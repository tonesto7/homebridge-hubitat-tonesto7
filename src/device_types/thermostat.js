// device_types/thermostat.js

function clamp(value, min, max) {
    return Math.max(min, Math.min(max, value));
}

function thermostatTempConversion(temp, platform, isSet = false) {
    if (isSet) {
        if (platform.getTempUnit() === "C") {
            return clamp(Math.round(temp), 10, 38); // Celsius clamp
        } else {
            return clamp(Math.round(temp), 50, 100); // Fahrenheit clamp
        }
    } else {
        if (platform.getTempUnit() === "C") {
            return Math.round(temp * 10) / 10;
        } else {
            return Math.round(((temp - 32) / 1.8) * 10) / 10;
        }
    }
}

function thermostatTargetTemp(accessory, deviceClass) {
    const mode = accessory.context.deviceData.attributes.thermostatMode;
    const currentTemp = accessory.context.deviceData.attributes.temperature;
    let targetTemp;

    switch (mode) {
        case "cool":
            targetTemp = accessory.context.deviceData.attributes.coolingSetpoint;
            break;
        case "heat":
            targetTemp = accessory.context.deviceData.attributes.heatingSetpoint;
            break;
        case "auto":
            const coolSetpoint = accessory.context.deviceData.attributes.coolingSetpoint;
            const heatSetpoint = accessory.context.deviceData.attributes.heatingSetpoint;
            targetTemp = Math.abs(coolSetpoint - currentTemp) < Math.abs(heatSetpoint - currentTemp) ? coolSetpoint : heatSetpoint;
            break;
        default:
            targetTemp = accessory.context.deviceData.attributes.thermostatSetpoint || currentTemp;
    }

    // Convert to Celsius if necessary and clamp to HomeKit range
    if (deviceClass.mainPlatform.getTempUnit() === "F") {
        targetTemp = ((targetTemp - 32) * 5) / 9; // Convert Fahrenheit to Celsius
    }
    targetTemp = clamp(targetTemp, 10, 38); // Clamp to HomeKit range (10°C to 38°C)

    accessory.log.debug(`${accessory.name} | Calculated Target Temperature: ${targetTemp}°C`);
    return Math.round(targetTemp * 10) / 10; // Round to one decimal place
}

function thermostatTargetTemp_set(accessory) {
    const mode = accessory.context.deviceData.attributes.thermostatMode;
    let cmdName, attrName;

    switch (mode) {
        case "cool":
            cmdName = "setCoolingSetpoint";
            attrName = "coolingSetpoint";
            break;
        case "heat":
            cmdName = "setHeatingSetpoint";
            attrName = "heatingSetpoint";
            break;
        case "auto":
            const coolSetpoint = accessory.context.deviceData.attributes.coolingSetpoint;
            const heatSetpoint = accessory.context.deviceData.attributes.heatingSetpoint;
            const currentTemp = accessory.context.deviceData.attributes.temperature;
            const useCool = Math.abs(coolSetpoint - currentTemp) < Math.abs(heatSetpoint - currentTemp);
            cmdName = useCool ? "setCoolingSetpoint" : "setHeatingSetpoint";
            attrName = useCool ? "coolingSetpoint" : "heatingSetpoint";
            break;
        default:
            cmdName = "setThermostatSetpoint";
            attrName = "thermostatSetpoint";
    }

    accessory.log.debug(`${accessory.name} | Command Name: ${cmdName}, Attribute Name: ${attrName}`);
    return { cmdName, attrName };
}

function getSupportedThermostatModes(accessory, Characteristic) {
    const supportedModes = [];
    const modes = accessory.context.deviceData.attributes.supportedThermostatModes || ["off", "heat", "cool", "auto"];

    modes.forEach((mode) => {
        switch (mode) {
            case "off":
                supportedModes.push(Characteristic.TargetHeatingCoolingState.OFF);
                break;
            case "heat":
                supportedModes.push(Characteristic.TargetHeatingCoolingState.HEAT);
                break;
            case "cool":
                supportedModes.push(Characteristic.TargetHeatingCoolingState.COOL);
                break;
            case "auto":
                supportedModes.push(Characteristic.TargetHeatingCoolingState.AUTO);
                break;
            default:
                accessory.log.warn(`${accessory.name} | Unsupported thermostat mode: ${mode}`);
        }
    });

    accessory.log.debug(`${accessory.name} | Supported Thermostat Modes: ${supportedModes}`);
    return supportedModes;
}

module.exports = {
    isSupported: (accessory) => accessory.hasCapability("Thermostat") || accessory.hasCapability("ThermostatOperatingState") || accessory.hasAttribute("thermostatOperatingState"),
    relevantAttributes: ["thermostatOperatingState", "thermostatMode", "temperature", "coolingSetpoint", "heatingSetpoint", "thermostatSetpoint", "humidity"],

    initializeAccessory: (accessory, deviceClass) => {
        const { Service, Characteristic } = deviceClass.mainPlatform;
        const service = accessory.getService(Service.Thermostat) || accessory.addService(Service.Thermostat);

        // Current Heating/Cooling State
        service
            .getCharacteristic(Characteristic.CurrentHeatingCoolingState)
            .onGet(() => {
                const operatingState = accessory.context.deviceData.attributes.thermostatOperatingState;
                switch (operatingState) {
                    case "cooling":
                        accessory.log.debug(`${accessory.name} | Current HeatingCoolingState: COOL`);
                        return Characteristic.CurrentHeatingCoolingState.COOL;
                    case "heating":
                        accessory.log.debug(`${accessory.name} | Current HeatingCoolingState: HEAT`);
                        return Characteristic.CurrentHeatingCoolingState.HEAT;
                    default:
                        accessory.log.debug(`${accessory.name} | Current HeatingCoolingState: OFF`);
                        return Characteristic.CurrentHeatingCoolingState.OFF;
                }
            })
            .onSet(() => {
                accessory.log.warn(`${accessory.name} | Attempted to set CurrentHeatingCoolingState characteristic, which is read-only.`);
            });

        // Target Heating/Cooling State
        service
            .getCharacteristic(Characteristic.TargetHeatingCoolingState)
            .setProps({
                validValues: getSupportedThermostatModes(accessory, Characteristic),
            })
            .onGet(() => {
                const mode = accessory.context.deviceData.attributes.thermostatMode;
                let targetState;
                switch (mode) {
                    case "cool":
                        targetState = Characteristic.TargetHeatingCoolingState.COOL;
                        break;
                    case "heat":
                        targetState = Characteristic.TargetHeatingCoolingState.HEAT;
                        break;
                    case "auto":
                        targetState = Characteristic.TargetHeatingCoolingState.AUTO;
                        break;
                    default:
                        targetState = Characteristic.TargetHeatingCoolingState.OFF;
                }
                accessory.log.debug(`${accessory.name} | Target HeatingCoolingState Retrieved: ${targetState}`);
                return targetState;
            })
            .onSet((value) => {
                let mode;
                switch (value) {
                    case Characteristic.TargetHeatingCoolingState.COOL:
                        mode = "cool";
                        break;
                    case Characteristic.TargetHeatingCoolingState.HEAT:
                        mode = "heat";
                        break;
                    case Characteristic.TargetHeatingCoolingState.AUTO:
                        mode = "auto";
                        break;
                    default:
                        mode = "off";
                }
                accessory.log.info(`${accessory.name} | Setting thermostat mode to ${mode}`);
                accessory.sendCommand(null, accessory, accessory.context.deviceData, "setThermostatMode", { value1: mode });
            });

        // Current Temperature
        service
            .getCharacteristic(Characteristic.CurrentTemperature)
            .onGet(() => {
                const temp = accessory.context.deviceData.attributes.temperature;
                const convertedTemp = thermostatTempConversion(temp, deviceClass.mainPlatform);
                accessory.log.debug(`${accessory.name} | Current Temperature Retrieved: ${convertedTemp}°C (${temp}°${deviceClass.mainPlatform.getTempUnit()})`);
                return convertedTemp;
            })
            .onSet(() => {
                accessory.log.warn(`${accessory.name} | Attempted to set CurrentTemperature characteristic, which is read-only.`);
            });

        // Target Temperature
        service
            .getCharacteristic(Characteristic.TargetTemperature)
            .setProps({
                minValue: 10,
                maxValue: 38,
                minStep: 0.1,
            })
            .onGet(() => {
                const targetTemp = thermostatTargetTemp(accessory, deviceClass);
                accessory.log.debug(`${accessory.name} | Target Temperature Retrieved: ${targetTemp}°C`);
                return targetTemp;
            })
            .onSet((value) => {
                let { cmdName, attrName } = thermostatTargetTemp_set(accessory);
                let temp;
                if (deviceClass.mainPlatform.getTempUnit() === "C") {
                    temp = thermostatTempConversion(value, deviceClass.mainPlatform, true);
                } else {
                    // Convert C to F for setting
                    temp = thermostatTempConversion((value * 9) / 5 + 32, deviceClass.mainPlatform, true);
                }
                accessory.log.info(`${accessory.name} | Setting thermostat setpoint to ${temp}°${deviceClass.mainPlatform.getTempUnit()} via command ${cmdName}`);
                accessory.sendCommand(null, accessory, accessory.context.deviceData, cmdName, { value1: temp });
                accessory.context.deviceData.attributes[attrName] = temp;
            });

        // Current Relative Humidity (if supported)
        if (accessory.hasCapability("RelativeHumidityMeasurement")) {
            service
                .getCharacteristic(Characteristic.CurrentRelativeHumidity)
                .onGet(() => {
                    const humidity = Math.round(clamp(parseFloat(accessory.context.deviceData.attributes.humidity) || 0, 0, 100));
                    accessory.log.debug(`${accessory.name} | Current Humidity Retrieved: ${humidity}%`);
                    return humidity;
                })
                .onSet(() => {
                    accessory.log.warn(`${accessory.name} | Attempted to set CurrentRelativeHumidity characteristic, which is read-only.`);
                });
        }

        // Temperature Display Units
        service
            .getCharacteristic(Characteristic.TemperatureDisplayUnits)
            .onGet(() => {
                const unit = deviceClass.mainPlatform.getTempUnit() === "F" ? Characteristic.TemperatureDisplayUnits.FAHRENHEIT : Characteristic.TemperatureDisplayUnits.CELSIUS;
                accessory.log.debug(`${accessory.name} | Temperature Display Units Retrieved: ${unit === Characteristic.TemperatureDisplayUnits.FAHRENHEIT ? "Fahrenheit" : "Celsius"}`);
                return unit;
            })
            .onSet(() => {
                accessory.log.warn(`${accessory.name} | Attempted to set TemperatureDisplayUnits characteristic, which is read-only.`);
            });

        accessory.context.deviceGroups.push("thermostat");
    },

    handleAttributeUpdate: (accessory, change, deviceClass) => {
        const { Characteristic, Service } = deviceClass.mainPlatform;
        const service = accessory.getService(Service.Thermostat);

        if (!service) {
            accessory.log.warn(`${accessory.name} | Thermostat service not found`);
            return;
        }

        switch (change.attribute) {
            case "thermostatOperatingState":
                let currentState;
                switch (change.value) {
                    case "cooling":
                        currentState = Characteristic.CurrentHeatingCoolingState.COOL;
                        break;
                    case "heating":
                        currentState = Characteristic.CurrentHeatingCoolingState.HEAT;
                        break;
                    default:
                        currentState = Characteristic.CurrentHeatingCoolingState.OFF;
                }
                service.updateCharacteristic(Characteristic.CurrentHeatingCoolingState, currentState);
                accessory.log.debug(`${accessory.name} | Updated Current HeatingCoolingState: ${currentState}`);
                break;

            case "thermostatMode":
                let targetState;
                switch (change.value) {
                    case "cool":
                        targetState = Characteristic.TargetHeatingCoolingState.COOL;
                        break;
                    case "heat":
                        targetState = Characteristic.TargetHeatingCoolingState.HEAT;
                        break;
                    case "auto":
                        targetState = Characteristic.TargetHeatingCoolingState.AUTO;
                        break;
                    default:
                        targetState = Characteristic.TargetHeatingCoolingState.OFF;
                }
                service.updateCharacteristic(Characteristic.TargetHeatingCoolingState, targetState);
                accessory.log.debug(`${accessory.name} | Updated Target HeatingCoolingState: ${targetState}`);
                break;

            case "temperature":
                const currentTemp = thermostatTempConversion(change.value, deviceClass.mainPlatform);
                service.updateCharacteristic(Characteristic.CurrentTemperature, currentTemp);
                accessory.log.debug(`${accessory.name} | Updated Current Temperature: ${currentTemp}°C`);
                break;

            case "coolingSetpoint":
            case "heatingSetpoint":
            case "thermostatSetpoint":
                const targetTemp = thermostatTargetTemp(accessory, deviceClass);
                service.updateCharacteristic(Characteristic.TargetTemperature, targetTemp);
                accessory.log.debug(`${accessory.name} | Updated Target Temperature: ${targetTemp}°C`);
                break;

            case "humidity":
                if (accessory.hasCapability("RelativeHumidityMeasurement")) {
                    const humidity = Math.round(clamp(parseFloat(change.value) || 0, 0, 100));
                    service.updateCharacteristic(Characteristic.CurrentRelativeHumidity, humidity);
                    accessory.log.debug(`${accessory.name} | Updated Current Humidity: ${humidity}%`);
                }
                break;

            default:
                accessory.log.debug(`${accessory.name} | Unhandled attribute update: ${change.attribute}`);
        }
    },
};

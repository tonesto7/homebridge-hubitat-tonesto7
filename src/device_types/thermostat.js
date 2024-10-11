// device_types/thermostat.js

export function isSupported(accessory) {
    return accessory.hasCapability("Thermostat") || accessory.hasCapability("ThermostatOperatingState") || accessory.hasAttribute("thermostatOperatingState");
}

export const relevantAttributes = ["thermostatOperatingState", "thermostatMode", "temperature", "coolingSetpoint", "heatingSetpoint", "thermostatSetpoint", "humidity"];

export function initializeAccessory(accessory, deviceClass) {
    const { Service, Characteristic } = deviceClass.platform;
    const service = deviceClass.getOrAddService(accessory, Service.Thermostat);

    deviceClass.getOrAddCharacteristic(accessory, service, Characteristic.CurrentHeatingCoolingState, {
        getHandler: function () {
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
        },
    });

    const supportedModes = getSupportedThermostatModes(accessory, Characteristic);

    deviceClass.getOrAddCharacteristic(accessory, service, Characteristic.TargetHeatingCoolingState, {
        props: {
            validValues: supportedModes,
        },
        getHandler: function () {
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
        },
        setHandler: function (value) {
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
        },
    });

    deviceClass.getOrAddCharacteristic(accessory, service, Characteristic.CurrentTemperature, {
        getHandler: function () {
            const temp = accessory.context.deviceData.attributes.temperature;
            const convertedTemp = thermostatTempConversion(temp, deviceClass.platform);
            accessory.log.debug(`${accessory.name} | Current Temperature Retrieved: ${convertedTemp}°C (${temp}°${deviceClass.platform.getTempUnit()})`);
            return convertedTemp;
        },
    });

    deviceClass.getOrAddCharacteristic(accessory, service, Characteristic.TargetTemperature, {
        props: {
            minValue: 10,
            maxValue: 38,
            minStep: 0.1,
        },
        getHandler: function () {
            const targetTemp = thermostatTargetTemp(accessory, deviceClass);
            accessory.log.debug(`${accessory.name} | Target Temperature Retrieved: ${targetTemp}°C`);
            return targetTemp;
        },
        setHandler: function (value) {
            let { cmdName, attrName } = thermostatTargetTemp_set(accessory);
            let temp;
            if (deviceClass.platform.getTempUnit() === "C") {
                temp = thermostatTempConversion(value, deviceClass.platform, true);
            } else {
                temp = thermostatTempConversion((value * 9) / 5 + 32, deviceClass.platform, true);
            }
            accessory.log.info(`${accessory.name} | Setting thermostat setpoint to ${temp}°${deviceClass.platform.getTempUnit()} via command ${cmdName}`);
            accessory.sendCommand(null, accessory, accessory.context.deviceData, cmdName, { value1: temp });
            accessory.context.deviceData.attributes[attrName] = temp;
        },
    });

    if (accessory.hasCapability("RelativeHumidityMeasurement")) {
        deviceClass.getOrAddCharacteristic(accessory, service, Characteristic.CurrentRelativeHumidity, {
            getHandler: function () {
                const humidity = Math.round(clamp(parseFloat(accessory.context.deviceData.attributes.humidity) || 0, 0, 100));
                accessory.log.debug(`${accessory.name} | Current Humidity Retrieved: ${humidity}%`);
                return humidity;
            },
        });
    }

    deviceClass.getOrAddCharacteristic(accessory, service, Characteristic.TemperatureDisplayUnits, {
        getHandler: function () {
            const unit = deviceClass.platform.getTempUnit() === "F" ? Characteristic.TemperatureDisplayUnits.FAHRENHEIT : Characteristic.TemperatureDisplayUnits.CELSIUS;
            accessory.log.debug(`${accessory.name} | Temperature Display Units Retrieved: ${unit === Characteristic.TemperatureDisplayUnits.FAHRENHEIT ? "Fahrenheit" : "Celsius"}`);
            return unit;
        },
    });

    accessory.context.deviceGroups.push("thermostat");
}

export function handleAttributeUpdate(accessory, change, deviceClass) {
    const { Characteristic, Service } = deviceClass.platform;
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
            deviceClass.updateCharacteristicValue(accessory, service, Characteristic.CurrentHeatingCoolingState, currentState);
            // accessory.log.debug(`${accessory.name} | Updated Current HeatingCoolingState: ${currentState}`);
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
            deviceClass.updateCharacteristicValue(accessory, service, Characteristic.TargetHeatingCoolingState, targetState);
            // accessory.log.debug(`${accessory.name} | Updated Target HeatingCoolingState: ${targetState}`);
            break;

        case "temperature":
            const currentTemp = thermostatTempConversion(change.value, deviceClass.platform);
            deviceClass.updateCharacteristicValue(accessory, service, Characteristic.CurrentTemperature, currentTemp);
            // accessory.log.debug(`${accessory.name} | Updated Current Temperature: ${currentTemp}°C`);
            break;

        case "coolingSetpoint":
        case "heatingSetpoint":
        case "thermostatSetpoint":
            const targetTemp = thermostatTargetTemp(accessory, deviceClass);
            deviceClass.updateCharacteristicValue(accessory, service, Characteristic.TargetTemperature, targetTemp);
            // accessory.log.debug(`${accessory.name} | Updated Target Temperature: ${targetTemp}°C`);
            break;

        case "humidity":
            if (accessory.hasCapability("RelativeHumidityMeasurement")) {
                const humidity = Math.round(clamp(parseFloat(change.value) || 0, 0, 100));
                deviceClass.updateCharacteristicValue(accessory, service, Characteristic.CurrentRelativeHumidity, humidity);
                // accessory.log.debug(`${accessory.name} | Updated Current Humidity: ${humidity}%`);
            }
            break;

        default:
            accessory.log.debug(`${accessory.name} | Unhandled attribute update: ${change.attribute}`);
    }
}

function clamp(value, min, max) {
    return Math.max(min, Math.min(max, value));
}

function thermostatTempConversion(temp, platform, isSet = false) {
    if (isSet) {
        if (platform.getTempUnit() === "C") {
            return clamp(Math.round(temp), 10, 38);
        } else {
            return clamp(Math.round(temp), 50, 100);
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

    if (deviceClass.platform.getTempUnit() === "F") {
        targetTemp = ((targetTemp - 32) * 5) / 9;
    }
    targetTemp = clamp(targetTemp, 10, 38);

    accessory.log.debug(`${accessory.name} | Calculated Target Temperature: ${targetTemp}°C`);
    return Math.round(targetTemp * 10) / 10;
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

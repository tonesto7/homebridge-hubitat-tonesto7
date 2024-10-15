// device_types/thermostat.js

let DeviceClass, Characteristic, Service, CommunityTypes;

export function init(_deviceClass, _Characteristic, _Service, _CommunityTypes) {
    DeviceClass = _deviceClass;
    Characteristic = _Characteristic;
    Service = _Service;
    CommunityTypes = _CommunityTypes;
}

export function isSupported(accessory) {
    return accessory.hasCapability("Thermostat") || accessory.hasCapability("ThermostatOperatingState") || accessory.hasAttribute("thermostatOperatingState");
}

export const relevantAttributes = ["thermostatOperatingState", "thermostatMode", "temperature", "coolingSetpoint", "heatingSetpoint", "thermostatSetpoint", "humidity"];

export function initializeAccessory(accessory) {
    const thermostatSvc = DeviceClass.getOrAddService(accessory, Service.Thermostat);

    DeviceClass.getOrAddCharacteristic(accessory, thermostatSvc, Characteristic.CurrentHeatingCoolingState, {
        getHandler: function () {
            const operatingState = getCurrentOperatingState(accessory.context.deviceData.attributes.thermostatOperatingState);
            accessory.log.debug(`${accessory.name} | Current HeatingCoolingState: ${accessory.context.deviceData.attributes.thermostatOperatingState.replace("ing", "").toUpperCase()}`);
            return operatingState;
        },
    });

    // Get the supported thermostat modes to set the valid values for TargetHeatingCoolingState which is used by the UI to offer the correct options
    const supportedModes = getSupportedThermostatModes(accessory);
    // console.log("supportedThermostatModes:", supportedModes);

    DeviceClass.getOrAddCharacteristic(accessory, thermostatSvc, Characteristic.TargetHeatingCoolingState, {
        props: {
            validValues: supportedModes,
        },
        getHandler: function () {
            const targetState = getTargetOperatingState(accessory.context.deviceData.attributes.thermostatMode);
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

    DeviceClass.getOrAddCharacteristic(accessory, thermostatSvc, Characteristic.CurrentTemperature, {
        getHandler: function () {
            const temp = accessory.context.deviceData.attributes.temperature;
            const convertedTemp = thermostatTempConversion(temp);
            accessory.log.debug(`${accessory.name} | Current Temperature Retrieved: ${convertedTemp}°C (${temp}°${DeviceClass.platform.getTempUnit()})`);
            return convertedTemp;
        },
    });

    DeviceClass.getOrAddCharacteristic(accessory, thermostatSvc, Characteristic.TargetTemperature, {
        props: {
            minValue: 10,
            maxValue: 38,
            minStep: 0.1,
        },
        getHandler: function () {
            const targetTemp = thermostatTargetTemp(accessory, DeviceClass);
            accessory.log.debug(`${accessory.name} | Target Temperature Retrieved: ${targetTemp}°C`);
            return targetTemp;
        },
        setHandler: function (value) {
            let { cmdName, attrName } = thermostatTargetTemp_set(accessory);
            let temp;
            if (DeviceClass.platform.getTempUnit() === "C") {
                temp = thermostatTempConversion(value, true);
            } else {
                temp = thermostatTempConversion((value * 9) / 5 + 32, true);
            }
            accessory.log.info(`${accessory.name} | Setting thermostat setpoint to ${temp}°${DeviceClass.platform.getTempUnit()} via command ${cmdName}`);
            accessory.sendCommand(null, accessory, accessory.context.deviceData, cmdName, { value1: temp });
            accessory.context.deviceData.attributes[attrName] = temp;
        },
    });

    DeviceClass.getOrAddCharacteristic(accessory, thermostatSvc, Characteristic.CurrentRelativeHumidity, {
        preReqChk: (acc) => acc.hasCapability("RelativeHumidityMeasurement"),
        getHandler: function () {
            const humidity = Math.round(clamp(parseFloat(accessory.context.deviceData.attributes.humidity) || 0, 0, 100));
            accessory.log.debug(`${accessory.name} | Current Humidity Retrieved: ${humidity}%`);
            return humidity;
        },
    });

    DeviceClass.getOrAddCharacteristic(accessory, thermostatSvc, Characteristic.TemperatureDisplayUnits, {
        getHandler: function () {
            const unit = DeviceClass.platform.getTempUnit() === "F" ? Characteristic.TemperatureDisplayUnits.FAHRENHEIT : Characteristic.TemperatureDisplayUnits.CELSIUS;
            accessory.log.debug(`${accessory.name} | Temperature Display Units Retrieved: ${unit === Characteristic.TemperatureDisplayUnits.FAHRENHEIT ? "Fahrenheit" : "Celsius"}`);
            return unit;
        },
    });

    accessory.context.deviceGroups.push("thermostat");
}

export function handleAttributeUpdate(accessory, change) {
    const thermostatSvc = accessory.getService(Service.Thermostat);

    if (!thermostatSvc) {
        accessory.log.warn(`${accessory.name} | Thermostat service not found`);
        return;
    }

    switch (change.attribute) {
        case "thermostatOperatingState":
            const currentState = getCurrentOperatingState(change.value);
            DeviceClass.updateCharacteristicValue(accessory, thermostatSvc, Characteristic.CurrentHeatingCoolingState, currentState);
            // accessory.log.debug(`${accessory.name} | Updated Current HeatingCoolingState: ${currentState}`);
            break;

        case "thermostatMode":
            // updateThermostatModeValidValues(accessory);
            const targetState = getTargetOperatingState(change.value);
            DeviceClass.updateCharacteristicValue(accessory, thermostatSvc, Characteristic.TargetHeatingCoolingState, targetState);
            // accessory.log.debug(`${accessory.name} | Updated Target HeatingCoolingState: ${targetState}`);
            break;

        case "temperature":
            const currentTemp = thermostatTempConversion(change.value);
            DeviceClass.updateCharacteristicValue(accessory, thermostatSvc, Characteristic.CurrentTemperature, currentTemp);
            // accessory.log.debug(`${accessory.name} | Updated Current Temperature: ${currentTemp}°C`);
            break;

        case "coolingSetpoint":
        case "heatingSetpoint":
        case "thermostatSetpoint":
            const targetTemp = thermostatTargetTemp(accessory);
            DeviceClass.updateCharacteristicValue(accessory, thermostatSvc, Characteristic.TargetTemperature, targetTemp);
            // accessory.log.debug(`${accessory.name} | Updated Target Temperature: ${targetTemp}°C`);
            break;

        case "humidity":
            if (accessory.hasCapability("RelativeHumidityMeasurement")) {
                const humidity = Math.round(clamp(parseFloat(change.value) || 0, 0, 100));
                DeviceClass.updateCharacteristicValue(accessory, thermostatSvc, Characteristic.CurrentRelativeHumidity, humidity);
                // accessory.log.debug(`${accessory.name} | Updated Current Humidity: ${humidity}%`);
            }
            break;

        default:
            accessory.log.debug(`${accessory.name} | Unhandled attribute update: ${change.attribute}`);
    }
}

function getCurrentOperatingState(state) {
    switch (state) {
        case "cooling":
            return Characteristic.CurrentHeatingCoolingState.COOL;
        case "heating":
            return Characteristic.CurrentHeatingCoolingState.HEAT;
        default:
            return Characteristic.CurrentHeatingCoolingState.OFF;
    }
}

function getTargetOperatingState(mode) {
    switch (mode) {
        case "cool":
            return Characteristic.TargetHeatingCoolingState.COOL;
        case "heat":
            return Characteristic.TargetHeatingCoolingState.HEAT;
        case "auto":
            return Characteristic.TargetHeatingCoolingState.AUTO;
        default:
            return Characteristic.TargetHeatingCoolingState.OFF;
    }
}

function clamp(value, min, max) {
    return Math.max(min, Math.min(max, value));
}

function thermostatTempConversion(temp, isSet = false) {
    if (isSet) {
        if (DeviceClass.platform.getTempUnit() === "C") {
            return clamp(Math.round(temp), 10, 38);
        } else {
            return clamp(Math.round(temp), 50, 100);
        }
    } else {
        if (DeviceClass.platform.getTempUnit() === "C") {
            return Math.round(temp * 10) / 10;
        } else {
            return Math.round(((temp - 32) / 1.8) * 10) / 10;
        }
    }
}

function thermostatTargetTemp(accessory) {
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

    if (DeviceClass.platform.getTempUnit() === "F") {
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

function getSupportedThermostatModes(accessory) {
    let supportedModes = [];
    let modes = accessory.context.deviceData.attributes.supportedThermostatModes || ["off", "heat", "cool", "auto"];
    // check modes are an array and not empty and if its a string then split it
    if (typeof modes === "string") {
        try {
            modes = JSON.parse(modes);
        } catch (e) {
            modes = modes.split(",");
        }
    }

    // console.log("modes:", modes, modes.length);
    for (const [i, mode] of modes.entries()) {
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
            // default:
            //     accessory.log.warn(`${accessory.name} | Unsupported thermostat mode: ${mode}`);
        }
    }

    accessory.log.debug(`${accessory.name} | Supported Thermostat Modes: ${supportedModes}`);
    return supportedModes;
}

function updateThermostatModeValidValues(accessory) {
    // Update the valid values for TargetHeatingCoolingState if they are different from the current prop values
    const thermostatSvc = accessory.getService(Service.Thermostat);
    const supportedModes = getSupportedThermostatModes(accessory);
    const currentModes = thermostatSvc.getCharacteristic(Characteristic.TargetHeatingCoolingState).props.validValues;

    if (JSON.stringify(currentModes) !== JSON.stringify(supportedModes)) {
        thermostatSvc.getCharacteristic(Characteristic.TargetHeatingCoolingState).props.validValues = supportedModes;
        accessory.log.debug(`${accessory.name} | Updated Supported Thermostat Modes: ${supportedModes}`);
    }
}

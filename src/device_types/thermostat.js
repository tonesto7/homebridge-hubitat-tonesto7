// device_types/thermostat.js

module.exports = {
    isSupported: (accessory) => accessory.hasCapability("Thermostat") || accessory.hasCapability("ThermostatOperatingState") || accessory.hasAttribute("thermostatOperatingState"),

    initializeAccessory: (accessory, deviceTypes) => {
        const { Service, Characteristic } = deviceTypes.mainPlatform;
        const service = accessory.getService(Service.Thermostat) || accessory.addService(Service.Thermostat);

        /**
         * Clamps a value between a minimum and maximum.
         * @param {number} value - The value to clamp.
         * @param {number} min - The minimum allowable value.
         * @param {number} max - The maximum allowable value.
         * @returns {number} - The clamped value.
         */
        function clamp(value, min, max) {
            return Math.max(min, Math.min(max, value));
        }

        /**
         * Converts temperature based on the platform's unit preference.
         * @param {number} temp - The temperature value to convert.
         * @param {object} platform - The platform instance to determine unit.
         * @param {boolean} isSet - Flag indicating if the value is being set.
         * @returns {number} - Converted temperature.
         */
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

        /**
         * Determines the target temperature based on the current thermostat mode.
         * @returns {number} - The target temperature.
         */
        function thermostatTargetTemp() {
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

            // Clamp targetTemp to a realistic range
            targetTemp = clamp(targetTemp, 10, 38); // Example range in Celsius
            accessory.log.debug(`${accessory.name} | Calculated Target Temperature: ${targetTemp} ${deviceTypes.mainPlatform.getTempUnit()}`);
            return thermostatTempConversion(targetTemp, deviceTypes.mainPlatform);
        }

        /**
         * Determines the command and attribute name for setting the target temperature.
         * @returns {object} - An object containing cmdName and attrName.
         */
        function thermostatTargetTemp_set() {
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

        /**
         * Retrieves the supported thermostat modes based on device data.
         * @returns {Array} - Array of supported HomeKit HeatingCoolingStates.
         */
        function getSupportedThermostatModes() {
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
                validValues: getSupportedThermostatModes(),
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
                const convertedTemp = thermostatTempConversion(temp, deviceTypes.mainPlatform);
                accessory.log.debug(`${accessory.name} | Current Temperature Retrieved: ${convertedTemp}°C (${temp}°${deviceTypes.mainPlatform.getTempUnit()})`);
                return convertedTemp;
            })
            .onSet(() => {
                accessory.log.warn(`${accessory.name} | Attempted to set CurrentTemperature characteristic, which is read-only.`);
            });

        // Target Temperature
        service
            .getCharacteristic(Characteristic.TargetTemperature)
            .onGet(() => {
                const targetTemp = thermostatTargetTemp();
                accessory.log.debug(`${accessory.name} | Target Temperature Retrieved: ${targetTemp}°C`);
                return targetTemp;
            })
            .onSet((value) => {
                let { cmdName, attrName } = thermostatTargetTemp_set();
                let temp;
                if (deviceTypes.mainPlatform.getTempUnit() === "C") {
                    temp = thermostatTempConversion(value, deviceTypes.mainPlatform, true);
                } else {
                    // Convert C to F for setting
                    temp = thermostatTempConversion((value * 9) / 5 + 32, deviceTypes.mainPlatform, true);
                }
                accessory.log.info(`${accessory.name} | Setting thermostat setpoint to ${temp}°${deviceTypes.mainPlatform.getTempUnit()} via command ${cmdName}`);
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
                const unit = deviceTypes.mainPlatform.getTempUnit() === "F" ? Characteristic.TemperatureDisplayUnits.FAHRENHEIT : Characteristic.TemperatureDisplayUnits.CELSIUS;
                accessory.log.debug(`${accessory.name} | Temperature Display Units Retrieved: ${unit === Characteristic.TemperatureDisplayUnits.FAHRENHEIT ? "Fahrenheit" : "Celsius"}`);
                return unit;
            })
            .onSet(() => {
                accessory.log.warn(`${accessory.name} | Attempted to set TemperatureDisplayUnits characteristic, which is read-only.`);
            });

        accessory.context.deviceGroups.push("thermostat");
    },
};

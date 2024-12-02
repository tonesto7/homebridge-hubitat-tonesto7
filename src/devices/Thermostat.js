// devices/Thermostat.js
export class Thermostat {
    constructor(platform) {
        this.logManager = platform.logManager;
        this.Service = platform.Service;
        this.Characteristic = platform.Characteristic;
        this.tempUnit = platform.configManager.getTempUnit();
        this.generateSrvcName = platform.generateSrvcName;
    }

    static relevantAttributes = ["temperature", "thermostatOperatingState", "thermostatMode", "coolingSetpoint", "heatingSetpoint", "thermostatFanMode", "humidity"];
    configure(accessory) {
        this.logManager.logDebug(`Configuring Thermostat for ${accessory.displayName}`);
        const svc = accessory.getOrAddService(this.Service.Thermostat, this.generateSrvcName(accessory.displayName, "Thermostat"));

        // Configure characteristics
        this._configureCurrentTemp(accessory, svc);
        this._configureTargetTemp(accessory, svc);
        this._configureCurrentState(accessory, svc);
        this._configureTargetState(accessory, svc);
        this._configureDisplayUnits(accessory, svc);
        this._configureHumidity(accessory, svc);

        // Configure auto mode thresholds if supported
        if (this._supportsAutoMode(accessory)) {
            this._configureAutoModeThresholds(accessory, svc);
        }

        // Configure fan if supported
        if (this._supportsFan(accessory)) {
            this._configureFan(accessory);
        }

        return accessory;
    }

    _configureCurrentTemp(accessory, svc) {
        const minCurrentTemp = 0; // 32°F
        const maxCurrentTemp = 100; // 212°F
        accessory.getOrAddCharacteristic(svc, this.Characteristic.CurrentTemperature, {
            getHandler: () => this._clampValue(this._convertToHomeKitTemp(accessory.context.deviceData.attributes.temperature), minCurrentTemp, maxCurrentTemp),
            updateHandler: (value) => this._clampValue(this._convertToHomeKitTemp(value), maxCurrentTemp, maxCurrentTemp),
            storeAttribute: "temperature",
        });
    }

    _configureTargetTemp(accessory, svc) {
        const minTargetTemp = 10; // 50°F
        const maxTargetTemp = 38; // 100°F
        accessory.getOrAddCharacteristic(svc, this.Characteristic.TargetTemperature, {
            getHandler: () => {
                const temp = this._convertToHomeKitTemp(this._getActiveSetpoint(accessory));
                return this._clampValue(temp, minTargetTemp, maxTargetTemp);
            },
            setHandler: (value) => {
                const { command } = this._getSetpointCommand(accessory, value);
                if (command) {
                    const temp = this._convertFromHomeKitTemp(this._clampValue(value, minTargetTemp, maxTargetTemp));
                    accessory.sendCommand(command, [temp]);
                }
            },
            updateHandler: (value) => this._clampValue(this._convertToHomeKitTemp(value), minTargetTemp, maxTargetTemp),
            storeAttribute: "thermostatSetpoint",
        });
    }

    _configureCurrentState(accessory, svc) {
        accessory.getOrAddCharacteristic(svc, this.Characteristic.CurrentHeatingCoolingState, {
            getHandler: () => this._getCurrentState(accessory.context.deviceData.attributes.thermostatOperatingState),
            updateHandler: (value) => this._getCurrentState(value),
            storeAttribute: "thermostatOperatingState",
        });
    }

    _configureTargetState(accessory, svc) {
        const validModes = this._getSupportedModes(accessory);
        accessory.getOrAddCharacteristic(svc, this.Characteristic.TargetHeatingCoolingState, {
            getHandler: () => this._getTargetState(accessory.context.deviceData.attributes.thermostatMode),
            setHandler: (value) => {
                const mode = this._convertHomeKitModeToHubitat(value);
                accessory.sendCommand("setThermostatMode", [mode]);
            },
            updateHandler: (value) => this._getTargetState(value),
            props: { validValues: validModes },
            storeAttribute: "thermostatMode",
        });
    }

    _configureDisplayUnits(accessory, svc) {
        svc.getCharacteristic(this.Characteristic.TemperatureDisplayUnits).updateValue(this.tempUnit === "F" ? this.Characteristic.TemperatureDisplayUnits.FAHRENHEIT : this.Characteristic.TemperatureDisplayUnits.CELSIUS);
    }

    _configureHumidity(accessory, svc) {
        const minHumidity = 0; // 0%
        const maxHumidity = 100; // 100%
        if (accessory.hasCapability("RelativeHumidityMeasurement")) {
            accessory.getOrAddCharacteristic(svc, this.Characteristic.CurrentRelativeHumidity, {
                getHandler: () => this._clampValue(accessory.context.deviceData.attributes.humidity, minHumidity, maxHumidity),
                updateHandler: (value) => this._clampValue(value, minHumidity, maxHumidity),
                storeAttribute: "humidity",
            });
        }
    }

    _configureAutoModeThresholds(accessory, svc) {
        // Cooling Threshold (10-35°C)
        const minCoolingThresholdCelcius = 10; // 50°F
        const maxCoolingThresholdCelcius = 35; // 95°F
        accessory.getOrAddCharacteristic(svc, this.Characteristic.CoolingThresholdTemperature, {
            getHandler: () => {
                const temp = this._convertToHomeKitTemp(accessory.context.deviceData.attributes.coolingSetpoint);
                return this._clampValue(temp, minCoolingThresholdCelcius, maxCoolingThresholdCelcius);
            },
            setHandler: (value) => {
                const temp = this._convertFromHomeKitTemp(this._clampValue(value, minCoolingThresholdCelcius, maxCoolingThresholdCelcius));
                accessory.sendCommand("setCoolingSetpoint", [temp]);
            },
            updateHandler: (value) => this._clampValue(this._convertToHomeKitTemp(value), minCoolingThresholdCelcius, maxCoolingThresholdCelcius),
            storeAttribute: "coolingSetpoint",
        });

        // Heating Threshold (0-25°C)
        const minHeatingThresholdCelcius = 0; // 32°F
        const maxHeatingThresholdCelcius = 25; // 77°F
        accessory.getOrAddCharacteristic(svc, this.Characteristic.HeatingThresholdTemperature, {
            getHandler: () => {
                const temp = this._convertToHomeKitTemp(accessory.context.deviceData.attributes.heatingSetpoint);
                return this._clampValue(temp, minHeatingThresholdCelcius, maxHeatingThresholdCelcius);
            },
            setHandler: (value) => {
                const temp = this._convertFromHomeKitTemp(this._clampValue(value, minHeatingThresholdCelcius, maxHeatingThresholdCelcius));
                accessory.sendCommand("setHeatingSetpoint", [temp]);
            },
            updateHandler: (value) => this._clampValue(this._convertToHomeKitTemp(value), minHeatingThresholdCelcius, maxHeatingThresholdCelcius),
            storeAttribute: "heatingSetpoint",
        });
    }

    _configureFan(accessory) {
        const fanSvc = accessory.getOrAddService(this.Service.Fanv2);

        accessory.getOrAddCharacteristic(fanSvc, this.Characteristic.Active, {
            getHandler: () => this._getFanActive(accessory.context.deviceData.attributes.thermostatFanMode),
            setHandler: (value) => accessory.sendCommand(value === this.Characteristic.Active.ACTIVE ? "fanOn" : "fanAuto"),
            updateHandler: (value) => this._getFanActive(value),
            storeAttribute: "thermostatFanMode",
        });

        accessory.getOrAddCharacteristic(fanSvc, this.Characteristic.CurrentFanState, {
            getHandler: () => this._getCurrentFanState(accessory.context.deviceData.attributes.thermostatFanMode),
            updateHandler: (value) => this._getCurrentFanState(value),
            storeAttribute: "thermostatFanMode",
        });

        accessory.getOrAddCharacteristic(fanSvc, this.Characteristic.TargetFanState, {
            getHandler: () => this._getTargetFanState(accessory.context.deviceData.attributes.thermostatFanMode),
            setHandler: (value) => accessory.sendCommand(value === this.Characteristic.TargetFanState.AUTO ? "fanAuto" : "fanOn"),
            updateHandler: (value) => this._getTargetFanState(value),
            storeAttribute: "thermostatFanMode",
        });
    }

    _clampValue(value, min, max) {
        if (value === null || value === undefined || isNaN(value)) return min;
        return Math.min(Math.max(value, min), max);
    }

    _convertToHomeKitTemp(temp) {
        if (!temp || isNaN(temp)) return null;
        return this.tempUnit === "F" ? (temp - 32) / 1.8 : temp;
    }

    _convertFromHomeKitTemp(temp) {
        if (!temp || isNaN(temp)) return null;
        return this.tempUnit === "F" ? temp * 1.8 + 32 : temp;
    }

    _getActiveSetpoint(accessory) {
        const attrs = accessory.context.deviceData.attributes;
        const mode = attrs.thermostatMode;

        switch (mode) {
            case "cool":
                return attrs.coolingSetpoint;
            case "heat":
            case "emergency heat":
                return attrs.heatingSetpoint;
            case "auto": {
                const currentTemp = attrs.temperature;
                const coolingTemp = attrs.coolingSetpoint;
                const heatingTemp = attrs.heatingSetpoint;
                const coolingDiff = Math.abs(currentTemp - coolingTemp);
                const heatingDiff = Math.abs(currentTemp - heatingTemp);
                return coolingDiff < heatingDiff ? coolingTemp : heatingTemp;
            }
            default:
                return attrs.temperature;
        }
    }

    _getSetpointCommand(accessory, targetTemp) {
        const mode = accessory.context.deviceData.attributes.thermostatMode;
        const commands = {
            cool: {
                command: "setCoolingSetpoint",
                attribute: "coolingSetpoint",
            },
            heat: {
                command: "setHeatingSetpoint",
                attribute: "heatingSetpoint",
            },
            "emergency heat": {
                command: "setHeatingSetpoint",
                attribute: "heatingSetpoint",
            },
            auto: {
                command: this._getAutoModeCommand(accessory, targetTemp),
                attribute: this._getAutoModeCommand(accessory, targetTemp).includes("Cooling") ? "coolingSetpoint" : "heatingSetpoint",
            },
        };

        return (
            commands[mode] || {
                command: "setThermostatSetpoint",
                attribute: "thermostatSetpoint",
            }
        );
    }

    _getAutoModeCommand(accessory, targetTemp) {
        const currentTemp = accessory.context.deviceData.attributes.temperature;
        return targetTemp > currentTemp ? "setCoolingSetpoint" : "setHeatingSetpoint";
    }

    _getCurrentState(state) {
        switch (state) {
            case "heating":
            case "pending heat":
                return this.Characteristic.CurrentHeatingCoolingState.HEAT;
            case "cooling":
            case "pending cool":
                return this.Characteristic.CurrentHeatingCoolingState.COOL;
            default:
                return this.Characteristic.CurrentHeatingCoolingState.OFF;
        }
    }

    _getTargetState(mode) {
        switch (mode) {
            case "heat":
            case "emergency heat":
                return this.Characteristic.TargetHeatingCoolingState.HEAT;
            case "cool":
                return this.Characteristic.TargetHeatingCoolingState.COOL;
            case "auto":
                return this.Characteristic.TargetHeatingCoolingState.AUTO;
            default:
                return this.Characteristic.TargetHeatingCoolingState.OFF;
        }
    }

    _convertHomeKitModeToHubitat(value) {
        switch (value) {
            case this.Characteristic.TargetHeatingCoolingState.COOL:
                return "cool";
            case this.Characteristic.TargetHeatingCoolingState.HEAT:
                return "heat";
            case this.Characteristic.TargetHeatingCoolingState.AUTO:
                return "auto";
            default:
                return "off";
        }
    }

    _getFanActive(fanMode) {
        return fanMode === "on" ? this.Characteristic.Active.ACTIVE : this.Characteristic.Active.INACTIVE;
    }

    _getCurrentFanState(fanMode) {
        return fanMode === "on" ? this.Characteristic.CurrentFanState.BLOWING_AIR : this.Characteristic.CurrentFanState.IDLE;
    }

    _getTargetFanState(fanMode) {
        return fanMode === "auto" ? this.Characteristic.TargetFanState.AUTO : this.Characteristic.TargetFanState.MANUAL;
    }

    _supportsFan(accessory) {
        return accessory.hasAttribute("thermostatFanMode") && accessory.hasCommand("fanOn") && accessory.hasCommand("fanAuto");
    }

    _supportsAutoMode(accessory) {
        const modes = accessory.context.deviceData.attributes.supportedThermostatModes || [];
        return modes.includes("auto") || (accessory.hasAttribute("coolingSetpoint") && accessory.hasAttribute("heatingSetpoint"));
    }

    _getSupportedModes(accessory) {
        const modes = [this.Characteristic.TargetHeatingCoolingState.OFF];
        const supported = accessory.context.deviceData.attributes.supportedThermostatModes || [];
        const hasHeating = accessory.hasAttribute("heatingSetpoint");
        const hasCooling = accessory.hasAttribute("coolingSetpoint");

        if (supported.includes("heat") || supported.includes("emergency heat") || hasHeating) {
            modes.push(this.Characteristic.TargetHeatingCoolingState.HEAT);
        }

        if (supported.includes("cool") || hasCooling) {
            modes.push(this.Characteristic.TargetHeatingCoolingState.COOL);
        }

        if (this._supportsAutoMode(accessory)) {
            modes.push(this.Characteristic.TargetHeatingCoolingState.AUTO);
        }

        return modes;
    }

    // Handle attribute updates
    handleAttributeUpdate(accessory, update) {
        const { attribute, value } = update;
        this.logManager.logDebug(`Thermostat | ${accessory.displayName} | Attribute update: ${attribute} = ${value}`);
        if (!Thermostat.relevantAttributes.includes(attribute)) return;

        const tstatSvc = accessory.getService(this.Service.Thermostat, this.generateSrvcName(accessory.displayName, "Thermostat"));
        if (!tstatSvc) return;

        switch (attribute) {
            case "temperature":
                const currentTemp = this._convertToHomeKitTemp(value);
                tstatSvc.getCharacteristic(this.Characteristic.CurrentTemperature).updateValue(this._clampValue(currentTemp, 0, 100));
                break;

            case "thermostatMode":
                // Update target state
                tstatSvc.getCharacteristic(this.Characteristic.TargetHeatingCoolingState).updateValue(this._getTargetState(value));

                // Update target temperature based on new mode
                const activeSetpoint = this._getActiveSetpoint(accessory);
                if (activeSetpoint) {
                    const targetTemp = this._convertToHomeKitTemp(activeSetpoint);
                    tstatSvc.getCharacteristic(this.Characteristic.TargetTemperature).updateValue(this._clampValue(targetTemp, 10, 38));
                }
                break;

            case "coolingSetpoint":
                const coolTemp = this._convertToHomeKitTemp(value);
                // Update cooling threshold
                tstatSvc.getCharacteristic(this.Characteristic.CoolingThresholdTemperature).updateValue(this._clampValue(coolTemp, 10, 35));

                // If in cooling mode, update target temp
                if (accessory.context.deviceData.attributes.thermostatMode === "cool") {
                    tstatSvc.getCharacteristic(this.Characteristic.TargetTemperature).updateValue(this._clampValue(coolTemp, 10, 38));
                }
                break;

            case "heatingSetpoint":
                const heatTemp = this._convertToHomeKitTemp(value);
                // Update heating threshold
                tstatSvc.getCharacteristic(this.Characteristic.HeatingThresholdTemperature).updateValue(this._clampValue(heatTemp, 0, 25));

                // If in heating mode, update target temp
                if (["heat", "emergency heat"].includes(accessory.context.deviceData.attributes.thermostatMode)) {
                    tstatSvc.getCharacteristic(this.Characteristic.TargetTemperature).updateValue(this._clampValue(heatTemp, 10, 38));
                }
                break;

            case "thermostatOperatingState":
                tstatSvc.getCharacteristic(this.Characteristic.CurrentHeatingCoolingState).updateValue(this._getCurrentState(value));
                break;

            case "humidity":
                tstatSvc.getCharacteristic(this.Characteristic.CurrentRelativeHumidity).updateValue(this._clampValue(parseInt(value), 0, 100));
                break;

            case "thermostatFanMode":
                const fanSvc = accessory.getService(this.Service.Fanv2);
                if (fanSvc) {
                    fanSvc.getCharacteristic(this.Characteristic.Active).updateValue(this._getFanActive(value));
                    fanSvc.getCharacteristic(this.Characteristic.CurrentFanState).updateValue(this._getCurrentFanState(value));
                    fanSvc.getCharacteristic(this.Characteristic.TargetFanState).updateValue(this._getTargetFanState(value));
                }
                break;
            default:
                this.logManager.logWarn(`Thermostat | ${accessory.displayName} | Unhandled attribute update: ${attribute} = ${value}`);
        }
    }
}

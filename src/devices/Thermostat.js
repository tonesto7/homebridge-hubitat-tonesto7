// devices/Thermostat.js
export class Thermostat {
    constructor(platform) {
        this.logManager = platform.logManager;
        this.Service = platform.Service;
        this.Characteristic = platform.Characteristic;
        this.tempUnit = platform.configManager.getTempUnit();
    }

    configure(accessory) {
        this.logManager.logDebug(`Configuring Thermostat for ${accessory.displayName}`);
        const svc = accessory.getOrAddService(this.Service.Thermostat);
        const devData = accessory.context.deviceData;

        this._configureCurrentState(accessory, svc, devData);
        this._configureTargetState(accessory, svc, devData);
        this._configureCurrentTemp(accessory, svc, devData);
        this._configureTargetTemp(accessory, svc, devData);
        this._configureDisplayUnits(accessory, svc);

        accessory.context.deviceGroups.push("thermostat");
        return accessory;
    }

    _configureCurrentState(accessory, svc, devData) {
        accessory.getOrAddCharacteristic(svc, this.Characteristic.CurrentHeatingCoolingState, {
            getHandler: () => this._getCurrentState(devData.attributes.thermostatOperatingState),
            updateHandler: (value) => this._getCurrentState(value),
            storeAttribute: "thermostatOperatingState",
        });
    }

    _configureTargetState(accessory, svc, devData) {
        const validModes = this._getSupportedModes(accessory);
        accessory.getOrAddCharacteristic(svc, this.Characteristic.TargetHeatingCoolingState, {
            getHandler: () => this._getTargetState(devData.attributes.thermostatMode),
            setHandler: (value) => {
                const modes = ["off", "heat", "cool", "auto"];
                accessory.sendCommand("setThermostatMode", [modes[value]]);
            },
            updateHandler: (value) => this._getTargetState(value),
            props: { validValues: validModes },
            storeAttribute: "thermostatMode",
        });
    }

    _configureCurrentTemp(accessory, svc, devData) {
        accessory.getOrAddCharacteristic(svc, this.Characteristic.CurrentTemperature, {
            getHandler: () => this._convertTemp(parseFloat(devData.attributes.temperature)),
            updateHandler: (value) => this._convertTemp(parseFloat(value)),
            storeAttribute: "temperature",
        });
    }

    _configureTargetTemp(accessory, svc, devData) {
        accessory.getOrAddCharacteristic(svc, this.Characteristic.TargetTemperature, {
            getHandler: () => {
                const targetTemp = this._getTargetTemp(devData);
                return targetTemp ? this._convertTemp(targetTemp) : null;
            },
            setHandler: (value) => {
                const temp = this.tempUnit === "F" ? value * 1.8 + 32 : value;
                const targetObj = this._getTargetTempSetpoint(devData);
                if (targetObj?.cmdName && targetObj?.attrName) {
                    accessory.sendCommand(targetObj.cmdName, [temp]);
                    devData.attributes[targetObj.attrName] = temp;
                }
            },
            updateHandler: (value) => this._convertTemp(parseFloat(value)),
            storeAttribute: "thermostatSetpoint",
        });
    }

    _configureDisplayUnits(accessory, svc) {
        accessory.getOrAddCharacteristic(svc, this.Characteristic.TemperatureDisplayUnits, {
            value: this.tempUnit === "F" ? this.Characteristic.TemperatureDisplayUnits.FAHRENHEIT : this.Characteristic.TemperatureDisplayUnits.CELSIUS,
        });
    }

    _getCurrentState(state) {
        switch (state) {
            case "heating":
                return this.Characteristic.CurrentHeatingCoolingState.HEAT;
            case "cooling":
                return this.Characteristic.CurrentHeatingCoolingState.COOL;
            default:
                return this.Characteristic.CurrentHeatingCoolingState.OFF;
        }
    }

    _getTargetState(mode) {
        switch (mode) {
            case "heat":
                return this.Characteristic.TargetHeatingCoolingState.HEAT;
            case "cool":
                return this.Characteristic.TargetHeatingCoolingState.COOL;
            case "auto":
                return this.Characteristic.TargetHeatingCoolingState.AUTO;
            default:
                return this.Characteristic.TargetHeatingCoolingState.OFF;
        }
    }

    _getSupportedModes(accessory) {
        const modes = [this.Characteristic.TargetHeatingCoolingState.OFF];
        const supportedModes = accessory.context.deviceData.attributes.supportedThermostatModes || [];

        if (supportedModes.includes("heat") || supportedModes.includes("emergency heat") || accessory.hasAttribute("heatingSetpoint")) {
            modes.push(this.Characteristic.TargetHeatingCoolingState.HEAT);
        }

        if (supportedModes.includes("cool") || accessory.hasAttribute("coolingSetpoint")) {
            modes.push(this.Characteristic.TargetHeatingCoolingState.COOL);
        }

        if (supportedModes.includes("auto")) {
            modes.push(this.Characteristic.TargetHeatingCoolingState.AUTO);
        }

        return modes;
    }

    _getTargetTemp(devData) {
        const mode = devData.attributes.thermostatMode;
        if (mode === "heat") return parseFloat(devData.attributes.heatingSetpoint);
        if (mode === "cool") return parseFloat(devData.attributes.coolingSetpoint);
        return parseFloat(devData.attributes.thermostatSetpoint);
    }

    _getTargetTempSetpoint(devData) {
        const mode = devData.attributes.thermostatMode;
        if (mode === "heat") return { cmdName: "setHeatingSetpoint", attrName: "heatingSetpoint" };
        if (mode === "cool") return { cmdName: "setCoolingSetpoint", attrName: "coolingSetpoint" };
        return { cmdName: "setThermostatSetpoint", attrName: "thermostatSetpoint" };
    }

    _convertTemp(temp) {
        return this.tempUnit === "F" ? (temp - 32) / 1.8 : temp;
    }
}

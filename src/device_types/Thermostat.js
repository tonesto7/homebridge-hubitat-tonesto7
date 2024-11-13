// device_types/Thermostat.js

import HubitatPlatformAccessory from "../HubitatPlatformAccessory.js";

export default class Thermostat extends HubitatPlatformAccessory {
    constructor(platform, accessory) {
        super(platform, accessory);
        this.thermostatService = null;
        this.fanService = null;
        this.tempUnit = this.platform.configManager.getTempUnit();
    }

    async configureServices() {
        try {
            await this.configureThermostatService();

            // Configure fan service if supported
            if (this.supportsFan()) {
                await this.configureFanService();
            }

            // Configure humidity if supported
            if (this.supportsHumidity()) {
                this.configureHumiditySensor();
            }

            return true;
        } catch (error) {
            this.logError("Error configuring thermostat services:", error);
            throw error;
        }
    }

    async configureThermostatService() {
        this.thermostatService = this.getOrAddService(this.Service.Thermostat);
        this.markServiceForRetention(this.thermostatService);

        // Current Temperature
        this.getOrAddCharacteristic(this.thermostatService, this.Characteristic.CurrentTemperature, {
            getHandler: () => this.getCurrentTemperature(),
            props: {
                minValue: -100,
                maxValue: 100,
                minStep: 0.1,
            },
        });

        // Target Temperature
        this.getOrAddCharacteristic(this.thermostatService, this.Characteristic.TargetTemperature, {
            getHandler: () => this.getTargetTemperature(),
            setHandler: async (value) => this.setTargetTemperature(value),
            props: {
                minValue: this.getMinTemp(),
                maxValue: this.getMaxTemp(),
                minStep: 0.5,
            },
        });

        // Current Heating/Cooling State
        this.getOrAddCharacteristic(this.thermostatService, this.Characteristic.CurrentHeatingCoolingState, {
            getHandler: () => this.getCurrentHeatingCoolingState(),
        });

        // Target Heating/Cooling State
        this.getOrAddCharacteristic(this.thermostatService, this.Characteristic.TargetHeatingCoolingState, {
            getHandler: () => this.getTargetHeatingCoolingState(),
            setHandler: async (value) => this.setTargetHeatingCoolingState(value),
            props: {
                validValues: this.getSupportedThermostatModes(),
            },
        });

        // Temperature Display Units
        this.getOrAddCharacteristic(this.thermostatService, this.Characteristic.TemperatureDisplayUnits, {
            getHandler: () => this.getTempDisplayUnits(),
        });

        // Heating/Cooling Thresholds if auto mode is supported
        if (this.supportsAutoMode()) {
            this.configureAutoModeCharacteristics();
        }
    }

    async configureFanService() {
        this.fanService = this.getOrAddService(this.Service.Fanv2);
        this.markServiceForRetention(this.fanService);

        // Active State
        this.getOrAddCharacteristic(this.fanService, this.Characteristic.Active, {
            getHandler: () => this.getFanActive(),
            setHandler: async (value) => this.setFanActive(value),
        });

        // Current Fan State
        this.getOrAddCharacteristic(this.fanService, this.Characteristic.CurrentFanState, {
            getHandler: () => this.getCurrentFanState(),
        });

        // Target Fan State (Auto/Manual)
        this.getOrAddCharacteristic(this.fanService, this.Characteristic.TargetFanState, {
            getHandler: () => this.getTargetFanState(),
            setHandler: async (value) => this.setTargetFanState(value),
        });
    }

    configureHumiditySensor() {
        this.getOrAddCharacteristic(this.thermostatService, this.Characteristic.CurrentRelativeHumidity, {
            getHandler: () => this.getCurrentHumidity(),
        });
    }

    configureAutoModeCharacteristics() {
        // Cooling Threshold
        this.getOrAddCharacteristic(this.thermostatService, this.Characteristic.CoolingThresholdTemperature, {
            getHandler: () => this.getCoolingThresholdTemperature(),
            setHandler: async (value) => this.setCoolingThresholdTemperature(value),
            props: {
                minValue: this.getMinTemp(),
                maxValue: this.getMaxTemp(),
                minStep: 0.5,
            },
        });

        // Heating Threshold
        this.getOrAddCharacteristic(this.thermostatService, this.Characteristic.HeatingThresholdTemperature, {
            getHandler: () => this.getHeatingThresholdTemperature(),
            setHandler: async (value) => this.setHeatingThresholdTemperature(value),
            props: {
                minValue: this.getMinTemp(),
                maxValue: this.getMaxTemp(),
                minStep: 0.5,
            },
        });
    }

    // Temperature Handlers
    getCurrentTemperature() {
        return this.convertTemperatureFromDevice(this.deviceData.attributes.temperature);
    }

    getTargetTemperature() {
        return this.convertTemperatureFromDevice(this.getActiveSetpoint());
    }

    async setTargetTemperature(value) {
        const deviceTemp = this.convertTemperatureToDevice(value);
        const mode = this.deviceData.attributes.thermostatMode;

        let command;
        switch (mode) {
            case "cool":
                command = "setCoolingSetpoint";
                break;
            case "heat":
            case "emergency heat":
                command = "setHeatingSetpoint";
                break;
            case "auto":
                // In auto mode, adjust the setpoint closest to current temperature
                const currentTemp = this.deviceData.attributes.temperature;
                const coolingSetpoint = this.deviceData.attributes.coolingSetpoint;
                const heatingSetpoint = this.deviceData.attributes.heatingSetpoint;

                const coolDiff = Math.abs(currentTemp - coolingSetpoint);
                const heatDiff = Math.abs(currentTemp - heatingSetpoint);

                command = coolDiff < heatDiff ? "setCoolingSetpoint" : "setHeatingSetpoint";
                break;
            default:
                this.logWarn(`Cannot set temperature in ${mode} mode`);
                return;
        }

        await this.sendCommand(command, deviceTemp);
    }

    // Heating/Cooling State Handlers
    getCurrentHeatingCoolingState() {
        const state = this.deviceData.attributes.thermostatOperatingState;
        const Characteristic = this.Characteristic;

        switch (state) {
            case "heating":
            case "pending heat":
                return Characteristic.CurrentHeatingCoolingState.HEAT;
            case "cooling":
            case "pending cool":
                return Characteristic.CurrentHeatingCoolingState.COOL;
            default:
                return Characteristic.CurrentHeatingCoolingState.OFF;
        }
    }

    getTargetHeatingCoolingState() {
        const mode = this.deviceData.attributes.thermostatMode;
        const Characteristic = this.Characteristic;

        switch (mode) {
            case "heat":
            case "emergency heat":
                return Characteristic.TargetHeatingCoolingState.HEAT;
            case "cool":
                return Characteristic.TargetHeatingCoolingState.COOL;
            case "auto":
                return Characteristic.TargetHeatingCoolingState.AUTO;
            default:
                return Characteristic.TargetHeatingCoolingState.OFF;
        }
    }

    async setTargetHeatingCoolingState(value) {
        let mode;
        const Characteristic = this.Characteristic;

        switch (value) {
            case Characteristic.TargetHeatingCoolingState.HEAT:
                mode = "heat";
                break;
            case Characteristic.TargetHeatingCoolingState.COOL:
                mode = "cool";
                break;
            case Characteristic.TargetHeatingCoolingState.AUTO:
                mode = "auto";
                break;
            default:
                mode = "off";
        }

        await this.sendCommand("setThermostatMode", mode);
    }

    // Fan Handlers
    getFanActive() {
        const mode = this.deviceData.attributes.thermostatFanMode;
        return mode === "on" ? this.Characteristic.Active.ACTIVE : this.Characteristic.Active.INACTIVE;
    }

    async setFanActive(value) {
        await this.sendCommand(value === this.Characteristic.Active.ACTIVE ? "fanOn" : "fanAuto");
    }

    getCurrentFanState() {
        const mode = this.deviceData.attributes.thermostatFanMode;
        const Characteristic = this.Characteristic;

        return mode === "on" ? Characteristic.CurrentFanState.BLOWING_AIR : Characteristic.CurrentFanState.IDLE;
    }

    getTargetFanState() {
        const mode = this.deviceData.attributes.thermostatFanMode;
        const Characteristic = this.Characteristic;

        return mode === "auto" ? Characteristic.TargetFanState.AUTO : Characteristic.TargetFanState.MANUAL;
    }

    async setTargetFanState(value) {
        await this.sendCommand(value === this.Characteristic.TargetFanState.AUTO ? "fanAuto" : "fanOn");
    }

    // Temperature Threshold Handlers
    getCoolingThresholdTemperature() {
        return this.convertTemperatureFromDevice(this.deviceData.attributes.coolingSetpoint);
    }

    async setCoolingThresholdTemperature(value) {
        const deviceTemp = this.convertTemperatureToDevice(value);
        await this.sendCommand("setCoolingSetpoint", deviceTemp);
    }

    getHeatingThresholdTemperature() {
        return this.convertTemperatureFromDevice(this.deviceData.attributes.heatingSetpoint);
    }

    async setHeatingThresholdTemperature(value) {
        const deviceTemp = this.convertTemperatureToDevice(value);
        await this.sendCommand("setHeatingSetpoint", deviceTemp);
    }

    // Support checking methods
    supportsFan() {
        return this.hasAttribute("thermostatFanMode") && this.hasCommand("fanOn") && this.hasCommand("fanAuto");
    }

    supportsHumidity() {
        return this.hasCapability("RelativeHumidityMeasurement") && this.hasAttribute("humidity");
    }

    supportsAutoMode() {
        const modes = this.deviceData.attributes.supportedThermostatModes || [];
        return modes.includes("auto") || (this.hasAttribute("coolingSetpoint") && this.hasAttribute("heatingSetpoint"));
    }

    // Helper methods
    getSupportedThermostatModes() {
        const modes = [this.Characteristic.TargetHeatingCoolingState.OFF];
        const supportedModes = this.deviceData.attributes.supportedThermostatModes || [];

        if (supportedModes.includes("heat") || supportedModes.includes("emergency heat") || this.hasAttribute("heatingSetpoint")) {
            modes.push(this.Characteristic.TargetHeatingCoolingState.HEAT);
        }

        if (supportedModes.includes("cool") || this.hasAttribute("coolingSetpoint")) {
            modes.push(this.Characteristic.TargetHeatingCoolingState.COOL);
        }

        if (this.supportsAutoMode()) {
            modes.push(this.Characteristic.TargetHeatingCoolingState.AUTO);
        }

        return modes;
    }

    getActiveSetpoint() {
        const mode = this.deviceData.attributes.thermostatMode;

        switch (mode) {
            case "cool":
                return this.deviceData.attributes.coolingSetpoint;
            case "heat":
            case "emergency heat":
                return this.deviceData.attributes.heatingSetpoint;
            case "auto": {
                const currentTemp = this.deviceData.attributes.temperature;
                const coolingSetpoint = this.deviceData.attributes.coolingSetpoint;
                const heatingSetpoint = this.deviceData.attributes.heatingSetpoint;

                // Return the setpoint closest to current temperature
                return Math.abs(currentTemp - coolingSetpoint) < Math.abs(currentTemp - heatingSetpoint) ? coolingSetpoint : heatingSetpoint;
            }
            default:
                return this.deviceData.attributes.temperature;
        }
    }

    getTempDisplayUnits() {
        return this.tempUnit === "F" ? this.Characteristic.TemperatureDisplayUnits.FAHRENHEIT : this.Characteristic.TemperatureDisplayUnits.CELSIUS;
    }

    getMinTemp() {
        return this.tempUnit === "F" ? 50 : 10;
    }

    getMaxTemp() {
        return this.tempUnit === "F" ? 90 : 32;
    }

    convertTemperatureFromDevice(temp) {
        if (this.tempUnit === "C") {
            return parseFloat(temp);
        }
        return (parseFloat(temp) - 32) / 1.8;
    }

    convertTemperatureToDevice(temp) {
        if (this.tempUnit === "C") {
            return parseFloat(temp);
        }
        return parseFloat(temp) * 1.8 + 32;
    }

    async handleAttributeUpdate(attribute, value) {
        this.updateDeviceAttribute(attribute, value);
        switch (attribute) {
            case "temperature":
                this.thermostatService.getCharacteristic(this.Characteristic.CurrentTemperature).updateValue(this.convertTemperatureFromDevice(value));
                break;

            case "thermostatOperatingState":
                this.thermostatService.getCharacteristic(this.Characteristic.CurrentHeatingCoolingState).updateValue(this.getCurrentHeatingCoolingState());
                break;

            case "thermostatMode":
                this.thermostatService.getCharacteristic(this.Characteristic.TargetHeatingCoolingState).updateValue(this.getTargetHeatingCoolingState());

                // Update target temperature when mode changes
                this.thermostatService.getCharacteristic(this.Characteristic.TargetTemperature).updateValue(this.getTargetTemperature());
                break;

            case "heatingSetpoint":
            case "coolingSetpoint":
                if (this.supportsAutoMode()) {
                    const characteristic = attribute === "heatingSetpoint" ? this.Characteristic.HeatingThresholdTemperature : this.Characteristic.CoolingThresholdTemperature;

                    this.thermostatService.getCharacteristic(characteristic).updateValue(this.convertTemperatureFromDevice(value));
                }
                // Update target temperature if this is the active setpoint
                if (this.getActiveSetpoint() === value) {
                    this.thermostatService.getCharacteristic(this.Characteristic.TargetTemperature).updateValue(this.convertTemperatureFromDevice(value));
                }
                break;

            case "thermostatFanMode":
                if (!this.fanService) return;

                // Update fan characteristics
                this.fanService.getCharacteristic(this.Characteristic.Active).updateValue(this.getFanActive());

                this.fanService.getCharacteristic(this.Characteristic.CurrentFanState).updateValue(this.getCurrentFanState());

                this.fanService.getCharacteristic(this.Characteristic.TargetFanState).updateValue(this.getTargetFanState());
                break;

            case "humidity":
                if (!this.supportsHumidity()) return;

                this.thermostatService.getCharacteristic(this.Characteristic.CurrentRelativeHumidity).updateValue(parseInt(value));
                break;

            default:
                this.logDebug(`Unhandled attribute update: ${attribute} = ${value}`);
        }
    }

    // Override cleanup to handle additional services
    async cleanup() {
        if (this.fanService) {
            this.fanService = null;
        }
        this.thermostatService = null;
        await super.cleanup();
    }
}

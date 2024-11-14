// device_types/Thermostat.js

import HubitatPlatformAccessory from "../HubitatPlatformAccessory.js";

export default class Thermostat extends HubitatPlatformAccessory {
    constructor(platform, accessory) {
        super(platform, accessory);
        this.thermostatService = null;
        this.fanService = null;
    }

    // Main Service Configuration
    async configureServices() {
        try {
            await this.configureThermostatService();

            if (this.supportsFan()) {
                await this.configureFanService();
            }

            if (this.hasCapability("RelativeHumidityMeasurement") && this.hasAttribute("humidity")) {
                this.getOrAddCharacteristic(this.thermostatService, this.Characteristic.CurrentRelativeHumidity, {
                    getHandler: () => {
                        const humidity = parseInt(this.deviceData.attributes.humidity);
                        if (isNaN(humidity)) {
                            this.logWarn(`Invalid humidity value: ${this.deviceData.attributes.humidity}`);
                            return 0;
                        }
                        return humidity;
                    },
                });
            }

            return true;
        } catch (error) {
            this.logError("Error configuring thermostat services:", error);
            throw error;
        }
    }

    // Core Thermostat Configuration
    async configureThermostatService() {
        this.thermostatService = this.getOrAddService(this.Service.Thermostat);

        // Basic Temperature Controls
        this.configureTemperatureControls();

        // Thermostat Mode Controls
        this.configureModeControls();

        // Display Units
        this.getOrAddCharacteristic(this.thermostatService, this.Characteristic.TemperatureDisplayUnits, {
            getHandler: () => this.getTemperatureDisplayUnits(),
        });

        // Auto Mode Temperature Thresholds
        if (this.supportsAutoMode()) {
            this.configureAutoModeThresholds();
        }
    }

    // Temperature Controls Configuration
    configureTemperatureControls() {
        this.getOrAddCharacteristic(this.thermostatService, this.Characteristic.CurrentTemperature, {
            getHandler: () => this.transformTemperatureToHomeKit(this.deviceData.attributes.temperature),
            props: { minValue: -100, maxValue: 100, minStep: 0.1 },
        });

        this.getOrAddCharacteristic(this.thermostatService, this.Characteristic.TargetTemperature, {
            getHandler: () => this.transformTemperatureToHomeKit(this.getActiveSetpoint()),
            setHandler: async (value) => this.handleSetTargetTemperature(value),
            props: {
                minValue: this.tempUnit === "F" ? 50 : 10,
                maxValue: this.tempUnit === "F" ? 90 : 32,
                minStep: 0.5,
            },
        });
    }

    // Mode Controls Configuration
    configureModeControls() {
        this.getOrAddCharacteristic(this.thermostatService, this.Characteristic.CurrentHeatingCoolingState, {
            getHandler: () => this.getCurrentHeatingCoolingState(),
        });

        this.getOrAddCharacteristic(this.thermostatService, this.Characteristic.TargetHeatingCoolingState, {
            getHandler: () => this.getTargetHeatingCoolingState(),
            setHandler: async (value) => this.handleSetThermostatMode(value),
            props: { validValues: this.getSupportedThermostatModes() },
        });
    }

    // Auto Mode Configuration
    configureAutoModeThresholds() {
        const props = {
            minValue: this.tempUnit === "F" ? 50 : 10,
            maxValue: this.tempUnit === "F" ? 90 : 32,
            minStep: 0.5,
        };

        this.getOrAddCharacteristic(this.thermostatService, this.Characteristic.CoolingThresholdTemperature, {
            getHandler: () => this.transformTemperatureToHomeKit(this.deviceData.attributes.coolingSetpoint),
            setHandler: async (value) => this.sendCommand("setCoolingSetpoint", this.transformTemperatureFromHomeKit(value)),
            props,
        });

        this.getOrAddCharacteristic(this.thermostatService, this.Characteristic.HeatingThresholdTemperature, {
            getHandler: () => this.transformTemperatureToHomeKit(this.deviceData.attributes.heatingSetpoint),
            setHandler: async (value) => this.sendCommand("setHeatingSetpoint", this.transformTemperatureFromHomeKit(value)),
            props,
        });
    }
    // Fan Configuration
    async configureFanService() {
        this.fanService = this.getOrAddService(this.Service.Fanv2);

        // Fan Active State
        this.getOrAddCharacteristic(this.fanService, this.Characteristic.Active, {
            getHandler: () => this.getFanActive(),
            setHandler: async (value) => this.setFanActive(value),
        });

        // Fan State Controls
        this.getOrAddCharacteristic(this.fanService, this.Characteristic.CurrentFanState, {
            getHandler: () => this.getCurrentFanState(),
        });

        this.getOrAddCharacteristic(this.fanService, this.Characteristic.TargetFanState, {
            getHandler: () => this.getTargetFanState(),
            setHandler: async (value) => this.setTargetFanState(value),
        });
    }

    // Heating/Cooling State Handlers
    getCurrentHeatingCoolingState() {
        const state = this.deviceData.attributes.thermostatOperatingState;
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

    getTargetHeatingCoolingState() {
        const mode = this.deviceData.attributes.thermostatMode;
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

    async handleSetThermostatMode(value) {
        let mode;
        switch (value) {
            case this.Characteristic.TargetHeatingCoolingState.HEAT:
                mode = "heat";
                break;
            case this.Characteristic.TargetHeatingCoolingState.COOL:
                mode = "cool";
                break;
            case this.Characteristic.TargetHeatingCoolingState.AUTO:
                mode = "auto";
                break;
            default:
                mode = "off";
        }
        await this.sendCommand("setThermostatMode", mode);
    }

    // Fan State Handlers
    getFanActive() {
        return this.deviceData.attributes.thermostatFanMode === "on" ? this.Characteristic.Active.ACTIVE : this.Characteristic.Active.INACTIVE;
    }

    async setFanActive(value) {
        await this.sendCommand(value === this.Characteristic.Active.ACTIVE ? "fanOn" : "fanAuto");
    }

    getCurrentFanState() {
        return this.deviceData.attributes.thermostatFanMode === "on" ? this.Characteristic.CurrentFanState.BLOWING_AIR : this.Characteristic.CurrentFanState.IDLE;
    }

    getTargetFanState() {
        return this.deviceData.attributes.thermostatFanMode === "auto" ? this.Characteristic.TargetFanState.AUTO : this.Characteristic.TargetFanState.MANUAL;
    }

    async setTargetFanState(value) {
        await this.sendCommand(value === this.Characteristic.TargetFanState.AUTO ? "fanAuto" : "fanOn");
    }

    // Support Methods
    supportsFan() {
        return this.hasAttribute("thermostatFanMode") && this.hasCommand("fanOn") && this.hasCommand("fanAuto");
    }

    supportsAutoMode() {
        const modes = this.deviceData.attributes.supportedThermostatModes || [];
        return modes.includes("auto") || (this.hasAttribute("coolingSetpoint") && this.hasAttribute("heatingSetpoint"));
    }

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
                return Math.abs(currentTemp - coolingSetpoint) < Math.abs(currentTemp - heatingSetpoint) ? coolingSetpoint : heatingSetpoint;
            }
            default:
                return this.deviceData.attributes.temperature;
        }
    }

    // Attribute Update Handler
    async handleAttributeUpdate(attribute, value) {
        this.updateDeviceAttribute(attribute, value);

        switch (attribute) {
            case "temperature":
                this.thermostatService.getCharacteristic(this.Characteristic.CurrentTemperature).updateValue(this.transformTemperatureToHomeKit(value));
                break;

            case "thermostatOperatingState":
                this.thermostatService.getCharacteristic(this.Characteristic.CurrentHeatingCoolingState).updateValue(this.getCurrentHeatingCoolingState());
                break;

            case "thermostatMode":
                this.thermostatService.getCharacteristic(this.Characteristic.TargetHeatingCoolingState).updateValue(this.getTargetHeatingCoolingState());
                this.thermostatService.getCharacteristic(this.Characteristic.TargetTemperature).updateValue(this.transformTemperatureToHomeKit(this.getActiveSetpoint()));
                break;

            case "heatingSetpoint":
            case "coolingSetpoint":
                if (this.supportsAutoMode()) {
                    const characteristic = attribute === "heatingSetpoint" ? this.Characteristic.HeatingThresholdTemperature : this.Characteristic.CoolingThresholdTemperature;
                    this.thermostatService.getCharacteristic(characteristic).updateValue(this.transformTemperatureToHomeKit(value));
                }
                if (this.getActiveSetpoint() === value) {
                    this.thermostatService.getCharacteristic(this.Characteristic.TargetTemperature).updateValue(this.transformTemperatureToHomeKit(value));
                }
                break;

            case "thermostatFanMode":
                if (!this.fanService) return;
                this.fanService.getCharacteristic(this.Characteristic.Active).updateValue(this.getFanActive());
                this.fanService.getCharacteristic(this.Characteristic.CurrentFanState).updateValue(this.getCurrentFanState());
                this.fanService.getCharacteristic(this.Characteristic.TargetFanState).updateValue(this.getTargetFanState());
                break;

            case "humidity":
                if (!this.hasCapability("RelativeHumidityMeasurement")) return;
                this.thermostatService.getCharacteristic(this.Characteristic.CurrentRelativeHumidity).updateValue(parseInt(value));
                break;
        }
    }

    // Cleanup
    async cleanup() {
        this.fanService = null;
        this.thermostatService = null;
        super.cleanup();
    }
}

// device_types/Thermostat.js

import HubitatBaseAccessory from "./BaseAccessory.js";

export default class Thermostat extends HubitatBaseAccessory {
    constructor(platform, accessory) {
        super(platform, accessory);
        this.thermostatService = null;
        this.fanService = null;
    }

    static relevantAttributes = ["temperature", "thermostatOperatingState", "thermostatMode", "heatingSetpoint", "coolingSetpoint", "thermostatFanMode", "humidity"];

    // Main Service Configuration
    async configureServices() {
        try {
            this.thermostatService = this.getOrAddService(this.Service.Thermostat, this.cleanServiceDisplayName(this.deviceData.name, "Thermostat"));

            // Current Temperature
            this.getOrAddCharacteristic(this.thermostatService, this.Characteristic.CurrentTemperature, {
                getHandler: () => this.transformTemperatureToHomeKit(this.deviceData.attributes.temperature),
                props: { minValue: -100, maxValue: 100, minStep: 0.1 },
            });

            // Target Temperature
            this.getOrAddCharacteristic(this.thermostatService, this.Characteristic.TargetTemperature, {
                getHandler: () => {
                    const temp = this.transformTemperatureToHomeKit(this.getActiveSetpoint());
                    return this.validateTemperatureValue(temp);
                },
                setHandler: async (value) => this.handleSetTargetTemperature(value),
                props: this.getTemperatureProps(),
            });

            // Current Heating/Cooling State
            this.getOrAddCharacteristic(this.thermostatService, this.Characteristic.CurrentHeatingCoolingState, {
                getHandler: () => this.getCurrentHeatingCoolingState(this.deviceData.attributes.thermostatOperatingState),
            });

            // Target Heating/Cooling State
            this.getOrAddCharacteristic(this.thermostatService, this.Characteristic.TargetHeatingCoolingState, {
                getHandler: () => this.getTargetHeatingCoolingState(this.deviceData.attributes.thermostatMode),
                setHandler: async (value) => this.handleSetThermostatMode(value),
                props: { validValues: this.getSupportedThermostatModes() },
            });

            this.getOrAddCharacteristic(this.thermostatService, this.Characteristic.CurrentRelativeHumidity, {
                preReqChk: () => this.hasCapability("RelativeHumidityMeasurement") && this.hasAttribute("humidity"),
                getHandler: () => {
                    const humidity = parseInt(this.deviceData.attributes.humidity);
                    if (isNaN(humidity)) {
                        this.logManager.logWarn(`Invalid humidity value: ${this.deviceData.attributes.humidity}`);
                        return 0;
                    }
                    return humidity;
                },
            });

            // Display Units
            this.getOrAddCharacteristic(this.thermostatService, this.Characteristic.TemperatureDisplayUnits, {
                getHandler: () => this.getTemperatureDisplayUnits(),
            });

            // Auto Mode Temperature Thresholds
            if (this.supportsAutoMode()) {
                this.getOrAddCharacteristic(this.thermostatService, this.Characteristic.CoolingThresholdTemperature, {
                    getHandler: () => {
                        const temp = this.transformTemperatureToHomeKit(this.deviceData.attributes.coolingSetpoint);
                        return this.validateTemperatureValue(temp);
                    },
                    setHandler: async (value) => this.sendCommand("setCoolingSetpoint", this.transformTemperatureFromHomeKit(value)),
                    props: this.getTemperatureProps(),
                });

                this.getOrAddCharacteristic(this.thermostatService, this.Characteristic.HeatingThresholdTemperature, {
                    getHandler: () => {
                        const temp = this.transformTemperatureToHomeKit(this.deviceData.attributes.heatingSetpoint);
                        return this.validateTemperatureValue(temp);
                    },
                    setHandler: async (value) => this.sendCommand("setHeatingSetpoint", this.transformTemperatureFromHomeKit(value)),
                    props: this.getTemperatureProps(),
                });
            }

            if (this.supportsFan()) {
                this.fanService = this.getOrAddService(this.Service.Fanv2, this.cleanServiceDisplayName(this.deviceData.name, "Fan"));

                // Fan Active State
                this.getOrAddCharacteristic(this.fanService, this.Characteristic.Active, {
                    getHandler: () => this.getFanActive(this.deviceData.attributes.thermostatFanMode),
                    setHandler: async (value) => this.setFanActive(value),
                });

                // Fan State Controls
                this.getOrAddCharacteristic(this.fanService, this.Characteristic.CurrentFanState, {
                    getHandler: () => this.getCurrentFanState(this.deviceData.attributes.thermostatFanMode),
                });

                this.getOrAddCharacteristic(this.fanService, this.Characteristic.TargetFanState, {
                    getHandler: () => this.getTargetFanState(this.deviceData.attributes.thermostatFanMode),
                    setHandler: async (value) => this.setTargetFanState(value),
                });
            }

            return true;
        } catch (error) {
            this.logManager.logError(`Thermostat | ${this.deviceData.name} | Error configuring services:`, error);
            throw error;
        }
    }

    getTemperatureProps() {
        return {
            minValue: this.tempUnit === "F" ? 50 : 10, // 10°C = 50°F
            maxValue: this.tempUnit === "F" ? 90 : 32, // 32°C = 90°F
            minStep: 0.5,
        };
    }

    validateTemperatureValue(temp) {
        const props = this.getTemperatureProps();
        if (temp < props.minValue) {
            this.logManager.logWarn(`${this.deviceData.name} | Temperature value ${temp} below minimum ${props.minValue}, using minimum`);
            return props.minValue;
        }
        if (temp > props.maxValue) {
            this.logManager.logWarn(`${this.deviceData.name} | Temperature value ${temp} above maximum ${props.maxValue}, using maximum`);
            return props.maxValue;
        }
        return temp;
    }

    // Heating/Cooling State Handlers
    getCurrentHeatingCoolingState(state) {
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

    getTargetHeatingCoolingState(mode) {
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
    getFanActive(fanMode) {
        return fanMode === "on" ? this.Characteristic.Active.ACTIVE : this.Characteristic.Active.INACTIVE;
    }

    async setFanActive(value) {
        await this.sendCommand(value === this.Characteristic.Active.ACTIVE ? "fanOn" : "fanAuto");
    }

    getCurrentFanState(fanMode) {
        return fanMode === "on" ? this.Characteristic.CurrentFanState.BLOWING_AIR : this.Characteristic.CurrentFanState.IDLE;
    }

    getTargetFanState(fanMode) {
        return fanMode === "auto" ? this.Characteristic.TargetFanState.AUTO : this.Characteristic.TargetFanState.MANUAL;
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
    async handleAttributeUpdate(change) {
        const { attribute, value } = change;

        switch (attribute) {
            case "temperature":
                this.thermostatService.getCharacteristic(this.Characteristic.CurrentTemperature).updateValue(this.transformTemperatureToHomeKit(value));
                break;

            case "thermostatOperatingState":
                this.thermostatService.getCharacteristic(this.Characteristic.CurrentHeatingCoolingState).updateValue(this.getCurrentHeatingCoolingState(value));
                break;

            case "thermostatMode":
                this.thermostatService.getCharacteristic(this.Characteristic.TargetHeatingCoolingState).updateValue(this.getTargetHeatingCoolingState(value));
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
                this.fanService.getCharacteristic(this.Characteristic.Active).updateValue(this.getFanActive(value));
                this.fanService.getCharacteristic(this.Characteristic.CurrentFanState).updateValue(this.getCurrentFanState(value));
                this.fanService.getCharacteristic(this.Characteristic.TargetFanState).updateValue(this.getTargetFanState(value));
                break;

            case "humidity":
                if (!this.hasCapability("RelativeHumidityMeasurement")) return;
                this.thermostatService.getCharacteristic(this.Characteristic.CurrentRelativeHumidity).updateValue(parseInt(value));
                break;

            default:
                this.logManager.logDebug(`Thermostat | ${this.deviceData.name} | Unhandled attribute update: ${attribute} = ${value}`);
        }
    }

    // Cleanup
    async cleanup() {
        this.fanService = null;
        this.thermostatService = null;
        super.cleanup();
    }
}

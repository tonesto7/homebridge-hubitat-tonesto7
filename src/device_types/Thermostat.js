import HubitatAccessory from "../HubitatAccessory.js";

export default class Thermostat extends HubitatAccessory {
    constructor(platform, accessory) {
        super(platform, accessory);
        this.deviceData = accessory.context.deviceData;
    }

    static relevantAttributes = ["thermostatOperatingState", "thermostatMode", "temperature", "coolingSetpoint", "heatingSetpoint", "thermostatSetpoint", "humidity"];

    async initializeService() {
        this.thermostatSvc = this.getOrAddService(this.Service.Thermostat);

        this.getOrAddCharacteristic(this.thermostatSvc, this.Characteristic.CurrentHeatingCoolingState, {
            getHandler: () => {
                const operatingState = this.getCurrentOperatingState(this.deviceData.attributes.thermostatOperatingState);
                this.log.debug(`${this.accessory.displayName} | Current HeatingCoolingState: ${this.deviceData.attributes.thermostatOperatingState.replace("ing", "").toUpperCase()}`);
                return operatingState;
            },
        });

        const supportedModes = this.getSupportedThermostatModes();

        this.getOrAddCharacteristic(this.thermostatSvc, this.Characteristic.TargetHeatingCoolingState, {
            props: {
                validValues: supportedModes,
            },
            getHandler: () => {
                const targetState = this.getTargetOperatingState(this.deviceData.attributes.thermostatMode);
                this.log.debug(`${this.accessory.displayName} | Target HeatingCoolingState Retrieved: ${targetState}`);
                return targetState;
            },
            setHandler: (value) => {
                let mode;
                switch (value) {
                    case this.Characteristic.TargetHeatingCoolingState.COOL:
                        mode = "cool";
                        break;
                    case this.Characteristic.TargetHeatingCoolingState.HEAT:
                        mode = "heat";
                        break;
                    case this.Characteristic.TargetHeatingCoolingState.AUTO:
                        mode = "auto";
                        break;
                    default:
                        mode = "off";
                }
                this.log.info(`${this.accessory.displayName} | Setting thermostat mode to ${mode}`);
                this.sendCommand(null, this.deviceData, "setThermostatMode", { value1: mode });
            },
        });

        this.getOrAddCharacteristic(this.thermostatSvc, this.Characteristic.CurrentTemperature, {
            getHandler: () => {
                const temp = this.deviceData.attributes.temperature;
                const convertedTemp = this.thermostatTempConversion(temp);
                this.log.debug(`${this.accessory.displayName} | Current Temperature Retrieved: ${convertedTemp}°C (${temp}°${this.platform.getTempUnit()})`);
                return convertedTemp;
            },
        });

        this.getOrAddCharacteristic(this.thermostatSvc, this.Characteristic.TargetTemperature, {
            props: {
                minValue: 10,
                maxValue: 38,
                minStep: 0.1,
            },
            getHandler: () => {
                const targetTemp = this.thermostatTargetTemp();
                this.log.debug(`${this.accessory.displayName} | Target Temperature Retrieved: ${targetTemp}°C`);
                return targetTemp;
            },
            setHandler: (value) => {
                let { cmdName, attrName } = this.thermostatTargetTemp_set();
                let temp;
                if (this.platform.getTempUnit() === "C") {
                    temp = this.thermostatTempConversion(value, true);
                } else {
                    temp = this.thermostatTempConversion((value * 9) / 5 + 32, true);
                }
                this.log.info(`${this.accessory.displayName} | Setting thermostat setpoint to ${temp}°${this.platform.getTempUnit()} via command ${cmdName}`);
                this.sendCommand(null, this.deviceData, cmdName, { value1: temp });
                this.deviceData.attributes[attrName] = temp;
            },
        });

        this.getOrAddCharacteristic(this.thermostatSvc, this.Characteristic.CurrentRelativeHumidity, {
            preReqChk: () => this.hasCapability("RelativeHumidityMeasurement"),
            getHandler: () => {
                const humidity = Math.round(this.clamp(parseFloat(this.deviceData.attributes.humidity) || 0, 0, 100));
                this.log.debug(`${this.accessory.displayName} | Current Humidity Retrieved: ${humidity}%`);
                return humidity;
            },
        });

        this.getOrAddCharacteristic(this.thermostatSvc, this.Characteristic.TemperatureDisplayUnits, {
            getHandler: () => {
                const unit = this.platform.getTempUnit() === "F" ? this.Characteristic.TemperatureDisplayUnits.FAHRENHEIT : this.Characteristic.TemperatureDisplayUnits.CELSIUS;
                this.log.debug(`${this.accessory.displayName} | Temperature Display Units Retrieved: ${unit === this.Characteristic.TemperatureDisplayUnits.FAHRENHEIT ? "Fahrenheit" : "Celsius"}`);
                return unit;
            },
        });

        this.accessory.deviceGroups.push("thermostat");
    }

    handleAttributeUpdate(change) {
        if (!this.thermostatSvc) {
            this.log.warn(`${this.accessory.displayName} | Thermostat service not found`);
            return;
        }

        switch (change.attribute) {
            case "thermostatOperatingState":
                const currentState = this.getCurrentOperatingState(change.value);
                this.updateCharacteristicValue(this.thermostatSvc, this.Characteristic.CurrentHeatingCoolingState, currentState);
                break;

            case "thermostatMode":
                const targetState = this.getTargetOperatingState(change.value);
                this.updateCharacteristicValue(this.thermostatSvc, this.Characteristic.TargetHeatingCoolingState, targetState);
                break;

            case "temperature":
                const currentTemp = this.thermostatTempConversion(change.value);
                this.updateCharacteristicValue(this.thermostatSvc, this.Characteristic.CurrentTemperature, currentTemp);
                break;

            case "coolingSetpoint":
            case "heatingSetpoint":
            case "thermostatSetpoint":
                const targetTemp = this.thermostatTargetTemp();
                this.updateCharacteristicValue(this.thermostatSvc, this.Characteristic.TargetTemperature, targetTemp);
                break;

            case "humidity":
                if (this.hasCapability("RelativeHumidityMeasurement")) {
                    const humidity = Math.round(this.clamp(parseFloat(change.value) || 0, 0, 100));
                    this.updateCharacteristicValue(this.thermostatSvc, this.Characteristic.CurrentRelativeHumidity, humidity);
                }
                break;

            default:
                this.log.debug(`${this.accessory.displayName} | Unhandled attribute update: ${change.attribute}`);
        }
    }

    getCurrentOperatingState(state) {
        switch (state) {
            case "cooling":
                return this.Characteristic.CurrentHeatingCoolingState.COOL;
            case "heating":
                return this.Characteristic.CurrentHeatingCoolingState.HEAT;
            default:
                return this.Characteristic.CurrentHeatingCoolingState.OFF;
        }
    }

    getTargetOperatingState(mode) {
        switch (mode) {
            case "cool":
                return this.Characteristic.TargetHeatingCoolingState.COOL;
            case "heat":
                return this.Characteristic.TargetHeatingCoolingState.HEAT;
            case "auto":
                return this.Characteristic.TargetHeatingCoolingState.AUTO;
            default:
                return this.Characteristic.TargetHeatingCoolingState.OFF;
        }
    }

    thermostatTempConversion(temp, isSet = false) {
        if (isSet) {
            if (this.platform.getTempUnit() === "C") {
                return this.clamp(Math.round(temp), 10, 38);
            } else {
                return this.clamp(Math.round(temp), 50, 100);
            }
        } else {
            if (this.platform.getTempUnit() === "C") {
                return Math.round(temp * 10) / 10;
            } else {
                return Math.round(((temp - 32) / 1.8) * 10) / 10;
            }
        }
    }

    thermostatTargetTemp() {
        const mode = this.deviceData.attributes.thermostatMode;
        const currentTemp = this.deviceData.attributes.temperature;
        let targetTemp;

        switch (mode) {
            case "cool":
                targetTemp = this.deviceData.attributes.coolingSetpoint;
                break;
            case "heat":
                targetTemp = this.deviceData.attributes.heatingSetpoint;
                break;
            case "auto":
                const coolSetpoint = this.deviceData.attributes.coolingSetpoint;
                const heatSetpoint = this.deviceData.attributes.heatingSetpoint;
                targetTemp = Math.abs(coolSetpoint - currentTemp) < Math.abs(heatSetpoint - currentTemp) ? coolSetpoint : heatSetpoint;
                break;
            default:
                targetTemp = this.deviceData.attributes.thermostatSetpoint || currentTemp;
        }

        if (this.platform.getTempUnit() === "F") {
            targetTemp = ((targetTemp - 32) * 5) / 9;
        }
        targetTemp = this.clamp(targetTemp, 10, 38);

        this.log.debug(`${this.accessory.displayName} | Calculated Target Temperature: ${targetTemp}°C`);
        return Math.round(targetTemp * 10) / 10;
    }

    thermostatTargetTemp_set() {
        const mode = this.deviceData.attributes.thermostatMode;
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
                const coolSetpoint = this.deviceData.attributes.coolingSetpoint;
                const heatSetpoint = this.deviceData.attributes.heatingSetpoint;
                const currentTemp = this.deviceData.attributes.temperature;
                const useCool = Math.abs(coolSetpoint - currentTemp) < Math.abs(heatSetpoint - currentTemp);
                cmdName = useCool ? "setCoolingSetpoint" : "setHeatingSetpoint";
                attrName = useCool ? "coolingSetpoint" : "heatingSetpoint";
                break;
            default:
                cmdName = "setThermostatSetpoint";
                attrName = "thermostatSetpoint";
        }

        this.log.debug(`${this.accessory.displayName} | Command Name: ${cmdName}, Attribute Name: ${attrName}`);
        return { cmdName, attrName };
    }

    getSupportedThermostatModes() {
        let supportedModes = [];
        let modes = this.deviceData.attributes.supportedThermostatModes || ["off", "heat", "cool", "auto"];
        if (typeof modes === "string") {
            try {
                modes = JSON.parse(modes);
            } catch (e) {
                modes = modes.split(",");
            }
        }

        for (const mode of modes) {
            switch (mode) {
                case "off":
                    supportedModes.push(this.Characteristic.TargetHeatingCoolingState.OFF);
                    break;
                case "heat":
                    supportedModes.push(this.Characteristic.TargetHeatingCoolingState.HEAT);
                    break;
                case "cool":
                    supportedModes.push(this.Characteristic.TargetHeatingCoolingState.COOL);
                    break;
                case "auto":
                    supportedModes.push(this.Characteristic.TargetHeatingCoolingState.AUTO);
                    break;
            }
        }

        this.log.debug(`${this.accessory.displayName} | Supported Thermostat Modes: ${supportedModes}`);
        return supportedModes;
    }
}

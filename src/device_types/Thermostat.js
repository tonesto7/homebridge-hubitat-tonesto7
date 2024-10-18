import HubitatAccessory from "../HubitatAccessory.js";

export default class Thermostat extends HubitatAccessory {
    constructor(platform, accessory) {
        super(platform, accessory);
        this.deviceData = accessory.context.deviceData;
    }

    static relevantAttributes = ["thermostatOperatingState", "thermostatMode", "temperature", "coolingSetpoint", "heatingSetpoint", "thermostatSetpoint", "humidity"];

    /**
     * Initializes the thermostat service and its characteristics.
     *
     * This method sets up the following characteristics for the thermostat service:
     * - CurrentHeatingCoolingState: Retrieves the current operating state of the thermostat.
     * - TargetHeatingCoolingState: Retrieves and sets the target operating state of the thermostat.
     * - CurrentTemperature: Retrieves the current temperature from the thermostat.
     * - TargetTemperature: Retrieves and sets the target temperature for the thermostat.
     * - CurrentRelativeHumidity: Retrieves the current relative humidity if the device supports it.
     * - TemperatureDisplayUnits: Retrieves the temperature display units (Celsius or Fahrenheit).
     *
     * Additionally, it adds the thermostat to the accessory's device groups.
     *
     * @async
     * @returns {Promise<void>} A promise that resolves when the service is initialized.
     */
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

    /**
     * Handles updates to thermostat attributes and updates the corresponding HomeKit characteristics.
     *
     * @param {Object} change - The change object containing attribute and value.
     * @param {string} change.attribute - The name of the attribute that has changed.
     * @param {any} change.value - The new value of the attribute.
     *
     * @returns {void}
     */
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

    /**
     * Converts the thermostat's operating state to the corresponding HomeKit characteristic.
     *
     * @param {string} state - The current operating state of the thermostat.
     *                         Possible values are "cooling", "heating", or any other string for "off".
     * @returns {number} - The corresponding HomeKit characteristic for the current heating/cooling state.
     *                     Returns `this.Characteristic.CurrentHeatingCoolingState.COOL` for "cooling",
     *                     `this.Characteristic.CurrentHeatingCoolingState.HEAT` for "heating",
     *                     and `this.Characteristic.CurrentHeatingCoolingState.OFF` for any other state.
     */
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

    /**
     * Returns the target operating state based on the provided mode.
     *
     * @param {string} mode - The mode of the thermostat (e.g., "cool", "heat", "auto").
     * @returns {number} - The corresponding TargetHeatingCoolingState constant.
     */
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

    /**
     * Converts the thermostat temperature based on the temperature unit.
     *
     * @param {number} temp - The temperature value to be converted.
     * @param {boolean} [isSet=false] - Flag indicating if the temperature is being set or read.
     * @returns {number} - The converted temperature value.
     */
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

    /**
     * Calculates the target temperature for the thermostat based on its current mode and attributes.
     *
     * @returns {number} The calculated target temperature in Celsius, rounded to one decimal place.
     *
     * @property {Object} this.deviceData - The data object containing device attributes.
     * @property {string} this.deviceData.attributes.thermostatMode - The current mode of the thermostat (e.g., "cool", "heat", "auto").
     * @property {number} this.deviceData.attributes.temperature - The current temperature.
     * @property {number} this.deviceData.attributes.coolingSetpoint - The cooling setpoint temperature.
     * @property {number} this.deviceData.attributes.heatingSetpoint - The heating setpoint temperature.
     * @property {number} [this.deviceData.attributes.thermostatSetpoint] - The general thermostat setpoint temperature.
     * @property {Object} this.platform - The platform object containing utility methods.
     * @property {Function} this.platform.getTempUnit - Method to get the temperature unit ("F" or "C").
     * @property {Function} this.clamp - Method to clamp a value between a minimum and maximum range.
     * @property {Object} this.log - The logging object.
     * @property {Function} this.log.debug - Method to log debug messages.
     * @property {Object} this.accessory - The accessory object containing display information.
     * @property {string} this.accessory.displayName - The display name of the accessory.
     */
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

    /**
     * Determines the appropriate command and attribute names for setting the thermostat target temperature
     * based on the current thermostat mode and temperature attributes.
     *
     * @returns {Object} An object containing the command name (`cmdName`) and attribute name (`attrName`).
     * @property {string} cmdName - The name of the command to set the thermostat target temperature.
     * @property {string} attrName - The name of the attribute to set the thermostat target temperature.
     */
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

    /**
     * Retrieves the supported thermostat modes for the device.
     *
     * This method checks the device's supported thermostat modes from its attributes.
     * If the modes are provided as a string, it attempts to parse them as JSON or splits them by commas.
     * It then maps the modes to the corresponding HomeKit characteristic values.
     *
     * @returns {Array} An array of supported thermostat modes mapped to HomeKit characteristic values.
     */
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

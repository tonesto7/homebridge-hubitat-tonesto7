// Transforms.js

export default class Transforms {
    constructor(platform) {
        this.platform = platform;
        this.logManager = platform.logManager;
        this.configManager = platform.configManager;
        this.config = platform.config;
    }

    /**
     * Transform switch state from device to HomeKit
     * @param {string} value - Device switch attribute value
     * @returns {boolean} - HomeKit On characteristic value
     */
    transformSwitchState(value) {
        return value === "on";
    }

    /**
     * Transform brightness level from device to HomeKit (0-100)
     * @param {string|number} value - Device level attribute value
     * @returns {number} - HomeKit Brightness characteristic value
     */
    transformBrightnessFromDevice(value) {
        let level = parseInt(value);
        if (this.config.round_levels) {
            if (level < 5) return 0;
            if (level > 95) return 100;
        }
        return Math.max(0, Math.min(100, level));
    }

    /**
     * Transform brightness level from HomeKit to device
     * @param {number} value - HomeKit Brightness characteristic value
     * @returns {number} - Device level attribute value
     */
    transformBrightnessToDevice(value) {
        return Math.max(0, Math.min(100, parseInt(value)));
    }

    /**
     * Transform hue value from device (0-100) to HomeKit (0-360)
     * @param {string|number} value - Device hue attribute value
     * @returns {number} - HomeKit Hue characteristic value
     */
    transformHueFromDevice(value) {
        return Math.max(0, Math.min(360, Math.round(value * 3.6)));
    }

    /**
     * Transform hue value from HomeKit to device (0-360)
     * @param {number} value - HomeKit Hue characteristic value
     * @returns {number} - Device hue attribute value
     */
    transformHueToDevice(value) {
        return Math.round(value / 3.6);
    }

    /**
     * Transform color temperature from device (Kelvin) to HomeKit (mired)
     * @param {string|number} kelvin - Device colorTemperature attribute value
     * @returns {number} - HomeKit ColorTemperature characteristic value
     */
    kelvinToMired(kelvin) {
        return Math.max(140, Math.min(500, Math.round(1000000 / kelvin)));
    }

    /**
     * Transform color temperature from HomeKit (mired) to device (Kelvin)
     * @param {number} mired - HomeKit ColorTemperature characteristic value
     * @returns {number} - Device colorTemperature attribute value
     */
    miredToKelvin(mired) {
        return Math.round(1000000 / mired);
    }

    /**
     * Transform motion attribute from device to HomeKit
     * @param {string} value - Device motion attribute value
     * @returns {boolean} - HomeKit MotionDetected characteristic value
     */
    transformMotionDetected(value) {
        return value === "active";
    }

    /**
     * Transform status attribute from device to HomeKit StatusActive characteristic
     * @param {string} value - Device status attribute value
     * @returns {boolean} - HomeKit StatusActive characteristic value
     */
    transformStatusActive(value) {
        return value === "ACTIVE";
    }

    /**
     * Transform tamper attribute from device to HomeKit StatusTampered characteristic
     * @param {string} value - Device tamper attribute value
     * @returns {number} - HomeKit StatusTampered characteristic value
     */
    transformStatusTampered(value) {
        return value === "detected" ? this.platform.Characteristic.StatusTampered.TAMPERED : this.platform.Characteristic.StatusTampered.NOT_TAMPERED;
    }

    /**
     * Transform temperature from device to HomeKit (Celsius)
     * @param {string|number} value - Device temperature attribute value
     * @returns {number} - HomeKit CurrentTemperature characteristic value
     */
    transformTemperatureFromDevice(value) {
        const tempUnit = this.configManager.getTempUnit();
        let temp = parseFloat(value);
        if (tempUnit === "F") {
            temp = (temp - 32) / 1.8;
        }
        return parseFloat(temp.toFixed(1));
    }

    /**
     * Transform temperature from HomeKit (Celsius) to device
     * @param {number} value - HomeKit CurrentTemperature characteristic value
     * @returns {number} - Device temperature attribute value
     */
    transformTemperatureToDevice(value) {
        const tempUnit = this.configManager.getTempUnit();
        let temp = parseFloat(value);
        if (tempUnit === "F") {
            temp = temp * 1.8 + 32;
        }
        return parseFloat(temp.toFixed(1));
    }

    /**
     * Transform humidity from device to HomeKit
     * @param {string|number} value - Device humidity attribute value
     * @returns {number} - HomeKit CurrentRelativeHumidity characteristic value
     */
    transformHumidityFromDevice(value) {
        return Math.max(0, Math.min(100, parseInt(value)));
    }

    /**
     * Transform contact sensor state from device to HomeKit
     * @param {string} value - Device contact attribute value
     * @returns {number} - HomeKit ContactSensorState characteristic value
     */
    transformContactSensorState(value) {
        return value === "closed" ? this.platform.Characteristic.ContactSensorState.CONTACT_DETECTED : this.platform.Characteristic.ContactSensorState.CONTACT_NOT_DETECTED;
    }

    /**
     * Transform leak sensor state from device to HomeKit
     * @param {string} value - Device water attribute value
     * @returns {number} - HomeKit LeakDetected characteristic value
     */
    transformLeakDetected(value) {
        return value === "wet" ? this.platform.Characteristic.LeakDetected.LEAK_DETECTED : this.platform.Characteristic.LeakDetected.LEAK_NOT_DETECTED;
    }

    /**
     * Transform battery level from device to HomeKit
     * @param {string|number} value - Device battery attribute value
     * @returns {number} - HomeKit BatteryLevel characteristic value
     */
    transformBatteryLevel(value) {
        return Math.max(0, Math.min(100, parseInt(value)));
    }

    /**
     * Transform low battery status from device to HomeKit
     * @param {string|number} value - Device battery attribute value
     * @returns {number} - HomeKit StatusLowBattery characteristic value
     */
    transformStatusLowBattery(value) {
        const batteryLevel = parseInt(value);
        return batteryLevel <= 20 ? this.platform.Characteristic.StatusLowBattery.BATTERY_LEVEL_LOW : this.platform.Characteristic.StatusLowBattery.BATTERY_LEVEL_NORMAL;
    }

    /**
     * Transform occupancy state from device to HomeKit
     * @param {string} value - Device presence attribute value
     * @returns {number} - HomeKit OccupancyDetected characteristic value
     */
    transformOccupancyDetected(value) {
        return value === "present" ? this.platform.Characteristic.OccupancyDetected.OCCUPANCY_DETECTED : this.platform.Characteristic.OccupancyDetected.OCCUPANCY_NOT_DETECTED;
    }

    /**
     * Transform smoke detected state from device to HomeKit
     * @param {string} value - Device smoke attribute value
     * @returns {number} - HomeKit SmokeDetected characteristic value
     */
    transformSmokeDetected(value) {
        return value === "detected" ? this.platform.Characteristic.SmokeDetected.SMOKE_DETECTED : this.platform.Characteristic.SmokeDetected.SMOKE_NOT_DETECTED;
    }

    /**
     * Transform carbon monoxide detected state from device to HomeKit
     * @param {string} value - Device carbonMonoxide attribute value
     * @returns {number} - HomeKit CarbonMonoxideDetected characteristic value
     */
    transformCarbonMonoxideDetected(value) {
        return value === "detected" ? this.platform.Characteristic.CarbonMonoxideDetected.CO_LEVELS_ABNORMAL : this.platform.Characteristic.CarbonMonoxideDetected.CO_LEVELS_NORMAL;
    }

    /**
     * Transform air quality index from device to HomeKit
     * @param {string|number} value - Device airQualityIndex attribute value
     * @returns {number} - HomeKit AirQuality characteristic value
     */
    transformAirQuality(value) {
        const index = parseInt(value);
        if (index <= 50) {
            return this.platform.Characteristic.AirQuality.EXCELLENT;
        } else if (index <= 100) {
            return this.platform.Characteristic.AirQuality.GOOD;
        } else if (index <= 150) {
            return this.platform.Characteristic.AirQuality.FAIR;
        } else if (index <= 200) {
            return this.platform.Characteristic.AirQuality.INFERIOR;
        } else {
            return this.platform.Characteristic.AirQuality.POOR;
        }
    }

    /**
     * Transform illumination from device to HomeKit
     * @param {string|number} value - Device illuminance attribute value
     * @returns {number} - HomeKit CurrentAmbientLightLevel characteristic value
     */
    transformIlluminance(value) {
        // HomeKit requires value between 0.0001 and 100000 lux
        let lux = parseFloat(value);
        lux = Math.max(0.0001, Math.min(100000, lux));
        return lux;
    }

    /**
     * Transform lock state from device to HomeKit
     * @param {string} value - Device lock attribute value
     * @returns {number} - HomeKit LockCurrentState characteristic value
     */
    transformLockCurrentState(value) {
        switch (value) {
            case "locked":
                return this.platform.Characteristic.LockCurrentState.SECURED;
            case "unlocked":
                return this.platform.Characteristic.LockCurrentState.UNSECURED;
            case "jammed":
                return this.platform.Characteristic.LockCurrentState.JAMMED;
            default:
                return this.platform.Characteristic.LockCurrentState.UNKNOWN;
        }
    }

    /**
     * Transform target lock state from HomeKit to device
     * @param {number} value - HomeKit LockTargetState characteristic value
     * @returns {string} - Device lock command
     */
    transformLockTargetStateToDevice(value) {
        return value === this.platform.Characteristic.LockTargetState.SECURED ? "lock" : "unlock";
    }

    /**
     * Transform valve state from device to HomeKit
     * @param {string} value - Device valve attribute value
     * @returns {number} - HomeKit InUse characteristic value
     */
    transformValveInUse(value) {
        return value === "open" ? this.platform.Characteristic.InUse.IN_USE : this.platform.Characteristic.InUse.NOT_IN_USE;
    }

    /**
     * Transform thermostat mode from device to HomeKit
     * @param {string} value - Device thermostatMode attribute value
     * @returns {number} - HomeKit TargetHeatingCoolingState characteristic value
     */
    transformThermostatMode(value) {
        switch (value.toLowerCase()) {
            case "off":
                return this.platform.Characteristic.TargetHeatingCoolingState.OFF;
            case "heat":
                return this.platform.Characteristic.TargetHeatingCoolingState.HEAT;
            case "cool":
                return this.platform.Characteristic.TargetHeatingCoolingState.COOL;
            case "auto":
                return this.platform.Characteristic.TargetHeatingCoolingState.AUTO;
            default:
                return this.platform.Characteristic.TargetHeatingCoolingState.OFF;
        }
    }

    /**
     * Transform thermostat target mode from HomeKit to device
     * @param {number} value - HomeKit TargetHeatingCoolingState characteristic value
     * @returns {string} - Device thermostatMode command value
     */
    transformThermostatModeToDevice(value) {
        switch (value) {
            case this.platform.Characteristic.TargetHeatingCoolingState.OFF:
                return "off";
            case this.platform.Characteristic.TargetHeatingCoolingState.HEAT:
                return "heat";
            case this.platform.Characteristic.TargetHeatingCoolingState.COOL:
                return "cool";
            case this.platform.Characteristic.TargetHeatingCoolingState.AUTO:
                return "auto";
            default:
                return "off";
        }
    }

    /**
     * Transform thermostat operating state from device to HomeKit
     * @param {string} value - Device thermostatOperatingState attribute value
     * @returns {number} - HomeKit CurrentHeatingCoolingState characteristic value
     */
    transformThermostatOperatingState(value) {
        switch (value.toLowerCase()) {
            case "heating":
                return this.platform.Characteristic.CurrentHeatingCoolingState.HEAT;
            case "cooling":
                return this.platform.Characteristic.CurrentHeatingCoolingState.COOL;
            case "idle":
            case "off":
                return this.platform.Characteristic.CurrentHeatingCoolingState.OFF;
            default:
                return this.platform.Characteristic.CurrentHeatingCoolingState.OFF;
        }
    }

    /**
     * Transform thermostat target temperature from device to HomeKit
     * @param {string|number} value - Device thermostatSetpoint attribute value
     * @returns {number} - HomeKit TargetTemperature characteristic value
     */
    transformThermostatTargetTemperature(value) {
        return this.transformTemperatureFromDevice(value);
    }

    /**
     * Transform thermostat target temperature from HomeKit to device
     * @param {number} value - HomeKit TargetTemperature characteristic value
     * @returns {number} - Device thermostatSetpoint attribute value
     */
    transformThermostatTargetTemperatureToDevice(value) {
        return this.transformTemperatureToDevice(value);
    }

    /**
     * Transform fan speed from device to HomeKit (0-100)
     * @param {string|number} value - Device level attribute value
     * @returns {number} - HomeKit RotationSpeed characteristic value
     */
    transformFanSpeedFromDevice(value) {
        return this.transformBrightnessFromDevice(value);
    }

    /**
     * Transform fan speed from HomeKit to device
     * @param {number} value - HomeKit RotationSpeed characteristic value
     * @returns {number} - Device level attribute value
     */
    transformFanSpeedToDevice(value) {
        return this.transformBrightnessToDevice(value);
    }

    /**
     * Transform fan state from device to HomeKit
     * @param {string} value - Device switch attribute value
     * @returns {number} - HomeKit Active characteristic value
     */
    transformFanActiveState(value) {
        return value === "on" ? this.platform.Characteristic.Active.ACTIVE : this.platform.Characteristic.Active.INACTIVE;
    }

    /**
     * Transform window covering position from device to HomeKit (0-100)
     * @param {string|number} value - Device position attribute value
     * @returns {number} - HomeKit CurrentPosition characteristic value
     */
    transformWindowCoveringPosition(value) {
        return Math.max(0, Math.min(100, parseInt(value)));
    }

    /**
     * Transform window covering state from device to HomeKit
     * @param {string} value - Device windowShade attribute value
     * @returns {number} - HomeKit PositionState characteristic value
     */
    transformWindowCoveringState(value) {
        switch (value.toLowerCase()) {
            case "opening":
                return this.platform.Characteristic.PositionState.INCREASING;
            case "closing":
                return this.platform.Characteristic.PositionState.DECREASING;
            case "partially open":
            case "open":
            case "closed":
                return this.platform.Characteristic.PositionState.STOPPED;
            default:
                return this.platform.Characteristic.PositionState.STOPPED;
        }
    }

    /**
     * Transform battery charging state from device to HomeKit
     * @param {string} value - Device powerSource attribute value
     * @returns {number} - HomeKit ChargingState characteristic value
     */
    transformChargingState(value) {
        return value === "dc" ? this.platform.Characteristic.ChargingState.CHARGING : this.platform.Characteristic.ChargingState.NOT_CHARGING;
    }

    /**
     * Transform PM2.5 density from device to HomeKit
     * @param {string|number} value - Device pm25 attribute value
     * @returns {number} - HomeKit PM2_5Density characteristic value
     */
    transformPM25Density(value) {
        return parseFloat(value);
    }

    /**
     * Transform Carbon Dioxide Level from device to HomeKit
     * @param {string|number} value - Device carbonDioxide attribute value
     * @returns {number} - HomeKit CarbonDioxideLevel characteristic value
     */
    transformCarbonDioxideLevel(value) {
        return parseFloat(value);
    }

    // Add additional transformation methods as needed...
}

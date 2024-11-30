// Transforms.js

export default class Transforms {
    constructor(platform) {
        // this.platform = platform;
        this.logManager = platform.logManager;
        this.config = platform.configManager.getConfig();
        this.Characteristic = platform.Characteristic;
        this.CommunityTypes = platform.CommunityTypes;
        this.tempUnit = platform.configManager.getTempUnit();

        // Subscribe to configuration updates
        platform.configManager.onConfigUpdate(this.handleConfigUpdate.bind(this));

        // Define characteristic ranges for clamping values
        this.CHARACTERISTIC_RANGES = {
            battery: { min: 0, max: 100 },
            level: { min: 0, max: 100 },
            volume: { min: 0, max: 100 },
            colorTemperature: { min: 140, max: 500 },
            temperature: { min: -100, max: 200 },
            heatingSetpoint: { min: 10, max: 38 },
            coolingSetpoint: { min: 10, max: 38 },
            thermostatSetpoint: { min: 10, max: 38 },
            humidity: { min: 0, max: 100 },
            carbonDioxideMeasurement: { min: 0, max: 100000 },
            airQualityIndex: { min: 0, max: 5 },
            speed: { min: 0, max: 100 },
            hue: { min: 0, max: 360 },
            saturation: { min: 0, max: 100 },
            pm25: { min: 0, max: 1000 },
            illuminance: { min: 0, max: 100000 },
        };
    }

    handleConfigUpdate(newConfig) {
        this.config = newConfig;
    }

    /**
     * Clamps a value between min and max
     * @param {number} value - The value to clamp
     * @param {number} min - Minimum allowed value
     * @param {number} max - Maximum allowed value
     * @returns {number} - Clamped value
     */
    clampValue(value, min, max) {
        return Math.max(min, Math.min(max, value));
    }

    /**
     * Transforms a device status value
     * @param {string} status - The device status value
     * @returns {boolean} - True if device is active/online, false otherwise
     */
    transformStatus(status) {
        return status !== "OFFLINE" && status !== "INACTIVE";
    }

    /**
     * Transforms a Hubitat attribute value to a HomeKit characteristic value
     * @param {string} attr - The attribute name
     * @param {any} val - The attribute value
     * @param {string} charName - The characteristic display name
     * @param {object} [opts={}] - Additional options
     * @returns {any} - The transformed value
     */
    transformAttributeState(attr, val, charName, opts = {}) {
        const { Characteristic } = this;
        const clampNumericValue = (value, attribute) => {
            const range = this.CHARACTERISTIC_RANGES[attribute];
            return range ? this.clampValue(parseFloat(value), range.min, range.max) : value;
        };

        // Define mappings for attributes to characteristic values
        const attributeMappings = {
            switch: () => val === "on",

            contact: () => (val === "closed" ? Characteristic.ContactSensorState.CONTACT_DETECTED : Characteristic.ContactSensorState.CONTACT_NOT_DETECTED),

            motion: () => val === "active",

            battery: () => {
                if (charName === "Status Low Battery") {
                    return val < 20 ? Characteristic.StatusLowBattery.BATTERY_LEVEL_LOW : Characteristic.StatusLowBattery.BATTERY_LEVEL_NORMAL;
                } else {
                    return clampNumericValue(val, attr);
                }
            },

            temperature: () => clampNumericValue(this.convertTemperature(val), attr),

            filterStatus: () => {
                if (charName === "Filter Change Indication") {
                    return val === "replace" ? Characteristic.FilterChangeIndication.CHANGE_FILTER : Characteristic.FilterChangeIndication.FILTER_OK;
                } else if (charName === "Filter Life Level") {
                    return val === "replace" ? 0 : 100;
                } else {
                    return val;
                }
            },

            humidity: () => clampNumericValue(parseFloat(val), attr),

            illuminance: () => clampNumericValue(parseFloat(val), attr),

            acceleration: () => val === "active",

            water: () => (val === "dry" ? Characteristic.LeakDetected.LEAK_NOT_DETECTED : Characteristic.LeakDetected.LEAK_DETECTED),

            presence: () => val === "present",

            smoke: () => (val === "clear" ? Characteristic.SmokeDetected.SMOKE_NOT_DETECTED : Characteristic.SmokeDetected.SMOKE_DETECTED),

            carbonMonoxide: () => (val === "clear" ? Characteristic.CarbonMonoxideDetected.CO_LEVELS_NORMAL : Characteristic.CarbonMonoxideDetected.CO_LEVELS_ABNORMAL),

            tamper: () => (val === "detected" ? Characteristic.StatusTampered.TAMPERED : Characteristic.StatusTampered.NOT_TAMPERED),

            mute: () => val === "muted",

            valve: () => (val === "open" ? Characteristic.InUse.IN_USE : Characteristic.InUse.NOT_IN_USE),

            powerSource: () => {
                switch (val) {
                    case "mains":
                    case "dc":
                    case "USB Cable":
                        return Characteristic.ChargingState.CHARGING;
                    case "battery":
                        return Characteristic.ChargingState.NOT_CHARGING;
                    default:
                        return Characteristic.ChargingState.NOT_CHARGEABLE;
                }
            },

            lock: () => {
                switch (val) {
                    case "locked":
                        return Characteristic.LockCurrentState.SECURED;
                    case "unlocked":
                        return Characteristic.LockCurrentState.UNSECURED;
                    default:
                        return Characteristic.LockCurrentState.UNKNOWN;
                }
            },

            door: () => {
                const stateMappings = {
                    open: Characteristic.CurrentDoorState.OPEN,
                    opening: Characteristic.CurrentDoorState.OPENING,
                    closed: Characteristic.CurrentDoorState.CLOSED,
                    closing: Characteristic.CurrentDoorState.CLOSING,
                    unknown: Characteristic.CurrentDoorState.STOPPED,
                };
                return stateMappings[val] || Characteristic.CurrentDoorState.STOPPED;
            },

            thermostatOperatingState: () => {
                const stateMappings = {
                    heating: Characteristic.CurrentHeatingCoolingState.HEAT,
                    cooling: Characteristic.CurrentHeatingCoolingState.COOL,
                    idle: Characteristic.CurrentHeatingCoolingState.OFF,
                };
                return stateMappings[val] || Characteristic.CurrentHeatingCoolingState.OFF;
            },

            thermostatMode: () => {
                const modeMappings = {
                    off: Characteristic.TargetHeatingCoolingState.OFF,
                    heat: Characteristic.TargetHeatingCoolingState.HEAT,
                    cool: Characteristic.TargetHeatingCoolingState.COOL,
                    auto: Characteristic.TargetHeatingCoolingState.AUTO,
                };
                return modeMappings[val] || Characteristic.TargetHeatingCoolingState.OFF;
            },

            thermostatFanMode: () => (val !== "auto" ? Characteristic.Active.ACTIVE : Characteristic.Active.INACTIVE),

            fanState: () => (val === "off" || val === "auto" ? Characteristic.CurrentFanState.IDLE : Characteristic.CurrentFanState.BLOWING_AIR),

            fanMode: () => {
                const modeMappings = {
                    low: this.CommunityTypes.FanOscillationMode.LOW,
                    medium: this.CommunityTypes.FanOscillationMode.MEDIUM,
                    high: this.CommunityTypes.FanOscillationMode.HIGH,
                    sleep: this.CommunityTypes.FanOscillationMode.SLEEP,
                };
                return modeMappings[val] || this.CommunityTypes.FanOscillationMode.SLEEP;
            },

            hue: () => clampNumericValue(parseInt(val), attr),

            saturation: () => clampNumericValue(parseInt(val), attr),

            colorTemperature: () => clampNumericValue(this.convertColorTemperature(val), attr),

            level: () => clampNumericValue(parseInt(val), attr),

            speed: () => clampNumericValue(this.fanSpeedToLevel(val), attr),

            airQualityIndex: () => clampNumericValue(this.aqiToHomeKit(val), attr),

            pm25: () => clampNumericValue(parseFloat(val), attr),

            carbonDioxideMeasurement: () => {
                if (charName === "Carbon Dioxide Detected") {
                    return val < 2000 ? Characteristic.CarbonDioxideDetected.CO2_LEVELS_NORMAL : Characteristic.CarbonDioxideDetected.CO2_LEVELS_ABNORMAL;
                }
                return clampNumericValue(parseFloat(val), attr);
            },

            alarmSystemStatus: () => this.convertAlarmState(val),
        };

        // If we have a mapping for the attribute, use it
        if (attributeMappings[attr]) {
            return attributeMappings[attr]();
        }

        // If no specific mapping, return the value as-is
        return val;
    }

    /**
     * Transforms a HomeKit characteristic value to a Hubitat command value
     * @param {string} attr - The attribute name
     * @param {any} val - The characteristic value
     * @returns {any} - The transformed command value
     */
    transformCommandValue(attr, val) {
        const { Characteristic } = this;
        const commandValueMappings = {
            switch: () => (val ? "on" : "off"),

            lock: () => (val === Characteristic.LockTargetState.SECURED ? "lock" : "unlock"),

            door: () => (val === Characteristic.TargetDoorState.OPEN ? "open" : "close"),

            mute: () => (val ? "mute" : "unmute"),

            valve: () => (val === Characteristic.InUse.IN_USE ? "open" : "close"),

            thermostatMode: () => {
                const modeMappings = {
                    [Characteristic.TargetHeatingCoolingState.OFF]: "off",
                    [Characteristic.TargetHeatingCoolingState.HEAT]: "heat",
                    [Characteristic.TargetHeatingCoolingState.COOL]: "cool",
                    [Characteristic.TargetHeatingCoolingState.AUTO]: "auto",
                };
                return modeMappings[val];
            },

            thermostatFanMode: () => (val ? "fanOn" : "fanAuto"),

            fanMode: () => {
                const modeMappings = {
                    [this.CommunityTypes.FanOscillationMode.LOW]: "low",
                    [this.CommunityTypes.FanOscillationMode.MEDIUM]: "medium",
                    [this.CommunityTypes.FanOscillationMode.HIGH]: "high",
                    [this.CommunityTypes.FanOscillationMode.SLEEP]: "sleep",
                };
                return modeMappings[val];
            },

            hue: () => parseInt(val),

            saturation: () => parseInt(val),

            colorTemperature: () => this.convertColorTemperature(val, true),

            level: () => parseInt(val),

            speed: () => this.fanLevelToSpeed(val),

            alarmSystemStatus: () => this.convertAlarmCommand(val),
        };

        if (commandValueMappings[attr]) {
            return commandValueMappings[attr]();
        }

        return val;
    }

    /**
     * Converts temperature between Celsius and Fahrenheit
     * @param {number} temp - The temperature value to convert
     * @param {boolean} [toHubitat=false] - Whether to convert to Hubitat's unit
     * @returns {number} - The converted temperature
     */
    convertTemperature(temp, toHubitat = false) {
        if (this.tempUnit === "F") {
            return toHubitat ? temp * 1.8 + 32 : (temp - 32) / 1.8;
        }
        return temp;
    }

    /**
     * Converts color temperature between Mired and Kelvin
     * @param {number} value - The color temperature value
     * @param {boolean} [toHubitat=false] - Whether to convert to Hubitat's unit
     * @returns {number} - The converted color temperature
     */
    convertColorTemperature(value, toHubitat = false) {
        return toHubitat ? Math.round(1000000 / value) : Math.round(1000000 / value);
    }

    /**
     * Converts fan speed value from Hubitat to HomeKit level
     * @param {string} speedVal - The Hubitat fan speed value
     * @returns {number} - The HomeKit level value
     */
    fanSpeedToLevel(speedVal) {
        const speedMappings = {
            off: 0,
            low: 25,
            medium: 50,
            high: 100,
        };
        return speedMappings[speedVal] !== undefined ? speedMappings[speedVal] : 0;
    }

    /**
     * Converts HomeKit level to Hubitat fan speed value
     * @param {number} level - The HomeKit level value
     * @returns {string} - The Hubitat fan speed value
     */
    fanLevelToSpeed(level) {
        if (level === 0) return "off";
        if (level > 0 && level <= 33) return "low";
        if (level > 33 && level <= 66) return "medium";
        if (level > 66) return "high";
        return "off";
    }

    /**
     * Converts Air Quality Index to HomeKit AirQuality characteristic value
     * @param {number} aqi - The Air Quality Index
     * @returns {number} - The HomeKit AirQuality value
     */
    aqiToHomeKit(aqi) {
        if (aqi <= 50) {
            return this.Characteristic.AirQuality.EXCELLENT;
        } else if (aqi <= 100) {
            return this.Characteristic.AirQuality.GOOD;
        } else if (aqi <= 150) {
            return this.Characteristic.AirQuality.FAIR;
        } else if (aqi <= 200) {
            return this.Characteristic.AirQuality.INFERIOR;
        } else {
            return this.Characteristic.AirQuality.POOR;
        }
    }

    /**
     * Converts alarm system states between Hubitat and HomeKit
     * @param {string} value - The Hubitat alarm system state
     * @returns {number} - The HomeKit security system state
     */
    convertAlarmState(value) {
        const { SecuritySystemCurrentState } = this.Characteristic;
        const alarmStateMappings = {
            disarmed: SecuritySystemCurrentState.DISARMED,
            armedHome: SecuritySystemCurrentState.STAY_ARM,
            armedAway: SecuritySystemCurrentState.AWAY_ARM,
            armedNight: SecuritySystemCurrentState.NIGHT_ARM,
            intrusion: SecuritySystemCurrentState.ALARM_TRIGGERED,
            "intrusion-home": SecuritySystemCurrentState.ALARM_TRIGGERED,
            "intrusion-away": SecuritySystemCurrentState.ALARM_TRIGGERED,
            "intrusion-night": SecuritySystemCurrentState.ALARM_TRIGGERED,
        };

        return alarmStateMappings[value] !== undefined ? alarmStateMappings[value] : SecuritySystemCurrentState.DISARMED;
    }

    /**
     * Converts HomeKit security system target state to Hubitat command
     * @param {number} value - The HomeKit security system target state
     * @returns {string} - The Hubitat command for the alarm system
     */
    convertAlarmCommand(value) {
        const { SecuritySystemTargetState } = this.Characteristic;
        const alarmCommandMappings = {
            [SecuritySystemTargetState.DISARM]: "disarm",
            [SecuritySystemTargetState.STAY_ARM]: "armHome",
            [SecuritySystemTargetState.AWAY_ARM]: "armAway",
            [SecuritySystemTargetState.NIGHT_ARM]: "armNight",
        };

        return alarmCommandMappings[value] || "disarm";
    }

    getSupportedButtonValues(accessory) {
        const values = new Set();
        const ProgrammableSwitchEvent = this.Characteristic.ProgrammableSwitchEvent;

        if (accessory.context.deviceData.capabilities.PushableButton) {
            values.add(ProgrammableSwitchEvent.SINGLE_PRESS);
        }
        if (accessory.context.deviceData.capabilities.DoubleTapableButton) {
            values.add(ProgrammableSwitchEvent.DOUBLE_PRESS);
        }
        if (accessory.context.deviceData.capabilities.HoldableButton) {
            values.add(ProgrammableSwitchEvent.LONG_PRESS);
        }

        // Default if no specific capabilities
        if (values.size === 0) {
            values.add(ProgrammableSwitchEvent.SINGLE_PRESS);
            values.add(ProgrammableSwitchEvent.LONG_PRESS);
        }

        return Array.from(values);
    }
}

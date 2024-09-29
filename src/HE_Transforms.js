// HE_Transforms.js

var Characteristic;
var CommunityTypes;

module.exports = class Transforms {
    constructor(platform, char) {
        this.accessories = platform;
        this.logInfo = platform.logInfo;
        this.logAlert = platform.logAlert;
        this.logGreen = platform.logGreen;
        this.logNotice = platform.logNotice;
        this.logDebug = platform.logDebug;
        this.logError = platform.logError;
        this.logWarn = platform.logWarn;
        this.platform = platform.mainPlatform;
        this.client = platform.client;
        Characteristic = char;
        CommunityTypes = platform.CommunityTypes;
        this.log = platform.log;
        this.configItems = platform.configItems;

        this.CHARACTERISTIC_RANGES = {
            battery: { min: 0, max: 100 },
            level: { min: 0, max: 100 },
            volume: { min: 0, max: 100 },
            colorTemperature: { min: 140, max: 500 },
            temperature: { min: 0, max: 100 },
            heatingSetpoint: { min: 10, max: 38 },
            coolingSetpoint: { min: 10, max: 38 },
            thermostatSetpoint: { min: 10, max: 38 },
            humidity: { min: 0, max: 100 },
            carbonDioxideMeasurement: { min: 0, max: 100000 },
            airQualityIndex: { min: 0, max: 5 },
            speed: { min: 0, max: 100 },
            hue: { min: 1, max: 360 },
            saturation: { min: 0, max: 100 },
        };
    }

    clampValue(value, min, max) {
        return Math.max(min, Math.min(max, value));
    }

    transformStatus(val) {
        val = val.toLowerCase() || undefined;
        switch (val) {
            case "online":
            case "active":
                return true;
            default:
                return false;
        }
    }

    getSupportedButtonVals(_acc) {
        var validValues = [];
        if (_acc && _acc.getCapabilities().length) {
            if (_acc.hasCapability("PushableButton")) {
                validValues.push(Characteristic.ProgrammableSwitchEvent.SINGLE_PRESS);
            }
            if (_acc.hasCapability("DoubleTapableButton")) {
                validValues.push(Characteristic.ProgrammableSwitchEvent.DOUBLE_PRESS);
            }
            if (_acc.hasCapability("HoldableButton")) {
                validValues.push(Characteristic.ProgrammableSwitchEvent.LONG_PRESS);
            }
            if (validValues.length < 1) {
                validValues.push(Characteristic.ProgrammableSwitchEvent.SINGLE_PRESS);
                validValues.push(Characteristic.ProgrammableSwitchEvent.LONG_PRESS);
            }
        } else {
            validValues.push(Characteristic.ProgrammableSwitchEvent.SINGLE_PRESS);
            validValues.push(Characteristic.ProgrammableSwitchEvent.LONG_PRESS);
        }
        return validValues;
    }

    aqiToPm25(aqi) {
        // this.log("Transforming %s.", aqi.toString())
        if (aqi === undefined || aqi > 500 || aqi < 0) {
            return 0; // Error or unknown response
        } else if (aqi <= 50) {
            return 1; // Return EXCELLENT
        } else if (aqi <= 100) {
            return 2; // Return GOOD
        } else if (aqi <= 150) {
            return 3; // Return FAIR
        } else if (aqi <= 200) {
            return 4; // Return INFERIOR
        } else if (aqi > 200) {
            return 5; // Return POOR (Homekit only goes to cat 5, so combined the last two AQI cats of Very Unhealty and Hazardous.
        }
    }

    transformAttributeState(attr, val, charName, opts) {
        const clampNumericValue = (value, attribute) => {
            const range = this.CHARACTERISTIC_RANGES[attribute];
            return range ? this.clampValue(parseFloat(value), range.min, range.max) : value;
        };

        switch (attr) {
            case "airQualityIndex":
                return clampNumericValue(this.aqiToPm25(val), attr);
            case "switch":
                return val === "on";
            case "door":
                switch (val) {
                    case "open":
                        return Characteristic.TargetDoorState.OPEN;
                    case "opening":
                        return charName && charName === "Target Door State" ? Characteristic.TargetDoorState.OPEN : Characteristic.CurrentDoorState.OPENING;
                    case "closed":
                        return Characteristic.TargetDoorState.CLOSED;
                    case "closing":
                        return charName && charName === "Target Door State" ? Characteristic.TargetDoorState.CLOSED : Characteristic.CurrentDoorState.CLOSING;
                    default:
                        return charName && charName === "Target Door State" ? Characteristic.TargetDoorState.OPEN : Characteristic.CurrentDoorState.STOPPED;
                }
            case "fanMode":
                switch (val) {
                    case "low":
                        return CommunityTypes.FanOscilationMode.LOW;
                    case "medium":
                        return CommunityTypes.FanOscilationMode.MEDIUM;
                    case "high":
                        return CommunityTypes.FanOscilationMode.HIGH;
                    default:
                        return CommunityTypes.FanOscilationMode.SLEEP;
                }
            case "lock":
                switch (val) {
                    case "locked":
                        return Characteristic.LockCurrentState.SECURED;
                    case "unlocked":
                        return Characteristic.LockCurrentState.UNSECURED;
                    default:
                        return Characteristic.LockCurrentState.UNKNOWN;
                }
            case "button":
                switch (val) {
                    case "pushed":
                        return Characteristic.ProgrammableSwitchEvent.SINGLE_PRESS;
                    case "held":
                        return Characteristic.ProgrammableSwitchEvent.LONG_PRESS;
                    case "doubleTapped":
                        return Characteristic.ProgrammableSwitchEvent.DOUBLE_PRESS;
                    default:
                        return null;
                }
            case "pushed":
                return Characteristic.ProgrammableSwitchEvent.SINGLE_PRESS;
            case "held":
                return Characteristic.ProgrammableSwitchEvent.LONG_PRESS;
            case "doubleTapped":
                return Characteristic.ProgrammableSwitchEvent.DOUBLE_PRESS;
            case "fanState":
                return val === "off" || val === "auto" ? Characteristic.CurrentFanState.IDLE : Characteristic.CurrentFanState.BLOWING_AIR;
            case "fanTargetState":
                return val === "auto" ? Characteristic.TargetFanState.AUTO : Characteristic.TargetFanState.MANUAL;
            case "valve":
                return val === "open" ? Characteristic.InUse.IN_USE : Characteristic.InUse.NOT_IN_USE;
            case "outlet":
                return val === "on";
            case "mute":
                return val === "muted";
            case "smoke":
                return val === "clear" ? Characteristic.SmokeDetected.SMOKE_NOT_DETECTED : Characteristic.SmokeDetected.SMOKE_DETECTED;
            case "carbonMonoxide":
                return val === "clear" ? Characteristic.CarbonMonoxideDetected.CO_LEVELS_NORMAL : Characteristic.CarbonMonoxideDetected.CO_LEVELS_ABNORMAL;
            case "carbonDioxideMeasurement":
                switch (charName) {
                    case "Carbon Dioxide Detected":
                        return val < 2000 ? Characteristic.CarbonMonoxideDetected.CO_LEVELS_NORMAL : Characteristic.CarbonMonoxideDetected.CO_LEVELS_ABNORMAL;
                    default:
                        return clampNumericValue(val, attr);
                }
            case "tamper":
                return val === "detected" ? Characteristic.StatusTampered.TAMPERED : Characteristic.StatusTampered.NOT_TAMPERED;
            case "acceleration":
            case "motion":
                return val === "active";
            case "water":
                return val === "dry" ? Characteristic.LeakDetected.LEAK_NOT_DETECTED : Characteristic.LeakDetected.LEAK_DETECTED;
            case "contact":
                return val === "closed" ? Characteristic.ContactSensorState.CONTACT_DETECTED : Characteristic.ContactSensorState.CONTACT_NOT_DETECTED;
            case "presence":
                return val === "present";
            case "battery":
                if (charName === "Status Low Battery") {
                    return val < 20 ? Characteristic.StatusLowBattery.BATTERY_LEVEL_LOW : Characteristic.StatusLowBattery.BATTERY_LEVEL_NORMAL;
                } else {
                    return clampNumericValue(val, attr);
                }
            case "powerSource":
                // this.logInfo(`powerSource: ${val}`);
                switch (val) {
                    case "mains":
                    case "dc":
                    case "USB Cable":
                        return 1;

                    case "battery":
                        return 0;

                    default:
                        return 2;
                }
            case "hue":
                // Ensure the value is at least 1 before applying the conversion
                return clampNumericValue(Math.max(1, Math.round(val * 3.6)), attr);
            case "colorTemperature":
                return clampNumericValue(parseInt(this.kelvinToMired(val)), attr);
            case "temperature":
                return clampNumericValue(parseFloat(this.tempConversion(val)), attr);
            case "heatingSetpoint":
            case "coolingSetpoint":
            case "thermostatSetpoint":
                return clampNumericValue(this.thermostatTempConversion(val), attr);
            case "speed":
                return clampNumericValue(this.fanSpeedToLevel(val, opts), attr);
            // case "speed":
            case "level": {
                let lvl = parseInt(val);
                if (this.configItems.round_levels === true && lvl < 5) lvl = 0;
                if (this.configItems.round_levels === true && lvl > 95) lvl = 100;
                // console.log(`lvl | ${lvl}${this.configItems.round_levels === true ? " Rounded" : ""}`);
                return clampNumericValue(parseInt(lvl) || 0, attr);
            }
            case "volume":
            case "saturation":
                return clampNumericValue(parseInt(val) || 0, attr);
            case "illuminance":
                if (isNaN(val)) {
                    return undefined;
                }
                return Math.round(Math.ceil(parseFloat(val)), 0);
            case "humidity":
                return clampNumericValue(Math.round(val), attr);
            case "energy":
            case "power":
                return Math.round(val);
            case "thermostatOperatingState":
                switch (val) {
                    case "pending cool":
                    case "cooling":
                        return Characteristic.CurrentHeatingCoolingState.COOL;
                    case "pending heat":
                    case "heating":
                        return Characteristic.CurrentHeatingCoolingState.HEAT;
                    default:
                        // The above list should be inclusive, but we need to return  something if they change stuff.
                        // TODO: Double check if Hubitat can send "auto" as operatingstate. I don't think it can.
                        return Characteristic.CurrentHeatingCoolingState.OFF;
                }
            case "thermostatMode":
                switch (val) {
                    case "cool":
                        return Characteristic.TargetHeatingCoolingState.COOL;
                    case "emergency heat":
                    case "heat":
                        return Characteristic.TargetHeatingCoolingState.HEAT;
                    case "auto":
                        return Characteristic.TargetHeatingCoolingState.AUTO;
                    default:
                        return Characteristic.TargetHeatingCoolingState.OFF;
                }
            case "thermostatFanMode":
                return val !== "auto" ? Characteristic.Active.ACTIVE : Characteristic.Active.INACTIVE;
            case "windowShade":
                if (val === "opening") {
                    return Characteristic.PositionState.INCREASING;
                } else if (val === "closing") {
                    return Characteristic.PositionState.DECREASING;
                } else {
                    return Characteristic.PositionState.STOPPED;
                }
            case "alarmSystemStatus":
                // console.log(`alarmSystemStatus | char: (${charName}) | Opts: ${JSON.stringify(opts)} | val: ${this.convertAlarmState(val)}`);
                if (charName && charName === "Security System Target State") {
                    return this.convertAlarmTargetState(val);
                } else {
                    return this.convertAlarmState(val);
                }

            default:
                return val;
        }
    }

    transformCommandName(attr, val) {
        switch (attr) {
            case "valve":
                return val === 1 || val === true ? "open" : "close";
            case "switch":
                return val === 1 || val === true ? "on" : "off";
            case "door":
                if (val === Characteristic.TargetDoorState.OPEN || val === 0) {
                    return "open";
                } else {
                    return "close";
                }
            case "lock":
                return val === 1 || val === true ? "lock" : "unlock";
            case "mute":
                return val === "muted" ? "mute" : "unmute";
            case "thermostatFanMode":
                return val ? "fanOn" : "fanAuto";
            case "thermostatFanModeTarget":
                return val ? Characteristic.TargetFanState.MANUAL : Characteristic.TargetFanState.AUTO;
            case "speed":
            case "level":
            case "volume":
            case "thermostatMode":
            case "saturation":
            case "hue":
            case "colorTemperature":
                return `set${attr.charAt(0).toUpperCase() + attr.slice(1)}`;
            default:
                return val;
        }
    }

    transformCommandValue(attr, val) {
        switch (attr) {
            case "valve":
                return val === 1 || val === true ? "open" : "close";
            case "switch":
                return val === 1 || val === true ? "on" : "off";
            case "lock":
                return val === 1 || val === true ? "lock" : "unlock";
            case "door":
                if (val === Characteristic.TargetDoorState.OPEN || val === 0) {
                    return "open";
                } else if (val === Characteristic.TargetDoorState.CLOSED || val === 1) {
                    return "close";
                }
                return "closing";
            case "hue":
                return Math.round(val / 3.6);
            case "colorTemperature":
                return this.miredToKelvin(val);
            case "mute":
                return val === "muted" ? "mute" : "unmute";
            case "alarmSystemStatus":
                return this.convertAlarmCmd(val);
            case "speed":
                // console.log("transformCommandValue(speed): ", this.fanSpeedConversion(val));
                return this.fanSpeedConversion(val);
            case "thermostatMode":
                switch (val) {
                    case Characteristic.TargetHeatingCoolingState.COOL:
                        return "cool";
                    case Characteristic.TargetHeatingCoolingState.HEAT:
                        return "heat";
                    case Characteristic.TargetHeatingCoolingState.AUTO:
                        return "auto";
                    case Characteristic.TargetHeatingCoolingState.OFF:
                        return "off";
                    default:
                        return undefined;
                }

            case "thermostatFanMode":
                return val ? "fanOn" : "fanAuto";
            case "fanMode":
                if (val >= 0 && val <= CommunityTypes.FanOscilationMode.SLEEP) {
                    return "sleep";
                } else if (val > CommunityTypes.FanOscilationMode.SLEEP && val <= CommunityTypes.FanOscilationMode.LOW) {
                    return "low";
                } else if (val > CommunityTypes.FanOscilationMode.LOW && val <= CommunityTypes.FanOscilationMode.MEDIUM) {
                    return "medium";
                } else if (val > CommunityTypes.FanOscilationMode.MEDIUM && val <= CommunityTypes.FanOscilationMode.HIGH) {
                    return "high";
                } else {
                    return "sleep";
                }
            case "level": {
                let lvl = parseInt(val);
                if (this.configItems.round_levels === true && lvl < 5) lvl = 0;
                if (this.configItems.round_levels === true && lvl > 95) lvl = 100;
                // console.log(`lvl | ${lvl}${this.configItems.round_levels === true ? " Rounded" : ""}`);
                return parseInt(lvl);
            }
            default:
                return val;
        }
    }

    toInt(value, minValue, maxValue) {
        const n = parseInt(value);
        if (isNaN(n) || n < minValue) {
            return minValue;
        }
        if (n > maxValue) {
            return maxValue;
        }
        return n;
    }

    kelvinToMired(kelvin) {
        let val = (1000000 / kelvin).toFixed();
        val = this.toInt(val, 140, 500);
        // console.log("kelvinToMired | k: ", kelvin, " | ct: ", val);
        return val;
    }

    miredToKelvin(temp) {
        let val = (1000000 / temp).toFixed();
        // console.log("miredToKelvin | k: ", val, " | ct: ", temp);
        return val;
    }

    thermostatTempConversion(temp, isSet = false) {
        if (isSet) {
            return this.platform.getTempUnit() === "C" ? Math.round(temp) : Math.round(temp * 1.8 + 32);
        } else {
            return this.platform.getTempUnit() === "C" ? Math.round(temp * 10) / 10 : Math.round(((temp - 32) / 1.8) * 10) / 10;
        }
    }

    thermostatTargetTemp(devData) {
        // console.log('ThermostatMode:', devData.attributes.thermostatMode, ' | thermostatOperatingState: ', devData.attributes.thermostatOperatingState);
        switch (devData.attributes.thermostatMode) {
            case "cool":
            case "cooling":
                return devData.attributes.coolingSetpoint;
            case "emergency heat":
            case "heat":
            case "heating":
                return devData.attributes.heatingSetpoint;
            default: {
                const cool = devData.attributes.coolingSetpoint;
                const heat = devData.attributes.heatingSetpoint;
                const cur = devData.attributes.temperature;
                const cDiff = Math.abs(cool - cur);
                const hDiff = Math.abs(heat - cur);
                const useCool = cDiff < hDiff;
                // console.log('(cool-cur):', cDiff);
                // console.log('(heat-cur):', hDiff);
                // console.log(`targerTemp(GET) | cool: ${cool} | heat: ${heat} | cur: ${cur} | useCool: ${useCool}`);
                return useCool ? cool : heat;
            }
        }
    }

    thermostatSupportedModes(devData) {
        let hasHeatSetpoint = devData.attributes.heatingSetpoint !== undefined || devData.attributes.heatingSetpoint !== null;
        let hasCoolSetpoint = devData.attributes.coolingSetpoint !== undefined || devData.attributes.coolingSetpoint !== null;
        let sModes = devData.attributes.supportedThermostatModes || [];
        let validModes = [Characteristic.TargetHeatingCoolingState.OFF];
        if ((sModes.length && sModes.includes("heat")) || sModes.includes("emergency heat") || hasHeatSetpoint) validModes.push(Characteristic.TargetHeatingCoolingState.HEAT);

        if ((sModes.length && sModes.includes("cool")) || hasCoolSetpoint) validModes.push(Characteristic.TargetHeatingCoolingState.COOL);

        if ((sModes.length && sModes.includes("auto")) || (hasCoolSetpoint && hasHeatSetpoint)) validModes.push(Characteristic.TargetHeatingCoolingState.AUTO);
        return validModes;
    }

    thermostatTargetTemp_set(devData) {
        let cmdName;
        let attrName;
        switch (devData.attributes.thermostatMode) {
            case "cool":
                cmdName = "setCoolingSetpoint";
                attrName = "coolingSetpoint";
                break;
            case "emergency heat":
            case "heat":
                cmdName = "setHeatingSetpoint";
                attrName = "heatingSetpoint";
                break;
            default: {
                // This should only refer to auto
                // Choose closest target as single target
                const cool = devData.attributes.coolingSetpoint;
                const heat = devData.attributes.heatingSetpoint;
                const cur = devData.attributes.temperature;
                const cDiff = Math.abs(cool - cur);
                const hDiff = Math.abs(heat - cur);
                const useCool = cDiff < hDiff;
                // console.log('(cool-cur):', cDiff);
                // console.log('(heat-cur):', hDiff);
                // console.log(`targerTemp(SET) | cool: ${cool} | heat: ${heat} | cur: ${cur} | useCool: ${useCool}`);
                cmdName = useCool ? "setCoolingSetpoint" : "setHeatingSetpoint";
                attrName = useCool ? "coolingSetpoint" : "heatingSetpoint";
            }
        }
        return {
            cmdName: cmdName,
            attrName: attrName,
        };
    }

    tempConversion(temp, onlyC = false) {
        if (this.platform.getTempUnit() === "C" || onlyC) {
            return parseFloat(temp * 10) / 10;
        } else {
            return (parseFloat(((temp - 32) / 1.8) * 10) / 10).toFixed(2);
        }
    }

    cToF(temp) {
        return parseFloat(temp * 10) / 10;
    }

    fToC(temp) {
        return parseFloat(((temp - 32) / 1.8) * 10) / 10;
    }

    fanSpeedConversion(speedVal) {
        // console.log("speedVal: ", speedVal);
        if (speedVal <= 0) {
            return "off";
        } else if (speedVal > 0 && speedVal <= 20) {
            return "low";
        } else if (speedVal > 20 && speedVal <= 40) {
            return "medium-low";
        } else if (speedVal > 40 && speedVal <= 60) {
            return "medium";
        } else if (speedVal > 60 && speedVal <= 80) {
            return "medium-high";
        } else if (speedVal > 80 && speedVal <= 100) {
            return "high";
        }
    }

    // eslint-disable-next-line no-unused-vars
    fanSpeedToLevel(speedVal, opts = {}) {
        // let spds = 3;
        // if (opts && Object.keys(opts).length && opts.spdSteps) {
        //     spds = opts.spdSteps;
        // }
        // console.log(`fanSpeedToLevel(${speedVal}) | steps: ${spds}`);
        switch (speedVal) {
            case "off":
                return 0;
            case "low":
                return 33;
            case "medium-low":
                return 40;
            case "medium":
                return 66;
            case "medium-high":
                return 80;
            case "high":
                return 100;
            default:
                // console.log("using default fanspeed of 0 | speedVal: ", speedVal);
                return 0;
        }
    }

    convertAlarmState(value) {
        // console.log("convertAlarmState", value);
        switch (value) {
            case "armedHome":
                return Characteristic.SecuritySystemCurrentState.STAY_ARM;
            case "armedNight":
                return Characteristic.SecuritySystemCurrentState.NIGHT_ARM;
            case "armedAway":
                return Characteristic.SecuritySystemCurrentState.AWAY_ARM;
            case "disarmed":
                return Characteristic.SecuritySystemCurrentState.DISARMED;
            case "intrusion":
            case "intrusion-home":
            case "intrusion-away":
            case "intrusion-night":
                return Characteristic.SecuritySystemCurrentState.ALARM_TRIGGERED;
        }
    }

    convertAlarmTargetState(value) {
        // console.log("convertAlarmTargetState", value);
        switch (value) {
            case "armedHome":
            case "intrusion-home":
                return Characteristic.SecuritySystemCurrentState.STAY_ARM;
            case "armedNight":
            case "intrusion-night":
                return Characteristic.SecuritySystemCurrentState.NIGHT_ARM;
            case "armedAway":
            case "intrusion-away":
                return Characteristic.SecuritySystemCurrentState.AWAY_ARM;
            case "disarmed":
                return Characteristic.SecuritySystemCurrentState.DISARMED;
        }
    }

    convertAlarmCmd(value) {
        // console.log("convertAlarmCmd", value);
        switch (value) {
            case 0:
            case Characteristic.SecuritySystemCurrentState.STAY_ARM:
                return "armHome";
            case 1:
            case Characteristic.SecuritySystemCurrentState.AWAY_ARM:
                return "armAway";
            case 2:
            case Characteristic.SecuritySystemCurrentState.NIGHT_ARM:
                return "armNight";
            case 3:
            case Characteristic.SecuritySystemCurrentState.DISARMED:
                return "disarm";
            default:
                return "disarm";
            // case 4:
            // case Characteristic.SecuritySystemCurrentState.ALARM_TRIGGERED:
            //     return "alarm_active";
        }
    }
};

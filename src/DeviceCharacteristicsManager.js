// DeviceCharacteristicsManager.js

export default class DeviceCharacteristicsManager {
    constructor(platform) {
        this.platform = platform;
        this.logManager = platform.logManager;
        this.configManager = platform.configManager;
        this.Service = platform.Service;
        this.Characteristic = platform.Characteristic;
        this.CommunityTypes = platform.CommunityTypes;

        // Common transforms used across multiple device types
        this.transforms = {
            onOff: (val) => val === "on",
            temperature: (val) => {
                const tempUnit = this.configManager.getTempUnit();
                return tempUnit === "C" ? parseFloat(val * 10) / 10 : parseFloat(((val - 32) / 1.8) * 10) / 10;
            },
            battery: (val, charName) => {
                if (charName === "Status Low Battery") {
                    return val < 20 ? this.Characteristic.StatusLowBattery.BATTERY_LEVEL_LOW : this.Characteristic.StatusLowBattery.BATTERY_LEVEL_NORMAL;
                }
                return this.clampValue(val, 0, 100);
            },
            level: (val) => {
                let lvl = parseInt(val);
                if (this.configManager.getConfigValue("round_levels")) {
                    if (lvl < 5) lvl = 0;
                    if (lvl > 95) lvl = 100;
                }
                return this.clampValue(lvl || 0, 0, 100);
            },
            powerSource: (val) => {
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
            },
        };

        // Ranges for value clamping
        this.ranges = {
            battery: { min: 0, max: 100 },
            level: { min: 0, max: 100 },
            volume: { min: 0, max: 100 },
            colorTemperature: { min: 140, max: 500 },
            temperature: { min: 0, max: 100 },
            heatingSetpoint: { min: 10, max: 38 },
            coolingSetpoint: { min: 10, max: 38 },
            humidity: { min: 0, max: 100 },
            hue: { min: 1, max: 360 },
            saturation: { min: 0, max: 100 },
        };
    }

    // Helper Methods
    clampValue(value, min, max) {
        return Math.max(min, Math.min(max, value));
    }

    kelvinToMired(kelvin) {
        let val = Math.round(1000000 / kelvin);
        return this.clampValue(val, 140, 500);
    }

    miredToKelvin(mired) {
        return Math.round(1000000 / mired);
    }

    fanSpeedToLevel(speedVal) {
        const speedMap = {
            off: 0,
            low: 33,
            "medium-low": 40,
            medium: 66,
            "medium-high": 80,
            high: 100,
        };
        return speedMap[speedVal] || 0;
    }

    // Device Type Implementations
    acceleration_sensor(accessory, service) {
        const acc = accessory.getOrAddService(service);

        // Motion detection characteristic
        const motionChar = acc.getCharacteristic(this.Characteristic.MotionDetected);
        if (!motionChar._events.get) {
            motionChar.on("get", (callback) => {
                const val = accessory.context.deviceData.attributes.acceleration === "active";
                callback(null, val);
            });
            accessory.storeCharacteristicItem("acceleration", accessory.context.deviceData.deviceid, motionChar);
        }

        // Status Active characteristic
        const statusChar = acc.getCharacteristic(this.Characteristic.StatusActive);
        if (!statusChar._events.get) {
            statusChar.on("get", (callback) => {
                const val = accessory.context.deviceData.status.toLowerCase() === "online";
                callback(null, val);
            });
            accessory.storeCharacteristicItem("status", accessory.context.deviceData.deviceid, statusChar);
        }

        // Optional Tamper characteristic
        if (accessory.hasCapability("Tamper Alert")) {
            const tamperChar = acc.getCharacteristic(this.Characteristic.StatusTampered);
            if (!tamperChar._events.get) {
                tamperChar.on("get", (callback) => {
                    const val = accessory.context.deviceData.attributes.tamper === "detected" ? this.Characteristic.StatusTampered.TAMPERED : this.Characteristic.StatusTampered.NOT_TAMPERED;
                    callback(null, val);
                });
                accessory.storeCharacteristicItem("tamper", accessory.context.deviceData.deviceid, tamperChar);
            }
        }

        accessory.context.deviceGroups.push("acceleration_sensor");
        return accessory;
    }

    contact_sensor(accessory, service) {
        const acc = accessory.getOrAddService(service);

        // Contact State characteristic
        const contactChar = acc.getCharacteristic(this.Characteristic.ContactSensorState);
        if (!contactChar._events.get) {
            contactChar.on("get", (callback) => {
                const val = accessory.context.deviceData.attributes.contact === "closed" ? this.Characteristic.ContactSensorState.CONTACT_DETECTED : this.Characteristic.ContactSensorState.CONTACT_NOT_DETECTED;
                callback(null, val);
            });
            accessory.storeCharacteristicItem("contact", accessory.context.deviceData.deviceid, contactChar);
        }

        // Status Active characteristic
        const statusChar = acc.getCharacteristic(this.Characteristic.StatusActive);
        if (!statusChar._events.get) {
            statusChar.on("get", (callback) => {
                const val = accessory.context.deviceData.status.toLowerCase() === "online";
                callback(null, val);
            });
            accessory.storeCharacteristicItem("status", accessory.context.deviceData.deviceid, statusChar);
        }

        if (accessory.hasCapability("Tamper Alert")) {
            const tamperChar = acc.getCharacteristic(this.Characteristic.StatusTampered);
            if (!tamperChar._events.get) {
                tamperChar.on("get", (callback) => {
                    const val = accessory.context.deviceData.attributes.tamper === "detected" ? this.Characteristic.StatusTampered.TAMPERED : this.Characteristic.StatusTampered.NOT_TAMPERED;
                    callback(null, val);
                });
                accessory.storeCharacteristicItem("tamper", accessory.context.deviceData.deviceid, tamperChar);
            }
        }

        accessory.context.deviceGroups.push("contact_sensor");
        return accessory;
    }

    light(accessory, service) {
        const acc = accessory.getOrAddService(service);

        // On/Off characteristic
        const onChar = acc.getCharacteristic(this.Characteristic.On);
        if (!onChar._events.get || !onChar._events.set) {
            onChar
                .on("get", (callback) => {
                    callback(null, this.transforms.onOff(accessory.context.deviceData.attributes.switch));
                })
                .on("set", (value, callback) => {
                    accessory.sendCommand(callback, accessory, accessory.context.deviceData, value ? "on" : "off");
                });
            accessory.storeCharacteristicItem("switch", accessory.context.deviceData.deviceid, onChar);
        }

        // Brightness if supported
        if (accessory.hasAttribute("level")) {
            const brightnessChar = acc.getCharacteristic(this.Characteristic.Brightness);
            if (!brightnessChar._events.get || !brightnessChar._events.set) {
                brightnessChar
                    .on("get", (callback) => {
                        callback(null, this.transforms.level(accessory.context.deviceData.attributes.level));
                    })
                    .on("set", (value, callback) => {
                        accessory.sendCommand(callback, accessory, accessory.context.deviceData, "setLevel", {
                            value1: this.transforms.level(value),
                        });
                    });
                accessory.storeCharacteristicItem("level", accessory.context.deviceData.deviceid, brightnessChar);
            }
        }

        // Color control if supported
        if (accessory.hasAttribute("hue") && accessory.hasCommand("setHue")) {
            const hueChar = acc.getCharacteristic(this.Characteristic.Hue);
            if (!hueChar._events.get || !hueChar._events.set) {
                hueChar
                    .on("get", (callback) => {
                        const val = Math.max(1, Math.round(accessory.context.deviceData.attributes.hue * 3.6));
                        callback(null, this.clampValue(val, 1, 360));
                    })
                    .on("set", (value, callback) => {
                        accessory.sendCommand(callback, accessory, accessory.context.deviceData, "setHue", {
                            value1: Math.round(value / 3.6),
                        });
                    });
                accessory.storeCharacteristicItem("hue", accessory.context.deviceData.deviceid, hueChar);
            }
        }

        // Saturation if supported
        if (accessory.hasAttribute("saturation") && accessory.hasCommand("setSaturation")) {
            const satChar = acc.getCharacteristic(this.Characteristic.Saturation);
            if (!satChar._events.get || !satChar._events.set) {
                satChar
                    .on("get", (callback) => {
                        callback(null, this.clampValue(accessory.context.deviceData.attributes.saturation, 0, 100));
                    })
                    .on("set", (value, callback) => {
                        accessory.sendCommand(callback, accessory, accessory.context.deviceData, "setSaturation", {
                            value1: this.clampValue(value, 0, 100),
                        });
                    });
                accessory.storeCharacteristicItem("saturation", accessory.context.deviceData.deviceid, satChar);
            }
        }

        // Color Temperature if supported
        if (accessory.hasAttribute("colorTemperature") && accessory.hasCommand("setColorTemperature")) {
            const ctChar = acc.getCharacteristic(this.Characteristic.ColorTemperature);
            if (!ctChar._events.get || !ctChar._events.set) {
                ctChar
                    .setProps({
                        minValue: 140,
                        maxValue: 500,
                    })
                    .on("get", (callback) => {
                        const val = this.kelvinToMired(accessory.context.deviceData.attributes.colorTemperature);
                        callback(null, val);
                    })
                    .on("set", (value, callback) => {
                        accessory.sendCommand(callback, accessory, accessory.context.deviceData, "setColorTemperature", {
                            value1: this.miredToKelvin(value),
                        });
                    });
                accessory.storeCharacteristicItem("colorTemperature", accessory.context.deviceData.deviceid, ctChar);
            }
        }

        // Adaptive Lighting
        const canUseAL = this.configManager.getConfigValue("adaptive_lighting") !== false && accessory.isAdaptiveLightingSupported && !accessory.hasDeviceFlag("light_no_al") && accessory.hasAttribute("level") && accessory.hasAttribute("colorTemperature");

        if (canUseAL && !accessory.adaptiveLightingController) {
            accessory.addAdaptiveLightingController(accessory, service);
        } else if (!canUseAL && accessory.adaptiveLightingController) {
            accessory.removeAdaptiveLightingController();
        }

        accessory.context.deviceGroups.push("light_bulb");
        return accessory;
    }

    thermostat(accessory, service) {
        const acc = accessory.getOrAddService(service);

        // Current Temperature
        const curTempChar = acc.getCharacteristic(this.Characteristic.CurrentTemperature);
        if (!curTempChar._events.get) {
            curTempChar
                .setProps({
                    minValue: -100,
                    maxValue: 200,
                })
                .on("get", (callback) => {
                    callback(null, this.transforms.temperature(accessory.context.deviceData.attributes.temperature));
                });
            accessory.storeCharacteristicItem("temperature", accessory.context.deviceData.deviceid, curTempChar);
        }

        // Current Operating State
        const curStateChar = acc.getCharacteristic(this.Characteristic.CurrentHeatingCoolingState);
        if (!curStateChar._events.get) {
            curStateChar.on("get", (callback) => {
                const state = this.transforms.thermostatOperatingState(accessory.context.deviceData.attributes.thermostatOperatingState);
                callback(null, state);
            });
            accessory.storeCharacteristicItem("thermostatOperatingState", accessory.context.deviceData.deviceid, curStateChar);
        }

        // Target State
        const targetStateChar = acc.getCharacteristic(this.Characteristic.TargetHeatingCoolingState);
        if (!targetStateChar._events.get || !targetStateChar._events.set) {
            const validModes = this.thermostatSupportedModes(accessory.context.deviceData);
            targetStateChar
                .setProps({
                    validValues: validModes,
                })
                .on("get", (callback) => {
                    const mode = this.transforms.thermostatMode(accessory.context.deviceData.attributes.thermostatMode);
                    callback(null, mode);
                })
                .on("set", (value, callback) => {
                    const mode = this.transforms.thermostatModeCommand(value);
                    accessory.sendCommand(callback, accessory, accessory.context.deviceData, "setThermostatMode", {
                        value1: mode,
                    });
                    accessory.context.deviceData.attributes.thermostatMode = mode;
                });
            accessory.storeCharacteristicItem("thermostatMode", accessory.context.deviceData.deviceid, targetStateChar);
        }

        // Target Temperature
        const targetTempChar = acc.getCharacteristic(this.Characteristic.TargetTemperature);
        if (!targetTempChar._events.get || !targetTempChar._events.set) {
            targetTempChar
                .setProps({
                    minValue: 10,
                    maxValue: 38,
                })
                .on("get", (callback) => {
                    const targetTemp = this.getTargetTemperature(accessory.context.deviceData);
                    callback(null, targetTemp ? this.transforms.temperature(targetTemp) : null);
                })
                .on("set", (value, callback) => {
                    const temp = this.transforms.temperature(value, true);
                    const target = this.getTargetTempCommand(accessory.context.deviceData);
                    if (target && target.cmdName && target.attrName && temp) {
                        accessory.sendCommand(callback, accessory, accessory.context.deviceData, target.cmdName, {
                            value1: temp,
                        });
                        accessory.context.deviceData.attributes[target.attrName] = temp;
                    }
                });
            accessory.storeCharacteristicItem("coolingSetpoint", accessory.context.deviceData.deviceid, targetTempChar);
            accessory.storeCharacteristicItem("heatingSetpoint", accessory.context.deviceData.deviceid, targetTempChar);
            accessory.storeCharacteristicItem("thermostatSetpoint", accessory.context.deviceData.deviceid, targetTempChar);
        }

        // Temperature Display Units
        const tempUnitChar = acc.getCharacteristic(this.Characteristic.TemperatureDisplayUnits);
        tempUnitChar.updateValue(this.configManager.getTempUnit() === "F" ? this.Characteristic.TemperatureDisplayUnits.FAHRENHEIT : this.Characteristic.TemperatureDisplayUnits.CELSIUS);

        // Heating/Cooling Threshold Temperature (for Auto mode)
        const modes = targetStateChar.props.validValues;
        if (modes.includes(this.Characteristic.TargetHeatingCoolingState.AUTO)) {
            // Heating Threshold
            const heatThreshChar = acc.getCharacteristic(this.Characteristic.HeatingThresholdTemperature);
            if (!heatThreshChar._events.get || !heatThreshChar._events.set) {
                heatThreshChar
                    .setProps({
                        minValue: 10,
                        maxValue: 38,
                    })
                    .on("get", (callback) => {
                        callback(null, this.transforms.temperature(accessory.context.deviceData.attributes.heatingSetpoint));
                    })
                    .on("set", (value, callback) => {
                        const temp = this.transforms.temperature(value, true);
                        accessory.sendCommand(callback, accessory, accessory.context.deviceData, "setHeatingSetpoint", {
                            value1: temp,
                        });
                        accessory.context.deviceData.attributes.heatingSetpoint = temp;
                    });
                accessory.storeCharacteristicItem("heatingSetpoint", accessory.context.deviceData.deviceid, heatThreshChar);
            }

            // Cooling Threshold
            const coolThreshChar = acc.getCharacteristic(this.Characteristic.CoolingThresholdTemperature);
            if (!coolThreshChar._events.get || !coolThreshChar._events.set) {
                coolThreshChar
                    .setProps({
                        minValue: 10,
                        maxValue: 38,
                    })
                    .on("get", (callback) => {
                        callback(null, this.transforms.temperature(accessory.context.deviceData.attributes.coolingSetpoint));
                    })
                    .on("set", (value, callback) => {
                        const temp = this.transforms.temperature(value, true);
                        accessory.sendCommand(callback, accessory, accessory.context.deviceData, "setCoolingSetpoint", {
                            value1: temp,
                        });
                        accessory.context.deviceData.attributes.coolingSetpoint = temp;
                    });
                accessory.storeCharacteristicItem("coolingSetpoint", accessory.context.deviceData.deviceid, coolThreshChar);
            }
        } else {
            acc.removeCharacteristic(this.Characteristic.HeatingThresholdTemperature);
            acc.removeCharacteristic(this.Characteristic.CoolingThresholdTemperature);
        }

        // Handle relative humidity if supported
        if (accessory.hasCapability("Relative Humidity Measurement")) {
            const humidityChar = acc.getCharacteristic(this.Characteristic.CurrentRelativeHumidity);
            if (!humidityChar._events.get) {
                humidityChar.on("get", (callback) => {
                    callback(null, this.clampValue(accessory.context.deviceData.attributes.humidity, 0, 100));
                });
                accessory.storeCharacteristicItem("humidity", accessory.context.deviceData.deviceid, humidityChar);
            }
        }

        accessory.context.deviceGroups.push("thermostat");
        return accessory;
    }

    // Thermostat helper methods
    getTargetTemperature(deviceData) {
        switch (deviceData.attributes.thermostatMode) {
            case "cool":
            case "cooling":
                return deviceData.attributes.coolingSetpoint;
            case "emergency heat":
            case "heat":
            case "heating":
                return deviceData.attributes.heatingSetpoint;
            default: {
                const cool = deviceData.attributes.coolingSetpoint;
                const heat = deviceData.attributes.heatingSetpoint;
                const cur = deviceData.attributes.temperature;
                const cDiff = Math.abs(cool - cur);
                const hDiff = Math.abs(heat - cur);
                return cDiff < hDiff ? cool : heat;
            }
        }
    }

    fan(accessory, service) {
        const acc = accessory.getOrAddService(service);

        // Active State (On/Off)
        if (accessory.hasAttribute("switch")) {
            const activeChar = acc.getCharacteristic(this.Characteristic.Active);
            if (!activeChar._events.get || !activeChar._events.set) {
                activeChar
                    .on("get", (callback) => {
                        callback(null, this.transforms.onOff(accessory.context.deviceData.attributes.switch));
                    })
                    .on("set", (value, callback) => {
                        accessory.sendCommand(callback, accessory, accessory.context.deviceData, value ? "on" : "off");
                    });
                accessory.storeCharacteristicItem("switch", accessory.context.deviceData.deviceid, activeChar);
            }

            // Current Fan State
            const curStateChar = acc.getCharacteristic(this.Characteristic.CurrentFanState);
            if (!curStateChar._events.get) {
                curStateChar.on("get", (callback) => {
                    const isOn = accessory.context.deviceData.attributes.switch === "on";
                    callback(null, isOn ? this.Characteristic.CurrentFanState.BLOWING_AIR : this.Characteristic.CurrentFanState.IDLE);
                });
                accessory.storeCharacteristicItem("switch", accessory.context.deviceData.deviceid, curStateChar);
            }
        }

        // Rotation Speed if supported
        const spdSteps = accessory.hasDeviceFlag("fan_5_spd") ? 20 : accessory.hasDeviceFlag("fan_4_spd") ? 25 : accessory.hasDeviceFlag("fan_3_spd") ? 33 : 1;

        const speedAttr = accessory.hasAttribute("speed") && accessory.hasCommand("setSpeed") ? "speed" : accessory.hasAttribute("level") ? "level" : undefined;

        if (speedAttr) {
            const rotationChar = acc.getCharacteristic(this.Characteristic.RotationSpeed);
            if (!rotationChar._events.get || !rotationChar._events.set) {
                rotationChar
                    .setProps({
                        minStep: spdSteps,
                    })
                    .on("get", (callback) => {
                        const speed = accessory.context.deviceData.attributes[speedAttr];
                        callback(null, this.fanSpeedToLevel(speed));
                    })
                    .on("set", (value, callback) => {
                        const cmdName = speedAttr === "speed" ? "setSpeed" : "setLevel";
                        accessory.sendCommand(callback, accessory, accessory.context.deviceData, cmdName, {
                            value1: this.clampValue(value, 0, 100),
                        });
                    });
                accessory.storeCharacteristicItem(speedAttr, accessory.context.deviceData.deviceid, rotationChar);
            }
        }

        accessory.context.deviceGroups.push("fan");
        return accessory;
    }

    lock(accessory, service) {
        const acc = accessory.getOrAddService(service);

        // Current Lock State
        const curStateChar = acc.getCharacteristic(this.Characteristic.LockCurrentState);
        if (!curStateChar._events.get) {
            curStateChar.on("get", (callback) => {
                const state = accessory.context.deviceData.attributes.lock === "locked" ? this.Characteristic.LockCurrentState.SECURED : this.Characteristic.LockCurrentState.UNSECURED;
                callback(null, state);
            });
            accessory.storeCharacteristicItem("lock", accessory.context.deviceData.deviceid, curStateChar);
        }

        // Target Lock State
        const targetStateChar = acc.getCharacteristic(this.Characteristic.LockTargetState);
        if (!targetStateChar._events.get || !targetStateChar._events.set) {
            targetStateChar
                .on("get", (callback) => {
                    const state = accessory.context.deviceData.attributes.lock === "locked" ? this.Characteristic.LockTargetState.SECURED : this.Characteristic.LockTargetState.UNSECURED;
                    callback(null, state);
                })
                .on("set", (value, callback) => {
                    const command = value === this.Characteristic.LockTargetState.SECURED ? "lock" : "unlock";
                    accessory.sendCommand(callback, accessory, accessory.context.deviceData, command);
                });
            accessory.storeCharacteristicItem("lock", accessory.context.deviceData.deviceid, targetStateChar);
        }

        accessory.context.deviceGroups.push("lock");
        return accessory;
    }

    motion_sensor(accessory, service) {
        const acc = accessory.getOrAddService(service);

        // Motion Detected
        const motionChar = acc.getCharacteristic(this.Characteristic.MotionDetected);
        if (!motionChar._events.get) {
            motionChar.on("get", (callback) => {
                callback(null, accessory.context.deviceData.attributes.motion === "active");
            });
            accessory.storeCharacteristicItem("motion", accessory.context.deviceData.deviceid, motionChar);
        }

        // Status Active
        const statusChar = acc.getCharacteristic(this.Characteristic.StatusActive);
        if (!statusChar._events.get) {
            statusChar.on("get", (callback) => {
                callback(null, accessory.context.deviceData.status.toLowerCase() === "online");
            });
            accessory.storeCharacteristicItem("status", accessory.context.deviceData.deviceid, statusChar);
        }

        // Tamper Detection if supported
        if (accessory.hasCapability("Tamper Alert")) {
            const tamperChar = acc.getCharacteristic(this.Characteristic.StatusTampered);
            if (!tamperChar._events.get) {
                tamperChar.on("get", (callback) => {
                    const tampered = accessory.context.deviceData.attributes.tamper === "detected";
                    callback(null, tampered ? this.Characteristic.StatusTampered.TAMPERED : this.Characteristic.StatusTampered.NOT_TAMPERED);
                });
                accessory.storeCharacteristicItem("tamper", accessory.context.deviceData.deviceid, tamperChar);
            }
        }

        accessory.context.deviceGroups.push("motion_sensor");
        return accessory;
    }

    switch_device(accessory, service) {
        const acc = accessory.getOrAddService(service);

        const onChar = acc.getCharacteristic(this.Characteristic.On);
        if (!onChar._events.get || !onChar._events.set) {
            onChar
                .on("get", (callback) => {
                    callback(null, this.transforms.onOff(accessory.context.deviceData.attributes.switch));
                })
                .on("set", (value, callback) => {
                    accessory.sendCommand(callback, accessory, accessory.context.deviceData, value ? "on" : "off");
                });
            accessory.storeCharacteristicItem("switch", accessory.context.deviceData.deviceid, onChar);
        }

        accessory.context.deviceGroups.push("switch");
        return accessory;
    }

    outlet(accessory, service) {
        const acc = accessory.getOrAddService(service);

        // On/Off State
        const onChar = acc.getCharacteristic(this.Characteristic.On);
        if (!onChar._events.get || !onChar._events.set) {
            onChar
                .on("get", (callback) => {
                    callback(null, this.transforms.onOff(accessory.context.deviceData.attributes.switch));
                })
                .on("set", (value, callback) => {
                    accessory.sendCommand(callback, accessory, accessory.context.deviceData, value ? "on" : "off");
                });
            accessory.storeCharacteristicItem("switch", accessory.context.deviceData.deviceid, onChar);
        }

        // Outlet In Use
        const inUseChar = acc.getCharacteristic(this.Characteristic.OutletInUse);
        if (!inUseChar._events.get) {
            inUseChar.on("get", (callback) => {
                callback(null, this.transforms.onOff(accessory.context.deviceData.attributes.switch));
            });
            accessory.storeCharacteristicItem("switch", accessory.context.deviceData.deviceid, inUseChar);
        }

        accessory.context.deviceGroups.push("outlet");
        return accessory;
    }

    temperature_sensor(accessory, service) {
        const acc = accessory.getOrAddService(service);

        const tempChar = acc.getCharacteristic(this.Characteristic.CurrentTemperature);
        if (!tempChar._events.get) {
            tempChar
                .setProps({
                    minValue: -100,
                    maxValue: 200,
                })
                .on("get", (callback) => {
                    callback(null, this.transforms.temperature(accessory.context.deviceData.attributes.temperature));
                });
            accessory.storeCharacteristicItem("temperature", accessory.context.deviceData.deviceid, tempChar);
        }

        if (accessory.hasCapability("Tamper Alert")) {
            const tamperChar = acc.getCharacteristic(this.Characteristic.StatusTampered);
            if (!tamperChar._events.get) {
                tamperChar.on("get", (callback) => {
                    const tampered = accessory.context.deviceData.attributes.tamper === "detected";
                    callback(null, tampered ? this.Characteristic.StatusTampered.TAMPERED : this.Characteristic.StatusTampered.NOT_TAMPERED);
                });
                accessory.storeCharacteristicItem("tamper", accessory.context.deviceData.deviceid, tamperChar);
            }
        }

        accessory.context.deviceGroups.push("temperature_sensor");
        return accessory;
    }

    humidity_sensor(accessory, service) {
        const acc = accessory.getOrAddService(service);

        const humidityChar = acc.getCharacteristic(this.Characteristic.CurrentRelativeHumidity);
        if (!humidityChar._events.get) {
            humidityChar.on("get", (callback) => {
                callback(null, this.clampValue(accessory.context.deviceData.attributes.humidity, 0, 100));
            });
            accessory.storeCharacteristicItem("humidity", accessory.context.deviceData.deviceid, humidityChar);
        }

        // Status Active
        const statusChar = acc.getCharacteristic(this.Characteristic.StatusActive);
        if (!statusChar._events.get) {
            statusChar.on("get", (callback) => {
                callback(null, accessory.context.deviceData.status.toLowerCase() === "online");
            });
            accessory.storeCharacteristicItem("status", accessory.context.deviceData.deviceid, statusChar);
        }

        if (accessory.hasCapability("Tamper Alert")) {
            const tamperChar = acc.getCharacteristic(this.Characteristic.StatusTampered);
            if (!tamperChar._events.get) {
                tamperChar.on("get", (callback) => {
                    const tampered = accessory.context.deviceData.attributes.tamper === "detected";
                    callback(null, tampered ? this.Characteristic.StatusTampered.TAMPERED : this.Characteristic.StatusTampered.NOT_TAMPERED);
                });
                accessory.storeCharacteristicItem("tamper", accessory.context.deviceData.deviceid, tamperChar);
            }
        }

        accessory.context.deviceGroups.push("humidity_sensor");
        return accessory;
    }

    button(accessory, service) {
        const btnCount = accessory.context.deviceData.attributes.numberOfButtons || 1;
        const validValues = this.getValidButtonValues(accessory);

        for (let btnNum = 1; btnNum <= btnCount; btnNum++) {
            const svc = accessory.getOrAddServiceByName(service, `${accessory.context.deviceData.deviceid}_${btnNum}`, btnNum);

            const btnChar = svc.getCharacteristic(this.Characteristic.ProgrammableSwitchEvent);
            btnChar.setProps({
                validValues: validValues,
            });

            if (!btnChar._events.get) {
                accessory._buttonMap[`${accessory.context.deviceData.deviceid}_${btnNum}`] = svc;
                btnChar.on("get", (callback) => {
                    callback(null, -1);
                });

                accessory.buttonEvent = this.handleButtonEvent.bind(accessory);
                accessory.storeCharacteristicItem("button", accessory.context.deviceData.deviceid, btnChar);
            }

            svc.getCharacteristic(this.Characteristic.ServiceLabelIndex).setValue(btnNum);
        }

        accessory.context.deviceGroups.push("button");
        return accessory;
    }

    window_shade(accessory, service) {
        const acc = accessory.getOrAddService(service);
        const positionAttr = accessory.hasCommand("setPosition") ? "position" : "level";

        // Current Position
        const curPosChar = acc.getCharacteristic(this.Characteristic.CurrentPosition);
        if (!curPosChar._events.get) {
            curPosChar
                .setProps({
                    minStep: 10,
                })
                .on("get", (callback) => {
                    callback(null, this.clampValue(parseInt(accessory.context.deviceData.attributes[positionAttr]), 0, 100));
                });
            accessory.storeCharacteristicItem(positionAttr, accessory.context.deviceData.deviceid, curPosChar);
        }

        // Target Position
        const targetPosChar = acc.getCharacteristic(this.Characteristic.TargetPosition);
        if (!targetPosChar._events.get || !targetPosChar._events.set) {
            targetPosChar
                .setProps({
                    minStep: 10,
                })
                .on("get", (callback) => {
                    callback(null, parseInt(accessory.context.deviceData.attributes[positionAttr]));
                })
                .on("set", (value, callback) => {
                    if (accessory.hasCommand("close") && value <= 2) {
                        accessory.sendCommand(callback, accessory, accessory.context.deviceData, "close");
                    } else {
                        let targetValue = value;
                        if (value <= 2) targetValue = 0;
                        if (value >= 98) targetValue = 100;

                        const command = accessory.hasCommand("setPosition") ? "setPosition" : "setLevel";
                        accessory.sendCommand(callback, accessory, accessory.context.deviceData, command, {
                            value1: targetValue,
                        });
                    }
                });
            accessory.storeCharacteristicItem(positionAttr, accessory.context.deviceData.deviceid, targetPosChar);
        }

        // Position State
        const posStateChar = acc.getCharacteristic(this.Characteristic.PositionState);
        if (!posStateChar._events.get) {
            posStateChar.on("get", (callback) => {
                const state = accessory.context.deviceData.attributes.windowShade;
                let posState = this.Characteristic.PositionState.STOPPED;
                if (state === "opening") {
                    posState = this.Characteristic.PositionState.INCREASING;
                } else if (state === "closing") {
                    posState = this.Characteristic.PositionState.DECREASING;
                }
                callback(null, posState);
            });
            accessory.storeCharacteristicItem("windowShade", accessory.context.deviceData.deviceid, posStateChar);
        }

        // Obstruction Detection (default to false)
        acc.getCharacteristic(this.Characteristic.ObstructionDetected).updateValue(false);

        accessory.context.deviceGroups.push("window_shade");
        return accessory;
    }

    valve(accessory, service) {
        const acc = accessory.getOrAddService(service);

        // In Use State
        const inUseChar = acc.getCharacteristic(this.Characteristic.InUse);
        if (!inUseChar._events.get) {
            inUseChar.on("get", (callback) => {
                callback(null, accessory.context.deviceData.attributes.valve === "open" ? this.Characteristic.InUse.IN_USE : this.Characteristic.InUse.NOT_IN_USE);
            });
            accessory.storeCharacteristicItem("valve", accessory.context.deviceData.deviceid, inUseChar);
        }

        // Active State
        const activeChar = acc.getCharacteristic(this.Characteristic.Active);
        if (!activeChar._events.get || !activeChar._events.set) {
            activeChar
                .on("get", (callback) => {
                    callback(null, accessory.context.deviceData.attributes.valve === "open" ? 1 : 0);
                })
                .on("set", (value, callback) => {
                    accessory.sendCommand(callback, accessory, accessory.context.deviceData, value ? "open" : "close");
                });
            accessory.storeCharacteristicItem("valve", accessory.context.deviceData.deviceid, activeChar);
        }

        // Set valve type if not already set
        if (!acc.getCharacteristic(this.Characteristic.ValveType).value) {
            acc.setCharacteristic(this.Characteristic.ValveType, 0);
        }

        accessory.context.deviceGroups.push("valve");
        return accessory;
    }

    speaker(accessory, service) {
        const acc = accessory.getOrAddService(service);
        const isSonos = accessory.context.deviceData.manufacturerName === "Sonos";
        const volumeAttr = isSonos || accessory.hasAttribute("volume") ? "volume" : "level";
        let lastVolumeValue = null;

        // Volume
        const volumeChar = acc.getCharacteristic(this.Characteristic.Volume);
        if (!volumeChar._events.get || !volumeChar._events.set) {
            volumeChar
                .on("get", (callback) => {
                    callback(null, this.clampValue(accessory.context.deviceData.attributes[volumeAttr], 0, 100) || 0);
                })
                .on("set", (value, callback) => {
                    if (value > 0) {
                        if (isSonos && value !== lastVolumeValue) {
                            lastVolumeValue = value;
                            this.logManager.logDebug(`Existing volume: ${accessory.context.deviceData.attributes.volume}, set to ${lastVolumeValue}`);
                        }

                        const command = volumeAttr === "volume" ? "setVolume" : "setLevel";
                        accessory.sendCommand(callback, accessory, accessory.context.deviceData, command, {
                            value1: value,
                        });
                    }
                });
            accessory.storeCharacteristicItem(volumeAttr, accessory.context.deviceData.deviceid, volumeChar);
        }

        // Mute if supported
        if (accessory.hasCapability("Audio Mute")) {
            const muteChar = acc.getCharacteristic(this.Characteristic.Mute);
            if (!muteChar._events.get || !muteChar._events.set) {
                muteChar
                    .on("get", (callback) => {
                        callback(null, accessory.context.deviceData.attributes.mute === "muted");
                    })
                    .on("set", (value, callback) => {
                        accessory.sendCommand(callback, accessory, accessory.context.deviceData, value ? "mute" : "unmute");
                    });
                accessory.storeCharacteristicItem("mute", accessory.context.deviceData.deviceid, muteChar);
            }
        }

        accessory.context.deviceGroups.push("speaker_device");
        return accessory;
    }

    smoke_detector(accessory, service) {
        const acc = accessory.getOrAddService(service);

        // Smoke Detected State
        const smokeChar = acc.getCharacteristic(this.Characteristic.SmokeDetected);
        if (!smokeChar._events.get) {
            smokeChar.on("get", (callback) => {
                const detected = accessory.context.deviceData.attributes.smoke !== "clear";
                callback(null, detected ? this.Characteristic.SmokeDetected.SMOKE_DETECTED : this.Characteristic.SmokeDetected.SMOKE_NOT_DETECTED);
            });
            accessory.storeCharacteristicItem("smoke", accessory.context.deviceData.deviceid, smokeChar);
        }

        // Status Active
        const statusChar = acc.getCharacteristic(this.Characteristic.StatusActive);
        if (!statusChar._events.get) {
            statusChar.on("get", (callback) => {
                callback(null, accessory.context.deviceData.status.toLowerCase() === "online");
            });
            accessory.storeCharacteristicItem("status", accessory.context.deviceData.deviceid, statusChar);
        }

        // Tamper Detection if supported
        if (accessory.hasCapability("Tamper Alert")) {
            const tamperChar = acc.getCharacteristic(this.Characteristic.StatusTampered);
            if (!tamperChar._events.get) {
                tamperChar.on("get", (callback) => {
                    const tampered = accessory.context.deviceData.attributes.tamper === "detected";
                    callback(null, tampered ? this.Characteristic.StatusTampered.TAMPERED : this.Characteristic.StatusTampered.NOT_TAMPERED);
                });
                accessory.storeCharacteristicItem("tamper", accessory.context.deviceData.deviceid, tamperChar);
            }
        }

        accessory.context.deviceGroups.push("smoke_detector");
        return accessory;
    }

    carbon_monoxide(accessory, service) {
        const acc = accessory.getOrAddService(service);

        // CO Detected State
        const coChar = acc.getCharacteristic(this.Characteristic.CarbonMonoxideDetected);
        if (!coChar._events.get) {
            coChar.on("get", (callback) => {
                const detected = accessory.context.deviceData.attributes.carbonMonoxide !== "clear";
                callback(null, detected ? this.Characteristic.CarbonMonoxideDetected.CO_LEVELS_ABNORMAL : this.Characteristic.CarbonMonoxideDetected.CO_LEVELS_NORMAL);
            });
            accessory.storeCharacteristicItem("carbonMonoxide", accessory.context.deviceData.deviceid, coChar);
        }

        // Status Active
        const statusChar = acc.getCharacteristic(this.Characteristic.StatusActive);
        if (!statusChar._events.get) {
            statusChar.on("get", (callback) => {
                callback(null, accessory.context.deviceData.status.toLowerCase() === "online");
            });
            accessory.storeCharacteristicItem("status", accessory.context.deviceData.deviceid, statusChar);
        }

        if (accessory.hasCapability("Tamper Alert")) {
            const tamperChar = acc.getCharacteristic(this.Characteristic.StatusTampered);
            if (!tamperChar._events.get) {
                tamperChar.on("get", (callback) => {
                    const tampered = accessory.context.deviceData.attributes.tamper === "detected";
                    callback(null, tampered ? this.Characteristic.StatusTampered.TAMPERED : this.Characteristic.StatusTampered.NOT_TAMPERED);
                });
                accessory.storeCharacteristicItem("tamper", accessory.context.deviceData.deviceid, tamperChar);
            }
        }

        accessory.context.deviceGroups.push("carbon_monoxide");
        return accessory;
    }

    leak_sensor(accessory, service) {
        const acc = accessory.getOrAddService(service);

        // Leak Detected State
        const leakChar = acc.getCharacteristic(this.Characteristic.LeakDetected);
        if (!leakChar._events.get) {
            leakChar.on("get", (callback) => {
                const detected = accessory.context.deviceData.attributes.water !== "dry";
                callback(null, detected ? this.Characteristic.LeakDetected.LEAK_DETECTED : this.Characteristic.LeakDetected.LEAK_NOT_DETECTED);
            });
            accessory.storeCharacteristicItem("water", accessory.context.deviceData.deviceid, leakChar);
        }

        // Status Active
        const statusChar = acc.getCharacteristic(this.Characteristic.StatusActive);
        if (!statusChar._events.get) {
            statusChar.on("get", (callback) => {
                callback(null, accessory.context.deviceData.status.toLowerCase() === "online");
            });
            accessory.storeCharacteristicItem("status", accessory.context.deviceData.deviceid, statusChar);
        }

        if (accessory.hasCapability("Tamper Alert")) {
            const tamperChar = acc.getCharacteristic(this.Characteristic.StatusTampered);
            if (!tamperChar._events.get) {
                tamperChar.on("get", (callback) => {
                    const tampered = accessory.context.deviceData.attributes.tamper === "detected";
                    callback(null, tampered ? this.Characteristic.StatusTampered.TAMPERED : this.Characteristic.StatusTampered.NOT_TAMPERED);
                });
                accessory.storeCharacteristicItem("tamper", accessory.context.deviceData.deviceid, tamperChar);
            }
        }

        accessory.context.deviceGroups.push("water_sensor");
        return accessory;
    }

    // Support Methods
    getValidButtonValues(accessory) {
        const validValues = [];

        if (accessory.hasCapability("PushableButton")) {
            validValues.push(this.Characteristic.ProgrammableSwitchEvent.SINGLE_PRESS);
        }
        if (accessory.hasCapability("DoubleTapableButton")) {
            validValues.push(this.Characteristic.ProgrammableSwitchEvent.DOUBLE_PRESS);
        }
        if (accessory.hasCapability("HoldableButton")) {
            validValues.push(this.Characteristic.ProgrammableSwitchEvent.LONG_PRESS);
        }

        if (validValues.length === 0) {
            validValues.push(this.Characteristic.ProgrammableSwitchEvent.SINGLE_PRESS);
            validValues.push(this.Characteristic.ProgrammableSwitchEvent.LONG_PRESS);
        }

        return validValues;
    }

    handleButtonEvent(btnNum, btnVal, devId, btnMap) {
        this.logManager.logDebug(`Button Press Event... | Button Number: (${btnNum}) | Button Value: ${btnVal}`);

        const buttonService = btnMap[`${devId}_${btnNum}`];
        if (!buttonService) return;

        let eventValue;
        switch (btnVal) {
            case "pushed":
                eventValue = this.Characteristic.ProgrammableSwitchEvent.SINGLE_PRESS;
                break;
            case "held":
                eventValue = this.Characteristic.ProgrammableSwitchEvent.LONG_PRESS;
                break;
            case "doubleTapped":
                eventValue = this.Characteristic.ProgrammableSwitchEvent.DOUBLE_PRESS;
                break;
            default:
                return;
        }

        buttonService.getCharacteristic(this.Characteristic.ProgrammableSwitchEvent).setValue(eventValue);
    }

    // Air Quality Sensor
    air_quality(accessory, service) {
        const acc = accessory.getOrAddService(service);

        // Air Quality
        const airQualityChar = acc.getCharacteristic(this.Characteristic.AirQuality);
        if (!airQualityChar._events.get) {
            airQualityChar.on("get", (callback) => {
                const aqi = accessory.context.deviceData.attributes.airQualityIndex;
                callback(null, this.convertAirQualityIndex(aqi));
            });
            accessory.storeCharacteristicItem("airQualityIndex", accessory.context.deviceData.deviceid, airQualityChar);
        }

        // Status Active
        const statusChar = acc.getCharacteristic(this.Characteristic.StatusActive);
        if (!statusChar._events.get) {
            statusChar.on("get", (callback) => {
                callback(null, accessory.context.deviceData.status.toLowerCase() === "online");
            });
            accessory.storeCharacteristicItem("status", accessory.context.deviceData.deviceid, statusChar);
        }

        // PM2.5 Density if supported
        if (accessory.hasAttribute("pm25")) {
            const pm25Char = acc.getCharacteristic(this.Characteristic.PM2_5Density);
            if (!pm25Char._events.get) {
                pm25Char.on("get", (callback) => {
                    callback(null, accessory.context.deviceData.attributes.pm25);
                });
                accessory.storeCharacteristicItem("pm25", accessory.context.deviceData.deviceid, pm25Char);
            }
        }

        if (accessory.hasCapability("Tamper Alert")) {
            const tamperChar = acc.getCharacteristic(this.Characteristic.StatusTampered);
            if (!tamperChar._events.get) {
                tamperChar.on("get", (callback) => {
                    const tampered = accessory.context.deviceData.attributes.tamper === "detected";
                    callback(null, tampered ? this.Characteristic.StatusTampered.TAMPERED : this.Characteristic.StatusTampered.NOT_TAMPERED);
                });
                accessory.storeCharacteristicItem("tamper", accessory.context.deviceData.deviceid, tamperChar);
            }
        }

        accessory.context.deviceGroups.push("air_quality");
        return accessory;
    }

    // Virtual Mode, Piston, and Routine handlers
    virtual_mode(accessory, service) {
        const acc = accessory.getOrAddService(service);

        const onChar = acc.getCharacteristic(this.Characteristic.On);
        if (!onChar._events.get || !onChar._events.set) {
            onChar
                .on("get", (callback) => {
                    callback(null, this.transforms.onOff(accessory.context.deviceData.attributes.switch));
                })
                .on("set", (value, callback) => {
                    if (value && accessory.context.deviceData.attributes.switch === "off") {
                        accessory.sendCommand(callback, accessory, accessory.context.deviceData, "mode");
                    } else {
                        callback();
                    }
                });
            accessory.storeCharacteristicItem("switch", accessory.context.deviceData.deviceid, onChar);
        }

        accessory.context.deviceGroups.push("virtual_mode");
        return accessory;
    }

    virtual_piston(accessory, service) {
        const acc = accessory.getOrAddService(service);

        const onChar = acc.getCharacteristic(this.Characteristic.On);
        if (!onChar._events.get || !onChar._events.set) {
            onChar
                .on("get", (callback) => {
                    callback(null, false);
                })
                .on("set", (value, callback) => {
                    if (value) {
                        accessory.sendCommand(callback, accessory, accessory.context.deviceData, "piston");
                        setTimeout(() => {
                            accessory.context.deviceData.attributes.switch = "off";
                            onChar.updateValue(false);
                        }, 1000);
                    } else {
                        callback();
                    }
                });
            accessory.storeCharacteristicItem("switch", accessory.context.deviceData.deviceid, onChar);
        }

        accessory.context.deviceGroups.push("virtual_piston");
        return accessory;
    }

    virtual_routine(accessory, service) {
        const acc = accessory.getOrAddService(service);

        const onChar = acc.getCharacteristic(this.Characteristic.On);
        if (!onChar._events.get || !onChar._events.set) {
            onChar
                .on("get", (callback) => {
                    callback(null, false);
                })
                .on("set", (value, callback) => {
                    if (value) {
                        accessory.sendCommand(callback, accessory, accessory.context.deviceData, "routine");
                        setTimeout(() => {
                            accessory.context.deviceData.attributes.switch = "off";
                            onChar.updateValue(false);
                        }, 1000);
                    } else {
                        callback();
                    }
                });
            accessory.storeCharacteristicItem("switch", accessory.context.deviceData.deviceid, onChar);
        }

        accessory.context.deviceGroups.push("virtual_routine");
        return accessory;
    }

    // Support Methods for Air Quality
    convertAirQualityIndex(aqi) {
        if (aqi === undefined || aqi > 500 || aqi < 0) {
            return this.Characteristic.AirQuality.UNKNOWN;
        } else if (aqi <= 50) {
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

    // Thermostat Support Methods
    thermostatSupportedModes(deviceData) {
        const hasHeatSetpoint = deviceData.attributes.heatingSetpoint !== undefined && deviceData.attributes.heatingSetpoint !== null;
        const hasCoolSetpoint = deviceData.attributes.coolingSetpoint !== undefined && deviceData.attributes.coolingSetpoint !== null;
        const supportedModes = deviceData.attributes.supportedThermostatModes || [];

        const validModes = [this.Characteristic.TargetHeatingCoolingState.OFF];

        if (supportedModes.includes("heat") || supportedModes.includes("emergency heat") || hasHeatSetpoint) {
            validModes.push(this.Characteristic.TargetHeatingCoolingState.HEAT);
        }

        if (supportedModes.includes("cool") || hasCoolSetpoint) {
            validModes.push(this.Characteristic.TargetHeatingCoolingState.COOL);
        }

        if (supportedModes.includes("auto") || (hasCoolSetpoint && hasHeatSetpoint)) {
            validModes.push(this.Characteristic.TargetHeatingCoolingState.AUTO);
        }

        return validModes;
    }

    // Temperature Conversion Methods
    thermostatTempConversion(temp, isSet = false) {
        if (isSet) {
            return this.configManager.getTempUnit() === "C" ? Math.round(temp) : Math.round(temp * 1.8 + 32);
        } else {
            return this.configManager.getTempUnit() === "C" ? Math.round(temp * 10) / 10 : Math.round(((temp - 32) / 1.8) * 10) / 10;
        }
    }

    // Thermostat State Transforms
    transforms = {
        thermostatOperatingState: (val) => {
            switch (val) {
                case "pending cool":
                case "cooling":
                    return this.Characteristic.CurrentHeatingCoolingState.COOL;
                case "pending heat":
                case "heating":
                    return this.Characteristic.CurrentHeatingCoolingState.HEAT;
                default:
                    return this.Characteristic.CurrentHeatingCoolingState.OFF;
            }
        },

        thermostatMode: (val) => {
            switch (val) {
                case "cool":
                    return this.Characteristic.TargetHeatingCoolingState.COOL;
                case "emergency heat":
                case "heat":
                    return this.Characteristic.TargetHeatingCoolingState.HEAT;
                case "auto":
                    return this.Characteristic.TargetHeatingCoolingState.AUTO;
                default:
                    return this.Characteristic.TargetHeatingCoolingState.OFF;
            }
        },

        thermostatModeCommand: (val) => {
            switch (val) {
                case this.Characteristic.TargetHeatingCoolingState.COOL:
                    return "cool";
                case this.Characteristic.TargetHeatingCoolingState.HEAT:
                    return "heat";
                case this.Characteristic.TargetHeatingCoolingState.AUTO:
                    return "auto";
                case this.Characteristic.TargetHeatingCoolingState.OFF:
                    return "off";
                default:
                    return undefined;
            }
        },
    };

    // Fan Speed Conversion Methods
    fanSpeedConversion(speedVal) {
        if (speedVal <= 0) return "off";
        if (speedVal <= 20) return "low";
        if (speedVal <= 40) return "medium-low";
        if (speedVal <= 60) return "medium";
        if (speedVal <= 80) return "medium-high";
        return "high";
    }

    // Alarm System Methods
    convertAlarmState(value) {
        switch (value) {
            case "armedHome":
                return this.Characteristic.SecuritySystemCurrentState.STAY_ARM;
            case "armedNight":
                return this.Characteristic.SecuritySystemCurrentState.NIGHT_ARM;
            case "armedAway":
                return this.Characteristic.SecuritySystemCurrentState.AWAY_ARM;
            case "disarmed":
                return this.Characteristic.SecuritySystemCurrentState.DISARMED;
            case "intrusion":
            case "intrusion-home":
            case "intrusion-away":
            case "intrusion-night":
                return this.Characteristic.SecuritySystemCurrentState.ALARM_TRIGGERED;
            default:
                return this.Characteristic.SecuritySystemCurrentState.DISARMED;
        }
    }

    convertAlarmCmd(value) {
        switch (value) {
            case this.Characteristic.SecuritySystemCurrentState.STAY_ARM:
                return "armHome";
            case this.Characteristic.SecuritySystemCurrentState.AWAY_ARM:
                return "armAway";
            case this.Characteristic.SecuritySystemCurrentState.NIGHT_ARM:
                return "armNight";
            case this.Characteristic.SecuritySystemCurrentState.DISARMED:
            default:
                return "disarm";
        }
    }

    // Utility Methods
    isAdaptiveLightingSupported(accessory) {
        return this.configManager.getConfigValue("adaptive_lighting") !== false && accessory.isAdaptiveLightingSupported && !accessory.hasDeviceFlag("light_no_al") && accessory.hasAttribute("level") && accessory.hasAttribute("colorTemperature");
    }

    shouldConsiderFanByName(name) {
        return this.configManager.getConfigValue("consider_fan_by_name") !== false && name.toLowerCase().includes("fan");
    }

    shouldConsiderLightByName(name) {
        return this.configManager.getConfigValue("consider_light_by_name") === true && name.toLowerCase().includes("light");
    }

    // Event Handling Method
    handleAttributeUpdate(accessory, attribute, newValue, oldValue) {
        this.logManager.logDebug(`Attribute Update | Device: ${accessory.displayName} | ` + `Attribute: ${attribute} | Old: ${oldValue} | New: ${newValue}`);

        const deviceInstance = this._deviceInstances.get(accessory.UUID);
        if (deviceInstance) {
            deviceInstance.forEach((instance) => {
                if (instance.supportedAttributes?.includes(attribute)) {
                    instance.handleAttributeUpdate(attribute, newValue, oldValue);
                }
            });
        }
    }
}

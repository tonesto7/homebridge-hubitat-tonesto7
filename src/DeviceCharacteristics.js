// DeviceCharacteristics.js

export default class DeviceCharacteristics {
    constructor(platform, accessories) {
        this.config = platform.configManager.getConfig();
        this.Service = platform.Service;
        this.Characteristic = platform.Characteristic;
        this.CommunityTypes = platform.CommunityTypes;
        this.accessories = accessories;
        this.logManager = platform.logManager;
        this.client = accessories.client;
        this.transforms = accessories.transforms;
        this.tempUnit = platform.configManager.getTempUnit();

        platform.configManager.onConfigUpdate(this.handleConfigUpdate.bind(this));
    }

    handleConfigUpdate(newConfig) {
        this.config = newConfig;
    }

    // Acceleration Sensor
    accelerationSensor(_accessory) {
        const svc = _accessory.getOrAddService(this.Service.MotionSensor);
        const devData = _accessory.context.deviceData;

        _accessory.getOrAddCharacteristic(svc, this.Characteristic.MotionDetected, {
            getHandler: () => {
                const val = devData.attributes.acceleration;
                return val === "active";
            },
            updateHandler: (value) => value === "active",
            storeAttribute: "acceleration",
        });

        _accessory.getOrAddCharacteristic(svc, this.Characteristic.StatusActive, {
            getHandler: () => {
                const status = devData.status;
                return status !== "OFFLINE" && status !== "INACTIVE";
            },
            updateHandler: (value) => value !== "OFFLINE" && value !== "INACTIVE",
            storeAttribute: "status",
        });

        _accessory.getOrAddCharacteristic(svc, this.Characteristic.StatusTampered, {
            preReqChk: () => _accessory.hasCapability("TamperAlert"),
            getHandler: () => {
                const val = devData.attributes.tamper;
                return val === "detected" ? this.Characteristic.StatusTampered.TAMPERED : this.Characteristic.StatusTampered.NOT_TAMPERED;
            },
            updateHandler: (value) => value === "detected",
            storeAttribute: "tamper",
            removeIfMissingPreReq: true,
        });

        _accessory.context.deviceGroups.push("acceleration_sensor");
        return _accessory;
    }

    // Air Purifier
    airPurifier(_accessory) {
        const svc = _accessory.getOrAddService(this.Service.AirPurifier);
        const devData = _accessory.context.deviceData;

        _accessory.getOrAddCharacteristic(svc, this.Characteristic.Active, {
            getHandler: () => {
                return devData.attributes.switch === "on" ? this.Characteristic.Active.ACTIVE : this.Characteristic.Active.INACTIVE;
            },
            setHandler: (value) => {
                _accessory.sendCommand(value ? "on" : "off");
            },
            updateHandler: (value) => {
                return value === "on" ? this.Characteristic.Active.ACTIVE : this.Characteristic.Active.INACTIVE;
            },
            storeAttribute: "switch",
        });

        _accessory.getOrAddCharacteristic(svc, this.Characteristic.CurrentAirPurifierState, {
            getHandler: () => {
                return devData.attributes.switch === "on" ? this.Characteristic.CurrentAirPurifierState.PURIFYING_AIR : this.Characteristic.CurrentAirPurifierState.INACTIVE;
            },
            updateHandler: (value) => {
                return value === "on" ? this.Characteristic.CurrentAirPurifierState.PURIFYING_AIR : this.Characteristic.CurrentAirPurifierState.INACTIVE;
            },
            storeAttribute: "switch",
        });

        _accessory.getOrAddCharacteristic(svc, this.CommunityTypes.FanOscillationMode, {
            getHandler: () => {
                const val = devData.attributes.fanMode;
                const modeMappings = {
                    low: this.CommunityTypes.FanOscillationMode.LOW,
                    medium: this.CommunityTypes.FanOscillationMode.MEDIUM,
                    high: this.CommunityTypes.FanOscillationMode.HIGH,
                    sleep: this.CommunityTypes.FanOscillationMode.SLEEP,
                };
                return modeMappings[val] || this.CommunityTypes.FanOscillationMode.SLEEP;
            },
            setHandler: (value) => {
                const modeMappings = {
                    [this.CommunityTypes.FanOscillationMode.LOW]: "low",
                    [this.CommunityTypes.FanOscillationMode.MEDIUM]: "medium",
                    [this.CommunityTypes.FanOscillationMode.HIGH]: "high",
                    [this.CommunityTypes.FanOscillationMode.SLEEP]: "sleep",
                };
                _accessory.sendCommand("setFanMode", [modeMappings[value]]);
            },
            updateHandler: (value) => {
                return modeMappings[value] || this.CommunityTypes.FanOscillationMode.SLEEP;
            },
            storeAttribute: "fanMode",
        });

        _accessory.context.deviceGroups.push("air_purifier");
        return _accessory;
    }

    // Air Quality Sensor
    airQuality(_accessory) {
        const svc = _accessory.getOrAddService(this.Service.AirQualitySensor);
        const devData = _accessory.context.deviceData;

        const stateMappings = (aqi) => {
            if (aqi <= 50) return this.Characteristic.AirQuality.EXCELLENT;
            if (aqi <= 100) return this.Characteristic.AirQuality.GOOD;
            if (aqi <= 150) return this.Characteristic.AirQuality.FAIR;
            if (aqi <= 200) return this.Characteristic.AirQuality.INFERIOR;
            return this.Characteristic.AirQuality.POOR;
        };

        svc.setCharacteristic(this.Characteristic.StatusFault, this.Characteristic.StatusFault.NO_FAULT);

        _accessory.getOrAddCharacteristic(svc, this.Characteristic.StatusActive, {
            getHandler: () => devData.status !== "OFFLINE" && devData.status !== "INACTIVE",
            updateHandler: (value) => value !== "OFFLINE" && value !== "INACTIVE",
            storeAttribute: "status",
        });

        _accessory.getOrAddCharacteristic(svc, this.Characteristic.AirQuality, {
            getHandler: () => {
                const aqi = devData.attributes.airQualityIndex;
                return stateMappings(aqi);
            },
            updateHandler: (value) => {
                return stateMappings(value);
            },
            storeAttribute: "airQualityIndex",
        });

        _accessory.getOrAddCharacteristic(svc, this.Characteristic.StatusLowBattery, {
            getHandler: () => {
                const battery = devData.attributes.battery;
                return battery < 20 ? this.Characteristic.StatusLowBattery.BATTERY_LEVEL_LOW : this.Characteristic.StatusLowBattery.BATTERY_LEVEL_NORMAL;
            },
            updateHandler: (value) => {
                return value < 20 ? this.Characteristic.StatusLowBattery.BATTERY_LEVEL_LOW : this.Characteristic.StatusLowBattery.BATTERY_LEVEL_NORMAL;
            },
            storeAttribute: "battery",
        });

        _accessory.getOrAddCharacteristic(svc, this.Characteristic.PM2_5Density, {
            preReqChk: () => _accessory.hasAttribute("pm25"),
            getHandler: () => {
                const val = parseFloat(devData.attributes.pm25);
                return this.clampValue(val, 0, 1000);
            },
            updateHandler: (value) => {
                return this.clampValue(value, 0, 1000);
            },
            storeAttribute: "pm25",
            removeIfMissingPreReq: true,
        });

        _accessory.getOrAddCharacteristic(svc, this.Characteristic.StatusTampered, {
            preReqChk: () => _accessory.hasCapability("TamperAlert"),
            getHandler: () => {
                return devData.attributes.tamper === "detected" ? this.Characteristic.StatusTampered.TAMPERED : this.Characteristic.StatusTampered.NOT_TAMPERED;
            },
            updateHandler: (value) => {
                return value === "detected" ? this.Characteristic.StatusTampered.TAMPERED : this.Characteristic.StatusTampered.NOT_TAMPERED;
            },
            storeAttribute: "tamper",
            removeIfMissingPreReq: true,
        });

        _accessory.context.deviceGroups.push("air_quality");
        return _accessory;
    }

    // Alarm System
    alarmSystem(_accessory) {
        const svc = _accessory.getOrAddService(this.Service.SecuritySystem);
        const devData = _accessory.context.deviceData;

        const currentStateMappings = {
            disarmed: this.Characteristic.SecuritySystemCurrentState.DISARMED,
            armedHome: this.Characteristic.SecuritySystemCurrentState.STAY_ARM,
            armedAway: this.Characteristic.SecuritySystemCurrentState.AWAY_ARM,
            armedNight: this.Characteristic.SecuritySystemCurrentState.NIGHT_ARM,
            intrusion: this.Characteristic.SecuritySystemCurrentState.ALARM_TRIGGERED,
            "intrusion-home": this.Characteristic.SecuritySystemCurrentState.ALARM_TRIGGERED,
            "intrusion-away": this.Characteristic.SecuritySystemCurrentState.ALARM_TRIGGERED,
            "intrusion-night": this.Characteristic.SecuritySystemCurrentState.ALARM_TRIGGERED,
        };

        const targetStateMappings = {
            disarmed: this.Characteristic.SecuritySystemTargetState.DISARM,
            armedHome: this.Characteristic.SecuritySystemTargetState.STAY_ARM,
            armedAway: this.Characteristic.SecuritySystemTargetState.AWAY_ARM,
            armedNight: this.Characteristic.SecuritySystemTargetState.NIGHT_ARM,
        };

        _accessory.getOrAddCharacteristic(svc, this.Characteristic.SecuritySystemCurrentState, {
            getHandler: () => {
                const val = devData.attributes.alarmSystemStatus;
                return currentStateMappings[val] || this.Characteristic.SecuritySystemCurrentState.DISARMED;
            },
            updateHandler: (value) => {
                return currentStateMappings[value] || this.Characteristic.SecuritySystemCurrentState.DISARMED;
            },
            storeAttribute: "alarmSystemStatus",
        });

        _accessory.getOrAddCharacteristic(svc, this.Characteristic.SecuritySystemTargetState, {
            getHandler: () => {
                const val = devData.attributes.alarmSystemStatus;
                return targetStateMappings[val] || this.Characteristic.SecuritySystemTargetState.DISARM;
            },
            setHandler: (value) => {
                const cmdMappings = {
                    [this.Characteristic.SecuritySystemTargetState.DISARM]: "disarm",
                    [this.Characteristic.SecuritySystemTargetState.STAY_ARM]: "armHome",
                    [this.Characteristic.SecuritySystemTargetState.AWAY_ARM]: "armAway",
                    [this.Characteristic.SecuritySystemTargetState.NIGHT_ARM]: "armNight",
                };
                _accessory.sendCommand(cmdMappings[value] || "disarm");
            },
            updateHandler: (value) => {
                return targetStateMappings[value] || this.Characteristic.SecuritySystemTargetState.DISARM;
            },
            storeAttribute: "alarmSystemStatus",
        });

        _accessory.context.deviceGroups.push("alarm_system");
        return _accessory;
    }

    // Battery Service
    battery(_accessory) {
        const svc = _accessory.getOrAddService(this.Service.Battery);
        const devData = _accessory.context.deviceData;

        const chargingStateMappings = (source) => {
            switch (source) {
                case "mains":
                case "dc":
                case "USB Cable":
                    return this.Characteristic.ChargingState.CHARGING;
                case "battery":
                    return this.Characteristic.ChargingState.NOT_CHARGING;
                default:
                    return this.Characteristic.ChargingState.NOT_CHARGEABLE;
            }
        };

        _accessory.getOrAddCharacteristic(svc, this.Characteristic.BatteryLevel, {
            getHandler: () => {
                const level = parseInt(devData.attributes.battery);
                return this.clampValue(level, 0, 100);
            },
            updateHandler: (value) => {
                return this.clampValue(value, 0, 100);
            },
            storeAttribute: "battery",
        });

        _accessory.getOrAddCharacteristic(svc, this.Characteristic.StatusLowBattery, {
            getHandler: () => {
                return devData.attributes.battery < 20 ? this.Characteristic.StatusLowBattery.BATTERY_LEVEL_LOW : this.Characteristic.StatusLowBattery.BATTERY_LEVEL_NORMAL;
            },
            updateHandler: (value) => {
                return value < 20 ? this.Characteristic.StatusLowBattery.BATTERY_LEVEL_LOW : this.Characteristic.StatusLowBattery.BATTERY_LEVEL_NORMAL;
            },
            storeAttribute: "battery",
        });

        _accessory.getOrAddCharacteristic(svc, this.Characteristic.ChargingState, {
            getHandler: () => {
                const source = devData.attributes.powerSource;
                return chargingStateMappings(source);
            },
            updateHandler: (value) => {
                return chargingStateMappings(value);
            },
            storeAttribute: "powerSource",
        });

        _accessory.context.deviceGroups.push("battery");
        return _accessory;
    }

    // Button
    button(_accessory) {
        const _service = this.Service.StatelessProgrammableSwitch;
        const buttonCount = Math.min(Math.max(_accessory.context.deviceData.attributes.numberOfButtons || 1, 1), 10);
        const validValues = this.transforms.getSupportedButtonValues(_accessory);

        for (let btnNum = 1; btnNum <= buttonCount; btnNum++) {
            const oldServiceName = `${_accessory.context.deviceData.deviceid}_${btnNum}`;
            const newServiceName = `${_accessory.context.deviceData.deviceid} Button ${btnNum}`;

            // Find existing service
            let btnService = _accessory.services.find((s) => s.UUID === _service.UUID && (s.displayName === oldServiceName || s.subtype === btnNum.toString()));

            // Update old format service
            if (btnService && btnService.displayName === oldServiceName) {
                const nameChar = btnService.getCharacteristic(this.Characteristic.Name);
                if (nameChar) {
                    nameChar.updateValue(newServiceName);
                }
            }

            // Create new service if needed
            if (!btnService) {
                btnService = _accessory.getOrAddService(_service, newServiceName, btnNum.toString());
            }

            // Configure characteristics
            let c = btnService.getCharacteristic(this.Characteristic.ProgrammableSwitchEvent);
            c.setProps({
                validValues: validValues,
            });
            c.eventOnlyCharacteristic = true;

            if (!c._events.get) {
                c.on("get", (callback) => {
                    callback(null, null);
                });
                this.accessories.storeCharacteristicItem("button", _accessory.context.deviceData.deviceid, c);
            }

            btnService.getCharacteristic(this.Characteristic.ServiceLabelIndex).updateValue(btnNum);
        }

        _accessory.context.deviceGroups.push("button");
        return _accessory;
    }

    buttonEvent(btnNum, btnVal, devId, btnMap) {
        let bSvc = btnMap[`${devId}_${btnNum}`];
        if (bSvc) {
            let btnOut;
            switch (btnVal) {
                case "pushed":
                    btnOut = this.Characteristic.ProgrammableSwitchEvent.SINGLE_PRESS;
                    break;
                case "held":
                    btnOut = this.Characteristic.ProgrammableSwitchEvent.LONG_PRESS;
                    break;
                case "doubleTapped":
                    btnOut = this.Characteristic.ProgrammableSwitchEvent.DOUBLE_PRESS;
                    break;
            }
            bSvc.getCharacteristic(this.Characteristic.ProgrammableSwitchEvent).setValue(btnOut);
        }
    }

    // Carbon Dioxide Sensor
    carbonDioxide(_accessory) {
        const svc = _accessory.getOrAddService(this.Service.CarbonDioxideSensor);
        const devData = _accessory.context.deviceData;

        _accessory.getOrAddCharacteristic(svc, this.Characteristic.CarbonDioxideDetected, {
            getHandler: () => {
                const level = parseInt(devData.attributes.carbonDioxideMeasurement);
                return level < 2000 ? this.Characteristic.CarbonDioxideDetected.CO2_LEVELS_NORMAL : this.Characteristic.CarbonDioxideDetected.CO2_LEVELS_ABNORMAL;
            },
            updateHandler: (value) => {
                return value < 2000 ? this.Characteristic.CarbonDioxideDetected.CO2_LEVELS_NORMAL : this.Characteristic.CarbonDioxideDetected.CO2_LEVELS_ABNORMAL;
            },
            storeAttribute: "carbonDioxideMeasurement",
        });

        _accessory.getOrAddCharacteristic(svc, this.Characteristic.CarbonDioxideLevel, {
            getHandler: () => {
                const level = parseFloat(devData.attributes.carbonDioxideMeasurement);
                return this.clampValue(level, 0, 100000);
            },
            updateHandler: (value) => {
                return this.clampValue(value, 0, 100000);
            },
            storeAttribute: "carbonDioxideMeasurement",
        });

        _accessory.getOrAddCharacteristic(svc, this.Characteristic.StatusActive, {
            getHandler: () => devData.status !== "OFFLINE" && devData.status !== "INACTIVE",
            updateHandler: (value) => {
                return value !== "OFFLINE" && value !== "INACTIVE";
            },
            storeAttribute: "status",
        });

        _accessory.getOrAddCharacteristic(svc, this.Characteristic.StatusTampered, {
            preReqChk: () => _accessory.hasCapability("TamperAlert"),
            getHandler: () => {
                return devData.attributes.tamper === "detected" ? this.Characteristic.StatusTampered.TAMPERED : this.Characteristic.StatusTampered.NOT_TAMPERED;
            },
            updateHandler: (value) => {
                return value === "detected" ? this.Characteristic.StatusTampered.TAMPERED : this.Characteristic.StatusTampered.NOT_TAMPERED;
            },
            storeAttribute: "tamper",
            removeIfMissingPreReq: true,
        });

        _accessory.context.deviceGroups.push("carbon_dioxide");
        return _accessory;
    }

    // Carbon Monoxide Sensor
    carbonMonoxide(_accessory) {
        const svc = _accessory.getOrAddService(this.Service.CarbonMonoxideSensor);
        const devData = _accessory.context.deviceData;

        _accessory.getOrAddCharacteristic(svc, this.Characteristic.CarbonMonoxideDetected, {
            getHandler: () => {
                return devData.attributes.carbonMonoxide === "clear" ? this.Characteristic.CarbonMonoxideDetected.CO_LEVELS_NORMAL : this.Characteristic.CarbonMonoxideDetected.CO_LEVELS_ABNORMAL;
            },
            updateHandler: (value) => {
                return value === "clear" ? this.Characteristic.CarbonMonoxideDetected.CO_LEVELS_NORMAL : this.Characteristic.CarbonMonoxideDetected.CO_LEVELS_ABNORMAL;
            },
            storeAttribute: "carbonMonoxide",
        });

        _accessory.getOrAddCharacteristic(svc, this.Characteristic.StatusActive, {
            getHandler: () => devData.status !== "OFFLINE" && devData.status !== "INACTIVE",
            updateHandler: (value) => {
                return value !== "OFFLINE" && value !== "INACTIVE";
            },
            storeAttribute: "status",
        });

        _accessory.getOrAddCharacteristic(svc, this.Characteristic.StatusTampered, {
            preReqChk: () => _accessory.hasCapability("TamperAlert"),
            getHandler: () => {
                return devData.attributes.tamper === "detected" ? this.Characteristic.StatusTampered.TAMPERED : this.Characteristic.StatusTampered.NOT_TAMPERED;
            },
            updateHandler: (value) => {
                return value === "detected" ? this.Characteristic.StatusTampered.TAMPERED : this.Characteristic.StatusTampered.NOT_TAMPERED;
            },
            storeAttribute: "tamper",
            removeIfMissingPreReq: true,
        });

        _accessory.context.deviceGroups.push("carbon_monoxide");
        return _accessory;
    }

    contactSensor(_accessory) {
        const svc = _accessory.getOrAddService(this.Service.ContactSensor);
        const devData = _accessory.context.deviceData;

        _accessory.getOrAddCharacteristic(svc, this.Characteristic.ContactSensorState, {
            getHandler: () => {
                return devData.attributes.contact === "closed" ? this.Characteristic.ContactSensorState.CONTACT_DETECTED : this.Characteristic.ContactSensorState.CONTACT_NOT_DETECTED;
            },
            updateHandler: (value) => {
                return value === "closed" ? this.Characteristic.ContactSensorState.CONTACT_DETECTED : this.Characteristic.ContactSensorState.CONTACT_NOT_DETECTED;
            },
            storeAttribute: "contact",
        });

        _accessory.getOrAddCharacteristic(svc, this.Characteristic.StatusActive, {
            getHandler: () => devData.status !== "OFFLINE" && devData.status !== "INACTIVE",
            updateHandler: (value) => {
                return value !== "OFFLINE" && value !== "INACTIVE";
            },
            storeAttribute: "status",
        });

        _accessory.getOrAddCharacteristic(svc, this.Characteristic.StatusTampered, {
            preReqChk: () => _accessory.hasCapability("TamperAlert"),
            getHandler: () => {
                return devData.attributes.tamper === "detected" ? this.Characteristic.StatusTampered.TAMPERED : this.Characteristic.StatusTampered.NOT_TAMPERED;
            },
            updateHandler: (value) => {
                return value === "detected" ? this.Characteristic.StatusTampered.TAMPERED : this.Characteristic.StatusTampered.NOT_TAMPERED;
            },
            storeAttribute: "tamper",
            removeIfMissingPreReq: true,
        });

        _accessory.context.deviceGroups.push("contact_sensor");
        return _accessory;
    }

    energyMeter(_accessory) {
        const svc = _accessory.getOrAddService(this.CommunityTypes.KilowattHoursService);

        _accessory.getOrAddCharacteristic(svc, this.CommunityTypes.KilowattHours, {
            getHandler: () => parseFloat(devData.attributes.energy),
            updateHandler: (value) => parseFloat(value),
            storeAttribute: "energy",
        });

        _accessory.context.deviceGroups.push("energy_meter");
        return _accessory;
    }

    // Fan
    fan(_accessory) {
        const svc = _accessory.getOrAddService(this.Service.Fanv2);
        const devData = _accessory.context.deviceData;

        if (_accessory.hasAttribute("switch")) {
            _accessory.getOrAddCharacteristic(svc, this.Characteristic.Active, {
                getHandler: () => (devData.attributes.switch === "on" ? this.Characteristic.Active.ACTIVE : this.Characteristic.Active.INACTIVE),
                setHandler: (value) => _accessory.sendCommand(value === "on" ? "on" : "off"),
                updateHandler: (value) => (value === "on" ? this.Characteristic.Active.ACTIVE : this.Characteristic.Active.INACTIVE),
                storeAttribute: "switch",
            });

            _accessory.getOrAddCharacteristic(svc, this.Characteristic.CurrentFanState, {
                getHandler: () => (devData.attributes.switch === "on" ? this.Characteristic.CurrentFanState.BLOWING_AIR : this.Characteristic.CurrentFanState.IDLE),
                updateHandler: (value) => (value === "on" ? this.Characteristic.CurrentFanState.BLOWING_AIR : this.Characteristic.CurrentFanState.IDLE),
                storeAttribute: "switch",
            });
        } else {
            svc.removeCharacteristic(this.Characteristic.CurrentFanState);
            svc.removeCharacteristic(this.Characteristic.Active);
        }

        const spdSteps = _accessory.hasDeviceFlag("fan_3_spd") ? 33 : _accessory.hasDeviceFlag("fan_4_spd") ? 25 : _accessory.hasDeviceFlag("fan_5_spd") ? 20 : 1;

        const spdAttr = _accessory.hasAttribute("speed") && _accessory.hasCommand("setSpeed") ? "speed" : _accessory.hasAttribute("level") ? "level" : undefined;

        _accessory.getOrAddCharacteristic(svc, this.Characteristic.RotationSpeed, {
            preReqChk: () => _accessory.hasAttribute("level") || _accessory.hasAttribute("speed"),
            getHandler: () => {
                const val = parseInt(devData.attributes[spdAttr]);
                return this.clampValue(val, 0, 100);
            },
            setHandler: (value) => {
                _accessory.sendCommand(null, _accessory, devData, _accessory.hasCommand("setSpeed") ? "setSpeed" : "setLevel", { value1: parseInt(value) });
            },
            updateHandler: (value) => {
                return this.clampValue(value, 0, 100);
            },
            props: { minStep: spdSteps },
            storeAttribute: spdAttr,
        });

        _accessory.context.deviceGroups.push("fan");
        return _accessory;
    }

    filterMaintenance(_accessory) {
        const svc = _accessory.getOrAddService(this.Service.FilterMaintenance);
        const devData = _accessory.context.deviceData;

        _accessory.getOrAddCharacteristic(svc, this.Characteristic.FilterChangeIndication, {
            getHandler: () => (devData.attributes.filterStatus === "replace" ? this.Characteristic.FilterChangeIndication.CHANGE_FILTER : this.Characteristic.FilterChangeIndication.FILTER_OK),
            updateHandler: (value) => (value === "replace" ? this.Characteristic.FilterChangeIndication.CHANGE_FILTER : this.Characteristic.FilterChangeIndication.FILTER_OK),
            storeAttribute: "filterStatus",
        });

        _accessory.getOrAddCharacteristic(svc, this.Characteristic.FilterLifeLevel, {
            getHandler: () => (devData.attributes.filterStatus === "replace" ? 0 : 100),
            updateHandler: (value) => (value === "replace" ? 0 : 100),
            storeAttribute: "filterStatus",
        });

        _accessory.context.deviceGroups.push("filter_maintenance");
        return _accessory;
    }

    // Garage Door
    garageDoor(_accessory) {
        const svc = _accessory.getOrAddService(this.Service.GarageDoorOpener);
        const devData = _accessory.context.deviceData;

        const currentDoorStateMappings = {
            open: this.Characteristic.CurrentDoorState.OPEN,
            opening: this.Characteristic.CurrentDoorState.OPENING,
            closed: this.Characteristic.CurrentDoorState.CLOSED,
            closing: this.Characteristic.CurrentDoorState.CLOSING,
            unknown: this.Characteristic.CurrentDoorState.STOPPED,
        };

        _accessory.getOrAddCharacteristic(svc, this.Characteristic.CurrentDoorState, {
            getHandler: () => {
                return currentDoorStateMappings[devData.attributes.door] || this.Characteristic.CurrentDoorState.STOPPED;
            },
            updateHandler: (value) => currentDoorStateMappings[value] || this.Characteristic.CurrentDoorState.STOPPED,
            storeAttribute: "door",
        });

        _accessory.getOrAddCharacteristic(svc, this.Characteristic.TargetDoorState, {
            getHandler: () => (devData.attributes.door === "closed" ? this.Characteristic.TargetDoorState.CLOSED : this.Characteristic.TargetDoorState.OPEN),
            setHandler: (value) => _accessory.sendCommand(value === this.Characteristic.TargetDoorState.OPEN ? "open" : "close"),
            updateHandler: (value) => (value === "closed" ? this.Characteristic.TargetDoorState.CLOSED : this.Characteristic.TargetDoorState.OPEN),
            storeAttribute: "door",
        });

        _accessory.getOrAddCharacteristic(svc, this.Characteristic.ObstructionDetected).updateValue(false);

        _accessory.context.deviceGroups.push("garage_door");
        return _accessory;
    }

    humidifier(_accessory) {
        const svc = _accessory.getOrAddService(this.Service.HumidifierDehumidifier);
        const devData = _accessory.context.deviceData;

        if (_accessory.hasCapability("Humidifier") && _accessory.hasCapability("Dehumidifier")) {
            svc.setCharacteristic(this.Characteristic.TargetHumidifierDehumidifierState, this.Characteristic.TargetHumidifierDehumidifierState.HUMIDIFIER_OR_DEHUMIDIFIER);
        } else if (_accessory.hasCapability("Humidifier")) {
            svc.setCharacteristic(this.Characteristic.TargetHumidifierDehumidifierState, this.Characteristic.TargetHumidifierDehumidifierState.HUMIDIFIER).setCharacteristic(this.Characteristic.CurrentHumidifierDehumidifierState, this.Characteristic.CurrentHumidifierDehumidifierState.HUMIDIFYING);
        } else if (_accessory.hasCapability("Dehumidifier")) {
            svc.setCharacteristic(this.Characteristic.TargetHumidifierDehumidifierState, this.Characteristic.TargetHumidifierDehumidifierState.DEHUMIDIFIER).setCharacteristic(this.Characteristic.CurrentHumidifierDehumidifierState, this.Characteristic.CurrentHumidifierDehumidifierState.DEHUMIDIFYING);
        }

        _accessory.getOrAddCharacteristic(svc, this.Characteristic.CurrentRelativeHumidity, {
            getHandler: () => this.clampValue(parseFloat(devData.attributes.humidity), 0, 100),
            updateHandler: (value) => this.clampValue(value, 0, 100),
            storeAttribute: "humidity",
        });

        _accessory.getOrAddCharacteristic(svc, this.Characteristic.Active, {
            getHandler: () => (devData.attributes.switch === "on" ? this.Characteristic.Active.ACTIVE : this.Characteristic.Active.INACTIVE),
            setHandler: (value) => _accessory.sendCommand(value ? "on" : "off"),
            updateHandler: (value) => (value === "on" ? this.Characteristic.Active.ACTIVE : this.Characteristic.Active.INACTIVE),
            storeAttribute: "switch",
        });

        _accessory.getOrAddCharacteristic(svc, this.Characteristic.WaterLevel, {
            getHandler: () => this.clampValue(parseFloat(devData.attributes.waterLevel), 0, 100),
            updateHandler: (value) => this.clampValue(value, 0, 100),
            storeAttribute: "waterLevel",
        });

        _accessory.context.deviceGroups.push("humidifier");
        return _accessory;
    }

    // Humidity Sensor
    humiditySensor(_accessory) {
        const svc = _accessory.getOrAddService(this.Service.HumiditySensor);
        const devData = _accessory.context.deviceData;

        _accessory.getOrAddCharacteristic(svc, this.Characteristic.CurrentRelativeHumidity, {
            getHandler: () => this.clampValue(parseFloat(devData.attributes.humidity), 0, 100),
            updateHandler: (value) => this.clampValue(value, 0, 100),
            storeAttribute: "humidity",
        });

        _accessory.getOrAddCharacteristic(svc, this.Characteristic.StatusActive, {
            getHandler: () => devData.status !== "OFFLINE" && devData.status !== "INACTIVE",
            updateHandler: (value) => value !== "OFFLINE" && value !== "INACTIVE",
            storeAttribute: "status",
        });

        _accessory.getOrAddCharacteristic(svc, this.Characteristic.StatusTampered, {
            preReqChk: () => _accessory.hasCapability("TamperAlert"),
            getHandler: () => (devData.attributes.tamper === "detected" ? this.Characteristic.StatusTampered.TAMPERED : this.Characteristic.StatusTampered.NOT_TAMPERED),
            updateHandler: (value) => (value === "detected" ? this.Characteristic.StatusTampered.TAMPERED : this.Characteristic.StatusTampered.NOT_TAMPERED),
            storeAttribute: "tamper",
            removeIfMissingPreReq: true,
        });

        _accessory.context.deviceGroups.push("humidity_sensor");
        return _accessory;
    }

    illuminanceSensor(_accessory) {
        const svc = _accessory.getOrAddService(this.Service.LightSensor);
        const devData = _accessory.context.deviceData;

        _accessory.getOrAddCharacteristic(svc, this.Characteristic.CurrentAmbientLightLevel, {
            getHandler: () => this.clampValue(parseFloat(devData.attributes.illuminance), 0, 100000),
            updateHandler: (value) => this.clampValue(value, 0, 100000),
            props: { minValue: 0, maxValue: 100000 },
            storeAttribute: "illuminance",
        });

        _accessory.getOrAddCharacteristic(svc, this.Characteristic.StatusActive, {
            getHandler: () => devData.status !== "OFFLINE" && devData.status !== "INACTIVE",
            updateHandler: (value) => value !== "OFFLINE" && value !== "INACTIVE",
            storeAttribute: "status",
        });

        _accessory.getOrAddCharacteristic(svc, this.Characteristic.StatusTampered, {
            preReqChk: () => _accessory.hasCapability("TamperAlert"),
            getHandler: () => (devData.attributes.tamper === "detected" ? this.Characteristic.StatusTampered.TAMPERED : this.Characteristic.StatusTampered.NOT_TAMPERED),
            updateHandler: (value) => (value === "detected" ? this.Characteristic.StatusTampered.TAMPERED : this.Characteristic.StatusTampered.NOT_TAMPERED),
            storeAttribute: "tamper",
            removeIfMissingPreReq: true,
        });

        _accessory.context.deviceGroups.push("illuminance_sensor");
        return _accessory;
    }

    leakSensor(_accessory) {
        const svc = _accessory.getOrAddService(this.Service.LeakSensor);
        const devData = _accessory.context.deviceData;

        _accessory.getOrAddCharacteristic(svc, this.Characteristic.LeakDetected, {
            getHandler: () => (devData.attributes.water === "dry" ? this.Characteristic.LeakDetected.LEAK_NOT_DETECTED : this.Characteristic.LeakDetected.LEAK_DETECTED),
            updateHandler: (value) => (value === "dry" ? this.Characteristic.LeakDetected.LEAK_NOT_DETECTED : this.Characteristic.LeakDetected.LEAK_DETECTED),
            storeAttribute: "water",
        });

        _accessory.getOrAddCharacteristic(svc, this.Characteristic.StatusActive, {
            getHandler: () => devData.status !== "OFFLINE" && devData.status !== "INACTIVE",
            updateHandler: (value) => value !== "OFFLINE" && value !== "INACTIVE",
            storeAttribute: "status",
        });

        _accessory.getOrAddCharacteristic(svc, this.Characteristic.StatusTampered, {
            preReqChk: () => _accessory.hasCapability("TamperAlert"),
            getHandler: () => (devData.attributes.tamper === "detected" ? this.Characteristic.StatusTampered.TAMPERED : this.Characteristic.StatusTampered.NOT_TAMPERED),
            updateHandler: (value) => (value === "detected" ? this.Characteristic.StatusTampered.TAMPERED : this.Characteristic.StatusTampered.NOT_TAMPERED),
            storeAttribute: "tamper",
            removeIfMissingPreReq: true,
        });

        _accessory.context.deviceGroups.push("water_sensor");
        return _accessory;
    }

    // Light Bulb
    light(_accessory) {
        const svc = _accessory.getOrAddService(this.Service.Lightbulb);
        const devData = _accessory.context.deviceData;

        _accessory.getOrAddCharacteristic(svc, this.Characteristic.On, {
            getHandler: () => devData.attributes.switch === "on",
            setHandler: (value) => _accessory.sendCommand(value ? "on" : "off"),
            updateHandler: (value) => (value === "on" ? this.Characteristic.On.ON : this.Characteristic.On.OFF),
            storeAttribute: "switch",
        });

        _accessory.getOrAddCharacteristic(svc, this.Characteristic.Brightness, {
            preReqChk: () => _accessory.hasAttribute("level") && _accessory.hasCommand("setLevel"),
            getHandler: () => this.clampValue(parseInt(devData.attributes.level), 0, 100),
            setHandler: (value) => _accessory.sendCommand("setLevel", [value]),
            updateHandler: (value) => this.clampValue(value, 0, 100),
            storeAttribute: "level",
        });

        _accessory.getOrAddCharacteristic(svc, this.Characteristic.Hue, {
            preReqChk: () => _accessory.hasAttribute("hue") && _accessory.hasCommand("setHue"),
            getHandler: () => this.clampValue(parseInt(devData.attributes.hue), 0, 360),
            setHandler: (value) => _accessory.sendCommand("setHue", [value]),
            updateHandler: (value) => this.clampValue(value, 0, 360),
            props: { minValue: 0, maxValue: 360 },
            storeAttribute: "hue",
        });

        _accessory.getOrAddCharacteristic(svc, this.Characteristic.Saturation, {
            preReqChk: () => _accessory.hasAttribute("saturation") && _accessory.hasCommand("setSaturation"),
            getHandler: () => this.clampValue(parseInt(devData.attributes.saturation), 0, 100),
            setHandler: (value) => _accessory.sendCommand("setSaturation", [value]),
            updateHandler: (value) => this.clampValue(value, 0, 100),
            storeAttribute: "saturation",
        });

        _accessory.getOrAddCharacteristic(svc, this.Characteristic.ColorTemperature, {
            preReqChk: () => _accessory.hasAttribute("colorTemperature") && _accessory.hasCommand("setColorTemperature"),
            getHandler: () => {
                const kelvin = parseInt(devData.attributes.colorTemperature);
                return this.clampValue(Math.round(1000000 / kelvin), 140, 500);
            },
            setHandler: (value) => {
                const kelvin = Math.round(1000000 / value);
                _accessory.sendCommand("setColorTemperature", [kelvin]);
            },
            updateHandler: (value) => {
                const kelvin = Math.round(1000000 / value);
                return this.clampValue(kelvin, 140, 500);
            },
            props: { maxValue: 500, minValue: 140 },
            storeAttribute: "colorTemperature",
        });

        const canUseAL = this.config.adaptive_lighting !== false && _accessory.isAdaptiveLightingSupported && !_accessory.hasDeviceFlag("light_no_al") && _accessory.hasAttribute("level") && _accessory.hasAttribute("colorTemperature");

        if (canUseAL && !_accessory.adaptiveLightingController) {
            _accessory.addAdaptiveLightingController(svc);
        } else if (!canUseAL && _accessory.adaptiveLightingController) {
            _accessory.removeAdaptiveLightingController();
        }

        _accessory.context.deviceGroups.push("light_bulb");
        return _accessory;
    }

    // Lock Mechanism
    lock(_accessory) {
        const svc = _accessory.getOrAddService(this.Service.LockMechanism);
        const devData = _accessory.context.deviceData;

        const lockCurrentState = (state) => {
            switch (devData.attributes.lock) {
                case "locked":
                    return this.Characteristic.LockCurrentState.SECURED;
                case "unlocked":
                    return this.Characteristic.LockCurrentState.UNSECURED;
                default:
                    return this.Characteristic.LockCurrentState.UNKNOWN;
            }
        };

        _accessory.getOrAddCharacteristic(svc, this.Characteristic.LockCurrentState, {
            getHandler: () => lockCurrentState(devData.attributes.lock),
            updateHandler: (value) => lockCurrentState(value),
            storeAttribute: "lock",
        });

        _accessory.getOrAddCharacteristic(svc, this.Characteristic.LockTargetState, {
            getHandler: () => (devData.attributes.lock === "locked" ? this.Characteristic.LockTargetState.SECURED : this.Characteristic.LockTargetState.UNSECURED),
            setHandler: (value) => _accessory.sendCommand(value === this.Characteristic.LockTargetState.SECURED ? "lock" : "unlock"),
            updateHandler: (value) => (value === "locked" ? this.Characteristic.LockTargetState.SECURED : this.Characteristic.LockTargetState.UNSECURED),
            storeAttribute: "lock",
        });

        _accessory.context.deviceGroups.push("lock");
        return _accessory;
    }

    motionSensor(_accessory) {
        const svc = _accessory.getOrAddService(this.Service.MotionSensor);
        const devData = _accessory.context.deviceData;

        _accessory.getOrAddCharacteristic(svc, this.Characteristic.MotionDetected, {
            getHandler: () => devData.attributes.motion === "active",
            updateHandler: (value) => value === "active",
            storeAttribute: "motion",
        });

        _accessory.getOrAddCharacteristic(svc, this.Characteristic.StatusActive, {
            getHandler: () => devData.status !== "OFFLINE" && devData.status !== "INACTIVE",
            updateHandler: (value) => value !== "OFFLINE" && value !== "INACTIVE",
            storeAttribute: "status",
        });

        _accessory.getOrAddCharacteristic(svc, this.Characteristic.StatusTampered, {
            preReqChk: () => _accessory.hasCapability("TamperAlert"),
            getHandler: () => (devData.attributes.tamper === "detected" ? this.Characteristic.StatusTampered.TAMPERED : this.Characteristic.StatusTampered.NOT_TAMPERED),
            updateHandler: (value) => (value === "detected" ? this.Characteristic.StatusTampered.TAMPERED : this.Characteristic.StatusTampered.NOT_TAMPERED),
            storeAttribute: "tamper",
            removeIfMissingPreReq: true,
        });

        _accessory.context.deviceGroups.push("motion_sensor");
        return _accessory;
    }

    // Power Meter
    outlet(_accessory) {
        const svc = _accessory.getOrAddService(this.Service.Outlet);
        const devData = _accessory.context.deviceData;

        _accessory.getOrAddCharacteristic(svc, this.Characteristic.On, {
            getHandler: () => devData.attributes.switch === "on",
            setHandler: (value) => _accessory.sendCommand(value ? "on" : "off"),
            updateHandler: (value) => (value === "on" ? this.Characteristic.On.ON : this.Characteristic.On.OFF),
            storeAttribute: "switch",
        });

        _accessory.getOrAddCharacteristic(svc, this.Characteristic.OutletInUse, {
            getHandler: () => devData.attributes.switch === "on",
            updateHandler: (value) => value === "on",
            storeAttribute: "switch",
        });

        _accessory.context.deviceGroups.push("outlet");
        return _accessory;
    }

    powerMeter(_accessory) {
        const svc = _accessory.getOrAddService(this.CommunityTypes.WattService);
        const devData = _accessory.context.deviceData;

        _accessory.getOrAddCharacteristic(svc, this.CommunityTypes.Watts, {
            getHandler: () => parseFloat(devData.attributes.power),
            updateHandler: (value) => parseFloat(value),
            storeAttribute: "power",
        });

        _accessory.context.deviceGroups.push("power_meter");
        return _accessory;
    }

    presenceSensor(_accessory) {
        const svc = _accessory.getOrAddService(this.Service.OccupancySensor);
        const devData = _accessory.context.deviceData;

        _accessory.getOrAddCharacteristic(svc, this.Characteristic.OccupancyDetected, {
            getHandler: () => (devData.attributes.presence === "present" ? this.Characteristic.OccupancyDetected.OCCUPANCY_DETECTED : this.Characteristic.OccupancyDetected.OCCUPANCY_NOT_DETECTED),
            updateHandler: (value) => (value === "present" ? this.Characteristic.OccupancyDetected.OCCUPANCY_DETECTED : this.Characteristic.OccupancyDetected.OCCUPANCY_NOT_DETECTED),
            storeAttribute: "presence",
        });

        _accessory.getOrAddCharacteristic(svc, this.Characteristic.StatusActive, {
            getHandler: () => devData.status !== "OFFLINE" && devData.status !== "INACTIVE",
            updateHandler: (value) => value !== "OFFLINE" && value !== "INACTIVE",
            storeAttribute: "status",
        });

        _accessory.getOrAddCharacteristic(svc, this.Characteristic.StatusTampered, {
            preReqChk: () => _accessory.hasCapability("TamperAlert"),
            getHandler: () => (devData.attributes.tamper === "detected" ? this.Characteristic.StatusTampered.TAMPERED : this.Characteristic.StatusTampered.NOT_TAMPERED),
            updateHandler: (value) => (value === "detected" ? this.Characteristic.StatusTampered.TAMPERED : this.Characteristic.StatusTampered.NOT_TAMPERED),
            storeAttribute: "tamper",
            removeIfMissingPreReq: true,
        });

        _accessory.context.deviceGroups.push("presence_sensor");
        return _accessory;
    }

    // Smoke Detector
    smokeDetector(_accessory) {
        const svc = _accessory.getOrAddService(this.Service.SmokeSensor);
        const devData = _accessory.context.deviceData;

        _accessory.getOrAddCharacteristic(svc, this.Characteristic.SmokeDetected, {
            getHandler: () => (devData.attributes.smoke === "clear" ? this.Characteristic.SmokeDetected.SMOKE_NOT_DETECTED : this.Characteristic.SmokeDetected.SMOKE_DETECTED),
            updateHandler: (value) => (value === "clear" ? this.Characteristic.SmokeDetected.SMOKE_NOT_DETECTED : this.Characteristic.SmokeDetected.SMOKE_DETECTED),
            storeAttribute: "smoke",
        });

        _accessory.getOrAddCharacteristic(svc, this.Characteristic.StatusActive, {
            getHandler: () => devData.status !== "OFFLINE" && devData.status !== "INACTIVE",
            updateHandler: (value) => value !== "OFFLINE" && value !== "INACTIVE",
            storeAttribute: "status",
        });

        _accessory.getOrAddCharacteristic(svc, this.Characteristic.StatusTampered, {
            preReqChk: () => _accessory.hasCapability("TamperAlert"),
            getHandler: () => (devData.attributes.tamper === "detected" ? this.Characteristic.StatusTampered.TAMPERED : this.Characteristic.StatusTampered.NOT_TAMPERED),
            updateHandler: (value) => (value === "detected" ? this.Characteristic.StatusTampered.TAMPERED : this.Characteristic.StatusTampered.NOT_TAMPERED),
            storeAttribute: "tamper",
            removeIfMissingPreReq: true,
        });

        _accessory.context.deviceGroups.push("smoke_detector");
        return _accessory;
    }

    speaker(_accessory) {
        const svc = _accessory.getOrAddService(this.Service.Speaker);
        const devData = _accessory.context.deviceData;
        const isSonos = devData.manufacturerName === "Sonos";
        const lvlAttr = isSonos || _accessory.hasAttribute("volume") ? "volume" : _accessory.hasAttribute("level") ? "level" : undefined;

        _accessory.getOrAddCharacteristic(svc, this.Characteristic.Volume, {
            getHandler: () => this.clampValue(this.transformAttributeState(lvlAttr, devData.attributes[lvlAttr]) || 0, 0, 100),
            setHandler: (value) => {
                if (value >= 0 && value <= 100) {
                    _accessory.sendCommand(isSonos ? "setVolume" : `set${lvlAttr.charAt(0).toUpperCase() + lvlAttr.slice(1)}`, [value]);
                }
            },
            updateHandler: (value) => this.clampValue(value, 0, 100),
            storeAttribute: "volume",
        });

        _accessory.getOrAddCharacteristic(svc, this.Characteristic.Mute, {
            preReqChk: () => _accessory.hasCapability("AudioMute"),
            getHandler: () => devData.attributes.mute === "muted",
            setHandler: (value) => _accessory.sendCommand(value ? "mute" : "unmute"),
            updateHandler: (value) => value === "muted",
            storeAttribute: "mute",
        });

        _accessory.context.deviceGroups.push("speaker_device");
        return _accessory;
    }

    switchDevice(_accessory) {
        const svc = _accessory.getOrAddService(this.Service.Switch);
        const devData = _accessory.context.deviceData;

        _accessory.getOrAddCharacteristic(svc, this.Characteristic.On, {
            getHandler: () => devData.attributes.switch === "on",
            setHandler: (value) => _accessory.sendCommand(value ? "on" : "off"),
            updateHandler: (value) => value === "on",
            storeAttribute: "switch",
        });

        _accessory.context.deviceGroups.push("switch");
        return _accessory;
    }

    // Temperature Sensor
    temperatureSensor(_accessory) {
        const svc = _accessory.getOrAddService(this.Service.TemperatureSensor);
        const devData = _accessory.context.deviceData;

        _accessory.getOrAddCharacteristic(svc, this.Characteristic.CurrentTemperature, {
            getHandler: () => {
                const temp = parseFloat(devData.attributes.temperature);
                return this.tempUnit === "F" ? (temp - 32) / 1.8 : temp;
            },
            updateHandler: (value) => {
                const temp = parseFloat(value);
                return this.tempUnit === "F" ? (temp - 32) / 1.8 : temp;
            },
            props: { minValue: -100, maxValue: 200 },
            storeAttribute: "temperature",
        });

        _accessory.getOrAddCharacteristic(svc, this.Characteristic.StatusTampered, {
            preReqChk: () => _accessory.hasCapability("TamperAlert"),
            getHandler: () => (devData.attributes.tamper === "detected" ? this.Characteristic.StatusTampered.TAMPERED : this.Characteristic.StatusTampered.NOT_TAMPERED),
            updateHandler: (value) => (value === "detected" ? this.Characteristic.StatusTampered.TAMPERED : this.Characteristic.StatusTampered.NOT_TAMPERED),
            storeAttribute: "tamper",
            removeIfMissingPreReq: true,
        });

        _accessory.context.deviceGroups.push("temperature_sensor");
        return _accessory;
    }

    thermostat(_accessory) {
        const svc = _accessory.getOrAddService(this.Service.Thermostat);
        const devData = _accessory.context.deviceData;

        const getSupportedThermostatModes = () => {
            const modes = [this.Characteristic.TargetHeatingCoolingState.OFF];
            const supportedModes = _accessory.context.deviceData.attributes.supportedThermostatModes || [];

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
        };

        // Current Heating/Cooling State
        _accessory.getOrAddCharacteristic(svc, this.Characteristic.CurrentHeatingCoolingState, {
            getHandler: () => {
                switch (devData.attributes.thermostatOperatingState) {
                    case "heating":
                        return this.Characteristic.CurrentHeatingCoolingState.HEAT;
                    case "cooling":
                        return this.Characteristic.CurrentHeatingCoolingState.COOL;
                    default:
                        return this.Characteristic.CurrentHeatingCoolingState.OFF;
                }
            },
            updateHandler: (value) => {
                switch (value) {
                    case "heating":
                        return this.Characteristic.CurrentHeatingCoolingState.HEAT;
                    case "cooling":
                        return this.Characteristic.CurrentHeatingCoolingState.COOL;
                    default:
                        return this.Characteristic.CurrentHeatingCoolingState.OFF;
                }
            },
            storeAttribute: "thermostatOperatingState",
        });

        const validModes = getSupportedThermostatModes();
        _accessory.getOrAddCharacteristic(svc, this.Characteristic.TargetHeatingCoolingState, {
            getHandler: () => {
                switch (devData.attributes.thermostatMode) {
                    case "heat":
                        return this.Characteristic.TargetHeatingCoolingState.HEAT;
                    case "cool":
                        return this.Characteristic.TargetHeatingCoolingState.COOL;
                    case "auto":
                        return this.Characteristic.TargetHeatingCoolingState.AUTO;
                    default:
                        return this.Characteristic.TargetHeatingCoolingState.OFF;
                }
            },
            setHandler: (value) => {
                const modes = ["off", "heat", "cool", "auto"];
                _accessory.sendCommand("setThermostatMode", [modes[value]]);
            },
            updateHandler: (value) => {
                switch (value) {
                    case "heat":
                        return this.Characteristic.TargetHeatingCoolingState.HEAT;
                    case "cool":
                        return this.Characteristic.TargetHeatingCoolingState.COOL;
                    case "auto":
                        return this.Characteristic.TargetHeatingCoolingState.AUTO;
                    default:
                        return this.Characteristic.TargetHeatingCoolingState.OFF;
                }
            },
            props: { validValues: validModes },
            storeAttribute: "thermostatMode",
        });

        _accessory.getOrAddCharacteristic(svc, this.Characteristic.CurrentTemperature, {
            getHandler: () => {
                const temp = parseFloat(devData.attributes.temperature);
                return this.tempUnit === "F" ? (temp - 32) / 1.8 : temp;
            },
            updateHandler: (value) => {
                const temp = parseFloat(value);
                return this.tempUnit === "F" ? (temp - 32) / 1.8 : temp;
            },
            storeAttribute: "temperature",
        });

        _accessory.getOrAddCharacteristic(svc, this.Characteristic.TargetTemperature, {
            getHandler: () => {
                const targetTemp = this.transforms.thermostatTargetTemp(devData);
                return targetTemp ? (this.tempUnit === "F" ? (targetTemp - 32) / 1.8 : targetTemp) : null;
            },
            setHandler: (value) => {
                const temp = this.tempUnit === "F" ? value * 1.8 + 32 : value;
                const targetObj = this.transforms.thermostatTargetTemp_set(devData);
                if (targetObj?.cmdName && targetObj?.attrName) {
                    _accessory.sendCommand(targetObj.cmdName, [temp]);
                    devData.attributes[targetObj.attrName] = temp;
                }
            },
            updateHandler: (value) => {
                const temp = this.tempUnit === "F" ? value * 1.8 + 32 : value;
                return temp;
            },
            storeAttribute: "thermostatSetpoint",
        });

        _accessory.getOrAddCharacteristic(svc, this.Characteristic.TemperatureDisplayUnits, {
            value: this.tempUnit === "F" ? this.Characteristic.TemperatureDisplayUnits.FAHRENHEIT : this.Characteristic.TemperatureDisplayUnits.CELSIUS,
        });

        _accessory.context.deviceGroups.push("thermostat");
        return _accessory;
    }

    // Valve
    valve(_accessory) {
        const svc = _accessory.getOrAddService(this.Service.Valve);
        const devData = _accessory.context.deviceData;

        _accessory.getOrAddCharacteristic(svc, this.Characteristic.InUse, {
            getHandler: () => (devData.attributes.valve === "open" ? this.Characteristic.InUse.IN_USE : this.Characteristic.InUse.NOT_IN_USE),
            updateHandler: (value) => (value === "open" ? this.Characteristic.InUse.IN_USE : this.Characteristic.InUse.NOT_IN_USE),
            storeAttribute: "valve",
        });

        _accessory.getOrAddCharacteristic(svc, this.Characteristic.Active, {
            getHandler: () => (devData.attributes.valve === "open" ? this.Characteristic.Active.ACTIVE : this.Characteristic.Active.INACTIVE),
            setHandler: (value) => _accessory.sendCommand(value ? "open" : "close"),
            updateHandler: (value) => (value === "open" ? this.Characteristic.Active.ACTIVE : this.Characteristic.Active.INACTIVE),
            storeAttribute: "valve",
        });

        svc.setCharacteristic(this.Characteristic.ValveType, 0);

        _accessory.context.deviceGroups.push("valve");
        return _accessory;
    }

    virtualMode(_accessory) {
        const svc = _accessory.getOrAddService(this.Service.Switch);
        const devData = _accessory.context.deviceData;

        _accessory.getOrAddCharacteristic(svc, this.Characteristic.On, {
            getHandler: () => devData.attributes.switch === "on",
            setHandler: (value) => {
                if (value && devData.attributes.switch === "off") {
                    _accessory.sendCommand("mode");
                }
            },
            updateHandler: (value) => value === "on",
            storeAttribute: "switch",
        });

        _accessory.context.deviceGroups.push("virtual_mode");
        return _accessory;
    }

    virtualPiston(_accessory) {
        const svc = _accessory.getOrAddService(this.Service.Switch);
        const devData = _accessory.context.deviceData;

        _accessory.getOrAddCharacteristic(svc, this.Characteristic.On, {
            getHandler: () => false,
            setHandler: (value) => {
                if (value) {
                    _accessory.sendCommand("piston");
                    setTimeout(() => {
                        devData.attributes.switch = "off";
                        svc.getCharacteristic(this.Characteristic.On).updateValue(false);
                    }, 1000);
                }
            },
            // updateHandler: (value) => value,
            storeAttribute: "switch",
        });

        _accessory.context.deviceGroups.push("virtual_piston");
        return _accessory;
    }

    windowCovering(_accessory) {
        const svc = _accessory.getOrAddService(this.Service.WindowCovering);
        const devData = _accessory.context.deviceData;
        const positionAttr = _accessory.hasCommand("setPosition") ? "position" : "level";

        _accessory.getOrAddCharacteristic(svc, this.Characteristic.CurrentPosition, {
            getHandler: () => parseInt(devData.attributes[positionAttr]),
            updateHandler: (value) => parseInt(value),
            props: { steps: 10 },
            storeAttribute: positionAttr,
        });

        _accessory.getOrAddCharacteristic(svc, this.Characteristic.TargetPosition, {
            getHandler: () => parseInt(devData.attributes[positionAttr]),
            setHandler: (value) => {
                if (_accessory.hasCommand("close") && value <= 2) {
                    _accessory.sendCommand("close");
                } else {
                    const v = value <= 2 ? 0 : value >= 98 ? 100 : value;
                    _accessory.sendCommand(_accessory.hasCommand("setPosition") ? "setPosition" : "setLevel", [v]);
                }
            },
            updateHandler: (value) => (value <= 2 ? 0 : value >= 98 ? 100 : value),
            storeAttribute: positionAttr,
        });

        _accessory.getOrAddCharacteristic(svc, this.Characteristic.PositionState, {
            getHandler: () => {
                switch (devData.attributes.windowShade) {
                    case "opening":
                        return this.Characteristic.PositionState.INCREASING;
                    case "closing":
                        return this.Characteristic.PositionState.DECREASING;
                    default:
                        return this.Characteristic.PositionState.STOPPED;
                }
            },
            updateHandler: (value) => {
                switch (value) {
                    case "opening":
                        return this.Characteristic.PositionState.INCREASING;
                    case "closing":
                        return this.Characteristic.PositionState.DECREASING;
                    default:
                        return this.Characteristic.PositionState.STOPPED;
                }
            },
            storeAttribute: "windowShade",
        });

        svc.setCharacteristic(this.Characteristic.ObstructionDetected, false).setCharacteristic(this.Characteristic.HoldPosition, false);

        _accessory.context.deviceGroups.push("window_shade");
        return _accessory;
    }
}

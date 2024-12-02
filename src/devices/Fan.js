export class Fan {
    constructor(platform) {
        this.logManager = platform.logManager;
        this.Service = platform.Service;
        this.Characteristic = platform.Characteristic;
        this.generateSrvcName = platform.generateSrvcName;
    }

    static relevantAttributes = ["switch", "speed", "level", "supportedFanSpeeds"];

    configure(accessory) {
        this.logManager.logDebug(`Configuring Fan for ${accessory.displayName}`);
        const svc = accessory.getOrAddService(this.Service.Fanv2, this.generateSrvcName(accessory.displayName, "Fan"));
        const devData = accessory.context.deviceData;

        this._configureActive(accessory, svc, devData);
        this._configureCurrentFanState(accessory, svc, devData);

        // Configure rotation speed based on supported attributes
        if (accessory.hasAttribute("speed") && accessory.hasCommand("setSpeed")) {
            this._configureSpeedControl(accessory, svc, devData);
        } else if (accessory.hasAttribute("level")) {
            this._configureLevelControl(accessory, svc, devData);
        }

        return accessory;
    }

    _configureActive(accessory, svc, devData) {
        accessory.getOrAddCharacteristic(svc, this.Characteristic.Active, {
            preReqChk: () => accessory.hasAttribute("switch"),
            getHandler: () => this._getActiveState(devData.attributes.switch),
            setHandler: (value) => accessory.sendCommand(value ? "on" : "off"),
            removeIfMissingPreReq: true,
        });
    }

    _configureCurrentFanState(accessory, svc, devData) {
        accessory.getOrAddCharacteristic(svc, this.Characteristic.CurrentFanState, {
            preReqChk: () => accessory.hasAttribute("switch"),
            getHandler: () => this._getCurrentFanState(devData.attributes.switch),
            removeIfMissingPreReq: true,
        });
    }

    _configureSpeedControl(accessory, svc, devData) {
        const supportedSpeeds = this._getSupportedSpeeds(accessory);
        if (!supportedSpeeds.length) return;

        accessory.getOrAddCharacteristic(svc, this.Characteristic.RotationSpeed, {
            preReqChk: () => accessory.hasAttribute("speed"),
            getHandler: () => this._speedToRotationSpeed(devData.attributes.speed, supportedSpeeds),
            setHandler: (value) => {
                const speedString = this._rotationSpeedToSpeed(value, supportedSpeeds);
                return accessory.sendCommand("setSpeed", [speedString]);
            },
            props: {
                minStep: Math.floor(100 / (supportedSpeeds.length - 1)),
                minValue: 0,
                maxValue: 100,
            },
        });
    }

    _configureLevelControl(accessory, svc, devData) {
        const spdSteps = this._getSpeedSteps(accessory);

        accessory.getOrAddCharacteristic(svc, this.Characteristic.RotationSpeed, {
            preReqChk: () => accessory.hasAttribute("level"),
            getHandler: () => this._getLevelValue(devData.attributes.level),
            setHandler: (value) => accessory.sendCommand("setLevel", [parseInt(value)]),
            updateHandler: (value) => this._getLevelValue(value),
            props: {
                minStep: spdSteps,
                minValue: 0,
                maxValue: 100,
            },
            storeAttribute: "level",
        });
    }

    _getSpeedSteps(accessory) {
        if (accessory.hasDeviceFlag("fan_3_spd")) return 33;
        if (accessory.hasDeviceFlag("fan_4_spd")) return 25;
        if (accessory.hasDeviceFlag("fan_5_spd")) return 20;
        if (accessory.hasDeviceFlag("fan_6_spd")) return 16;
        return 1;
    }

    _getSupportedSpeeds(accessory) {
        if (accessory.hasAttribute("supportedFanSpeeds")) {
            try {
                const supported = JSON.parse(accessory.context.deviceData.attributes.supportedFanSpeeds);
                if (Array.isArray(supported) && supported.length) {
                    return supported.filter((speed) => speed !== "off" && speed !== "on" && speed !== "auto");
                }
            } catch (e) {
                this.logManager.logWarn(`Failed to parse supportedFanSpeeds for ${accessory.displayName}`);
            }
        }

        if (accessory.hasDeviceFlag("fan_3_spd")) {
            return ["low", "medium", "high"];
        }
        if (accessory.hasDeviceFlag("fan_4_spd")) {
            return ["low", "medium-low", "medium-high", "high"];
        }
        if (accessory.hasDeviceFlag("fan_5_spd")) {
            return ["low", "medium-low", "medium", "medium-high", "high"];
        }

        return ["low", "medium", "high"];
    }

    _speedToRotationSpeed(speedString, supportedSpeeds) {
        if (!speedString || speedString === "off") return 0;
        if (speedString === "on") return 100;
        if (speedString === "auto") return 0;

        const index = supportedSpeeds.indexOf(speedString);
        if (index === -1) return 0;

        return Math.round((index / (supportedSpeeds.length - 1)) * 100);
    }

    _rotationSpeedToSpeed(rotationSpeed, supportedSpeeds) {
        if (rotationSpeed === 0) return "off";

        const index = Math.round((rotationSpeed / 100) * (supportedSpeeds.length - 1));
        return supportedSpeeds[Math.min(index, supportedSpeeds.length - 1)];
    }

    _getActiveState(value) {
        return value === "on" ? this.Characteristic.Active.ACTIVE : this.Characteristic.Active.INACTIVE;
    }

    _getCurrentFanState(value) {
        return value === "on" ? this.Characteristic.CurrentFanState.BLOWING_AIR : this.Characteristic.CurrentFanState.IDLE;
    }

    _getLevelValue(value) {
        if (value === null || value === undefined || isNaN(value)) return 0;
        return Math.min(Math.max(parseInt(value), 0), 100);
    }

    handleAttributeUpdate(accessory, update) {
        const { attribute, value } = update;
        this.logManager.logDebug(`Fan | ${accessory.displayName} | Attribute update: ${attribute} = ${value}`);
        if (!Fan.relevantAttributes.includes(attribute)) return;

        const svc = accessory.getService(this.Service.Fanv2, this.generateSrvcName(accessory.displayName, "Fan"));
        if (!svc) return;

        switch (attribute) {
            case "switch":
                svc.getCharacteristic(this.Characteristic.Active).updateValue(this._getActiveState(value));
                svc.getCharacteristic(this.Characteristic.CurrentFanState).updateValue(this._getCurrentFanState(value));
                break;
            case "speed": {
                const supportedSpeeds = this._getSupportedSpeeds(accessory);
                svc.getCharacteristic(this.Characteristic.RotationSpeed).updateValue(this._speedToRotationSpeed(value, supportedSpeeds));
                break;
            }
            case "level":
                svc.getCharacteristic(this.Characteristic.RotationSpeed).updateValue(this._getLevelValue(value));
                break;
            case "supportedFanSpeeds":
                if (accessory.hasAttribute("speed") && accessory.hasCommand("setSpeed")) {
                    this._configureSpeedControl(accessory, svc, accessory.context.deviceData);
                }
                break;
            default:
                this.logManager.logWarn(`Fan | ${accessory.displayName} | Unhandled attribute update: ${attribute} = ${value}`);
        }
    }
}

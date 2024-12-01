// devices/Fan.js
export class Fan {
    constructor(platform) {
        this.logManager = platform.logManager;
        this.Service = platform.Service;
        this.Characteristic = platform.Characteristic;
        this.generateSrvcName = platform.generateSrvcName;
    }

    static relevantAttributes = ["switch", "level", "speed"];

    configure(accessory) {
        this.logManager.logDebug(`Configuring Fan for ${accessory.displayName}`);
        const svc = accessory.getOrAddService(this.Service.Fanv2, this.generateSrvcName(accessory.displayName, "Fan"));
        const devData = accessory.context.deviceData;

        this._configureActive(accessory, svc, devData);
        this._configureCurrentFanState(accessory, svc, devData);
        this._configureRotationSpeed(accessory, svc, devData);

        accessory.context.deviceGroups.push("fan");
        return accessory;
    }

    _configureActive(accessory, svc, devData) {
        accessory.getOrAddCharacteristic(svc, this.Characteristic.Active, {
            preReqChk: () => accessory.hasAttribute("switch"),
            getHandler: () => (devData.attributes.switch === "on" ? this.Characteristic.Active.ACTIVE : this.Characteristic.Active.INACTIVE),
            setHandler: (value) => accessory.sendCommand(value ? "on" : "off"),
            updateHandler: (value) => (value === "on" ? this.Characteristic.Active.ACTIVE : this.Characteristic.Active.INACTIVE),
            storeAttribute: "switch",
            removeIfMissingPreReq: true,
        });
    }

    _configureCurrentFanState(accessory, svc, devData) {
        accessory.getOrAddCharacteristic(svc, this.Characteristic.CurrentFanState, {
            preReqChk: () => accessory.hasAttribute("switch"),
            getHandler: () => (devData.attributes.switch === "on" ? this.Characteristic.CurrentFanState.BLOWING_AIR : this.Characteristic.CurrentFanState.IDLE),
            updateHandler: (value) => (value === "on" ? this.Characteristic.CurrentFanState.BLOWING_AIR : this.Characteristic.CurrentFanState.IDLE),
            storeAttribute: "switch",
            removeIfMissingPreReq: true,
        });
    }

    _configureRotationSpeed(accessory, svc, devData) {
        const spdSteps = this._getSpeedSteps(accessory);
        const spdAttr = this._getSpeedAttribute(accessory);
        const spdCmd = accessory.hasCommand("setSpeed") ? "setSpeed" : "setLevel";

        if (!spdAttr) return;

        accessory.getOrAddCharacteristic(svc, this.Characteristic.RotationSpeed, {
            preReqChk: () => accessory.hasAttribute("level") || accessory.hasAttribute("speed"),
            getHandler: () => this._getRotationSpeed(devData.attributes[spdAttr]),
            setHandler: (value) => accessory.sendCommand(spdCmd, [parseInt(value)]),
            updateHandler: (value) => this._getRotationSpeed(value),
            props: { minStep: spdSteps },
            storeAttribute: spdAttr,
        });
    }

    _getSpeedSteps(accessory) {
        if (accessory.hasDeviceFlag("fan_3_spd")) return 33;
        if (accessory.hasDeviceFlag("fan_4_spd")) return 25;
        if (accessory.hasDeviceFlag("fan_5_spd")) return 20;
        if (accessory.hasDeviceFlag("fan_6_spd")) return 16;
        return 1;
    }

    _getSpeedAttribute(accessory) {
        if (accessory.hasAttribute("speed") && accessory.hasCommand("setSpeed")) return "speed";
        if (accessory.hasAttribute("level")) return "level";
        return undefined;
    }

    _getRotationSpeed(value) {
        value = parseInt(value);
        return this._clampValue(value, 0, 100);
    }

    _clampValue(value, min, max) {
        if (!value || isNaN(value)) return min;
        return Math.min(Math.max(value, min), max);
    }

    // Handle attribute updates
    handleAttributeUpdate(accessory, update) {
        const { attribute, value } = update;
        this.logManager.logInfo(`Fan | ${accessory.displayName} | Attribute update: ${attribute} = ${value}`);
        if (!Fan.relevantAttributes.includes(attribute)) return;

        const svc = accessory.getService(this.Service.Fanv2, this.generateSrvcName(accessory.displayName, "Fan"));
        if (!svc) return;

        switch (attribute) {
            case "switch":
                svc.getCharacteristic(this.Characteristic.Active).updateValue(this._getActiveState(value));
                break;
            case "level":
                svc.getCharacteristic(this.Characteristic.RotationSpeed).updateValue(this._getRotationSpeed(value));
                break;
            case "speed":
                svc.getCharacteristic(this.Characteristic.RotationSpeed).updateValue(this._getRotationSpeed(value));
                break;
            default:
                this.logManager.logWarn(`Fan | ${accessory.displayName} | Unhandled attribute update: ${attribute} = ${value}`);
        }
    }
}

// devices/Fan.js
export class Fan {
    constructor(platform) {
        this.logManager = platform.logManager;
        this.Service = platform.Service;
        this.Characteristic = platform.Characteristic;
    }

    configure(accessory) {
        this.logManager.logDebug(`Configuring Fan for ${accessory.displayName}`);
        const svc = accessory.getOrAddService(this.Service.Fanv2);
        const devData = accessory.context.deviceData;

        this._configureSwitchState(accessory, svc, devData);
        this._configureRotationSpeed(accessory, svc, devData);

        accessory.context.deviceGroups.push("fan");
        return accessory;
    }

    _configureSwitchState(accessory, svc, devData) {
        if (accessory.hasAttribute("switch")) {
            this._configureActive(accessory, svc, devData);
            this._configureCurrentFanState(accessory, svc, devData);
        } else {
            svc.removeCharacteristic(this.Characteristic.CurrentFanState);
            svc.removeCharacteristic(this.Characteristic.Active);
        }
    }

    _configureActive(accessory, svc, devData) {
        accessory.getOrAddCharacteristic(svc, this.Characteristic.Active, {
            getHandler: () => (devData.attributes.switch === "on" ? this.Characteristic.Active.ACTIVE : this.Characteristic.Active.INACTIVE),
            setHandler: (value) => accessory.sendCommand(value ? "on" : "off"),
            updateHandler: (value) => (value === "on" ? this.Characteristic.Active.ACTIVE : this.Characteristic.Active.INACTIVE),
            storeAttribute: "switch",
        });
    }

    _configureCurrentFanState(accessory, svc, devData) {
        accessory.getOrAddCharacteristic(svc, this.Characteristic.CurrentFanState, {
            getHandler: () => (devData.attributes.switch === "on" ? this.Characteristic.CurrentFanState.BLOWING_AIR : this.Characteristic.CurrentFanState.IDLE),
            updateHandler: (value) => (value === "on" ? this.Characteristic.CurrentFanState.BLOWING_AIR : this.Characteristic.CurrentFanState.IDLE),
            storeAttribute: "switch",
        });
    }

    _configureRotationSpeed(accessory, svc, devData) {
        const spdSteps = this._getSpeedSteps(accessory);
        const spdAttr = this._getSpeedAttribute(accessory);

        if (!spdAttr) return;

        accessory.getOrAddCharacteristic(svc, this.Characteristic.RotationSpeed, {
            preReqChk: () => accessory.hasAttribute("level") || accessory.hasAttribute("speed"),
            getHandler: () => {
                const val = parseInt(devData.attributes[spdAttr]);
                return this._clampValue(val, 0, 100);
            },
            setHandler: (value) => {
                accessory.sendCommand(accessory.hasCommand("setSpeed") ? "setSpeed" : "setLevel", [parseInt(value)]);
            },
            updateHandler: (value) => this._clampValue(value, 0, 100),
            props: { minStep: spdSteps },
            storeAttribute: spdAttr,
        });
    }

    _getSpeedSteps(accessory) {
        if (accessory.hasDeviceFlag("fan_3_spd")) return 33;
        if (accessory.hasDeviceFlag("fan_4_spd")) return 25;
        if (accessory.hasDeviceFlag("fan_5_spd")) return 20;
        return 1;
    }

    _getSpeedAttribute(accessory) {
        if (accessory.hasAttribute("speed") && accessory.hasCommand("setSpeed")) return "speed";
        if (accessory.hasAttribute("level")) return "level";
        return undefined;
    }

    _clampValue(value, min, max) {
        return Math.min(Math.max(value, min), max);
    }
}

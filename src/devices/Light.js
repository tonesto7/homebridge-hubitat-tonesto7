// devices/Light.js
export class Light {
    constructor(platform) {
        this.logManager = platform.logManager;
        this.Service = platform.Service;
        this.Characteristic = platform.Characteristic;
        this.config = platform.config;
    }

    configure(accessory) {
        this.logManager.logDebug(`Configuring Light for ${accessory.displayName}`);
        const svc = accessory.getOrAddService(this.Service.Lightbulb);
        const devData = accessory.context.deviceData;

        this._configureOnOff(accessory, svc, devData);
        this._configureBrightness(accessory, svc, devData);
        this._configureColor(accessory, svc, devData);
        this._configureColorTemperature(accessory, svc, devData);
        this._configureAdaptiveLighting(accessory, svc);

        accessory.context.deviceGroups.push("light_bulb");
        return accessory;
    }

    _configureOnOff(accessory, svc, devData) {
        accessory.getOrAddCharacteristic(svc, this.Characteristic.On, {
            getHandler: () => devData.attributes.switch === "on",
            setHandler: (value) => accessory.sendCommand(value ? "on" : "off"),
            updateHandler: (value) => value === "on",
            storeAttribute: "switch",
        });
    }

    _configureBrightness(accessory, svc, devData) {
        accessory.getOrAddCharacteristic(svc, this.Characteristic.Brightness, {
            preReqChk: () => accessory.hasAttribute("level") && accessory.hasCommand("setLevel"),
            getHandler: () => this._clampValue(parseInt(devData.attributes.level), 0, 100),
            setHandler: (value) => accessory.sendCommand("setLevel", [value]),
            updateHandler: (value) => this._clampValue(value, 0, 100),
            storeAttribute: "level",
        });
    }

    _configureColor(accessory, svc, devData) {
        if (accessory.hasAttribute("hue") && accessory.hasCommand("setHue")) {
            this._configureHue(accessory, svc, devData);
        }
        if (accessory.hasAttribute("saturation") && accessory.hasCommand("setSaturation")) {
            this._configureSaturation(accessory, svc, devData);
        }
    }

    _configureHue(accessory, svc, devData) {
        accessory.getOrAddCharacteristic(svc, this.Characteristic.Hue, {
            getHandler: () => this._clampValue(parseInt(devData.attributes.hue), 0, 360),
            setHandler: (value) => accessory.sendCommand("setHue", [value]),
            updateHandler: (value) => this._clampValue(value, 0, 360),
            props: { minValue: 0, maxValue: 360 },
            storeAttribute: "hue",
        });
    }

    _configureSaturation(accessory, svc, devData) {
        accessory.getOrAddCharacteristic(svc, this.Characteristic.Saturation, {
            getHandler: () => this._clampValue(parseInt(devData.attributes.saturation), 0, 100),
            setHandler: (value) => accessory.sendCommand("setSaturation", [value]),
            updateHandler: (value) => this._clampValue(value, 0, 100),
            storeAttribute: "saturation",
        });
    }

    _configureColorTemperature(accessory, svc, devData) {
        accessory.getOrAddCharacteristic(svc, this.Characteristic.ColorTemperature, {
            preReqChk: () => accessory.hasAttribute("colorTemperature") && accessory.hasCommand("setColorTemperature"),
            getHandler: () => {
                const kelvin = parseInt(devData.attributes.colorTemperature);
                return this._clampValue(Math.round(1000000 / kelvin), 140, 500);
            },
            setHandler: (value) => {
                const kelvin = Math.round(1000000 / value);
                accessory.sendCommand("setColorTemperature", [kelvin]);
            },
            updateHandler: (value) => {
                const kelvin = Math.round(1000000 / value);
                return this._clampValue(kelvin, 140, 500);
            },
            props: { maxValue: 500, minValue: 140 },
            storeAttribute: "colorTemperature",
        });
    }

    _configureAdaptiveLighting(accessory, svc) {
        const canUseAL = this.config.adaptive_lighting !== false && accessory.isAdaptiveLightingSupported && !accessory.hasDeviceFlag("light_no_al") && accessory.hasAttribute("level") && accessory.hasAttribute("colorTemperature");

        if (canUseAL && !accessory.adaptiveLightingController) {
            accessory.addAdaptiveLightingController(svc);
        } else if (!canUseAL && accessory.adaptiveLightingController) {
            accessory.removeAdaptiveLightingController();
        }
    }

    _clampValue(value, min, max) {
        return Math.min(Math.max(value, min), max);
    }
}

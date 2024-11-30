// devices/Speaker.js
export class Speaker {
    constructor(platform) {
        this.logManager = platform.logManager;
        this.Service = platform.Service;
        this.Characteristic = platform.Characteristic;
    }

    configure(accessory) {
        this.logManager.logDebug(`Configuring Speaker for ${accessory.displayName}`);
        const svc = accessory.getOrAddService(this.Service.Speaker);
        const devData = accessory.context.deviceData;

        const isSonos = devData.manufacturerName === "Sonos";
        const lvlAttr = isSonos || accessory.hasAttribute("volume") ? "volume" : accessory.hasAttribute("level") ? "level" : undefined;

        this._configureVolume(accessory, svc, devData, lvlAttr, isSonos);
        this._configureMute(accessory, svc, devData);

        accessory.context.deviceGroups.push("speaker_device");
        return accessory;
    }

    _configureVolume(accessory, svc, devData, lvlAttr, isSonos) {
        accessory.getOrAddCharacteristic(svc, this.Characteristic.Volume, {
            getHandler: () => this._clampValue(this._transformAttributeState(lvlAttr, devData.attributes[lvlAttr]) || 0, 0, 100),
            setHandler: (value) => {
                if (value >= 0 && value <= 100) {
                    accessory.sendCommand(isSonos ? "setVolume" : `set${lvlAttr.charAt(0).toUpperCase() + lvlAttr.slice(1)}`, [value]);
                }
            },
            updateHandler: (value) => this._clampValue(value, 0, 100),
            storeAttribute: "volume",
        });
    }

    _configureMute(accessory, svc, devData) {
        accessory.getOrAddCharacteristic(svc, this.Characteristic.Mute, {
            preReqChk: () => accessory.hasCapability("AudioMute"),
            getHandler: () => devData.attributes.mute === "muted",
            setHandler: (value) => accessory.sendCommand(value ? "mute" : "unmute"),
            updateHandler: (value) => value === "muted",
            storeAttribute: "mute",
        });
    }

    _transformAttributeState(attr, value) {
        return parseFloat(value);
    }

    _clampValue(value, min, max) {
        return Math.min(Math.max(value, min), max);
    }
}

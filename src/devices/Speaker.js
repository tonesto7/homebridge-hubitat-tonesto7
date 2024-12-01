// devices/Speaker.js
export class Speaker {
    constructor(platform) {
        this.logManager = platform.logManager;
        this.Service = platform.Service;
        this.Characteristic = platform.Characteristic;
        this.isSonos = false;
        this.levelAttr = null;
        this.generateSrvcName = platform.generateSrvcName;
    }

    static relevantAttributes = ["volume", "level", "mute"];

    configure(accessory) {
        this.logManager.logDebug(`Configuring Speaker for ${accessory.displayName}`);
        const svc = accessory.getOrAddService(this.Service.Speaker, this.generateSrvcName(accessory.displayName, "Speaker"));
        const devData = accessory.context.deviceData;

        this.isSonos = devData.manufacturerName === "Sonos";
        this.levelAttr = this.isSonos || accessory.hasAttribute("volume") ? "volume" : accessory.hasAttribute("level") ? "level" : undefined;

        this._configureVolume(accessory, svc, devData);
        this._configureMute(accessory, svc, devData);

        accessory.context.deviceGroups.push("speaker_device");
        return accessory;
    }

    _configureVolume(accessory, svc, devData) {
        accessory.getOrAddCharacteristic(svc, this.Characteristic.Volume, {
            getHandler: () => this._getVolume(devData.attributes[this.levelAttr]),
            setHandler: (value) => {
                if (this._validateVolume(value)) {
                    accessory.sendCommand(this.isSonos ? "setVolume" : `set${this.levelAttr.charAt(0).toUpperCase() + this.levelAttr.slice(1)}`, [value]);
                } else {
                    this.logManager.logError(`Invalid volume value: ${value}`);
                }
            },
            updateHandler: (value) => this._getVolume(value),
            props: this._getVolumeProps(),
            storeAttribute: this.levelAttr,
        });
    }

    _configureMute(accessory, svc, devData) {
        accessory.getOrAddCharacteristic(svc, this.Characteristic.Mute, {
            preReqChk: () => accessory.hasCapability("AudioMute"),
            getHandler: () => this._getMuteState(devData.attributes.mute),
            setHandler: (value) => accessory.sendCommand(value ? "mute" : "unmute"),
            updateHandler: (value) => this._getMuteState(value),
            storeAttribute: "mute",
        });
    }

    _getVolumeProps() {
        return { minValue: 0, maxValue: 100, step: 1 };
    }

    _validateVolume(value) {
        const validVolume = this._getVolumeProps();
        return value >= validVolume.minValue && value <= validVolume.maxValue;
    }

    _getVolume(value) {
        let volume = parseInt(value);
        return this._clampValue(volume, 0, 100);
    }

    _getMuteState(value) {
        return value === "muted";
    }

    _clampValue(value, min, max) {
        return Math.min(Math.max(value, min), max);
    }

    // Handle attribute updates
    handleAttributeUpdate(accessory, update) {
        const { attribute, value } = update;
        this.logManager.logInfo(`Speaker | ${accessory.displayName} | Attribute update: ${attribute} = ${value}`);
        if (!Speaker.relevantAttributes.includes(attribute)) return;

        const svc = accessory.getService(this.Service.Speaker, this.generateSrvcName(accessory.displayName, "Speaker"));
        if (!svc) return;

        switch (attribute) {
            case "volume":
            case "level":
                svc.getCharacteristic(this.Characteristic.Volume).updateValue(this._getVolume(value));
                break;
            case "mute":
                svc.getCharacteristic(this.Characteristic.Mute).updateValue(this._getMuteState(value));
                break;
            default:
                this.logManager.logWarn(`Speaker | ${accessory.displayName} | Unhandled attribute update: ${attribute} = ${value}`);
        }
    }
}

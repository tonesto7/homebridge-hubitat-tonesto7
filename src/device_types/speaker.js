import HubitatAccessory from "../HubitatAccessory.js";

export default class Speaker extends HubitatAccessory {
    constructor(platform, accessory) {
        super(platform, accessory);
        this.deviceData = accessory.context.deviceData;
        this.relevantAttributes = ["volume", "level", "mute"];
    }

    static isSupported(accessory) {
        return accessory.hasCapability("Speaker");
    }

    initializeService() {
        this.speakerSvc = this.getOrAddService(this.Service.Speaker);

        const isSonos = this.deviceData.manufacturerName === "Sonos";
        const lvlAttr = isSonos || this.hasAttribute("volume") ? "volume" : this.hasAttribute("level") ? "level" : undefined;

        if (lvlAttr) {
            this.getOrAddCharacteristic(this.speakerSvc, this.Characteristic.Volume, {
                getHandler: () => {
                    let volume = parseInt(this.deviceData.attributes[lvlAttr], 10);
                    volume = this.clamp(volume, 0, 100);
                    this.log.debug(`${this.accessory.displayName} | Speaker Volume Retrieved: ${volume}`);
                    return isNaN(volume) ? 0 : this.volumeToHomeKit(volume);
                },
                setHandler: (value) => {
                    const volume = this.volumeConversion(value);
                    this.log.info(`${this.accessory.displayName} | Setting speaker volume to ${volume}`);
                    if (isSonos && volume > 0) {
                        this.sendCommand(null, this.accessory, this.deviceData, "setVolume", { value1: volume });
                    } else if (volume > 0) {
                        const command = `set${lvlAttr.charAt(0).toUpperCase() + lvlAttr.slice(1)}`;
                        this.sendCommand(null, this.accessory, this.deviceData, command, { value1: volume });
                    }
                },
            });
        }

        this.getOrAddCharacteristic(this.speakerSvc, this.Characteristic.Mute, {
            preReqChk: () => this.hasCapability("AudioMute"),
            getHandler: () => {
                const isMuted = this.deviceData.attributes.mute === "muted";
                this.log.debug(`${this.accessory.displayName} | Speaker Mute Retrieved: ${isMuted}`);
                return isMuted;
            },
            setHandler: (value) => {
                const command = value ? "mute" : "unmute";
                this.log.info(`${this.accessory.displayName} | Setting speaker mute to ${value ? "Muted" : "Unmuted"}`);
                this.sendCommand(null, this.accessory, this.deviceData, command);
            },
            removeIfMissingPreReq: true,
        });

        this.accessory.context.deviceGroups.push("speaker_device");
    }

    handleAttributeUpdate(change) {
        if (!this.speakerSvc) {
            this.log.warn(`${this.accessory.displayName} | Speaker service not found`);
            return;
        }

        const isSonos = this.deviceData.manufacturerName === "Sonos";
        const lvlAttr = isSonos || this.hasAttribute("volume") ? "volume" : this.hasAttribute("level") ? "level" : undefined;

        switch (change.attribute) {
            case "volume":
            case "level":
                if (lvlAttr && change.attribute === lvlAttr) {
                    const volume = this.clamp(parseInt(change.value, 10), 0, 100);
                    this.updateCharacteristicValue(this.speakerSvc, this.Characteristic.Volume, this.volumeToHomeKit(volume));
                }
                break;
            case "mute":
                if (this.hasCapability("AudioMute")) {
                    const isMuted = change.value === "muted";
                    this.updateCharacteristicValue(this.speakerSvc, this.Characteristic.Mute, isMuted);
                }
                break;
            default:
                this.log.debug(`${this.accessory.displayName} | Unhandled attribute update: ${change.attribute}`);
        }
    }

    volumeConversion(volume) {
        return this.clamp(volume, 0, 100);
    }

    volumeToHomeKit(volume) {
        return this.clamp(volume, 0, 100);
    }
}

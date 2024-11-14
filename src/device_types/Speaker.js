// device_types/Speaker.js

import HubitatPlatformAccessory from "../HubitatPlatformAccessory.js";

export default class Speaker extends HubitatPlatformAccessory {
    constructor(platform, accessory) {
        super(platform, accessory);
        this.speakerService = null;
        this.isSonos = this.deviceData.manufacturerName === "Sonos";
    }

    async configureServices() {
        try {
            this.speakerService = this.getOrAddService(this.Service.Speaker);
            // this.markServiceForRetention(this.speakerService);

            // Volume
            const volumeAttr = this.isSonos || this.hasAttribute("volume") ? "volume" : this.hasAttribute("level") ? "level" : null;

            if (volumeAttr) {
                this.getOrAddCharacteristic(this.speakerService, this.Characteristic.Volume, {
                    getHandler: () => this.getVolume(volumeAttr),
                    setHandler: async (value) => this.setVolume(value, volumeAttr),
                });
            }

            // Mute (if supported)
            if (this.hasCapability("AudioMute")) {
                this.getOrAddCharacteristic(this.speakerService, this.Characteristic.Mute, {
                    getHandler: () => this.getMuteState(),
                    setHandler: async (value) => this.setMuteState(value),
                });
            }

            return true;
        } catch (error) {
            this.logError("Error configuring speaker services:", error);
            throw error;
        }
    }

    getVolume(attr) {
        return Math.max(0, Math.min(100, parseInt(this.deviceData.attributes[attr]) || 0));
    }

    async setVolume(value, attr) {
        if (value > 0) {
            if (this.isSonos) {
                await this.sendCommand("setVolume", { value1: value });
            } else {
                const command = `set${attr.charAt(0).toUpperCase() + attr.slice(1)}`;
                await this.sendCommand(command, { value1: value });
            }
        }
    }

    getMuteState() {
        return this.deviceData.attributes.mute === "muted";
    }

    async setMuteState(value) {
        await this.sendCommand(value ? "mute" : "unmute");
    }

    async handleAttributeUpdate(attribute, value) {
        this.updateDeviceAttribute(attribute, value);

        switch (attribute) {
            case "volume":
            case "level":
                if (!this.hasAttribute(attribute)) return;
                const volume = Math.max(0, Math.min(100, parseInt(value) || 0));
                this.speakerService.getCharacteristic(this.Characteristic.Volume).updateValue(volume);
                break;

            case "mute":
                if (!this.hasCapability("AudioMute")) return;
                this.speakerService.getCharacteristic(this.Characteristic.Mute).updateValue(value === "muted");
                break;

            default:
                this.logDebug(`Unhandled attribute update: ${attribute} = ${value}`);
        }
    }

    // Override cleanup
    async cleanup() {
        this.speakerService = null;
        await super.cleanup();
    }
}

import HubitatAccessory from "../HubitatAccessory.js";

export default class Speaker extends HubitatAccessory {
    constructor(platform, accessory) {
        super(platform, accessory);
        this.deviceData = accessory.context.deviceData;
    }

    static relevantAttributes = ["volume", "level", "mute"];

    /**
     * Initializes the speaker service for the accessory.
     *
     * This method sets up the speaker service and its characteristics, including volume and mute.
     * It handles the retrieval and setting of these characteristics based on the device's attributes.
     *
     * Characteristics:
     * - Volume: Retrieves and sets the volume of the speaker. Supports Sonos and other devices with volume or level attributes.
     * - Mute: Retrieves and sets the mute state of the speaker. Requires the "AudioMute" capability.
     *
     * The method also adds the speaker device group to the accessory.
     *
     * @async
     * @method initializeService
     */
    async initializeService() {
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
                        this.sendCommand(null, this.deviceData, "setVolume", { value1: volume });
                    } else if (volume > 0) {
                        const command = `set${lvlAttr.charAt(0).toUpperCase() + lvlAttr.slice(1)}`;
                        this.sendCommand(null, this.deviceData, command, { value1: volume });
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
                this.sendCommand(null, this.deviceData, command);
            },
            removeIfMissingPreReq: true,
        });

        this.accessory.deviceGroups.push("speaker_device");
    }

    /**
     * Handles updates to device attributes and updates the corresponding HomeKit characteristics.
     *
     * @param {Object} change - The change object containing attribute updates.
     * @param {string} change.attribute - The name of the attribute that has changed.
     * @param {string|number} change.value - The new value of the attribute.
     *
     * @returns {void}
     *
     * @example
     * handleAttributeUpdate({ attribute: 'volume', value: '50' });
     */
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

    /**
     * Converts the given volume to a value within the range of 0 to 100.
     *
     * @param {number} volume - The volume level to be converted.
     * @returns {number} - The volume level clamped between 0 and 100.
     */
    volumeConversion(volume) {
        return this.clamp(volume, 0, 100);
    }

    /**
     * Converts the given volume to a HomeKit-compatible volume level.
     *
     * @param {number} volume - The volume level to convert.
     * @returns {number} - The volume level clamped between 0 and 100.
     */
    volumeToHomeKit(volume) {
        return this.clamp(volume, 0, 100);
    }
}

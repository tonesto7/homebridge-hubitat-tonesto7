// device_types/speaker.js

module.exports = {
    isSupported: (accessory) => accessory.hasCapability("Speaker"),

    initializeAccessory: (accessory, deviceTypes) => {
        const { Service, Characteristic } = deviceTypes.mainPlatform;
        const service = accessory.getService(Service.Speaker) || accessory.addService(Service.Speaker);

        const isSonos = accessory.context.deviceData.manufacturerName === "Sonos";
        const lvlAttr = isSonos || accessory.hasAttribute("volume") ? "volume" : accessory.hasAttribute("level") ? "level" : undefined;

        /**
         * Clamps a value between a minimum and maximum.
         * @param {number} value - The value to clamp.
         * @param {number} min - The minimum allowable value.
         * @param {number} max - The maximum allowable value.
         * @returns {number} - The clamped value.
         */
        function clamp(value, min, max) {
            return Math.max(min, Math.min(max, value));
        }

        /**
         * Converts HomeKit Volume value to device-specific volume.
         * @param {number} volume - The HomeKit Volume value.
         * @returns {number} - The device-specific volume value.
         */
        function volumeConversion(volume) {
            // Implement any necessary conversion logic here
            return clamp(volume, 0, 100); // Assuming device supports 0-100
        }

        /**
         * Converts device-specific volume to HomeKit Volume.
         * @param {number} volume - The device-specific volume value.
         * @returns {number} - The HomeKit Volume value.
         */
        function volumeToHomeKit(volume) {
            // Implement any necessary conversion logic here
            return clamp(volume, 0, 100); // Assuming HomeKit expects 0-100
        }

        // Volume Characteristic
        if (lvlAttr) {
            service
                .getCharacteristic(Characteristic.Volume)
                .onGet(() => {
                    let volume = parseInt(accessory.context.deviceData.attributes[lvlAttr], 10);
                    volume = clamp(volume, 0, 100);
                    accessory.log.debug(`${accessory.name} | Speaker Volume Retrieved: ${volume}`);
                    return isNaN(volume) ? 0 : volumeToHomeKit(volume);
                })
                .onSet((value) => {
                    const volume = volumeConversion(value);
                    accessory.log.info(`${accessory.name} | Setting speaker volume to ${volume}`);
                    if (isSonos && volume > 0) {
                        accessory.sendCommand(null, accessory, accessory.context.deviceData, "setVolume", { value1: volume });
                    } else if (volume > 0) {
                        const command = `set${lvlAttr.charAt(0).toUpperCase() + lvlAttr.slice(1)}`;
                        accessory.sendCommand(null, accessory, accessory.context.deviceData, command, { value1: volume });
                    }
                });
        }

        // Mute Characteristic
        if (accessory.hasCapability("AudioMute")) {
            service
                .getCharacteristic(Characteristic.Mute)
                .onGet(() => {
                    const isMuted = accessory.context.deviceData.attributes.mute === "muted";
                    accessory.log.debug(`${accessory.name} | Speaker Mute Retrieved: ${isMuted}`);
                    return isMuted;
                })
                .onSet((value) => {
                    const command = value ? "mute" : "unmute";
                    accessory.log.info(`${accessory.name} | Setting speaker mute to ${value ? "Muted" : "Unmuted"}`);
                    accessory.sendCommand(null, accessory, accessory.context.deviceData, command);
                });
        }

        accessory.context.deviceGroups.push("speaker_device");
    },
};

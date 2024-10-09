// device_types/speaker.js

function clamp(value, min, max) {
    return Math.max(min, Math.min(max, value));
}

function volumeConversion(volume) {
    // Implement any necessary conversion logic here
    return clamp(volume, 0, 100); // Assuming device supports 0-100
}

function volumeToHomeKit(volume) {
    // Implement any necessary conversion logic here
    return clamp(volume, 0, 100); // Assuming HomeKit expects 0-100
}

module.exports = {
    isSupported: (accessory) => accessory.hasCapability("Speaker"),

    relevantAttributes: ["volume", "level", "mute"],

    initializeAccessory: (accessory, deviceClass) => {
        const { Service, Characteristic } = deviceClass.platform;
        const service = accessory.getService(Service.Speaker) || accessory.addService(Service.Speaker);

        const isSonos = accessory.context.deviceData.manufacturerName === "Sonos";
        const lvlAttr = isSonos || accessory.hasAttribute("volume") ? "volume" : accessory.hasAttribute("level") ? "level" : undefined;

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

    handleAttributeUpdate: (accessory, change, deviceClass) => {
        const { Characteristic, Service } = deviceClass.platform;
        const service = accessory.getService(Service.Speaker);

        if (!service) {
            accessory.log.warn(`${accessory.name} | Speaker service not found`);
            return;
        }

        const isSonos = accessory.context.deviceData.manufacturerName === "Sonos";
        const lvlAttr = isSonos || accessory.hasAttribute("volume") ? "volume" : accessory.hasAttribute("level") ? "level" : undefined;

        switch (change.attribute) {
            case "volume":
            case "level":
                if (lvlAttr && change.attribute === lvlAttr) {
                    const volume = clamp(parseInt(change.value, 10), 0, 100);
                    service.updateCharacteristic(Characteristic.Volume, volumeToHomeKit(volume));
                    accessory.log.debug(`${accessory.name} | Updated Speaker Volume: ${volume}`);
                }
                break;
            case "mute":
                if (accessory.hasCapability("AudioMute")) {
                    const isMuted = change.value === "muted";
                    service.updateCharacteristic(Characteristic.Mute, isMuted);
                    accessory.log.debug(`${accessory.name} | Updated Speaker Mute: ${isMuted}`);
                }
                break;
            default:
                accessory.log.debug(`${accessory.name} | Unhandled attribute update: ${change.attribute}`);
        }
    },
};

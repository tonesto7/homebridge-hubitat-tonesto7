// device_types/speaker.js

export function isSupported(accessory) {
    return accessory.hasCapability("Speaker");
}

export const relevantAttributes = ["volume", "level", "mute"];

export function initializeAccessory(accessory, deviceClass) {
    const { Service, Characteristic } = deviceClass.platform;
    const service = deviceClass.getOrAddService(accessory, Service.Speaker);

    const isSonos = accessory.context.deviceData.manufacturerName === "Sonos";
    const lvlAttr = isSonos || accessory.hasAttribute("volume") ? "volume" : accessory.hasAttribute("level") ? "level" : undefined;

    if (lvlAttr) {
        deviceClass.getOrAddCharacteristic(accessory, service, Characteristic.Volume, {
            getHandler: function () {
                let volume = parseInt(accessory.context.deviceData.attributes[lvlAttr], 10);
                volume = clamp(volume, 0, 100);
                accessory.log.debug(`${accessory.name} | Speaker Volume Retrieved: ${volume}`);
                return isNaN(volume) ? 0 : volumeToHomeKit(volume);
            },
            setHandler: function (value) {
                const volume = volumeConversion(value);
                accessory.log.info(`${accessory.name} | Setting speaker volume to ${volume}`);
                if (isSonos && volume > 0) {
                    accessory.sendCommand(null, accessory, accessory.context.deviceData, "setVolume", { value1: volume });
                } else if (volume > 0) {
                    const command = `set${lvlAttr.charAt(0).toUpperCase() + lvlAttr.slice(1)}`;
                    accessory.sendCommand(null, accessory, accessory.context.deviceData, command, { value1: volume });
                }
            },
        });
    }

    deviceClass.getOrAddCharacteristic(accessory, service, Characteristic.Mute, {
        preReqChk: (acc) => acc.hasCapability("AudioMute"),
        getHandler: function () {
            const isMuted = accessory.context.deviceData.attributes.mute === "muted";
            accessory.log.debug(`${accessory.name} | Speaker Mute Retrieved: ${isMuted}`);
            return isMuted;
        },
        setHandler: function (value) {
            const command = value ? "mute" : "unmute";
            accessory.log.info(`${accessory.name} | Setting speaker mute to ${value ? "Muted" : "Unmuted"}`);
            accessory.sendCommand(null, accessory, accessory.context.deviceData, command);
        },
        removeIfMissingPreReq: true,
    });

    accessory.context.deviceGroups.push("speaker_device");
}

export function handleAttributeUpdate(accessory, change, deviceClass) {
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
                deviceClass.updateCharacteristicValue(accessory, service, Characteristic.Volume, volumeToHomeKit(volume));
                // accessory.log.debug(`${accessory.name} | Updated Speaker Volume: ${volume}`);
            }
            break;
        case "mute":
            if (accessory.hasCapability("AudioMute")) {
                const isMuted = change.value === "muted";
                deviceClass.updateCharacteristicValue(accessory, service, Characteristic.Mute, isMuted);
                // accessory.log.debug(`${accessory.name} | Updated Speaker Mute: ${isMuted}`);
            }
            break;
        default:
            accessory.log.debug(`${accessory.name} | Unhandled attribute update: ${change.attribute}`);
    }
}

function clamp(value, min, max) {
    return Math.max(min, Math.min(max, value));
}

function volumeConversion(volume) {
    return clamp(volume, 0, 100);
}

function volumeToHomeKit(volume) {
    return clamp(volume, 0, 100);
}

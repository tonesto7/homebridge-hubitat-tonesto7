// device_types/presence_sensor.js

export function isSupported(accessory) {
    return accessory.hasCapability("PresenceSensor");
}

export const relevantAttributes = ["presence", "status", "tamper"];

export function initializeAccessory(accessory, deviceClass) {
    const { Service, Characteristic } = deviceClass.platform;
    const service = deviceClass.getOrAddService(accessory, Service.OccupancySensor);

    deviceClass.getOrAddCharacteristic(accessory, service, Characteristic.OccupancyDetected, {
        getHandler: function () {
            const occupancy = convertPresence(accessory.context.deviceData.attributes.presence, Characteristic);
            accessory.log.debug(`${accessory.name} | Occupancy Detected Retrieved: ${occupancy}`);
            return occupancy;
        },
    });

    deviceClass.getOrAddCharacteristic(accessory, service, Characteristic.StatusActive, {
        getHandler: function () {
            const isActive = accessory.context.deviceData.status === "online";
            accessory.log.debug(`${accessory.name} | Presence Sensor Status Active Retrieved: ${isActive}`);
            return isActive;
        },
    });

    deviceClass.getOrAddCharacteristic(accessory, service, Characteristic.StatusTampered, {
        preReqChk: (acc) => acc.hasCapability("TamperAlert"),
        getHandler: function () {
            const isTampered = accessory.context.deviceData.attributes.tamper === "detected";
            accessory.log.debug(`${accessory.name} | Presence Sensor Status Tampered Retrieved: ${isTampered}`);
            return isTampered;
        },
        removeIfMissingPreReq: true,
    });

    accessory.context.deviceGroups.push("presence_sensor");
}

export function handleAttributeUpdate(accessory, change, deviceClass) {
    const { Characteristic, Service } = deviceClass.platform;
    const service = accessory.getService(Service.OccupancySensor);

    if (!service) {
        accessory.log.warn(`${accessory.name} | Occupancy Sensor service not found`);
        return;
    }

    switch (change.attribute) {
        case "presence":
            const occupancy = convertPresence(change.value, Characteristic);
            deviceClass.updateCharacteristicValue(accessory, service, Characteristic.OccupancyDetected, occupancy);
            // accessory.log.debug(`${accessory.name} | Updated Occupancy Detected: ${occupancy}`);
            break;
        case "status":
            const isActive = change.value === "online";
            deviceClass.updateCharacteristicValue(accessory, service, Characteristic.StatusActive, isActive);
            // accessory.log.debug(`${accessory.name} | Updated Status Active: ${isActive}`);
            break;
        case "tamper":
            if (accessory.hasCapability("TamperAlert")) {
                const isTampered = change.value === "detected";
                deviceClass.updateCharacteristicValue(accessory, service, Characteristic.StatusTampered, isTampered);
                // accessory.log.debug(`${accessory.name} | Updated Status Tampered: ${isTampered}`);
            }
            break;
        default:
            accessory.log.debug(`${accessory.name} | Unhandled attribute update: ${change.attribute}`);
    }
}

function convertPresence(presence, Characteristic) {
    return presence === "present" ? Characteristic.OccupancyDetected.OCCUPANCY_DETECTED : Characteristic.OccupancyDetected.OCCUPANCY_NOT_DETECTED;
}

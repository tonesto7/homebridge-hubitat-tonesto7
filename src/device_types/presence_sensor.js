// device_types/presence_sensor.js

let DeviceClass, Characteristic, Service, CommunityTypes;

export function init(_deviceClass, _Characteristic, _Service, _CommunityTypes) {
    DeviceClass = _deviceClass;
    Characteristic = _Characteristic;
    Service = _Service;
    CommunityTypes = _CommunityTypes;
}

export function isSupported(accessory) {
    return accessory.hasCapability("PresenceSensor");
}

export const relevantAttributes = ["presence", "status", "tamper"];

export function initializeAccessory(accessory) {
    const occupancySvc = DeviceClass.getOrAddService(accessory, Service.OccupancySensor);

    DeviceClass.getOrAddCharacteristic(accessory, occupancySvc, Characteristic.OccupancyDetected, {
        getHandler: function () {
            const occupancy = convertPresence(accessory.context.deviceData.attributes.presence);
            accessory.log.debug(`${accessory.name} | Occupancy Detected Retrieved: ${occupancy}`);
            return occupancy;
        },
    });

    DeviceClass.getOrAddCharacteristic(accessory, occupancySvc, Characteristic.StatusActive, {
        getHandler: function () {
            const isActive = accessory.context.deviceData.status === "ACTIVE";
            accessory.log.debug(`${accessory.name} | Presence Sensor Status Active Retrieved: ${isActive}`);
            return isActive;
        },
    });

    DeviceClass.getOrAddCharacteristic(accessory, occupancySvc, Characteristic.StatusTampered, {
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

export function handleAttributeUpdate(accessory, change) {
    const occupancySvc = accessory.getService(Service.OccupancySensor);
    if (!occupancySvc) {
        accessory.log.warn(`${accessory.name} | Occupancy Sensor service not found`);
        return;
    }

    switch (change.attribute) {
        case "presence":
            const occupancy = convertPresence(change.value);
            DeviceClass.updateCharacteristicValue(accessory, occupancySvc, Characteristic.OccupancyDetected, occupancy);
            // accessory.log.debug(`${accessory.name} | Updated Occupancy Detected: ${occupancy}`);
            break;
        case "status":
            const isActive = change.value === "ACTIVE";
            DeviceClass.updateCharacteristicValue(accessory, occupancySvc, Characteristic.StatusActive, isActive);
            // accessory.log.debug(`${accessory.name} | Updated Status Active: ${isActive}`);
            break;
        case "tamper":
            if (accessory.hasCapability("TamperAlert")) {
                const isTampered = change.value === "detected";
                DeviceClass.updateCharacteristicValue(accessory, occupancySvc, Characteristic.StatusTampered, isTampered);
                // accessory.log.debug(`${accessory.name} | Updated Status Tampered: ${isTampered}`);
            }
            break;
        default:
            accessory.log.debug(`${accessory.name} | Unhandled attribute update: ${change.attribute}`);
    }
}

function convertPresence(presence) {
    return presence === "present" ? Characteristic.OccupancyDetected.OCCUPANCY_DETECTED : Characteristic.OccupancyDetected.OCCUPANCY_NOT_DETECTED;
}

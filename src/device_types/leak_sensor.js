// device_types/leak_sensor.js

let DeviceClass, Characteristic, Service, CommunityTypes;

export function init(_deviceClass, _Characteristic, _Service, _CommunityTypes) {
    DeviceClass = _deviceClass;
    Characteristic = _Characteristic;
    Service = _Service;
    CommunityTypes = _CommunityTypes;
}

export function isSupported(accessory) {
    return accessory.hasCapability("WaterSensor");
}

export const relevantAttributes = ["water", "status", "tamper"];

export function initializeAccessory(accessory) {
    const leakSensorSvc = DeviceClass.getOrAddService(accessory, Service.LeakSensor);

    DeviceClass.getOrAddCharacteristic(accessory, leakSensorSvc, Characteristic.LeakDetected, {
        getHandler: function () {
            const leak = convertWaterStatus(accessory.context.deviceData.attributes.water, Characteristic);
            accessory.log.debug(`${accessory.name} | Leak Detected Retrieved: ${leak}`);
            return leak;
        },
    });

    DeviceClass.getOrAddCharacteristic(accessory, leakSensorSvc, Characteristic.StatusActive, {
        getHandler: function () {
            const isActive = accessory.context.deviceData.status === "ACTIVE";
            accessory.log.debug(`${accessory.name} | Water Sensor Status Active Retrieved: ${isActive}`);
            return isActive;
        },
    });

    DeviceClass.getOrAddCharacteristic(accessory, leakSensorSvc, Characteristic.StatusTampered, {
        preReqChk: (acc) => acc.hasCapability("TamperAlert"),
        getHandler: function () {
            const isTampered = accessory.context.deviceData.attributes.tamper === "detected";
            accessory.log.debug(`${accessory.name} | Water Sensor Status Tampered Retrieved: ${isTampered}`);
            return isTampered;
        },
        removeIfMissingPreReq: true,
    });

    accessory.context.deviceGroups.push("leak_sensor");
}

export function handleAttributeUpdate(accessory, change) {
    const leakSensorSvc = accessory.getService(Service.LeakSensor);

    if (!leakSensorSvc) {
        accessory.log.warn(`${accessory.name} | Leak Sensor service not found`);
        return;
    }

    switch (change.attribute) {
        case "water":
            const leakDetected = convertWaterStatus(change.value, Characteristic);
            DeviceClass.updateCharacteristicValue(accessory, leakSensorSvc, Characteristic.LeakDetected, leakDetected);
            accessory.log.debug(`${accessory.name} | Updated Leak Detected: ${leakDetected}`);
            break;
        case "status":
            const isActive = change.value === "ACTIVE";
            DeviceClass.updateCharacteristicValue(accessory, leakSensorSvc, Characteristic.StatusActive, isActive);
            accessory.log.debug(`${accessory.name} | Updated Status Active: ${isActive}`);
            break;
        case "tamper":
            if (accessory.hasCapability("TamperAlert")) {
                const isTampered = change.value === "detected";
                DeviceClass.updateCharacteristicValue(accessory, leakSensorSvc, Characteristic.StatusTampered, isTampered);
                accessory.log.debug(`${accessory.name} | Updated Status Tampered: ${isTampered}`);
            }
            break;
        default:
            accessory.log.debug(`${accessory.name} | Unhandled attribute update: ${change.attribute}`);
    }
}

function convertWaterStatus(status) {
    return status === "dry" ? Characteristic.LeakDetected.LEAK_NOT_DETECTED : Characteristic.LeakDetected.LEAK_DETECTED;
}

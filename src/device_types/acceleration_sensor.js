// device_types/acceleration_sensor.js

let DeviceClass, Characteristic, Service, CommunityTypes;

export function init(_deviceClass, _Characteristic, _Service, _CommunityTypes) {
    DeviceClass = _deviceClass;
    Characteristic = _Characteristic;
    Service = _Service;
    CommunityTypes = _CommunityTypes;
}

export function isSupported(accessory) {
    return accessory.hasCapability("AccelerationSensor");
}

export const relevantAttributes = ["acceleration", "tamper", "status"];

export function initializeAccessory(accessory) {
    const motionSvc = DeviceClass.getOrAddService(accessory, Service.MotionSensor);

    // Motion Detected Characteristic
    DeviceClass.getOrAddCharacteristic(accessory, motionSvc, Characteristic.MotionDetected, {
        getHandler: function () {
            const motionDetected = accessory.context.deviceData.attributes.acceleration === "active";
            accessory.log.debug(`${accessory.name} | Motion Detected Retrieved: ${motionDetected}`);
            return motionDetected;
        },
    });

    // Status Active Characteristic
    DeviceClass.getOrAddCharacteristic(accessory, motionSvc, Characteristic.StatusActive, {
        getHandler: function () {
            const isActive = accessory.context.deviceData.status === "ACTIVE";
            accessory.log.debug(`${accessory.name} | Status Active Retrieved: ${isActive}`);
            return isActive;
        },
    });

    // Status Tampered Characteristic (if supported)
    DeviceClass.getOrAddCharacteristic(accessory, motionSvc, Characteristic.StatusTampered, {
        preReqChk: (acc) => acc.hasCapability("TamperAlert"),
        getHandler: function () {
            const isTampered = accessory.context.deviceData.attributes.tamper === "detected";
            accessory.log.debug(`${accessory.name} | Status Tampered Retrieved: ${isTampered}`);
            return isTampered;
        },
        removeIfMissingPreReq: true,
    });

    accessory.context.deviceGroups.push("acceleration_sensor");
}

export function handleAttributeUpdate(accessory, change) {
    const motionSvc = accessory.getService(Service.MotionSensor);
    if (!motionSvc) {
        accessory.log.warn(`${accessory.name} | Motion Sensor service not found`);
        return;
    }

    switch (change.attribute) {
        case "acceleration":
            DeviceClass.updateCharacteristicValue(accessory, motionSvc, Characteristic.MotionDetected, change.value === "active");
            break;
        case "tamper":
            if (accessory.hasCapability("TamperAlert")) {
                DeviceClass.updateCharacteristicValue(accessory, motionSvc, Characteristic.StatusTampered, change.value === "detected");
            }
            break;
        case "status":
            DeviceClass.updateCharacteristicValue(accessory, motionSvc, Characteristic.StatusActive, change.value === "ACTIVE");
            break;
        default:
            accessory.log.debug(`${accessory.name} | Unhandled attribute update: ${change.attribute}`);
    }
}

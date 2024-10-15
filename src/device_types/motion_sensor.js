// device_types/motion_sensor.js

let DeviceClass, Characteristic, Service, CommunityTypes;

export function init(_deviceClass, _Characteristic, _Service, _CommunityTypes) {
    DeviceClass = _deviceClass;
    Characteristic = _Characteristic;
    Service = _Service;
    CommunityTypes = _CommunityTypes;
}

export function isSupported(accessory) {
    return accessory.hasCapability("MotionSensor");
}

export const relevantAttributes = ["motion", "tamper", "status"];

export function initializeAccessory(accessory) {
    const motionSvc = DeviceClass.getOrAddService(accessory, Service.MotionSensor);

    DeviceClass.getOrAddCharacteristic(accessory, motionSvc, Characteristic.MotionDetected, {
        getHandler: function () {
            const motionDetected = accessory.context.deviceData.attributes.motion === "active";
            accessory.log.debug(`${accessory.name} | Motion Detected: ${motionDetected}`);
            return motionDetected;
        },
    });

    DeviceClass.getOrAddCharacteristic(accessory, motionSvc, Characteristic.StatusActive, {
        getHandler: function () {
            const isActive = accessory.context.deviceData.status === "ACTIVE";
            accessory.log.debug(`${accessory.name} | Status Active: ${isActive}`);
            return isActive;
        },
    });

    DeviceClass.getOrAddCharacteristic(accessory, motionSvc, Characteristic.StatusTampered, {
        preReqChk: (acc) => acc.hasCapability("TamperAlert"),
        getHandler: function () {
            const isTampered = accessory.context.deviceData.attributes.tamper === "detected";
            accessory.log.debug(`${accessory.name} | Status Tampered: ${isTampered}`);
            return isTampered;
        },
        removeIfMissingPreReq: true,
    });

    accessory.context.deviceGroups.push("motion_sensor");
}

export function handleAttributeUpdate(accessory, change) {
    const motionSvc = accessory.getService(Service.MotionSensor);

    if (!motionSvc) {
        accessory.log.warn(`${accessory.name} | Motion Sensor service not found`);
        return;
    }

    switch (change.attribute) {
        case "motion":
            DeviceClass.updateCharacteristicValue(accessory, motionSvc, Characteristic.MotionDetected, change.value === "active");
            // accessory.log.debug(`${accessory.name} | Updated Motion Detected: ${motionDetected}`);
            break;
        case "tamper":
            if (accessory.hasCapability("TamperAlert")) {
                const isTampered = change.value === "detected";
                DeviceClass.updateCharacteristicValue(accessory, motionSvc, Characteristic.StatusTampered, isTampered);
                // accessory.log.debug(`${accessory.name} | Updated Status Tampered: ${isTampered}`);
            }
            break;
        case "status":
            const isActive = change.value === "ACTIVE";
            DeviceClass.updateCharacteristicValue(accessory, motionSvc, Characteristic.StatusActive, isActive);
            // accessory.log.debug(`${accessory.name} | Updated Status Active: ${isActive}`);
            break;
        default:
            accessory.log.debug(`${accessory.name} | Unhandled attribute update: ${change.attribute}`);
    }
}

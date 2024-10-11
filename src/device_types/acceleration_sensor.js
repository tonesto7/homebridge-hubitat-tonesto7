// device_types/acceleration_sensor.js

export function isSupported(accessory) {
    return accessory.hasCapability("AccelerationSensor");
}

export const relevantAttributes = ["acceleration", "tamper", "status"];

export function initializeAccessory(accessory, deviceClass) {
    const { Service, Characteristic } = deviceClass.platform;
    const service = deviceClass.getOrAddService(accessory, Service.MotionSensor);

    const convertAccelerationStatus = (status) => {
        accessory.log.debug(`${accessory.name} | Acceleration Status: ${status}`);
        return status === "active" ? Characteristic.MotionDetected.MOTION_DETECTED : Characteristic.MotionDetected.NO_MOTION;
    };

    // Motion Detected Characteristic
    deviceClass.getOrAddCharacteristic(accessory, service, Characteristic.MotionDetected, {
        getHandler: function () {
            accessory.log.debug(`${accessory.name} | Motion Detected Retrieved: ${motionDetected}`);
            return convertAccelerationStatus(accessory.context.deviceData.attributes.acceleration);
        },
    });

    // Status Active Characteristic
    deviceClass.getOrAddCharacteristic(accessory, service, Characteristic.StatusActive, {
        getHandler: function () {
            const isActive = accessory.context.deviceData.status === "online";
            accessory.log.debug(`${accessory.name} | Status Active Retrieved: ${isActive}`);
            return isActive;
        },
    });

    // Status Tampered Characteristic (if supported)
    deviceClass.getOrAddCharacteristic(accessory, service, Characteristic.StatusTampered, {
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

export function handleAttributeUpdate(accessory, change, deviceClass) {
    const { Service, Characteristic } = deviceClass.platform;
    const service = accessory.getService(Service.MotionSensor);

    if (!service) {
        accessory.log.warn(`${accessory.name} | Motion Sensor service not found`);
        return;
    }

    switch (change.attribute) {
        case "acceleration":
            deviceClass.updateCharacteristicValue(accessory, service, Characteristic.MotionDetected, change.value === "active");
            break;
        case "tamper":
            if (accessory.hasCapability("TamperAlert")) {
                deviceClass.updateCharacteristicValue(accessory, service, Characteristic.StatusTampered, change.value === "detected");
            }
            break;
        case "status":
            deviceClass.updateCharacteristicValue(accessory, service, Characteristic.StatusActive, change.value === "online");
            break;
        default:
            accessory.log.debug(`${accessory.name} | Unhandled attribute update: ${change.attribute}`);
    }
}

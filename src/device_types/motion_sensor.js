// device_types/motion_sensor.js

export function isSupported(accessory) {
    return accessory.hasCapability("MotionSensor");
}

export const relevantAttributes = ["motion", "tamper", "status"];

export function initializeAccessory(accessory, deviceClass) {
    const { Service, Characteristic } = deviceClass.platform;
    const service = deviceClass.getOrAddService(accessory, Service.MotionSensor);

    deviceClass.getOrAddCharacteristic(accessory, service, Characteristic.MotionDetected, {
        getHandler: function () {
            const motion = accessory.context.deviceData.attributes.motion === "active";
            accessory.log.debug(`${accessory.name} | Motion Detected: ${motion}`);
            return motion;
        },
    });

    deviceClass.getOrAddCharacteristic(accessory, service, Characteristic.StatusActive, {
        getHandler: function () {
            const isActive = accessory.context.deviceData.status === "online";
            accessory.log.debug(`${accessory.name} | Status Active: ${isActive}`);
            return isActive;
        },
    });

    deviceClass.getOrAddCharacteristic(accessory, service, Characteristic.StatusTampered, {
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

export function handleAttributeUpdate(accessory, change, deviceClass) {
    const { Service, Characteristic } = deviceClass.platform;
    const service = accessory.getService(Service.MotionSensor);

    if (!service) {
        accessory.log.warn(`${accessory.name} | Motion Sensor service not found`);
        return;
    }

    switch (change.attribute) {
        case "motion":
            const motionDetected = change.value === "active";
            deviceClass.updateCharacteristicValue(accessory, service, Characteristic.MotionDetected, motionDetected);
            // accessory.log.debug(`${accessory.name} | Updated Motion Detected: ${motionDetected}`);
            break;
        case "tamper":
            if (accessory.hasCapability("TamperAlert")) {
                const isTampered = change.value === "detected";
                deviceClass.updateCharacteristicValue(accessory, service, Characteristic.StatusTampered, isTampered);
                // accessory.log.debug(`${accessory.name} | Updated Status Tampered: ${isTampered}`);
            }
            break;
        case "status":
            const isActive = change.value === "online";
            deviceClass.updateCharacteristicValue(accessory, service, Characteristic.StatusActive, isActive);
            // accessory.log.debug(`${accessory.name} | Updated Status Active: ${isActive}`);
            break;
        default:
            accessory.log.debug(`${accessory.name} | Unhandled attribute update: ${change.attribute}`);
    }
}

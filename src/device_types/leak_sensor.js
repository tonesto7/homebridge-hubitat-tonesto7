// device_types/leak_sensor.js

export function isSupported(accessory) {
    return accessory.hasCapability("WaterSensor");
}

export const relevantAttributes = ["water", "status", "tamper"];

export function initializeAccessory(accessory, deviceClass) {
    const { Service, Characteristic } = deviceClass.platform;
    const service = deviceClass.getOrAddService(accessory, Service.LeakSensor);

    deviceClass.getOrAddCharacteristic(accessory, service, Characteristic.LeakDetected, {
        getHandler: function () {
            const leak = convertWaterStatus(accessory.context.deviceData.attributes.water, Characteristic);
            accessory.log.debug(`${accessory.name} | Leak Detected Retrieved: ${leak}`);
            return leak;
        },
    });

    deviceClass.getOrAddCharacteristic(accessory, service, Characteristic.StatusActive, {
        getHandler: function () {
            const isActive = accessory.context.deviceData.status === "online";
            accessory.log.debug(`${accessory.name} | Water Sensor Status Active Retrieved: ${isActive}`);
            return isActive;
        },
    });

    deviceClass.getOrAddCharacteristic(accessory, service, Characteristic.StatusTampered, {
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

export function handleAttributeUpdate(accessory, change, deviceClass) {
    const { Characteristic, Service } = deviceClass.platform;
    const service = accessory.getService(Service.LeakSensor);

    if (!service) {
        accessory.log.warn(`${accessory.name} | Leak Sensor service not found`);
        return;
    }

    switch (change.attribute) {
        case "water":
            const leakDetected = convertWaterStatus(change.value, Characteristic);
            deviceClass.updateCharacteristicValue(accessory, service, Characteristic.LeakDetected, leakDetected);
            accessory.log.debug(`${accessory.name} | Updated Leak Detected: ${leakDetected}`);
            break;
        case "status":
            const isActive = change.value === "online";
            deviceClass.updateCharacteristicValue(accessory, service, Characteristic.StatusActive, isActive);
            accessory.log.debug(`${accessory.name} | Updated Status Active: ${isActive}`);
            break;
        case "tamper":
            if (accessory.hasCapability("TamperAlert")) {
                const isTampered = change.value === "detected";
                deviceClass.updateCharacteristicValue(accessory, service, Characteristic.StatusTampered, isTampered);
                accessory.log.debug(`${accessory.name} | Updated Status Tampered: ${isTampered}`);
            }
            break;
        default:
            accessory.log.debug(`${accessory.name} | Unhandled attribute update: ${change.attribute}`);
    }
}

function convertWaterStatus(status, Characteristic) {
    return status === "dry" ? Characteristic.LeakDetected.LEAK_NOT_DETECTED : Characteristic.LeakDetected.LEAK_DETECTED;
}

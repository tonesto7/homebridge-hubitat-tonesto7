// device_types/carbon_monoxide.js

export function isSupported(accessory) {
    return accessory.hasCapability("CarbonMonoxideDetector");
}

export const relevantAttributes = ["carbonMonoxide", "status", "tamper"];

export function initializeAccessory(accessory, deviceClass) {
    const { Service, Characteristic } = deviceClass.platform;
    const service = deviceClass.getOrAddService(accessory, Service.CarbonMonoxideSensor);

    // Carbon Monoxide Detected
    deviceClass.getOrAddCharacteristic(accessory, service, Characteristic.CarbonMonoxideDetected, {
        getHandler: function () {
            const coStatus = accessory.context.deviceData.attributes.carbonMonoxide;
            accessory.log.debug(`${accessory.name} | Carbon Monoxide Status: ${coStatus}`);
            return coStatus === "clear" ? Characteristic.CarbonMonoxideDetected.CO_LEVELS_NORMAL : Characteristic.CarbonMonoxideDetected.CO_LEVELS_ABNORMAL;
        },
    });

    // Status Active
    deviceClass.getOrAddCharacteristic(accessory, service, Characteristic.StatusActive, {
        getHandler: function () {
            const isActive = accessory.context.deviceData.status === "online";
            accessory.log.debug(`${accessory.name} | Status Active: ${isActive}`);
            return isActive;
        },
    });

    // Status Tampered (if supported)
    deviceClass.getOrAddCharacteristic(accessory, service, Characteristic.StatusTampered, {
        preReqChk: (acc) => acc.hasCapability("TamperAlert"),
        getHandler: function () {
            const isTampered = accessory.context.deviceData.attributes.tamper === "detected";
            accessory.log.debug(`${accessory.name} | Status Tampered: ${isTampered}`);
            return isTampered;
        },
        removeIfMissingPreReq: true,
    });

    accessory.context.deviceGroups.push("carbon_monoxide");
}

export function handleAttributeUpdate(accessory, change, deviceClass) {
    const { Characteristic, Service } = deviceClass.platform;
    const service = accessory.getService(Service.CarbonMonoxideSensor);

    if (!service) {
        accessory.log.warn(`${accessory.name} | Carbon Monoxide Sensor service not found`);
        return;
    }

    switch (change.attribute) {
        case "carbonMonoxide": {
            const coStatus = change.value === "clear" ? Characteristic.CarbonMonoxideDetected.CO_LEVELS_NORMAL : Characteristic.CarbonMonoxideDetected.CO_LEVELS_ABNORMAL;
            deviceClass.updateCharacteristicValue(accessory, service, Characteristic.CarbonMonoxideDetected, coStatus);
            // accessory.log.debug(`${accessory.name} | Updated Carbon Monoxide Status: ${change.value}`);
            break;
        }
        case "status": {
            const isActive = change.value === "online";
            deviceClass.updateCharacteristicValue(accessory, service, Characteristic.StatusActive, isActive);
            // accessory.log.debug(`${accessory.name} | Updated Status Active: ${isActive}`);
            break;
        }
        case "tamper": {
            if (accessory.hasCapability("TamperAlert")) {
                const isTampered = change.value === "detected";
                deviceClass.updateCharacteristicValue(accessory, service, Characteristic.StatusTampered, isTampered);
                // accessory.log.debug(`${accessory.name} | Updated Status Tampered: ${isTampered}`);
            }
            break;
        }
        default:
            accessory.log.debug(`${accessory.name} | Unhandled attribute update: ${change.attribute}`);
    }
}

// device_types/carbon_monoxide.js

let DeviceClass, Characteristic, Service, CommunityTypes;

export async function init(_deviceClass, _Characteristic, _Service, _CommunityTypes) {
    DeviceClass = _deviceClass;
    Characteristic = _Characteristic;
    Service = _Service;
    CommunityTypes = _CommunityTypes;
}

export function isSupported(accessory) {
    return accessory.hasCapability("CarbonMonoxideDetector");
}

export const relevantAttributes = ["carbonMonoxide", "status", "tamper"];

export async function initializeService(accessory) {
    const carbonMonoxideSvc = DeviceClass.getOrAddService(accessory, Service.CarbonMonoxideSensor);

    // Carbon Monoxide Detected
    DeviceClass.getOrAddCharacteristic(accessory, carbonMonoxideSvc, Characteristic.CarbonMonoxideDetected, {
        getHandler: function () {
            const coStatus = accessory.context.deviceData.attributes.carbonMonoxide;
            accessory.log.debug(`${accessory.name} | Carbon Monoxide Status: ${coStatus}`);
            return coStatus === "clear" ? Characteristic.CarbonMonoxideDetected.CO_LEVELS_NORMAL : Characteristic.CarbonMonoxideDetected.CO_LEVELS_ABNORMAL;
        },
    });

    // Status Active
    DeviceClass.getOrAddCharacteristic(accessory, carbonMonoxideSvc, Characteristic.StatusActive, {
        getHandler: function () {
            const isActive = accessory.context.deviceData.status === "ACTIVE";
            accessory.log.debug(`${accessory.name} | Status Active: ${isActive}`);
            return isActive;
        },
    });

    // Status Tampered (if supported)
    DeviceClass.getOrAddCharacteristic(accessory, carbonMonoxideSvc, Characteristic.StatusTampered, {
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

export async function handleAttributeUpdate(accessory, change) {
    const carbonMonoxideSvc = accessory.getService(Service.CarbonMonoxideSensor);

    if (!carbonMonoxideSvc) {
        accessory.log.warn(`${accessory.name} | Carbon Monoxide Sensor service not found`);
        return;
    }

    switch (change.attribute) {
        case "carbonMonoxide": {
            const coStatus = change.value === "clear" ? Characteristic.CarbonMonoxideDetected.CO_LEVELS_NORMAL : Characteristic.CarbonMonoxideDetected.CO_LEVELS_ABNORMAL;
            DeviceClass.updateCharacteristicValue(accessory, carbonMonoxideSvc, Characteristic.CarbonMonoxideDetected, coStatus);
            // accessory.log.debug(`${accessory.name} | Updated Carbon Monoxide Status: ${change.value}`);
            break;
        }
        case "status": {
            const isActive = change.value === "ACTIVE";
            DeviceClass.updateCharacteristicValue(accessory, carbonMonoxideSvc, Characteristic.StatusActive, isActive);
            // accessory.log.debug(`${accessory.name} | Updated Status Active: ${isActive}`);
            break;
        }
        case "tamper": {
            if (accessory.hasCapability("TamperAlert")) {
                const isTampered = change.value === "detected";
                DeviceClass.updateCharacteristicValue(accessory, carbonMonoxideSvc, Characteristic.StatusTampered, isTampered);
                // accessory.log.debug(`${accessory.name} | Updated Status Tampered: ${isTampered}`);
            }
            break;
        }
        default:
            accessory.log.debug(`${accessory.name} | Unhandled attribute update: ${change.attribute}`);
    }
}

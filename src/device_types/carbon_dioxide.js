// device_types/carbon_dioxide.js

let DeviceClass, Characteristic, Service, CommunityTypes;

export async function init(_deviceClass, _Characteristic, _Service, _CommunityTypes) {
    DeviceClass = _deviceClass;
    Characteristic = _Characteristic;
    Service = _Service;
    CommunityTypes = _CommunityTypes;
}

export function isSupported(accessory) {
    return accessory.hasCapability("CarbonDioxideMeasurement");
}

export const relevantAttributes = ["carbonDioxide", "status", "tamper"];

export async function initializeService(accessory) {
    const carbonDioxideSvc = DeviceClass.getOrAddService(accessory, Service.CarbonDioxideSensor);

    // Carbon Dioxide Detected
    DeviceClass.getOrAddCharacteristic(accessory, carbonDioxideSvc, Characteristic.CarbonDioxideDetected, {
        getHandler: function () {
            const co2Level = DeviceClass.clamp(accessory.context.deviceData.attributes.carbonDioxide, 0, 10000);
            accessory.log.debug(`${accessory.name} | CO2 Level: ${co2Level} ppm`);
            return co2Level < 2000 ? Characteristic.CarbonDioxideDetected.CO2_LEVELS_NORMAL : Characteristic.CarbonDioxideDetected.CO2_LEVELS_ABNORMAL;
        },
    });

    // Carbon Dioxide Level
    DeviceClass.getOrAddCharacteristic(accessory, carbonDioxideSvc, Characteristic.CarbonDioxideLevel, {
        getHandler: function () {
            const co2Level = DeviceClass.clamp(parseInt(accessory.context.deviceData.attributes.carbonDioxide, 10), 0, 10000);
            accessory.log.debug(`${accessory.name} | Carbon Dioxide Level: ${co2Level} ppm`);
            return co2Level;
        },
    });

    // Status Active
    DeviceClass.getOrAddCharacteristic(accessory, carbonDioxideSvc, Characteristic.StatusActive, {
        getHandler: function () {
            const isActive = accessory.context.deviceData.status === "ACTIVE";
            accessory.log.debug(`${accessory.name} | Status Active: ${isActive}`);
            return isActive;
        },
    });

    // Status Tampered (if supported)
    DeviceClass.getOrAddCharacteristic(accessory, carbonDioxideSvc, Characteristic.StatusTampered, {
        preReqChk: (acc) => acc.hasCapability("TamperAlert"),
        getHandler: function () {
            const isTampered = accessory.context.deviceData.attributes.tamper === "detected";
            accessory.log.debug(`${accessory.name} | Status Tampered: ${isTampered}`);
            return isTampered;
        },
        removeIfMissingPreReq: true,
    });

    accessory.context.deviceGroups.push("carbon_dioxide");
}

export async function handleAttributeUpdate(accessory, change) {
    const carbonDioxideSvc = accessory.getService(Service.CarbonDioxideSensor);

    if (!carbonDioxideSvc) {
        accessory.log.warn(`${accessory.name} | Carbon Dioxide Sensor service not found`);
        return;
    }

    switch (change.attribute) {
        case "carbonDioxide": {
            const co2Level = DeviceClass.clamp(parseInt(change.value, 10), 0, 10000);
            const co2Detected = co2Level < 2000 ? Characteristic.CarbonDioxideDetected.CO2_LEVELS_NORMAL : Characteristic.CarbonDioxideDetected.CO2_LEVELS_ABNORMAL;
            DeviceClass.updateCharacteristicValue(accessory, carbonDioxideSvc, Characteristic.CarbonDioxideDetected, co2Detected);
            DeviceClass.updateCharacteristicValue(accessory, carbonDioxideSvc, Characteristic.CarbonDioxideLevel, co2Level);
            // accessory.log.debug(`${accessory.name} | Updated CO2 Level: ${co2Level} ppm`);
            break;
        }
        case "status": {
            const isActive = change.value === "ACTIVE";
            DeviceClass.updateCharacteristicValue(accessory, carbonDioxideSvc, Characteristic.StatusActive, isActive);
            // accessory.log.debug(`${accessory.name} | Updated Status Active: ${isActive}`);
            break;
        }
        case "tamper": {
            if (accessory.hasCapability("TamperAlert")) {
                const isTampered = change.value === "detected";
                DeviceClass.updateCharacteristicValue(accessory, carbonDioxideSvc, Characteristic.StatusTampered, isTampered);
                // accessory.log.debug(`${accessory.name} | Updated Status Tampered: ${isTampered}`);
            }
            break;
        }
        default:
            accessory.log.debug(`${accessory.name} | Unhandled attribute update: ${change.attribute}`);
            break;
    }
}

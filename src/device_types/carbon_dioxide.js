// device_types/carbon_dioxide.js

export function isSupported(accessory) {
    return accessory.hasCapability("CarbonDioxideMeasurement");
}

export const relevantAttributes = ["carbonDioxideMeasurement", "status", "tamper"];

export function initializeAccessory(accessory, deviceClass) {
    const { Service, Characteristic } = deviceClass.platform;
    const service = deviceClass.getOrAddService(accessory, Service.CarbonDioxideSensor);

    // Carbon Dioxide Detected
    deviceClass.getOrAddCharacteristic(accessory, service, Characteristic.CarbonDioxideDetected, {
        getHandler: function () {
            const co2Level = deviceClass.clamp(accessory.context.deviceData.attributes.carbonDioxideMeasurement, 0, 10000);
            accessory.log.debug(`${accessory.name} | CO2 Level: ${co2Level} ppm`);
            return co2Level < 2000 ? Characteristic.CarbonDioxideDetected.CO2_LEVELS_NORMAL : Characteristic.CarbonDioxideDetected.CO2_LEVELS_ABNORMAL;
        },
    });

    // Carbon Dioxide Level
    deviceClass.getOrAddCharacteristic(accessory, service, Characteristic.CarbonDioxideLevel, {
        getHandler: function () {
            const co2Level = deviceClass.clamp(parseInt(accessory.context.deviceData.attributes.carbonDioxideMeasurement, 10), 0, 10000);
            accessory.log.debug(`${accessory.name} | Carbon Dioxide Level: ${co2Level} ppm`);
            return co2Level;
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

    accessory.context.deviceGroups.push("carbon_dioxide");
}

export function handleAttributeUpdate(accessory, change, deviceClass) {
    const { Characteristic, Service } = deviceClass.platform;
    const service = accessory.getService(Service.CarbonDioxideSensor);

    if (!service) {
        accessory.log.warn(`${accessory.name} | Carbon Dioxide Sensor service not found`);
        return;
    }

    switch (change.attribute) {
        case "carbonDioxideMeasurement": {
            const co2Level = deviceClass.clamp(parseInt(change.value, 10), 0, 10000);
            const co2Detected = co2Level < 2000 ? Characteristic.CarbonDioxideDetected.CO2_LEVELS_NORMAL : Characteristic.CarbonDioxideDetected.CO2_LEVELS_ABNORMAL;

            deviceClass.updateCharacteristicValue(accessory, service, Characteristic.CarbonDioxideDetected, co2Detected);
            deviceClass.updateCharacteristicValue(accessory, service, Characteristic.CarbonDioxideLevel, co2Level);

            // accessory.log.debug(`${accessory.name} | Updated CO2 Level: ${co2Level} ppm`);
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

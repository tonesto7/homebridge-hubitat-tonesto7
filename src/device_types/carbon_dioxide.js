// device_types/carbon_dioxide.js

module.exports = {
    isSupported: (accessory) => accessory.hasCapability("CarbonDioxideMeasurement"),
    relevantAttributes: ["carbonDioxideMeasurement", "status", "tamper"],

    initializeAccessory: (accessory, deviceClass) => {
        const { Service, Characteristic } = deviceClass.platform;
        const service = accessory.getService(Service.CarbonDioxideSensor) || accessory.addService(Service.CarbonDioxideSensor);

        // Carbon Dioxide Detected
        service.getCharacteristic(Characteristic.CarbonDioxideDetected).onGet(() => {
            const co2Level = deviceClass.clamp(accessory.context.deviceData.attributes.carbonDioxideMeasurement, 0, 10000); // Assuming max 10,000 ppm
            accessory.log.debug(`${accessory.name} | CO2 Level: ${co2Level} ppm`);
            return co2Level < 2000 ? Characteristic.CarbonDioxideDetected.CO2_LEVELS_NORMAL : Characteristic.CarbonDioxideDetected.CO2_LEVELS_ABNORMAL;
        });

        // Carbon Dioxide Level
        service.getCharacteristic(Characteristic.CarbonDioxideLevel).onGet(() => {
            const co2Level = deviceClass.clamp(parseInt(accessory.context.deviceData.attributes.carbonDioxideMeasurement, 10), 0, 10000);
            accessory.log.debug(`${accessory.name} | Carbon Dioxide Level: ${co2Level} ppm`);
            return co2Level;
        });

        // Status Active
        service.getCharacteristic(Characteristic.StatusActive).onGet(() => {
            const isActive = accessory.context.deviceData.status === "online";
            accessory.log.debug(`${accessory.name} | Status Active: ${isActive}`);
            return isActive;
        });

        // Status Tampered (if supported)
        if (accessory.hasCapability("TamperAlert")) {
            service.getCharacteristic(Characteristic.StatusTampered).onGet(() => {
                const isTampered = accessory.context.deviceData.attributes.tamper === "detected";
                accessory.log.debug(`${accessory.name} | Status Tampered: ${isTampered}`);
                return isTampered;
            });
        } else {
            service.removeCharacteristic(Characteristic.StatusTampered);
        }

        accessory.context.deviceGroups.push("carbon_dioxide");
    },

    handleAttributeUpdate: (accessory, change, deviceClass) => {
        const { Characteristic, Service } = deviceClass.platform;
        const service = accessory.getService(Service.CarbonDioxideSensor);

        if (!service) {
            accessory.log.warn(`${accessory.name} | Carbon Dioxide Sensor service not found`);
            return;
        }

        switch (change.attribute) {
            case "carbonDioxideMeasurement":
                const co2Level = deviceClass.clamp(parseInt(change.value, 10), 0, 10000);
                service.updateCharacteristic(Characteristic.CarbonDioxideDetected, co2Level < 2000 ? Characteristic.CarbonDioxideDetected.CO2_LEVELS_NORMAL : Characteristic.CarbonDioxideDetected.CO2_LEVELS_ABNORMAL);
                service.updateCharacteristic(Characteristic.CarbonDioxideLevel, co2Level);
                accessory.log.debug(`${accessory.name} | Updated CO2 Level: ${co2Level} ppm`);
                break;
            case "status":
                const isActive = change.value === "online";
                service.updateCharacteristic(Characteristic.StatusActive, isActive);
                accessory.log.debug(`${accessory.name} | Updated Status Active: ${isActive}`);
                break;
            case "tamper":
                if (accessory.hasCapability("TamperAlert")) {
                    const isTampered = change.value === "detected";
                    service.updateCharacteristic(Characteristic.StatusTampered, isTampered);
                    accessory.log.debug(`${accessory.name} | Updated Status Tampered: ${isTampered}`);
                }
                break;
            default:
                accessory.log.debug(`${accessory.name} | Unhandled attribute update: ${change.attribute}`);
        }
    },
};

// device_types/carbon_monoxide.js

module.exports = {
    isSupported: (accessory) => accessory.hasCapability("CarbonMonoxideDetector"),
    relevantAttributes: ["carbonMonoxide", "status", "tamper"],

    initializeAccessory: (accessory, deviceClass) => {
        const { Service, Characteristic } = deviceClass.mainPlatform;
        const service = accessory.getService(Service.CarbonMonoxideSensor) || accessory.addService(Service.CarbonMonoxideSensor);

        // Carbon Monoxide Detected
        service.getCharacteristic(Characteristic.CarbonMonoxideDetected).onGet(() => {
            const coStatus = accessory.context.deviceData.attributes.carbonMonoxide;
            accessory.log.debug(`${accessory.name} | Carbon Monoxide Status: ${coStatus}`);
            return coStatus === "clear" ? Characteristic.CarbonMonoxideDetected.CO_LEVELS_NORMAL : Characteristic.CarbonMonoxideDetected.CO_LEVELS_ABNORMAL;
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

        accessory.context.deviceGroups.push("carbon_monoxide");
    },

    handleAttributeUpdate: (accessory, change, deviceClass) => {
        const { Characteristic, Service } = deviceClass.mainPlatform;
        const service = accessory.getService(Service.CarbonMonoxideSensor);

        if (!service) {
            accessory.log.warn(`${accessory.name} | Carbon Monoxide Sensor service not found`);
            return;
        }

        switch (change.attribute) {
            case "carbonMonoxide":
                const coStatus = change.value === "clear" ? Characteristic.CarbonMonoxideDetected.CO_LEVELS_NORMAL : Characteristic.CarbonMonoxideDetected.CO_LEVELS_ABNORMAL;
                service.updateCharacteristic(Characteristic.CarbonMonoxideDetected, coStatus);
                accessory.log.debug(`${accessory.name} | Updated Carbon Monoxide Status: ${change.value}`);
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

// device_types/humidity_sensor.js

module.exports = {
    isSupported: (accessory) => accessory.hasCapability("RelativeHumidityMeasurement") && accessory.hasAttribute("humidity") && !(accessory.hasCapability("Thermostat") || accessory.hasCapability("ThermostatOperatingState") || accessory.hasCapability("HumidityControl") || accessory.hasAttribute("thermostatOperatingState")),
    relevantAttributes: ["humidity", "status", "tamper"],

    initializeAccessory: (accessory, deviceClass) => {
        const { Service, Characteristic } = deviceClass.mainPlatform;
        const service = accessory.getService(Service.HumiditySensor) || accessory.addService(Service.HumiditySensor);

        // Current Relative Humidity
        service.getCharacteristic(Characteristic.CurrentRelativeHumidity).onGet(() => {
            let humidity = parseFloat(accessory.context.deviceData.attributes.humidity);
            humidity = deviceClass.clamp(humidity, 0, 100);
            accessory.log.debug(`${accessory.name} | Current Humidity: ${humidity}%`);
            return Math.round(humidity);
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

        accessory.context.deviceGroups.push("humidity_sensor");
    },

    handleAttributeUpdate: (accessory, change, deviceClass) => {
        const { Characteristic, Service } = deviceClass.mainPlatform;
        const service = accessory.getService(Service.HumiditySensor);

        if (!service) {
            accessory.log.warn(`${accessory.name} | Humidity Sensor service not found`);
            return;
        }

        switch (change.attribute) {
            case "humidity":
                const humidity = deviceClass.clamp(parseFloat(change.value), 0, 100);
                service.updateCharacteristic(Characteristic.CurrentRelativeHumidity, Math.round(humidity));
                accessory.log.debug(`${accessory.name} | Updated Humidity: ${humidity}%`);
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

// device_types/illuminance_sensor.js

module.exports = {
    isSupported: (accessory) => accessory.hasCapability("IlluminanceMeasurement"),

    relevantAttributes: ["illuminance", "status", "tamper"],

    initializeAccessory: (accessory, deviceClass) => {
        const { Service, Characteristic } = deviceClass.mainPlatform;
        const service = accessory.getService(Service.LightSensor) || accessory.addService(Service.LightSensor);

        // Current Ambient Light Level
        service
            .getCharacteristic(Characteristic.CurrentAmbientLightLevel)
            .setProps({
                minValue: 0,
                maxValue: 100000,
                minStep: 1,
            })
            .onGet(() => {
                let illuminance = parseFloat(accessory.context.deviceData.attributes.illuminance);
                illuminance = deviceClass.clamp(illuminance, 0, 100000);
                accessory.log.debug(`${accessory.name} | Current Ambient Light Level: ${illuminance} lux`);
                return isNaN(illuminance) ? 0 : Math.round(Math.ceil(illuminance));
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

        accessory.context.deviceGroups.push("illuminance_sensor");
    },

    handleAttributeUpdate: (accessory, change, deviceClass) => {
        const { Characteristic, Service } = deviceClass.mainPlatform;
        const service = accessory.getService(Service.LightSensor);

        if (!service) {
            accessory.log.warn(`${accessory.name} | Light Sensor service not found`);
            return;
        }

        switch (change.attribute) {
            case "illuminance":
                const illuminance = deviceClass.clamp(parseFloat(change.value), 0, 100000);
                service.updateCharacteristic(Characteristic.CurrentAmbientLightLevel, Math.round(Math.ceil(illuminance)));
                accessory.log.debug(`${accessory.name} | Updated Ambient Light Level: ${illuminance} lux`);
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

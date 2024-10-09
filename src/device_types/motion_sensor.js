// device_types/motion_sensor.js

module.exports = {
    isSupported: (accessory) => accessory.hasCapability("MotionSensor"),

    relevantAttributes: ["motion", "tamper", "status"],

    initializeAccessory: (accessory, deviceClass) => {
        const { Service, Characteristic } = deviceClass.platform;
        const service = accessory.getService(Service.MotionSensor) || accessory.addService(Service.MotionSensor);

        // Motion Detected
        service.getCharacteristic(Characteristic.MotionDetected).onGet(() => {
            const motion = accessory.context.deviceData.attributes.motion === "active";
            accessory.log.debug(`${accessory.name} | Motion Detected: ${motion}`);
            return motion;
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

        accessory.context.deviceGroups.push("motion_sensor");
    },

    handleAttributeUpdate: (accessory, change, deviceClass) => {
        const { Service, Characteristic } = deviceClass.platform;
        const service = accessory.getService(Service.MotionSensor);

        if (!service) {
            accessory.log.warn(`${accessory.name} | Motion Sensor service not found`);
            return;
        }

        switch (change.attribute) {
            case "motion":
                const motionDetected = change.value === "active";
                service.updateCharacteristic(Characteristic.MotionDetected, motionDetected);
                accessory.log.debug(`${accessory.name} | Updated Motion Detected: ${motionDetected}`);
                break;
            case "tamper":
                if (accessory.hasCapability("TamperAlert")) {
                    const isTampered = change.value === "detected";
                    service.updateCharacteristic(Characteristic.StatusTampered, isTampered);
                    accessory.log.debug(`${accessory.name} | Updated Status Tampered: ${isTampered}`);
                }
                break;
            case "status":
                const isActive = change.value === "online";
                service.updateCharacteristic(Characteristic.StatusActive, isActive);
                accessory.log.debug(`${accessory.name} | Updated Status Active: ${isActive}`);
                break;
            default:
                accessory.log.debug(`${accessory.name} | Unhandled attribute update: ${change.attribute}`);
        }
    },
};

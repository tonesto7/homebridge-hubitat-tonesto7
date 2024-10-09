// device_types/acceleration_sensor.js

module.exports = {
    isSupported: (accessory) => accessory.hasCapability("AccelerationSensor"),

    relevantAttributes: ["acceleration", "tamper", "status"],

    initializeAccessory: (accessory, deviceClass) => {
        const { Service, Characteristic } = deviceClass.platform;
        const service = accessory.getService(Service.MotionSensor) || accessory.addService(Service.MotionSensor);

        function convertAccelerationStatus(status) {
            accessory.log.debug(`${accessory.name} | Acceleration Status: ${status}`);
            return status === "active" ? Characteristic.MotionDetected.MOTION_DETECTED : Characteristic.MotionDetected.NO_MOTION;
        }

        // Motion Detected Characteristic
        service.getCharacteristic(Characteristic.MotionDetected).onGet(() => {
            const motionStatus = accessory.context.deviceData.attributes.acceleration;
            const motionDetected = convertAccelerationStatus(motionStatus);
            accessory.log.debug(`${accessory.name} | Motion Detected Retrieved: ${motionDetected}`);
            return motionDetected;
        });

        // Status Active Characteristic
        service.getCharacteristic(Characteristic.StatusActive).onGet(() => {
            const isActive = accessory.context.deviceData.status === "online";
            accessory.log.debug(`${accessory.name} | Status Active Retrieved: ${isActive}`);
            return isActive;
        });

        // Status Tampered Characteristic (if supported)
        if (accessory.hasCapability("TamperAlert")) {
            service.getCharacteristic(Characteristic.StatusTampered).onGet(() => {
                const isTampered = accessory.context.deviceData.attributes.tamper === "detected";
                accessory.log.debug(`${accessory.name} | Status Tampered Retrieved: ${isTampered}`);
                return isTampered;
            });
        } else {
            service.removeCharacteristic(Characteristic.StatusTampered);
        }

        accessory.context.deviceGroups.push("acceleration_sensor");
    },

    handleAttributeUpdate: (accessory, change, deviceClass) => {
        const { Service, Characteristic } = deviceClass.platform;
        const service = accessory.getService(Service.MotionSensor);

        if (!service) {
            accessory.log.warn(`${accessory.name} | Motion Sensor service not found`);
            return;
        }

        switch (change.attribute) {
            case "acceleration":
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

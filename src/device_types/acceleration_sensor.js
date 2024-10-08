// device_types/acceleration_sensor.js

module.exports = {
    isSupported: (accessory) => accessory.hasCapability("AccelerationSensor"),

    initializeAccessory: (accessory, deviceTypes) => {
        const { Service, Characteristic } = deviceTypes.mainPlatform;
        const service = accessory.getService(Service.MotionSensor) || accessory.addService(Service.MotionSensor);

        /**
         * Converts acceleration status to HomeKit MotionDetected.
         * @param {string} status - The acceleration status from the device.
         * @returns {number} - HomeKit MotionDetected value.
         */
        function convertAccelerationStatus(status) {
            accessory.log.debug(`${accessory.name} | Acceleration Status: ${status}`);
            return status === "active" ? Characteristic.MotionDetected.MOTION_DETECTED : Characteristic.MotionDetected.NO_MOTION;
        }

        // Motion Detected Characteristic
        service
            .getCharacteristic(Characteristic.MotionDetected)
            .onGet(() => {
                const motionStatus = accessory.context.deviceData.attributes.acceleration;
                const motionDetected = convertAccelerationStatus(motionStatus);
                accessory.log.debug(`${accessory.name} | Motion Detected Retrieved: ${motionDetected}`);
                return motionDetected;
            })
            .onSet(() => {
                accessory.log.warn(`${accessory.name} | Attempted to set MotionDetected characteristic, which is read-only.`);
            });

        // Status Active Characteristic
        service
            .getCharacteristic(Characteristic.StatusActive)
            .onGet(() => {
                const isActive = accessory.context.deviceData.status === "online";
                accessory.log.debug(`${accessory.name} | Status Active Retrieved: ${isActive}`);
                return isActive;
            })
            .onSet(() => {
                accessory.log.warn(`${accessory.name} | Attempted to set StatusActive characteristic, which is read-only.`);
            });

        // Status Tampered Characteristic (if supported)
        if (accessory.hasCapability("TamperAlert")) {
            service
                .getCharacteristic(Characteristic.StatusTampered)
                .onGet(() => {
                    const isTampered = accessory.context.deviceData.attributes.tamper === "detected";
                    accessory.log.debug(`${accessory.name} | Status Tampered Retrieved: ${isTampered}`);
                    return isTampered;
                })
                .onSet(() => {
                    accessory.log.warn(`${accessory.name} | Attempted to set StatusTampered characteristic, which is read-only.`);
                });
        } else {
            service.removeCharacteristic(Characteristic.StatusTampered);
        }

        accessory.context.deviceGroups.push("acceleration_sensor");
    },
};

// device_types/water_sensor.js

module.exports = {
    isSupported: (accessory) => accessory.hasCapability("WaterSensor"),

    initializeAccessory: (accessory, deviceTypes) => {
        const { Service, Characteristic } = deviceTypes.mainPlatform;
        const service = accessory.getService(Service.LeakSensor) || accessory.addService(Service.LeakSensor);

        /**
         * Converts water status to HomeKit LeakDetected.
         * @param {string} status - The water status from the device.
         * @returns {number} - HomeKit LeakDetected value.
         */
        function convertWaterStatus(status) {
            accessory.log.debug(`${accessory.name} | Water Status: ${status}`);
            return status === "dry" ? Characteristic.LeakDetected.LEAK_NOT_DETECTED : Characteristic.LeakDetected.LEAK_DETECTED;
        }

        // Leak Detected Characteristic
        service
            .getCharacteristic(Characteristic.LeakDetected)
            .onGet(() => {
                const leak = convertWaterStatus(accessory.context.deviceData.attributes.water);
                accessory.log.debug(`${accessory.name} | Leak Detected Retrieved: ${leak}`);
                return leak;
            })
            .onSet(() => {
                accessory.log.warn(`${accessory.name} | Attempted to set LeakDetected characteristic, which is read-only.`);
            });

        // Status Active Characteristic
        service
            .getCharacteristic(Characteristic.StatusActive)
            .onGet(() => {
                const isActive = accessory.context.deviceData.status === "online";
                accessory.log.debug(`${accessory.name} | Water Sensor Status Active Retrieved: ${isActive}`);
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
                    accessory.log.debug(`${accessory.name} | Water Sensor Status Tampered Retrieved: ${isTampered}`);
                    return isTampered;
                })
                .onSet(() => {
                    accessory.log.warn(`${accessory.name} | Attempted to set StatusTampered characteristic, which is read-only.`);
                });
        } else {
            service.removeCharacteristic(Characteristic.StatusTampered);
        }

        accessory.context.deviceGroups.push("water_sensor");
    },
};

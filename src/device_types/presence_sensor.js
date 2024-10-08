// device_types/presence_sensor.js

module.exports = {
    isSupported: (accessory) => accessory.hasCapability("PresenceSensor"),

    initializeAccessory: (accessory, deviceTypes) => {
        const { Service, Characteristic } = deviceTypes.mainPlatform;
        const service = accessory.getService(Service.OccupancySensor) || accessory.addService(Service.OccupancySensor);

        /**
         * Converts presence status to HomeKit OccupancyDetected.
         * @param {string} presence - The presence status from the device.
         * @returns {number} - HomeKit OccupancyDetected value.
         */
        function convertPresence(presence) {
            accessory.log.debug(`${accessory.name} | Presence Status: ${presence}`);
            return presence === "present" ? Characteristic.OccupancyDetected.OCCUPANCY_DETECTED : Characteristic.OccupancyDetected.OCCUPANCY_NOT_DETECTED;
        }

        // Occupancy Detected Characteristic
        service
            .getCharacteristic(Characteristic.OccupancyDetected)
            .onGet(() => {
                const occupancy = convertPresence(accessory.context.deviceData.attributes.presence);
                accessory.log.debug(`${accessory.name} | Occupancy Detected Retrieved: ${occupancy}`);
                return occupancy;
            })
            .onSet(() => {
                accessory.log.warn(`${accessory.name} | Attempted to set OccupancyDetected characteristic, which is read-only.`);
            });

        // Status Active Characteristic
        service
            .getCharacteristic(Characteristic.StatusActive)
            .onGet(() => {
                const isActive = accessory.context.deviceData.status === "online";
                accessory.log.debug(`${accessory.name} | Presence Sensor Status Active Retrieved: ${isActive}`);
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
                    accessory.log.debug(`${accessory.name} | Presence Sensor Status Tampered Retrieved: ${isTampered}`);
                    return isTampered;
                })
                .onSet(() => {
                    accessory.log.warn(`${accessory.name} | Attempted to set StatusTampered characteristic, which is read-only.`);
                });
        } else {
            service.removeCharacteristic(Characteristic.StatusTampered);
        }

        accessory.context.deviceGroups.push("presence_sensor");
    },
};

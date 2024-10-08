// device_types/contact_sensor.js

module.exports = {
    isSupported: (accessory) => accessory.hasCapability("ContactSensor") && !accessory.hasCapability("GarageDoorControl"),

    initializeAccessory: (accessory, deviceTypes) => {
        const { Service, Characteristic } = deviceTypes.mainPlatform;
        const service = accessory.getService(Service.ContactSensor) || accessory.addService(Service.ContactSensor);

        /**
         * Converts contact status to HomeKit ContactSensorState.
         * @param {string} status - The contact status from the device.
         * @returns {number} - HomeKit ContactSensorState.
         */
        function convertContactStatus(status) {
            accessory.log.debug(`${accessory.name} | Contact Status: ${status}`);
            return status === "closed" ? Characteristic.ContactSensorState.CONTACT_DETECTED : Characteristic.ContactSensorState.CONTACT_NOT_DETECTED;
        }

        // Contact Sensor State
        service.getCharacteristic(Characteristic.ContactSensorState).onGet(() => {
            const status = accessory.context.deviceData.attributes.contact;
            return convertContactStatus(status);
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

        accessory.context.deviceGroups.push("contact_sensor");
    },
};

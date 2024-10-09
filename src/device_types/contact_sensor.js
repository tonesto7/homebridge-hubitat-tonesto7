// device_types/contact_sensor.js

/**
 * Converts contact status to HomeKit ContactSensorState.
 * @param {string} status - The contact status from the device.
 * @returns {number} - HomeKit ContactSensorState.
 */
function convertContactStatus(status, Characteristic) {
    return status === "closed" ? Characteristic.ContactSensorState.CONTACT_DETECTED : Characteristic.ContactSensorState.CONTACT_NOT_DETECTED;
}

module.exports = {
    isSupported: (accessory) => accessory.hasCapability("ContactSensor") && !accessory.hasCapability("GarageDoorControl"),
    relevantAttributes: ["contact", "status", "tamper"],

    initializeAccessory: (accessory, deviceClass) => {
        const { Service, Characteristic } = deviceClass.platform;
        const service = accessory.getService(Service.ContactSensor) || accessory.addService(Service.ContactSensor);

        // Contact Sensor State
        service.getCharacteristic(Characteristic.ContactSensorState).onGet(() => {
            const status = accessory.context.deviceData.attributes.contact;
            return convertContactStatus(status, Characteristic);
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

    handleAttributeUpdate: (accessory, change, deviceClass) => {
        const { Characteristic, Service } = deviceClass.platform;
        const service = accessory.getService(Service.ContactSensor);

        if (!service) {
            accessory.log.warn(`${accessory.name} | Contact Sensor service not found`);
            return;
        }

        switch (change.attribute) {
            case "contact":
                const contactState = convertContactStatus(change.value, Characteristic);
                service.updateCharacteristic(Characteristic.ContactSensorState, contactState);
                accessory.log.debug(`${accessory.name} | Updated Contact Sensor State: ${contactState}`);
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

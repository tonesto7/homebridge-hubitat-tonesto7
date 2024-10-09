// device_types/presence_sensor.js

/**
 * Converts presence status to HomeKit OccupancyDetected.
 * @param {string} presence - The presence status from the device.
 * @returns {number} - HomeKit OccupancyDetected value.
 */
function convertPresence(presence, Characteristic) {
    // accessory.log.debug(`${accessory.name} | Presence Status: ${presence}`);
    return presence === "present" ? Characteristic.OccupancyDetected.OCCUPANCY_DETECTED : Characteristic.OccupancyDetected.OCCUPANCY_NOT_DETECTED;
}

module.exports = {
    isSupported: (accessory) => accessory.hasCapability("PresenceSensor"),
    relevantAttributes: ["presence", "status", "tamper"],

    initializeAccessory: (accessory, deviceClass) => {
        const { Service, Characteristic } = deviceClass.platform;
        const service = accessory.getService(Service.OccupancySensor) || accessory.addService(Service.OccupancySensor);

        // Occupancy Detected Characteristic
        service
            .getCharacteristic(Characteristic.OccupancyDetected)
            .onGet(() => {
                const occupancy = convertPresence(accessory.context.deviceData.attributes.presence, Characteristic);
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

    handleAttributeUpdate: (accessory, change, deviceClass) => {
        const { Characteristic, Service } = deviceClass.platform;
        const service = accessory.getService(Service.OccupancySensor);

        if (!service) {
            accessory.log.warn(`${accessory.name} | Occupancy Sensor service not found`);
            return;
        }

        switch (change.attribute) {
            case "presence":
                const occupancy = convertPresence(change.value, Characteristic);
                service.updateCharacteristic(Characteristic.OccupancyDetected, occupancy);
                accessory.log.debug(`${accessory.name} | Updated Occupancy Detected: ${occupancy}`);
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

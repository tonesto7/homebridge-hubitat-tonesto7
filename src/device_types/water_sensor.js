// device_types/water_sensor.js

function convertWaterStatus(status, Characteristic) {
    return status === "dry" ? Characteristic.LeakDetected.LEAK_NOT_DETECTED : Characteristic.LeakDetected.LEAK_DETECTED;
}

module.exports = {
    isSupported: (accessory) => accessory.hasCapability("WaterSensor"),
    relevantAttributes: ["water", "status", "tamper"],

    initializeAccessory: (accessory, deviceClass) => {
        const { Service, Characteristic } = deviceClass.platform;
        const service = accessory.getService(Service.LeakSensor) || accessory.addService(Service.LeakSensor);

        // Leak Detected Characteristic
        service
            .getCharacteristic(Characteristic.LeakDetected)
            .onGet(() => {
                const leak = convertWaterStatus(accessory.context.deviceData.attributes.water, Characteristic);
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

    handleAttributeUpdate: (accessory, change, deviceClass) => {
        const { Characteristic, Service } = deviceClass.platform;
        const service = accessory.getService(Service.LeakSensor);

        if (!service) {
            accessory.log.warn(`${accessory.name} | Leak Sensor service not found`);
            return;
        }

        switch (change.attribute) {
            case "water":
                const leakDetected = convertWaterStatus(change.value, Characteristic);
                service.updateCharacteristic(Characteristic.LeakDetected, leakDetected);
                accessory.log.debug(`${accessory.name} | Updated Leak Detected: ${leakDetected}`);
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

// device_types/smoke_detector.js

/**
 * Converts smoke status to HomeKit SmokeDetected.
 * @param {string} smokeStatus - The smoke status from the device.
 * @returns {number} - HomeKit SmokeDetected value.
 */
function convertSmokeStatus(smokeStatus, Characteristic) {
    // accessory.log.debug(`${accessory.name} | Smoke Status: ${smokeStatus}`);
    return smokeStatus === "clear" ? Characteristic.SmokeDetected.SMOKE_NOT_DETECTED : Characteristic.SmokeDetected.SMOKE_DETECTED;
}

module.exports = {
    isSupported: (accessory) => accessory.hasCapability("SmokeDetector") && accessory.hasAttribute("smoke"),
    relevantAttributes: ["smoke", "status", "tamper"],

    initializeAccessory: (accessory, deviceClass) => {
        const { Service, Characteristic } = deviceClass.platform;
        const service = accessory.getService(Service.SmokeSensor) || accessory.addService(Service.SmokeSensor);

        // Smoke Detected Characteristic
        service
            .getCharacteristic(Characteristic.SmokeDetected)
            .onGet(() => {
                const smoke = convertSmokeStatus(accessory.context.deviceData.attributes.smoke, Characteristic);
                accessory.log.debug(`${accessory.name} | Smoke Detected Retrieved: ${smoke}`);
                return smoke;
            })
            .onSet(() => {
                accessory.log.warn(`${accessory.name} | Attempted to set SmokeDetected characteristic, which is read-only.`);
            });

        // Status Active Characteristic
        service
            .getCharacteristic(Characteristic.StatusActive)
            .onGet(() => {
                const isActive = accessory.context.deviceData.status === "online";
                accessory.log.debug(`${accessory.name} | Smoke Detector Status Active Retrieved: ${isActive}`);
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
                    accessory.log.debug(`${accessory.name} | Smoke Detector Status Tampered Retrieved: ${isTampered}`);
                    return isTampered;
                })
                .onSet(() => {
                    accessory.log.warn(`${accessory.name} | Attempted to set StatusTampered characteristic, which is read-only.`);
                });
        } else {
            service.removeCharacteristic(Characteristic.StatusTampered);
        }

        accessory.context.deviceGroups.push("smoke_detector");
    },

    handleAttributeUpdate: (accessory, change, deviceClass) => {
        const { Characteristic, Service } = deviceClass.platform;
        const service = accessory.getService(Service.SmokeSensor);

        if (!service) {
            accessory.log.warn(`${accessory.name} | Smoke Sensor service not found`);
            return;
        }

        switch (change.attribute) {
            case "smoke":
                const smokeDetected = convertSmokeStatus(change.value, Characteristic);
                service.updateCharacteristic(Characteristic.SmokeDetected, smokeDetected);
                accessory.log.debug(`${accessory.name} | Updated Smoke Detected: ${smokeDetected}`);
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

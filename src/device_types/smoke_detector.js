// device_types/smoke_detector.js

module.exports = {
    isSupported: (accessory) => accessory.hasCapability("SmokeDetector") && accessory.hasAttribute("smoke"),

    initializeAccessory: (accessory, deviceTypes) => {
        const { Service, Characteristic } = deviceTypes.mainPlatform;
        const service = accessory.getService(Service.SmokeSensor) || accessory.addService(Service.SmokeSensor);

        /**
         * Converts smoke status to HomeKit SmokeDetected.
         * @param {string} smokeStatus - The smoke status from the device.
         * @returns {number} - HomeKit SmokeDetected value.
         */
        function convertSmokeStatus(smokeStatus) {
            accessory.log.debug(`${accessory.name} | Smoke Status: ${smokeStatus}`);
            return smokeStatus === "clear" ? Characteristic.SmokeDetected.SMOKE_NOT_DETECTED : Characteristic.SmokeDetected.SMOKE_DETECTED;
        }

        // Smoke Detected Characteristic
        service
            .getCharacteristic(Characteristic.SmokeDetected)
            .onGet(() => {
                const smoke = convertSmokeStatus(accessory.context.deviceData.attributes.smoke);
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
};

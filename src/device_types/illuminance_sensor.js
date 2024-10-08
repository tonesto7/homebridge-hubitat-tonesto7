// device_types/illuminance_sensor.js

module.exports = {
    isSupported: (accessory) => accessory.hasCapability("IlluminanceMeasurement"),

    initializeAccessory: (accessory, deviceTypes) => {
        const { Service, Characteristic } = deviceTypes.mainPlatform;
        const service = accessory.getService(Service.LightSensor) || accessory.addService(Service.LightSensor);

        /**
         * Clamps a value between a minimum and maximum.
         * @param {number} value - The value to clamp.
         * @param {number} min - The minimum allowable value.
         * @param {number} max - The maximum allowable value.
         * @returns {number} - The clamped value.
         */
        function clamp(value, min, max) {
            return Math.max(min, Math.min(max, value));
        }

        // Current Ambient Light Level
        service
            .getCharacteristic(Characteristic.CurrentAmbientLightLevel)
            .setProps({
                minValue: 0,
                maxValue: 100000,
                minStep: 1,
            })
            .onGet(() => {
                let illuminance = parseFloat(accessory.context.deviceData.attributes.illuminance);
                illuminance = clamp(illuminance, 0, 100000);
                accessory.log.debug(`${accessory.name} | Current Ambient Light Level: ${illuminance} lux`);
                return isNaN(illuminance) ? 0 : Math.round(Math.ceil(illuminance));
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

        accessory.context.deviceGroups.push("illuminance_sensor");
    },
};

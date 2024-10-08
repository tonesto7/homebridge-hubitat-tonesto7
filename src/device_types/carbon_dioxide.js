// device_types/carbon_dioxide.js

module.exports = {
    isSupported: (accessory) => accessory.hasCapability("CarbonDioxideMeasurement"),

    initializeAccessory: (accessory, deviceTypes) => {
        const { Service, Characteristic } = deviceTypes.mainPlatform;
        const service = accessory.getService(Service.CarbonDioxideSensor) || accessory.addService(Service.CarbonDioxideSensor);

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

        // Carbon Dioxide Detected
        service.getCharacteristic(Characteristic.CarbonDioxideDetected).onGet(() => {
            const co2Level = clamp(accessory.context.deviceData.attributes.carbonDioxideMeasurement, 0, 10000); // Assuming max 10,000 ppm
            accessory.log.debug(`${accessory.name} | CO2 Level: ${co2Level} ppm`);
            return co2Level < 2000 ? Characteristic.CarbonDioxideDetected.CO2_LEVELS_NORMAL : Characteristic.CarbonDioxideDetected.CO2_LEVELS_ABNORMAL;
        });

        // Carbon Dioxide Level
        service.getCharacteristic(Characteristic.CarbonDioxideLevel).onGet(() => {
            const co2Level = clamp(parseInt(accessory.context.deviceData.attributes.carbonDioxideMeasurement, 10), 0, 10000);
            accessory.log.debug(`${accessory.name} | Carbon Dioxide Level: ${co2Level} ppm`);
            return co2Level;
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

        accessory.context.deviceGroups.push("carbon_dioxide");
    },
};

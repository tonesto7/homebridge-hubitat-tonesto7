// device_types/humidity_sensor.js

module.exports = {
    isSupported: (accessory) => accessory.hasCapability("RelativeHumidityMeasurement") && accessory.hasAttribute("humidity") && !(accessory.hasCapability("Thermostat") || accessory.hasCapability("ThermostatOperatingState") || accessory.hasCapability("HumidityControl") || accessory.hasAttribute("thermostatOperatingState")),

    initializeAccessory: (accessory, deviceTypes) => {
        const { Service, Characteristic } = deviceTypes.mainPlatform;
        const service = accessory.getService(Service.HumiditySensor) || accessory.addService(Service.HumiditySensor);

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

        // Current Relative Humidity
        service.getCharacteristic(Characteristic.CurrentRelativeHumidity).onGet(() => {
            let humidity = parseFloat(accessory.context.deviceData.attributes.humidity);
            humidity = clamp(humidity, 0, 100);
            accessory.log.debug(`${accessory.name} | Current Humidity: ${humidity}%`);
            return Math.round(humidity);
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

        accessory.context.deviceGroups.push("humidity_sensor");
    },
};

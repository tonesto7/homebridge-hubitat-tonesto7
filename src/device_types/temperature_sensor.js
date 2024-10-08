// device_types/temperature_sensor.js

module.exports = {
    isSupported: (accessory) => accessory.hasCapability("TemperatureMeasurement") && !(accessory.hasCapability("Thermostat") || accessory.hasCapability("ThermostatOperatingState") || accessory.hasAttribute("thermostatOperatingState")),

    initializeAccessory: (accessory, deviceTypes) => {
        const { Service, Characteristic } = deviceTypes.mainPlatform;
        const service = accessory.getService(Service.TemperatureSensor) || accessory.addService(Service.TemperatureSensor);

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

        /**
         * Converts temperature based on the platform's unit preference.
         * @param {number} temp - The temperature value to convert.
         * @param {object} platform - The platform instance to determine unit.
         * @returns {number} - Converted temperature.
         */
        function convertTemperature(temp, platform) {
            if (platform.getTempUnit() === "F") {
                return clamp((temp - 32) / 1.8, -100, 200);
            }
            return clamp(temp, -100, 200);
        }

        // Current Temperature Characteristic
        service
            .getCharacteristic(Characteristic.CurrentTemperature)
            .setProps({
                minValue: -100,
                maxValue: 200,
                minStep: 0.1,
            })
            .onGet(() => {
                let temp = parseFloat(accessory.context.deviceData.attributes.temperature);
                temp = isNaN(temp) ? 0 : convertTemperature(temp, deviceTypes.mainPlatform);
                accessory.log.debug(`${accessory.name} | Temperature Sensor Current Temperature Retrieved: ${temp} ${deviceTypes.mainPlatform.getTempUnit()}`);
                return temp;
            })
            .onSet(() => {
                accessory.log.warn(`${accessory.name} | Attempted to set CurrentTemperature characteristic, which is read-only.`);
            });

        // Status Tampered Characteristic (if supported)
        if (accessory.hasCapability("TamperAlert")) {
            service
                .getCharacteristic(Characteristic.StatusTampered)
                .onGet(() => {
                    const isTampered = accessory.context.deviceData.attributes.tamper === "detected";
                    accessory.log.debug(`${accessory.name} | Temperature Sensor Status Tampered Retrieved: ${isTampered}`);
                    return isTampered;
                })
                .onSet(() => {
                    accessory.log.warn(`${accessory.name} | Attempted to set StatusTampered characteristic, which is read-only.`);
                });
        } else {
            service.removeCharacteristic(Characteristic.StatusTampered);
        }

        // Status Active Characteristic
        service
            .getCharacteristic(Characteristic.StatusActive)
            .onGet(() => {
                const isActive = accessory.context.deviceData.status === "online";
                accessory.log.debug(`${accessory.name} | Temperature Sensor Status Active Retrieved: ${isActive}`);
                return isActive;
            })
            .onSet(() => {
                accessory.log.warn(`${accessory.name} | Attempted to set StatusActive characteristic, which is read-only.`);
            });

        accessory.context.deviceGroups.push("temperature_sensor");
    },
};

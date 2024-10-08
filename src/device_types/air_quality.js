// device_types/air_quality.js

module.exports = {
    isSupported: (accessory) => accessory.hasCapability("AirQuality"),

    initializeAccessory: (accessory, deviceTypes) => {
        const { Service, Characteristic } = deviceTypes.mainPlatform;
        const service = accessory.getService(Service.AirQualitySensor) || accessory.addService(Service.AirQualitySensor);

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
         * Converts AQI to HomeKit AirQuality characteristic.
         * @param {number} aqi - Air Quality Index value.
         * @returns {number} - HomeKit AirQuality value.
         */
        function aqiToPm25(aqi) {
            if (aqi === undefined || aqi > 500 || aqi < 0) return Characteristic.AirQuality.UNKNOWN;
            if (aqi <= 50) return Characteristic.AirQuality.EXCELLENT;
            if (aqi <= 100) return Characteristic.AirQuality.GOOD;
            if (aqi <= 150) return Characteristic.AirQuality.FAIR;
            if (aqi <= 200) return Characteristic.AirQuality.INFERIOR;
            return Characteristic.AirQuality.POOR;
        }

        // Status Fault
        service.setCharacteristic(Characteristic.StatusFault, Characteristic.StatusFault.NO_FAULT);

        // Status Active
        service.getCharacteristic(Characteristic.StatusActive).onGet(() => accessory.context.deviceData.status === "online");

        // Air Quality
        service.getCharacteristic(Characteristic.AirQuality).onGet(() => {
            const aqi = accessory.context.deviceData.attributes.airQualityIndex;
            const airQuality = aqiToPm25(aqi);
            accessory.log.debug(`${accessory.name} | Air Quality (AQI): ${aqi} => HomeKit AirQuality: ${airQuality}`);
            return airQuality;
        });

        // Status Low Battery
        if (accessory.hasAttribute("Battery")) {
            service.getCharacteristic(Characteristic.StatusLowBattery).onGet(() => {
                const battery = clamp(accessory.context.deviceData.attributes.battery, 0, 100);
                const lowBattery = battery < 20 ? Characteristic.StatusLowBattery.BATTERY_LEVEL_LOW : Characteristic.StatusLowBattery.BATTERY_LEVEL_NORMAL;
                accessory.log.debug(`${accessory.name} | Battery Level: ${battery} => StatusLowBattery: ${lowBattery}`);
                return lowBattery;
            });
        }

        // PM2.5 Density (if available)
        if (accessory.hasAttribute("pm25")) {
            service.getCharacteristic(Characteristic.PM2_5Density).onGet(() => {
                const pm25 = clamp(accessory.context.deviceData.attributes.pm25, 0, 1000); // Example clamp range
                accessory.log.debug(`${accessory.name} | PM2.5 Density: ${pm25}`);
                return pm25;
            });
        }

        // Status Tampered (if supported)
        if (accessory.hasCapability("TamperAlert")) {
            service.getCharacteristic(Characteristic.StatusTampered).onGet(() => accessory.context.deviceData.attributes.tamper === "detected");
        } else {
            service.removeCharacteristic(Characteristic.StatusTampered);
        }

        accessory.context.deviceGroups.push("air_quality");
    },
};

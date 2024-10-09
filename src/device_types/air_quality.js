// device_types/air_quality.js

function aqiToPm25(aqi, Characteristic) {
    if (aqi === undefined || aqi > 500 || aqi < 0) return Characteristic.AirQuality.UNKNOWN;
    if (aqi <= 50) return Characteristic.AirQuality.EXCELLENT;
    if (aqi <= 100) return Characteristic.AirQuality.GOOD;
    if (aqi <= 150) return Characteristic.AirQuality.FAIR;
    if (aqi <= 200) return Characteristic.AirQuality.INFERIOR;
    return Characteristic.AirQuality.POOR;
}

module.exports = {
    isSupported: (accessory) => accessory.hasCapability("AirQuality"),

    relevantAttributes: ["airQualityIndex", "battery", "pm25", "tamper", "status"],

    initializeAccessory: (accessory, deviceClass) => {
        const { Service, Characteristic } = deviceClass.mainPlatform;
        const service = accessory.getService(Service.AirQualitySensor) || accessory.addService(Service.AirQualitySensor);

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
            const airQuality = aqiToPm25(aqi, Characteristic);
            accessory.log.debug(`${accessory.name} | Air Quality (AQI): ${aqi} => HomeKit AirQuality: ${airQuality}`);
            return airQuality;
        });

        // Status Low Battery
        if (accessory.hasAttribute("Battery")) {
            service.getCharacteristic(Characteristic.StatusLowBattery).onGet(() => {
                const battery = deviceClass.clamp(accessory.context.deviceData.attributes.battery, 0, 100);
                const lowBattery = battery < 20 ? Characteristic.StatusLowBattery.BATTERY_LEVEL_LOW : Characteristic.StatusLowBattery.BATTERY_LEVEL_NORMAL;
                accessory.log.debug(`${accessory.name} | Battery Level: ${battery} => StatusLowBattery: ${lowBattery}`);
                return lowBattery;
            });
        }

        // PM2.5 Density (if available)
        if (accessory.hasAttribute("pm25")) {
            service.getCharacteristic(Characteristic.PM2_5Density).onGet(() => {
                const pm25 = deviceClass.clamp(accessory.context.deviceData.attributes.pm25, 0, 1000);
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

    handleAttributeUpdate: (accessory, change, deviceClass) => {
        const { Service, Characteristic } = deviceClass.mainPlatform;
        const service = accessory.getService(Service.AirQualitySensor);

        if (!service) {
            accessory.log.warn(`${accessory.name} | Air Quality Sensor service not found`);
            return;
        }

        switch (change.attribute) {
            case "airQualityIndex":
                const airQuality = aqiToPm25(change.value, Characteristic);
                service.updateCharacteristic(Characteristic.AirQuality, airQuality);
                accessory.log.debug(`${accessory.name} | Updated Air Quality: ${airQuality}`);
                break;
            case "battery":
                if (accessory.hasAttribute("Battery")) {
                    const battery = deviceClass.clamp(change.value, 0, 100);
                    const lowBattery = battery < 20 ? Characteristic.StatusLowBattery.BATTERY_LEVEL_LOW : Characteristic.StatusLowBattery.BATTERY_LEVEL_NORMAL;
                    service.updateCharacteristic(Characteristic.StatusLowBattery, lowBattery);
                    accessory.log.debug(`${accessory.name} | Updated Status Low Battery: ${lowBattery}`);
                }
                break;
            case "pm25":
                if (accessory.hasAttribute("pm25")) {
                    const pm25 = deviceClass.clamp(change.value, 0, 1000);
                    service.updateCharacteristic(Characteristic.PM2_5Density, pm25);
                    accessory.log.debug(`${accessory.name} | Updated PM2.5 Density: ${pm25}`);
                }
                break;
            case "tamper":
                if (accessory.hasCapability("TamperAlert")) {
                    const isTampered = change.value === "detected";
                    service.updateCharacteristic(Characteristic.StatusTampered, isTampered);
                    accessory.log.debug(`${accessory.name} | Updated Status Tampered: ${isTampered}`);
                }
                break;
            case "status":
                const isActive = change.value === "online";
                service.updateCharacteristic(Characteristic.StatusActive, isActive);
                accessory.log.debug(`${accessory.name} | Updated Status Active: ${isActive}`);
                break;
            default:
                accessory.log.debug(`${accessory.name} | Unhandled attribute update: ${change.attribute}`);
        }
    },
};

// device_types/air_quality.js

export function isSupported(accessory) {
    return accessory.hasCapability("AirQuality");
}

export const relevantAttributes = ["airQualityIndex", "battery", "pm25", "tamper", "status"];

export function initializeAccessory(accessory, deviceClass) {
    const { Service, Characteristic } = deviceClass.platform;
    const service = deviceClass.getOrAddService(accessory, Service.AirQualitySensor);

    // Status Fault
    // service.setCharacteristic(Characteristic.StatusFault, Characteristic.StatusFault.NO_FAULT);
    deviceClass.getOrAddCharacteristic(accessory, service, Characteristic.StatusFault, {
        getHandler: function () {
            return Characteristic.StatusFault.NO_FAULT;
        },
    });

    // Status Active
    // service.getCharacteristic(Characteristic.StatusActive).onGet(() => accessory.context.deviceData.status === "online");
    deviceClass.getOrAddCharacteristic(accessory, service, Characteristic.StatusActive, {
        getHandler: function () {
            return accessory.context.deviceData.status === "online";
        },
    });

    // Air Quality
    // service.getCharacteristic(Characteristic.AirQuality).onGet(() => {
    //     const aqi = accessory.context.deviceData.attributes.airQualityIndex;
    //     const airQuality = aqiToPm25(aqi, Characteristic);
    //     accessory.log.debug(`${accessory.name} | Air Quality (AQI): ${aqi} => HomeKit AirQuality: ${airQuality}`);
    //     return airQuality;
    // });

    deviceClass.getOrAddCharacteristic(accessory, service, Characteristic.AirQuality, {
        getHandler: function () {
            const aqi = accessory.context.deviceData.attributes.airQualityIndex;
            const airQuality = aqiToPm25(aqi, Characteristic);
            accessory.log.debug(`${accessory.name} | Air Quality (AQI): ${aqi} => HomeKit AirQuality: ${airQuality}`);
            return airQuality;
        },
    });

    // Status Low Battery
    // if (accessory.hasAttribute("Battery")) {
    //     service.getCharacteristic(Characteristic.StatusLowBattery).onGet(() => {
    //         const battery = deviceClass.clamp(accessory.context.deviceData.attributes.battery, 0, 100);
    //         const lowBattery = battery < 20 ? Characteristic.StatusLowBattery.BATTERY_LEVEL_LOW : Characteristic.StatusLowBattery.BATTERY_LEVEL_NORMAL;
    //         accessory.log.debug(`${accessory.name} | Battery Level: ${battery} => StatusLowBattery: ${lowBattery}`);
    //         return lowBattery;
    //     });
    // }

    deviceClass.getOrAddCharacteristic(accessory, service, Characteristic.StatusLowBattery, {
        getHandler: function () {
            const battery = deviceClass.clamp(accessory.context.deviceData.attributes.battery, 0, 100);
            accessory.log.debug(`${accessory.name} | Battery Level: ${battery}`);
            return battery < 20 ? Characteristic.StatusLowBattery.BATTERY_LEVEL_LOW : Characteristic.StatusLowBattery.BATTERY_LEVEL_NORMAL;
        },
        preReqChk: (acc) => acc.hasAttribute("Battery"),
    });

    // PM2.5 Density (if available)
    // if (accessory.hasAttribute("pm25")) {
    //     service.getCharacteristic(Characteristic.PM2_5Density).onGet(() => {
    //         const pm25 = deviceClass.clamp(accessory.context.deviceData.attributes.pm25, 0, 1000);
    //         accessory.log.debug(`${accessory.name} | PM2.5 Density: ${pm25}`);
    //         return pm25;
    //     });
    // }

    deviceClass.getOrAddCharacteristic(accessory, service, Characteristic.PM2_5Density, {
        getHandler: function () {
            const pm25 = deviceClass.clamp(accessory.context.deviceData.attributes.pm25, 0, 1000);
            accessory.log.debug(`${accessory.name} | PM2.5 Density: ${pm25}`);
            return pm25;
        },
        preReqChk: (acc) => acc.hasAttribute("pm25"),
    });

    // Status Tampered (if supported)
    // if (accessory.hasCapability("TamperAlert")) {
    //     service.getCharacteristic(Characteristic.StatusTampered).onGet(() => accessory.context.deviceData.attributes.tamper === "detected");

    //     // Add the characteristic to keep
    //     deviceClass.addCharacteristicToKeep(accessory, service, Characteristic.StatusTampered);
    // } else {
    //     service.removeCharacteristic(Characteristic.StatusTampered);
    // }

    deviceClass.getOrAddCharacteristic(accessory, service, Characteristic.StatusTampered, {
        preReqChk: (acc) => acc.hasCapability("TamperAlert"),
        getHandler: function () {
            const isTampered = accessory.context.deviceData.attributes.tamper === "detected";
            accessory.log.debug(`${accessory.name} | Status Tampered Retrieved: ${isTampered}`);
            return isTampered;
        },
        removeIfMissingPreReq: true,
    });

    accessory.context.deviceGroups.push("air_quality");
}

export function handleAttributeUpdate(accessory, change, deviceClass) {
    const { Service, Characteristic } = deviceClass.platform;
    const service = accessory.getService(Service.AirQualitySensor);

    if (!service) {
        accessory.log.warn(`${accessory.name} | Air Quality Sensor service not found`);
        return;
    }

    switch (change.attribute) {
        case "airQualityIndex":
            const airQuality = aqiToPm25(change.value, Characteristic);
            // service.updateCharacteristic(Characteristic.AirQuality, airQuality);
            // accessory.log.debug(`${accessory.name} | Updated Air Quality: ${airQuality}`);
            deviceClass.updateCharacteristicValue(accessory, service, Characteristic.AirQuality, airQuality);
            break;
        case "battery":
            if (accessory.hasAttribute("Battery")) {
                const battery = deviceClass.clamp(change.value, 0, 100);
                const lowBattery = battery < 20 ? Characteristic.StatusLowBattery.BATTERY_LEVEL_LOW : Characteristic.StatusLowBattery.BATTERY_LEVEL_NORMAL;
                deviceClass.updateCharacteristicValue(accessory, service, Characteristic.StatusLowBattery, lowBattery);
                // service.updateCharacteristic(Characteristic.StatusLowBattery, lowBattery);
                // accessory.log.debug(`${accessory.name} | Updated Status Low Battery: ${lowBattery}`);
            }
            break;
        case "pm25":
            if (accessory.hasAttribute("pm25")) {
                const pm25 = deviceClass.clamp(change.value, 0, 1000);
                // service.updateCharacteristic(Characteristic.PM2_5Density, pm25);
                deviceClass.updateCharacteristicValue(accessory, service, Characteristic.PM2_5Density, pm25);
                // accessory.log.debug(`${accessory.name} | Updated PM2.5 Density: ${pm25}`);
            }
            break;
        case "tamper":
            if (accessory.hasCapability("TamperAlert")) {
                const isTampered = change.value === "detected";
                deviceClass.updateCharacteristicValue(accessory, service, Characteristic.StatusTampered, isTampered);
                // service.updateCharacteristic(Characteristic.StatusTampered, isTampered);
                // accessory.log.debug(`${accessory.name} | Updated Status Tampered: ${isTampered}`);
            }
            break;
        case "status":
            const isActive = change.value === "online";
            deviceClass.updateCharacteristicValue(accessory, service, Characteristic.StatusActive, isActive);
            // service.updateCharacteristic(Characteristic.StatusActive, isActive);
            // accessory.log.debug(`${accessory.name} | Updated Status Active: ${isActive}`);
            break;
        default:
            accessory.log.debug(`${accessory.name} | Unhandled attribute update: ${change.attribute}`);
    }
}

function aqiToPm25(aqi, Characteristic) {
    if (aqi === undefined || aqi > 500 || aqi < 0) return Characteristic.AirQuality.UNKNOWN;
    if (aqi <= 50) return Characteristic.AirQuality.EXCELLENT;
    if (aqi <= 100) return Characteristic.AirQuality.GOOD;
    if (aqi <= 150) return Characteristic.AirQuality.FAIR;
    if (aqi <= 200) return Characteristic.AirQuality.INFERIOR;
    return Characteristic.AirQuality.POOR;
}

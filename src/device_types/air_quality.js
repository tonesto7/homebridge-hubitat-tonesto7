// device_types/air_quality.js

let DeviceClass, Characteristic, Service, CommunityTypes;

export async function init(_deviceClass, _Characteristic, _Service, _CommunityTypes) {
    DeviceClass = _deviceClass;
    Characteristic = _Characteristic;
    Service = _Service;
    CommunityTypes = _CommunityTypes;
}

export function isSupported(accessory) {
    return accessory.hasCapability("AirQuality");
}

export const relevantAttributes = ["airQualityIndex", "battery", "pm25", "tamper", "status"];

export async function initializeService(accessory) {
    const airQualitySvc = DeviceClass.getOrAddService(accessory, Service.AirQualitySensor);

    // Status Fault
    DeviceClass.getOrAddCharacteristic(accessory, airQualitySvc, Characteristic.StatusFault, {
        getHandler: function () {
            return Characteristic.StatusFault.NO_FAULT;
        },
    });

    // Status Active
    DeviceClass.getOrAddCharacteristic(accessory, airQualitySvc, Characteristic.StatusActive, {
        getHandler: function () {
            return accessory.context.deviceData.status === "ACTIVE";
        },
    });

    // Air Quality
    DeviceClass.getOrAddCharacteristic(accessory, airQualitySvc, Characteristic.AirQuality, {
        getHandler: function () {
            const aqi = accessory.context.deviceData.attributes.airQualityIndex;
            const airQuality = aqiToPm25(aqi, Characteristic);
            accessory.log.debug(`${accessory.name} | Air Quality (AQI): ${aqi} => HomeKit AirQuality: ${airQuality}`);
            return airQuality;
        },
    });

    // Status Low Battery
    DeviceClass.getOrAddCharacteristic(accessory, airQualitySvc, Characteristic.StatusLowBattery, {
        getHandler: function () {
            const battery = DeviceClass.clamp(accessory.context.deviceData.attributes.battery, 0, 100);
            accessory.log.debug(`${accessory.name} | Battery Level: ${battery}`);
            return battery < 20 ? Characteristic.StatusLowBattery.BATTERY_LEVEL_LOW : Characteristic.StatusLowBattery.BATTERY_LEVEL_NORMAL;
        },
        preReqChk: (acc) => acc.hasAttribute("Battery"),
    });

    // PM2.5 Density (if available)
    DeviceClass.getOrAddCharacteristic(accessory, airQualitySvc, Characteristic.PM2_5Density, {
        getHandler: function () {
            const pm25 = DeviceClass.clamp(accessory.context.deviceData.attributes.pm25, 0, 1000);
            accessory.log.debug(`${accessory.name} | PM2.5 Density: ${pm25}`);
            return pm25;
        },
        preReqChk: (acc) => acc.hasAttribute("pm25"),
    });

    // Status Tampered (if supported)
    DeviceClass.getOrAddCharacteristic(accessory, airQualitySvc, Characteristic.StatusTampered, {
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

export async function handleAttributeUpdate(accessory, change) {
    const airQualitySvc = accessory.getService(Service.AirQualitySensor);

    if (!airQualitySvc) {
        accessory.log.warn(`${accessory.name} | AirQualitySensor service not found`);
        return;
    }

    switch (change.attribute) {
        case "airQualityIndex":
            const airQuality = aqiToPm25(change.value, Characteristic);
            // accessory.log.debug(`${accessory.name} | Updated Air Quality: ${airQuality}`);
            DeviceClass.updateCharacteristicValue(accessory, airQualitySvc, Characteristic.AirQuality, airQuality);
            break;
        case "battery":
            if (accessory.hasAttribute("Battery")) {
                const battery = DeviceClass.clamp(change.value, 0, 100);
                const lowBattery = battery < 20 ? Characteristic.StatusLowBattery.BATTERY_LEVEL_LOW : Characteristic.StatusLowBattery.BATTERY_LEVEL_NORMAL;
                DeviceClass.updateCharacteristicValue(accessory, airQualitySvc, Characteristic.StatusLowBattery, lowBattery);

                // accessory.log.debug(`${accessory.name} | Updated Status Low Battery: ${lowBattery}`);
            }
            break;
        case "pm25":
            if (accessory.hasAttribute("pm25")) {
                const pm25 = DeviceClass.clamp(change.value, 0, 1000);

                DeviceClass.updateCharacteristicValue(accessory, airQualitySvc, Characteristic.PM2_5Density, pm25);
                // accessory.log.debug(`${accessory.name} | Updated PM2.5 Density: ${pm25}`);
            }
            break;
        case "tamper":
            if (accessory.hasCapability("TamperAlert")) {
                const isTampered = change.value === "detected";
                DeviceClass.updateCharacteristicValue(accessory, airQualitySvc, Characteristic.StatusTampered, isTampered);
                // accessory.log.debug(`${accessory.name} | Updated Status Tampered: ${isTampered}`);
            }
            break;
        case "status":
            const isActive = change.value === "ACTIVE";
            DeviceClass.updateCharacteristicValue(accessory, airQualitySvc, Characteristic.StatusActive, isActive);

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

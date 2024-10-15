// device_types/humidity_sensor.js

let DeviceClass, Characteristic, Service, CommunityTypes;

export async function init(_deviceClass, _Characteristic, _Service, _CommunityTypes) {
    DeviceClass = _deviceClass;
    Characteristic = _Characteristic;
    Service = _Service;
    CommunityTypes = _CommunityTypes;
}

export function isSupported(accessory) {
    return accessory.hasCapability("RelativeHumidityMeasurement") && accessory.hasAttribute("humidity") && !(accessory.hasCapability("Thermostat") || accessory.hasCapability("ThermostatOperatingState") || accessory.hasCapability("HumidityControl") || accessory.hasAttribute("thermostatOperatingState"));
}

export const relevantAttributes = ["humidity", "status", "tamper"];

export async function initializeService(accessory) {
    const humiditySvc = DeviceClass.getOrAddService(accessory, Service.HumiditySensor);

    DeviceClass.getOrAddCharacteristic(accessory, humiditySvc, Characteristic.CurrentRelativeHumidity, {
        getHandler: function () {
            let humidity = parseFloat(accessory.context.deviceData.attributes.humidity);
            humidity = DeviceClass.clamp(humidity, 0, 100);
            accessory.log.debug(`${accessory.name} | Current Humidity: ${humidity}%`);
            return Math.round(humidity);
        },
    });

    DeviceClass.getOrAddCharacteristic(accessory, humiditySvc, Characteristic.StatusActive, {
        getHandler: function () {
            const isActive = accessory.context.deviceData.status === "ACTIVE";
            accessory.log.debug(`${accessory.name} | Status Active: ${isActive}`);
            return isActive;
        },
    });

    DeviceClass.getOrAddCharacteristic(accessory, humiditySvc, Characteristic.StatusTampered, {
        preReqChk: (acc) => acc.hasCapability("TamperAlert"),
        getHandler: function () {
            const isTampered = accessory.context.deviceData.attributes.tamper === "detected";
            accessory.log.debug(`${accessory.name} | Status Tampered: ${isTampered}`);
            return isTampered;
        },
        removeIfMissingPreReq: true,
    });

    accessory.context.deviceGroups.push("humidity_sensor");
}

export async function handleAttributeUpdate(accessory, change) {
    const humiditySvc = accessory.getService(Service.HumiditySensor);

    if (!humiditySvc) {
        accessory.log.warn(`${accessory.name} | Humidity Sensor service not found`);
        return;
    }

    switch (change.attribute) {
        case "humidity": {
            const humidity = DeviceClass.clamp(parseFloat(change.value), 0, 100);
            DeviceClass.updateCharacteristicValue(accessory, humiditySvc, Characteristic.CurrentRelativeHumidity, Math.round(humidity));
            // accessory.log.debug(`${accessory.name} | Updated Humidity: ${humidity}%`);
            break;
        }
        case "status": {
            const isActive = change.value === "ACTIVE";
            DeviceClass.updateCharacteristicValue(accessory, humiditySvc, Characteristic.StatusActive, isActive);
            // accessory.log.debug(`${accessory.name} | Updated Status Active: ${isActive}`);
            break;
        }
        case "tamper": {
            if (accessory.hasCapability("TamperAlert")) {
                const isTampered = change.value === "detected";
                DeviceClass.updateCharacteristicValue(accessory, humiditySvc, Characteristic.StatusTampered, isTampered);
                // accessory.log.debug(`${accessory.name} | Updated Status Tampered: ${isTampered}`);
            }
            break;
        }
        default:
            accessory.log.debug(`${accessory.name} | Unhandled attribute update: ${change.attribute}`);
    }
}

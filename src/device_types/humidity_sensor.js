// device_types/humidity_sensor.js

export function isSupported(accessory) {
    return accessory.hasCapability("RelativeHumidityMeasurement") && accessory.hasAttribute("humidity") && !(accessory.hasCapability("Thermostat") || accessory.hasCapability("ThermostatOperatingState") || accessory.hasCapability("HumidityControl") || accessory.hasAttribute("thermostatOperatingState"));
}

export const relevantAttributes = ["humidity", "status", "tamper"];

export function initializeAccessory(accessory, deviceClass) {
    const { Service, Characteristic } = deviceClass.platform;
    const service = deviceClass.getOrAddService(accessory, Service.HumiditySensor);

    deviceClass.getOrAddCharacteristic(accessory, service, Characteristic.CurrentRelativeHumidity, {
        getHandler: function () {
            let humidity = parseFloat(accessory.context.deviceData.attributes.humidity);
            humidity = deviceClass.clamp(humidity, 0, 100);
            accessory.log.debug(`${accessory.name} | Current Humidity: ${humidity}%`);
            return Math.round(humidity);
        },
    });

    deviceClass.getOrAddCharacteristic(accessory, service, Characteristic.StatusActive, {
        getHandler: function () {
            const isActive = accessory.context.deviceData.status === "online";
            accessory.log.debug(`${accessory.name} | Status Active: ${isActive}`);
            return isActive;
        },
    });

    deviceClass.getOrAddCharacteristic(accessory, service, Characteristic.StatusTampered, {
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

export function handleAttributeUpdate(accessory, change, deviceClass) {
    const { Characteristic, Service } = deviceClass.platform;
    const service = accessory.getService(Service.HumiditySensor);

    if (!service) {
        accessory.log.warn(`${accessory.name} | Humidity Sensor service not found`);
        return;
    }

    switch (change.attribute) {
        case "humidity": {
            const humidity = deviceClass.clamp(parseFloat(change.value), 0, 100);
            deviceClass.updateCharacteristicValue(accessory, service, Characteristic.CurrentRelativeHumidity, Math.round(humidity));
            // accessory.log.debug(`${accessory.name} | Updated Humidity: ${humidity}%`);
            break;
        }
        case "status": {
            const isActive = change.value === "online";
            deviceClass.updateCharacteristicValue(accessory, service, Characteristic.StatusActive, isActive);
            // accessory.log.debug(`${accessory.name} | Updated Status Active: ${isActive}`);
            break;
        }
        case "tamper": {
            if (accessory.hasCapability("TamperAlert")) {
                const isTampered = change.value === "detected";
                deviceClass.updateCharacteristicValue(accessory, service, Characteristic.StatusTampered, isTampered);
                // accessory.log.debug(`${accessory.name} | Updated Status Tampered: ${isTampered}`);
            }
            break;
        }
        default:
            accessory.log.debug(`${accessory.name} | Unhandled attribute update: ${change.attribute}`);
    }
}

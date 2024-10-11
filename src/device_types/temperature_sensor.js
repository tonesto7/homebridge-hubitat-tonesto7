// device_types/temperature_sensor.js

export function isSupported(accessory) {
    return accessory.hasCapability("TemperatureMeasurement") && !(accessory.hasCapability("Thermostat") || accessory.hasCapability("ThermostatOperatingState") || accessory.hasAttribute("thermostatOperatingState"));
}

export const relevantAttributes = ["temperature", "tamper", "status"];

export function initializeAccessory(accessory, deviceClass) {
    const { Service, Characteristic } = deviceClass.platform;
    const service = deviceClass.getOrAddService(accessory, Service.TemperatureSensor);

    deviceClass.getOrAddCharacteristic(accessory, service, Characteristic.CurrentTemperature, {
        props: {
            minValue: -100,
            maxValue: 200,
            minStep: 0.1,
        },
        getHandler: function () {
            let temp = parseFloat(accessory.context.deviceData.attributes.temperature);
            temp = isNaN(temp) ? 0 : convertTemperature(temp, deviceClass.platform);
            accessory.log.debug(`${accessory.name} | Temperature Sensor Current Temperature Retrieved: ${temp} ${deviceClass.platform.getTempUnit()}`);
            return temp;
        },
    });

    deviceClass.getOrAddCharacteristic(accessory, service, Characteristic.StatusTampered, {
        preReqChk: (acc) => acc.hasCapability("TamperAlert"),
        getHandler: function () {
            const isTampered = accessory.context.deviceData.attributes.tamper === "detected";
            accessory.log.debug(`${accessory.name} | Temperature Sensor Status Tampered Retrieved: ${isTampered}`);
            return isTampered;
        },
        removeIfMissingPreReq: true,
    });

    deviceClass.getOrAddCharacteristic(accessory, service, Characteristic.StatusActive, {
        getHandler: function () {
            const isActive = accessory.context.deviceData.status === "online";
            accessory.log.debug(`${accessory.name} | Temperature Sensor Status Active Retrieved: ${isActive}`);
            return isActive;
        },
    });

    accessory.context.deviceGroups.push("temperature_sensor");
}

export function handleAttributeUpdate(accessory, change, deviceClass) {
    const { Characteristic, Service } = deviceClass.platform;
    const service = accessory.getService(Service.TemperatureSensor);

    if (!service) {
        accessory.log.warn(`${accessory.name} | Temperature Sensor service not found`);
        return;
    }

    switch (change.attribute) {
        case "temperature": {
            let temp = parseFloat(change.value);
            temp = isNaN(temp) ? 0 : convertTemperature(temp, deviceClass.platform);
            deviceClass.updateCharacteristicValue(accessory, service, Characteristic.CurrentTemperature, temp);
            // accessory.log.debug(
            //     `${accessory.name} | Updated Temperature: ${temp} ${deviceClass.platform.getTempUnit()}`
            // );
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
        case "status": {
            const isActive = change.value === "online";
            deviceClass.updateCharacteristicValue(accessory, service, Characteristic.StatusActive, isActive);
            // accessory.log.debug(`${accessory.name} | Updated Status Active: ${isActive}`);
            break;
        }
        default:
            accessory.log.debug(`${accessory.name} | Unhandled attribute update: ${change.attribute}`);
    }
}

function clamp(value, min, max) {
    return Math.max(min, Math.min(max, value));
}

function convertTemperature(temp, platform) {
    if (platform.getTempUnit() === "F") {
        return clamp((temp - 32) / 1.8, -100, 200);
    }
    return clamp(temp, -100, 200);
}

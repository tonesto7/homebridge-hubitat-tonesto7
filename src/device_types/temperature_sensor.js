// device_types/temperature_sensor.js

let DeviceClass, Characteristic, Service, CommunityTypes;

export async function init(_deviceClass, _Characteristic, _Service, _CommunityTypes) {
    DeviceClass = _deviceClass;
    Characteristic = _Characteristic;
    Service = _Service;
    CommunityTypes = _CommunityTypes;
}

export function isSupported(accessory) {
    return accessory.hasCapability("TemperatureMeasurement") && !(accessory.hasCapability("Thermostat") || accessory.hasCapability("ThermostatOperatingState") || accessory.hasAttribute("thermostatOperatingState"));
}

export const relevantAttributes = ["temperature", "tamper", "status"];

export async function initializeService(accessory) {
    const temperatureSvc = DeviceClass.getOrAddService(accessory, Service.TemperatureSensor);

    DeviceClass.getOrAddCharacteristic(accessory, temperatureSvc, Characteristic.CurrentTemperature, {
        props: {
            minValue: -100,
            maxValue: 200,
            minStep: 0.1,
        },
        getHandler: function () {
            let temp = parseFloat(accessory.context.deviceData.attributes.temperature);
            temp = isNaN(temp) ? 0 : convertTemperature(temp, DeviceClass.platform);
            accessory.log.debug(`${accessory.name} | Temperature Sensor CurrentTemperature Retrieved: ${temp} ${DeviceClass.platform.getTempUnit()}`);
            return temp;
        },
    });

    DeviceClass.getOrAddCharacteristic(accessory, temperatureSvc, Characteristic.StatusTampered, {
        preReqChk: (acc) => acc.hasCapability("TamperAlert"),
        getHandler: function () {
            const isTampered = accessory.context.deviceData.attributes.tamper === "detected";
            accessory.log.debug(`${accessory.name} | Temperature Sensor StatusTampered Retrieved: ${isTampered}`);
            return isTampered;
        },
        removeIfMissingPreReq: true,
    });

    DeviceClass.getOrAddCharacteristic(accessory, temperatureSvc, Characteristic.StatusActive, {
        getHandler: function () {
            const isActive = accessory.context.deviceData.status === "ACTIVE";
            accessory.log.debug(`${accessory.name} | Temperature Sensor StatusActive Retrieved: ${isActive}`);
            return isActive;
        },
    });

    accessory.context.deviceGroups.push("temperature_sensor");
}

export async function handleAttributeUpdate(accessory, change) {
    const temperatureSvc = accessory.getService(Service.TemperatureSensor);
    if (!temperatureSvc) {
        accessory.log.warn(`${accessory.name} | Temperature Sensor service not found`);
        return;
    }

    switch (change.attribute) {
        case "temperature": {
            let temp = parseFloat(change.value);
            temp = isNaN(temp) ? 0 : convertTemperature(temp, DeviceClass.platform);
            DeviceClass.updateCharacteristicValue(accessory, temperatureSvc, Characteristic.CurrentTemperature, temp);
            // accessory.log.debug(
            //     `${accessory.name} | Updated Temperature: ${temp} ${DeviceClass.platform.getTempUnit()}`
            // );
            break;
        }
        case "tamper": {
            if (accessory.hasCapability("TamperAlert")) {
                const isTampered = change.value === "detected";
                DeviceClass.updateCharacteristicValue(accessory, temperatureSvc, Characteristic.StatusTampered, isTampered);
                // accessory.log.debug(`${accessory.name} | Updated Status Tampered: ${isTampered}`);
            }
            break;
        }
        case "status": {
            const isActive = change.value === "ACTIVE";
            DeviceClass.updateCharacteristicValue(accessory, temperatureSvc, Characteristic.StatusActive, isActive);
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
        const tempOut = Math.round((temp - 32) / 1.8, 1);
        return clamp(tempOut, -100, 200);
    }
    return clamp(temp, -100, 200);
}

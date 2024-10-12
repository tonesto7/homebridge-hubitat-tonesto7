// device_types/illuminance_sensor.js

let DeviceClass, Characteristic, Service, CommunityTypes;

export function init(_deviceClass, _Characteristic, _Service, _CommunityTypes) {
    DeviceClass = _deviceClass;
    Characteristic = _Characteristic;
    Service = _Service;
    CommunityTypes = _CommunityTypes;
}

export function isSupported(accessory) {
    return accessory.hasCapability("IlluminanceMeasurement");
}

export const relevantAttributes = ["illuminance", "status", "tamper"];

export function initializeAccessory(accessory) {
    const lightSensorSvc = DeviceClass.getOrAddService(accessory, Service.LightSensor);

    DeviceClass.getOrAddCharacteristic(accessory, lightSensorSvc, Characteristic.CurrentAmbientLightLevel, {
        props: {
            minValue: 0,
            maxValue: 100000,
            minStep: 1,
        },
        getHandler: function () {
            let illuminance = parseFloat(accessory.context.deviceData.attributes.illuminance);
            illuminance = DeviceClass.clamp(illuminance, 0, 100000);
            illuminance = isNaN(illuminance) ? 0 : Math.round(Math.ceil(illuminance));
            accessory.log.debug(`${accessory.name} | Current Ambient Light Level: ${illuminance} lux`);
            return illuminance;
        },
    });

    DeviceClass.getOrAddCharacteristic(accessory, lightSensorSvc, Characteristic.StatusActive, {
        getHandler: function () {
            const isActive = accessory.context.deviceData.status === "ACTIVE";
            accessory.log.debug(`${accessory.name} | Status Active: ${isActive}`);
            return isActive;
        },
    });

    DeviceClass.getOrAddCharacteristic(accessory, lightSensorSvc, Characteristic.StatusTampered, {
        preReqChk: (acc) => acc.hasCapability("TamperAlert"),
        getHandler: function () {
            const isTampered = accessory.context.deviceData.attributes.tamper === "detected";
            accessory.log.debug(`${accessory.name} | Status Tampered: ${isTampered}`);
            return isTampered;
        },
        removeIfMissingPreReq: true,
    });

    accessory.context.deviceGroups.push("illuminance_sensor");
}

export function handleAttributeUpdate(accessory, change) {
    const lightSensorSvc = accessory.getService(Service.LightSensor);

    if (!lightSensorSvc) {
        accessory.log.warn(`${accessory.name} | Light Sensor service not found`);
        return;
    }

    switch (change.attribute) {
        case "illuminance":
            const illuminance = DeviceClass.clamp(parseFloat(change.value), 0, 100000);
            DeviceClass.updateCharacteristicValue(accessory, lightSensorSvc, Characteristic.CurrentAmbientLightLevel, Math.round(Math.ceil(illuminance)));
            // accessory.log.debug(`${accessory.name} | Updated Ambient Light Level: ${illuminance} lux`);
            break;
        case "status":
            DeviceClass.updateCharacteristicValue(accessory, lightSensorSvc, Characteristic.StatusActive, change.value === "ACTIVE");
            // accessory.log.debug(`${accessory.name} | Updated Status Active: ${isActive}`);
            break;
        case "tamper":
            if (accessory.hasCapability("TamperAlert")) {
                DeviceClass.updateCharacteristicValue(accessory, lightSensorSvc, Characteristic.StatusTampered, change.value === "detected");
                // accessory.log.debug(`${accessory.name} | Updated Status Tampered: ${isTampered}`);
            }
            break;
        default:
            accessory.log.debug(`${accessory.name} | Unhandled attribute update: ${change.attribute}`);
    }
}

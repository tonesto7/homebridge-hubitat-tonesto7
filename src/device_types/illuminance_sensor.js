// device_types/illuminance_sensor.js

export function isSupported(accessory) {
    return accessory.hasCapability("IlluminanceMeasurement");
}

export const relevantAttributes = ["illuminance", "status", "tamper"];

export function initializeAccessory(accessory, deviceClass) {
    const { Service, Characteristic } = deviceClass.platform;
    const service = deviceClass.getOrAddService(accessory, Service.LightSensor);

    deviceClass.getOrAddCharacteristic(accessory, service, Characteristic.CurrentAmbientLightLevel, {
        props: {
            minValue: 0,
            maxValue: 100000,
            minStep: 1,
        },
        getHandler: function () {
            let illuminance = parseFloat(accessory.context.deviceData.attributes.illuminance);
            illuminance = deviceClass.clamp(illuminance, 0, 100000);
            accessory.log.debug(`${accessory.name} | Current Ambient Light Level: ${illuminance} lux`);
            return isNaN(illuminance) ? 0 : Math.round(Math.ceil(illuminance));
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

    accessory.context.deviceGroups.push("illuminance_sensor");
}

export function handleAttributeUpdate(accessory, change, deviceClass) {
    const { Characteristic, Service } = deviceClass.platform;
    const service = accessory.getService(Service.LightSensor);

    if (!service) {
        accessory.log.warn(`${accessory.name} | Light Sensor service not found`);
        return;
    }

    switch (change.attribute) {
        case "illuminance":
            const illuminance = deviceClass.clamp(parseFloat(change.value), 0, 100000);
            deviceClass.updateCharacteristicValue(accessory, service, Characteristic.CurrentAmbientLightLevel, Math.round(Math.ceil(illuminance)));
            // accessory.log.debug(`${accessory.name} | Updated Ambient Light Level: ${illuminance} lux`);
            break;
        case "status":
            const isActive = change.value === "online";
            deviceClass.updateCharacteristicValue(accessory, service, Characteristic.StatusActive, isActive);
            // accessory.log.debug(`${accessory.name} | Updated Status Active: ${isActive}`);
            break;
        case "tamper":
            if (accessory.hasCapability("TamperAlert")) {
                const isTampered = change.value === "detected";
                deviceClass.updateCharacteristicValue(accessory, service, Characteristic.StatusTampered, isTampered);
                // accessory.log.debug(`${accessory.name} | Updated Status Tampered: ${isTampered}`);
            }
            break;
        default:
            accessory.log.debug(`${accessory.name} | Unhandled attribute update: ${change.attribute}`);
    }
}

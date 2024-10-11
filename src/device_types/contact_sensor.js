// device_types/contact_sensor.js

export function isSupported(accessory) {
    return accessory.hasCapability("ContactSensor") && !accessory.hasCapability("GarageDoorControl");
}

export const relevantAttributes = ["contact", "status", "tamper"];

export function initializeAccessory(accessory, deviceClass) {
    const { Service, Characteristic } = deviceClass.platform;
    const service = deviceClass.getOrAddService(accessory, Service.ContactSensor);

    // Contact Sensor State
    deviceClass.getOrAddCharacteristic(accessory, service, Characteristic.ContactSensorState, {
        getHandler: function () {
            const status = accessory.context.deviceData.attributes.contact;
            return convertContactStatus(status, Characteristic);
        },
    });

    // Status Active
    deviceClass.getOrAddCharacteristic(accessory, service, Characteristic.StatusActive, {
        getHandler: function () {
            const isActive = accessory.context.deviceData.status === "online";
            accessory.log.debug(`${accessory.name} | Status Active: ${isActive}`);
            return isActive;
        },
    });

    // Status Tampered (if supported)
    deviceClass.getOrAddCharacteristic(accessory, service, Characteristic.StatusTampered, {
        preReqChk: (acc) => acc.hasCapability("TamperAlert"),
        getHandler: function () {
            const isTampered = accessory.context.deviceData.attributes.tamper === "detected";
            accessory.log.debug(`${accessory.name} | Status Tampered: ${isTampered}`);
            return isTampered;
        },
        removeIfMissingPreReq: true,
    });

    accessory.context.deviceGroups.push("contact_sensor");
}

export function handleAttributeUpdate(accessory, change, deviceClass) {
    const { Characteristic, Service } = deviceClass.platform;
    const service = accessory.getService(Service.ContactSensor);

    if (!service) {
        accessory.log.warn(`${accessory.name} | Contact Sensor service not found`);
        return;
    }

    switch (change.attribute) {
        case "contact": {
            const contactState = convertContactStatus(change.value, Characteristic);
            deviceClass.updateCharacteristicValue(accessory, service, Characteristic.ContactSensorState, contactState);
            // accessory.log.debug(`${accessory.name} | Updated Contact Sensor State: ${contactState}`);
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

function convertContactStatus(status, Characteristic) {
    return status === "closed" ? Characteristic.ContactSensorState.CONTACT_DETECTED : Characteristic.ContactSensorState.CONTACT_NOT_DETECTED;
}

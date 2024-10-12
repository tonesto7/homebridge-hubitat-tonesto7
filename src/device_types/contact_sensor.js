// device_types/contact_sensor.js

let DeviceClass, Characteristic, Service, CommunityTypes;

export function init(_deviceClass, _Characteristic, _Service, _CommunityTypes) {
    DeviceClass = _deviceClass;
    Characteristic = _Characteristic;
    Service = _Service;
    CommunityTypes = _CommunityTypes;
}

export function isSupported(accessory) {
    return accessory.hasCapability("ContactSensor") && !accessory.hasCapability("GarageDoorControl");
}

export const relevantAttributes = ["contact", "status", "tamper"];

export function initializeAccessory(accessory) {
    const contactSvc = DeviceClass.getOrAddService(accessory, Service.ContactSensor);

    // Contact Sensor State
    DeviceClass.getOrAddCharacteristic(accessory, contactSvc, Characteristic.ContactSensorState, {
        getHandler: function () {
            const status = accessory.context.deviceData.attributes.contact;
            return convertContactStatus(status);
        },
    });

    // Status Active
    DeviceClass.getOrAddCharacteristic(accessory, contactSvc, Characteristic.StatusActive, {
        getHandler: function () {
            const isActive = accessory.context.deviceData.status === "ACTIVE";
            accessory.log.debug(`${accessory.name} | Status Active: ${isActive}`);
            return isActive;
        },
    });

    // Status Tampered (if supported)
    DeviceClass.getOrAddCharacteristic(accessory, contactSvc, Characteristic.StatusTampered, {
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

export function handleAttributeUpdate(accessory, change) {
    const contactSvc = accessory.getService(Service.ContactSensor);

    if (!contactSvc) {
        accessory.log.warn(`${accessory.name} | Contact Sensor service not found`);
        return;
    }

    switch (change.attribute) {
        case "contact": {
            const contactState = convertContactStatus(change.value);
            DeviceClass.updateCharacteristicValue(accessory, contactSvc, Characteristic.ContactSensorState, contactState);
            break;
        }
        case "status": {
            const isActive = change.value === "ACTIVE";
            DeviceClass.updateCharacteristicValue(accessory, contactSvc, Characteristic.StatusActive, isActive);
            // accessory.log.debug(`${accessory.name} | Updated Status Active: ${isActive}`);
            break;
        }
        case "tamper": {
            if (accessory.hasCapability("TamperAlert")) {
                const isTampered = change.value === "detected";
                DeviceClass.updateCharacteristicValue(accessory, contactSvc, Characteristic.StatusTampered, isTampered);
                // accessory.log.debug(`${accessory.name} | Updated Status Tampered: ${isTampered}`);
            }
            break;
        }
        default:
            accessory.log.debug(`${accessory.name} | Unhandled attribute update: ${change.attribute}`);
    }
}

function convertContactStatus(status) {
    return status === "closed" ? Characteristic.ContactSensorState.CONTACT_DETECTED : Characteristic.ContactSensorState.CONTACT_NOT_DETECTED;
}

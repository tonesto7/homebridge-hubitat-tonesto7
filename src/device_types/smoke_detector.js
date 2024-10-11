// device_types/smoke_detector.js

export function isSupported(accessory) {
    return accessory.hasCapability("SmokeDetector") && accessory.hasAttribute("smoke");
}

export const relevantAttributes = ["smoke", "status", "tamper"];

export function initializeAccessory(accessory, deviceClass) {
    const { Service, Characteristic } = deviceClass.platform;
    const service = deviceClass.getOrAddService(accessory, Service.SmokeSensor);

    deviceClass.getOrAddCharacteristic(accessory, service, Characteristic.SmokeDetected, {
        getHandler: function () {
            const smoke = convertSmokeStatus(accessory.context.deviceData.attributes.smoke, Characteristic);
            accessory.log.debug(`${accessory.name} | Smoke Detected Retrieved: ${smoke}`);
            return smoke;
        },
    });

    deviceClass.getOrAddCharacteristic(accessory, service, Characteristic.StatusActive, {
        getHandler: function () {
            const isActive = accessory.context.deviceData.status === "online";
            accessory.log.debug(`${accessory.name} | Smoke Detector Status Active Retrieved: ${isActive}`);
            return isActive;
        },
    });

    deviceClass.getOrAddCharacteristic(accessory, service, Characteristic.StatusTampered, {
        preReqChk: (acc) => acc.hasCapability("TamperAlert"),
        getHandler: function () {
            const isTampered = accessory.context.deviceData.attributes.tamper === "detected";
            accessory.log.debug(`${accessory.name} | Smoke Detector Status Tampered Retrieved: ${isTampered}`);
            return isTampered;
        },
        removeIfMissingPreReq: true,
    });

    accessory.context.deviceGroups.push("smoke_detector");
}

export function handleAttributeUpdate(accessory, change, deviceClass) {
    const { Characteristic, Service } = deviceClass.platform;
    const service = accessory.getService(Service.SmokeSensor);

    if (!service) {
        accessory.log.warn(`${accessory.name} | Smoke Sensor service not found`);
        return;
    }

    switch (change.attribute) {
        case "smoke": {
            const smokeDetected = convertSmokeStatus(change.value, Characteristic);
            deviceClass.updateCharacteristicValue(accessory, service, Characteristic.SmokeDetected, smokeDetected);
            // accessory.log.debug(`${accessory.name} | Updated Smoke Detected: ${smokeDetected}`);
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

function convertSmokeStatus(smokeStatus, Characteristic) {
    return smokeStatus === "clear" ? Characteristic.SmokeDetected.SMOKE_NOT_DETECTED : Characteristic.SmokeDetected.SMOKE_DETECTED;
}

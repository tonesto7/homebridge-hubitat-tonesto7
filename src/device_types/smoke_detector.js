// device_types/smoke_detector.js

let DeviceClass, Characteristic, Service, CommunityTypes;

export function init(_deviceClass, _Characteristic, _Service, _CommunityTypes) {
    DeviceClass = _deviceClass;
    Characteristic = _Characteristic;
    Service = _Service;
    CommunityTypes = _CommunityTypes;
}

export function isSupported(accessory) {
    return accessory.hasCapability("SmokeDetector") && accessory.hasAttribute("smoke");
}

export const relevantAttributes = ["smoke", "status", "tamper"];

export function initializeAccessory(accessory) {
    const smokeSensorSvc = DeviceClass.getOrAddService(accessory, Service.SmokeSensor);

    DeviceClass.getOrAddCharacteristic(accessory, smokeSensorSvc, Characteristic.SmokeDetected, {
        getHandler: function () {
            const smoke = convertSmokeStatus(accessory.context.deviceData.attributes.smoke);
            accessory.log.debug(`${accessory.name} | Smoke Detected Retrieved: ${smoke}`);
            return smoke;
        },
    });

    DeviceClass.getOrAddCharacteristic(accessory, smokeSensorSvc, Characteristic.StatusActive, {
        getHandler: function () {
            const isActive = accessory.context.deviceData.status === "ACTIVE";
            accessory.log.debug(`${accessory.name} | Smoke Detector Status Active Retrieved: ${isActive}`);
            return isActive;
        },
    });

    DeviceClass.getOrAddCharacteristic(accessory, smokeSensorSvc, Characteristic.StatusTampered, {
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

export function handleAttributeUpdate(accessory, change) {
    const smokeSensorSvc = accessory.getService(Service.SmokeSensor);
    if (!smokeSensorSvc) {
        accessory.log.warn(`${accessory.name} | Smoke Sensor service not found`);
        return;
    }

    switch (change.attribute) {
        case "smoke": {
            const smokeDetected = convertSmokeStatus(change.value);
            DeviceClass.updateCharacteristicValue(accessory, smokeSensorSvc, Characteristic.SmokeDetected, smokeDetected);
            // accessory.log.debug(`${accessory.name} | Updated Smoke Detected: ${smokeDetected}`);
            break;
        }
        case "status": {
            const isActive = change.value === "ACTIVE";
            DeviceClass.updateCharacteristicValue(accessory, smokeSensorSvc, Characteristic.StatusActive, isActive);
            // accessory.log.debug(`${accessory.name} | Updated Status Active: ${isActive}`);
            break;
        }
        case "tamper": {
            if (accessory.hasCapability("TamperAlert")) {
                const isTampered = change.value === "detected";
                DeviceClass.updateCharacteristicValue(accessory, smokeSensorSvc, Characteristic.StatusTampered, isTampered);
                // accessory.log.debug(`${accessory.name} | Updated Status Tampered: ${isTampered}`);
            }
            break;
        }
        default:
            accessory.log.debug(`${accessory.name} | Unhandled attribute update: ${change.attribute}`);
    }
}

function convertSmokeStatus(smokeStatus) {
    return smokeStatus === "clear" ? Characteristic.SmokeDetected.SMOKE_NOT_DETECTED : Characteristic.SmokeDetected.SMOKE_DETECTED;
}

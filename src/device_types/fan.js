// device_types/fan.js

export function isSupported(accessory) {
    return accessory.hasCapability("Fan") || accessory.hasCapability("FanControl") || (accessory.context.deviceData.name.toLowerCase().includes("fan") && accessory.platform.configItems.consider_fan_by_name !== false) || accessory.hasCommand("setSpeed") || accessory.hasAttribute("speed");
}

export const relevantAttributes = ["switch", "speed", "level"];

export function initializeAccessory(accessory, deviceClass) {
    const { Service, Characteristic } = deviceClass.platform;
    const service = deviceClass.getOrAddService(accessory, Service.Fanv2);

    deviceClass.getOrAddCharacteristic(accessory, service, Characteristic.Active, {
        preReqChk: (acc) => acc.hasAttribute("switch"),
        getHandler: function () {
            if (accessory.context.deviceData.isUnavailable) {
                throw new Error("Device is unavailable");
            }
            const isActive = accessory.context.deviceData.attributes.switch === "on" ? Characteristic.Active.ACTIVE : Characteristic.Active.INACTIVE;
            accessory.log.debug(`${accessory.name} | Fan Active State: ${isActive === Characteristic.Active.ACTIVE ? "Active" : "Inactive"}`);
            return isActive;
        },
        setHandler: function (value) {
            const state = value ? "on" : "off";
            accessory.log.info(`${accessory.name} | Setting fan state to ${state}`);
            accessory.sendCommand(null, accessory, accessory.context.deviceData, state);
        },
        removeIfMissingPreReq: true,
    });

    deviceClass.getOrAddCharacteristic(accessory, service, Characteristic.CurrentFanState, {
        preReqChk: (acc) => acc.hasAttribute("switch"),
        getHandler: function () {
            const currentState = accessory.context.deviceData.attributes.switch === "on" ? Characteristic.CurrentFanState.BLOWING_AIR : Characteristic.CurrentFanState.IDLE;
            accessory.log.debug(`${accessory.name} | Current Fan State: ${currentState === Characteristic.CurrentFanState.BLOWING_AIR ? "Blowing Air" : "Idle"}`);
            return currentState;
        },
        removeIfMissingPreReq: true,
    });

    // Rotation Speed
    let spdSteps = 1;
    if (accessory.hasDeviceFlag("fan_3_spd")) spdSteps = 33;
    if (accessory.hasDeviceFlag("fan_4_spd")) spdSteps = 25;
    if (accessory.hasDeviceFlag("fan_5_spd")) spdSteps = 20;

    let spdAttr = accessory.hasAttribute("speed") && accessory.hasCommand("setSpeed") ? "speed" : accessory.hasAttribute("level") ? "level" : undefined;

    deviceClass.getOrAddCharacteristic(accessory, service, Characteristic.RotationSpeed, {
        preReqChk: (acc) => spdAttr !== undefined,
        props: { minStep: spdSteps, maxValue: 100, minValue: 0 },
        getHandler: function () {
            const speedLevel = accessory.context.deviceData.attributes[spdAttr];
            const rotationSpeed = fanSpeedToLevel(speedLevel);
            accessory.log.debug(`${accessory.name} | Current Rotation Speed: ${rotationSpeed}`);
            return rotationSpeed;
        },
        setHandler: function (value) {
            const clampedValue = deviceClass.clamp(value, 0, 100);
            const speed = fanSpeedConversion(clampedValue);
            accessory.log.info(`${accessory.name} | Setting fan speed to ${speed}`);
            accessory.sendCommand(null, accessory, accessory.context.deviceData, `set${spdAttr.charAt(0).toUpperCase() + spdAttr.slice(1)}`, { value1: speed });
        },
        removeIfMissingPreReq: true,
    });

    accessory.context.deviceGroups.push("fan");
}

export function handleAttributeUpdate(accessory, change, deviceClass) {
    const { Characteristic, Service } = deviceClass.platform;
    const service = accessory.getService(Service.Fanv2);

    if (!service) {
        accessory.log.warn(`${accessory.name} | Fan service not found`);
        return;
    }

    switch (change.attribute) {
        case "switch":
            const isActive = change.value === "on";
            deviceClass.updateCharacteristicValue(accessory, service, Characteristic.Active, isActive ? Characteristic.Active.ACTIVE : Characteristic.Active.INACTIVE);
            deviceClass.updateCharacteristicValue(accessory, service, Characteristic.CurrentFanState, isActive ? Characteristic.CurrentFanState.BLOWING_AIR : Characteristic.CurrentFanState.IDLE);
            // accessory.log.debug(`${accessory.name} | Updated Fan Active: ${isActive}`);
            break;
        case "speed":
        case "level":
            const rotationSpeed = fanSpeedToLevel(change.value);
            deviceClass.updateCharacteristicValue(accessory, service, Characteristic.RotationSpeed, rotationSpeed);
            // accessory.log.debug(`${accessory.name} | Updated Rotation Speed: ${rotationSpeed}`);
            break;
        default:
            accessory.log.debug(`${accessory.name} | Unhandled attribute update: ${change.attribute}`);
    }
}

/**
 * Converts HomeKit RotationSpeed value to device-specific fan speed string.
 * @param {number} speedVal - The RotationSpeed value from HomeKit.
 * @returns {string} - Corresponding fan speed string.
 */
function fanSpeedConversion(speedVal) {
    if (speedVal <= 0) return "off";
    if (speedVal <= 20) return "low";
    if (speedVal <= 40) return "medium-low";
    if (speedVal <= 60) return "medium";
    if (speedVal <= 80) return "medium-high";
    return "high";
}

/**
 * Converts device-specific fan speed string to HomeKit RotationSpeed value.
 * @param {string} speedVal - The fan speed string from the device.
 * @returns {number} - Corresponding RotationSpeed value for HomeKit.
 */
function fanSpeedToLevel(speedVal) {
    switch (speedVal) {
        case "off":
            return 0;
        case "low":
            return 33;
        case "medium-low":
            return 40;
        case "medium":
            return 66;
        case "medium-high":
            return 80;
        case "high":
            return 100;
        default:
            return 0;
    }
}

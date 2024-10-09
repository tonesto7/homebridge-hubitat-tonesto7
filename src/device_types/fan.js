// device_types/fan.js

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

module.exports = {
    isSupported: (accessory) => accessory.hasCapability("Fan") || accessory.hasCapability("FanControl") || (accessory.context.deviceData.name.toLowerCase().includes("fan") && accessory.platform.configItems.consider_fan_by_name !== false) || accessory.hasCommand("setSpeed") || accessory.hasAttribute("speed"),

    relevantAttributes: ["switch", "speed", "level"],

    initializeAccessory: (accessory, deviceClass) => {
        const { Service, Characteristic } = deviceClass.mainPlatform;
        const service = accessory.getService(Service.Fanv2) || accessory.addService(Service.Fanv2);

        // Active State and Current Fan State
        if (accessory.hasAttribute("switch")) {
            service
                .getCharacteristic(Characteristic.Active)
                .onGet(() => {
                    if (accessory.context.deviceData.isUnavailable) {
                        throw new Error("Device is unavailable");
                    }
                    const isActive = accessory.context.deviceData.attributes.switch === "on" ? Characteristic.Active.ACTIVE : Characteristic.Active.INACTIVE;
                    accessory.log.debug(`${accessory.name} | Fan Active State: ${isActive === Characteristic.Active.ACTIVE ? "Active" : "Inactive"}`);
                    return isActive;
                })
                .onSet((value) => {
                    const state = value ? "on" : "off";
                    accessory.log.info(`${accessory.name} | Setting fan state to ${state}`);
                    accessory.sendCommand(null, accessory, accessory.context.deviceData, state);
                });

            service.getCharacteristic(Characteristic.CurrentFanState).onGet(() => {
                const currentState = accessory.context.deviceData.attributes.switch === "on" ? Characteristic.CurrentFanState.BLOWING_AIR : Characteristic.CurrentFanState.IDLE;
                accessory.log.debug(`${accessory.name} | Current Fan State: ${currentState === Characteristic.CurrentFanState.BLOWING_AIR ? "Blowing Air" : "Idle"}`);
                return currentState;
            });
        } else {
            service.removeCharacteristic(Characteristic.CurrentFanState);
            service.removeCharacteristic(Characteristic.Active);
        }

        // Rotation Speed
        let spdSteps = 1;
        if (accessory.hasDeviceFlag("fan_3_spd")) spdSteps = 33;
        if (accessory.hasDeviceFlag("fan_4_spd")) spdSteps = 25;
        if (accessory.hasDeviceFlag("fan_5_spd")) spdSteps = 20;

        let spdAttr = accessory.hasAttribute("speed") && accessory.hasCommand("setSpeed") ? "speed" : accessory.hasAttribute("level") ? "level" : undefined;

        if (spdAttr) {
            service
                .getCharacteristic(Characteristic.RotationSpeed)
                .setProps({ minStep: spdSteps, maxValue: 100, minValue: 0 })
                .onGet(() => {
                    const speedLevel = accessory.context.deviceData.attributes[spdAttr];
                    const rotationSpeed = fanSpeedToLevel(speedLevel);
                    accessory.log.debug(`${accessory.name} | Current Rotation Speed: ${rotationSpeed}`);
                    return rotationSpeed;
                })
                .onSet((value) => {
                    const clampedValue = deviceClass.clamp(value, 0, 100);
                    const speed = fanSpeedConversion(clampedValue);
                    accessory.log.info(`${accessory.name} | Setting fan speed to ${speed}`);
                    accessory.sendCommand(null, accessory, accessory.context.deviceData, `set${spdAttr.charAt(0).toUpperCase() + spdAttr.slice(1)}`, { value1: speed });
                });
        } else {
            service.removeCharacteristic(Characteristic.RotationSpeed);
        }

        accessory.context.deviceGroups.push("fan");
    },

    handleAttributeUpdate: (accessory, change, deviceClass) => {
        const { Characteristic, Service } = deviceClass.mainPlatform;
        const service = accessory.getService(Service.Fanv2);

        if (!service) {
            accessory.log.warn(`${accessory.name} | Fan service not found`);
            return;
        }

        switch (change.attribute) {
            case "switch":
                const isActive = change.value === "on";
                service.updateCharacteristic(Characteristic.Active, isActive ? Characteristic.Active.ACTIVE : Characteristic.Active.INACTIVE);
                service.updateCharacteristic(Characteristic.CurrentFanState, isActive ? Characteristic.CurrentFanState.BLOWING_AIR : Characteristic.CurrentFanState.IDLE);
                accessory.log.debug(`${accessory.name} | Updated Fan Active: ${isActive}`);
                break;
            case "speed":
            case "level":
                const rotationSpeed = fanSpeedToLevel(change.value);
                service.updateCharacteristic(Characteristic.RotationSpeed, rotationSpeed);
                accessory.log.debug(`${accessory.name} | Updated Rotation Speed: ${rotationSpeed}`);
                break;
            default:
                accessory.log.debug(`${accessory.name} | Unhandled attribute update: ${change.attribute}`);
        }
    },
};

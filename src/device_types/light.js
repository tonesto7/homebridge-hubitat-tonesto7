// device_types/light.js

export function isSupported(accessory) {
    return (
        accessory.hasCapability("Switch Level") &&
        (accessory.hasCapability("LightBulb") || accessory.hasCapability("Bulb") || accessory.context.deviceData.name.toLowerCase().includes("light") || accessory.hasAttribute("saturation") || accessory.hasAttribute("hue") || accessory.hasAttribute("colorTemperature") || accessory.hasCapability("Color Control"))
    );
}

export const relevantAttributes = ["switch", "level", "hue", "saturation", "colorTemperature"];

export function initializeAccessory(accessory, deviceClass) {
    const { Service, Characteristic, hap } = deviceClass.platform;
    const service = deviceClass.getOrAddService(accessory, Service.Lightbulb);

    deviceClass.getOrAddCharacteristic(accessory, service, Characteristic.On, {
        getHandler: function () {
            return accessory.context.deviceData.attributes.switch === "on";
        },
        setHandler: function (value) {
            const command = value ? "on" : "off";
            accessory.log.info(`${accessory.name} | Setting light state to ${command}`);
            accessory.sendCommand(null, accessory, accessory.context.deviceData, command);
        },
    });

    if (accessory.hasAttribute("level")) {
        deviceClass.getOrAddCharacteristic(accessory, service, Characteristic.Brightness, {
            getHandler: function () {
                let brightness = parseInt(accessory.context.deviceData.attributes.level, 10);
                brightness = deviceClass.clamp(brightness, 0, 100);
                accessory.log.debug(`${accessory.name} | Current Brightness: ${brightness}%`);
                return isNaN(brightness) ? 0 : brightness;
            },
            setHandler: function (value) {
                const brightness = deviceClass.clamp(value, 0, 100);
                accessory.log.info(`${accessory.name} | Setting brightness to ${brightness}%`);
                accessory.sendCommand(null, accessory, accessory.context.deviceData, "setLevel", { value1: brightness });
            },
        });
    }

    if (accessory.hasAttribute("hue") && accessory.hasCommand("setHue")) {
        deviceClass.getOrAddCharacteristic(accessory, service, Characteristic.Hue, {
            props: {
                minValue: 0,
                maxValue: 360,
                minStep: 1,
            },
            getHandler: function () {
                let hue = parseFloat(accessory.context.deviceData.attributes.hue);
                hue = deviceClass.clamp(hue, 0, 360);
                accessory.log.debug(`${accessory.name} | Current Hue: ${hue}`);
                return isNaN(hue) ? 0 : Math.round(hue);
            },
            setHandler: function (value) {
                const hue = deviceClass.clamp(Math.round(value), 0, 360);
                accessory.log.info(`${accessory.name} | Setting hue to ${hue}`);
                accessory.sendCommand(null, accessory, accessory.context.deviceData, "setHue", { value1: hue });
            },
        });
    }

    if (accessory.hasAttribute("saturation") && accessory.hasCommand("setSaturation")) {
        deviceClass.getOrAddCharacteristic(accessory, service, Characteristic.Saturation, {
            getHandler: function () {
                let saturation = parseFloat(accessory.context.deviceData.attributes.saturation);
                saturation = deviceClass.clamp(saturation, 0, 100);
                accessory.log.debug(`${accessory.name} | Current Saturation: ${saturation}%`);
                return isNaN(saturation) ? 0 : Math.round(saturation);
            },
            setHandler: function (value) {
                const saturation = deviceClass.clamp(Math.round(value), 0, 100);
                accessory.log.info(`${accessory.name} | Setting saturation to ${saturation}%`);
                accessory.sendCommand(null, accessory, accessory.context.deviceData, "setSaturation", { value1: saturation });
            },
        });
    }

    if (accessory.hasAttribute("colorTemperature") && accessory.hasCommand("setColorTemperature")) {
        deviceClass.getOrAddCharacteristic(accessory, service, Characteristic.ColorTemperature, {
            props: {
                minValue: 140,
                maxValue: 500,
            },
            getHandler: function () {
                let mired = kelvinToMired(parseInt(accessory.context.deviceData.attributes.colorTemperature));
                mired = deviceClass.clamp(mired, 140, 500);
                accessory.log.debug(`${accessory.name} | Current Color Temperature: ${mired} Mireds`);
                return isNaN(mired) ? 140 : mired;
            },
            setHandler: function (value) {
                const mired = deviceClass.clamp(Math.round(value), 140, 500);
                const kelvin = miredToKelvin(mired);
                accessory.log.info(`${accessory.name} | Setting color temperature to ${kelvin}K (${mired} Mireds)`);
                accessory.sendCommand(null, accessory, accessory.context.deviceData, "setColorTemperature", { value1: kelvin });
            },
        });
    }

    const canUseAL = deviceClass.configItems.adaptive_lighting !== false && accessory.isAdaptiveLightingSupported && !accessory.hasDeviceFlag("light_no_al") && accessory.hasAttribute("level") && accessory.hasAttribute("colorTemperature");

    if (canUseAL && !accessory.adaptiveLightingController) {
        addAdaptiveLightingController(accessory, service, hap);
    } else if (!canUseAL && accessory.adaptiveLightingController) {
        removeAdaptiveLightingController(accessory);
    }

    accessory.context.deviceGroups.push("light_bulb");

    function kelvinToMired(kelvin) {
        let val = Math.floor(1000000 / kelvin);
        return deviceClass.clamp(val, 140, 500);
    }

    function miredToKelvin(mired) {
        return Math.floor(1000000 / mired);
    }

    function addAdaptiveLightingController(accessory, service, hapAPI) {
        const offset = accessory.getPlatformConfig.adaptive_lighting_offset || 0;
        const controlMode = hapAPI.AdaptiveLightingControllerMode.AUTOMATIC;
        if (service) {
            accessory.adaptiveLightingController = new hapAPI.AdaptiveLightingController(service, {
                controllerMode: controlMode,
                customTemperatureAdjustment: offset,
            });
            accessory.adaptiveLightingController.on("update", (evt) => {
                accessory.log.debug(`[${accessory.context.deviceData.name}] Adaptive Lighting Controller Update Event: `, evt);
            });
            accessory.adaptiveLightingController.on("disable", (evt) => {
                accessory.log.debug(`[${accessory.context.deviceData.name}] Adaptive Lighting Controller Disabled Event: `, evt);
            });

            accessory.configureController(accessory.adaptiveLightingController);
            accessory.log.info(`Adaptive Lighting Supported... Assigned Adaptive Lighting Controller to [${accessory.context.deviceData.name}]`);
        } else {
            accessory.log.error(`${accessory.name} | Unable to add Adaptive Lighting Controller because the required service parameter was missing...`);
        }
    }

    function removeAdaptiveLightingController(accessory) {
        if (accessory.adaptiveLightingController) {
            accessory.log.info(`Adaptive Lighting Not Supported... Removing Adaptive Lighting Controller from [${accessory.context.deviceData.name}]`);
            accessory.removeController(accessory.adaptiveLightingController);
            delete accessory.adaptiveLightingController;
        }
    }
}

export function handleAttributeUpdate(accessory, change, deviceClass) {
    const { Characteristic, Service } = deviceClass.platform;
    const service = accessory.getService(Service.Lightbulb);

    if (!service) {
        accessory.log.warn(`${accessory.name} | Lightbulb service not found`);
        return;
    }

    switch (change.attribute) {
        case "switch":
            const isOn = change.value === "on";
            deviceClass.updateCharacteristicValue(accessory, service, Characteristic.On, isOn);
            // accessory.log.debug(`${accessory.name} | Updated On: ${isOn}`);
            break;
        case "level":
            const brightness = deviceClass.clamp(parseInt(change.value, 10), 0, 100);
            deviceClass.updateCharacteristicValue(accessory, service, Characteristic.Brightness, brightness);
            // accessory.log.debug(`${accessory.name} | Updated Brightness: ${brightness}%`);
            break;
        case "hue":
            if (accessory.hasAttribute("hue") && accessory.hasCommand("setHue")) {
                const hue = deviceClass.clamp(Math.round(parseFloat(change.value)), 0, 360);
                deviceClass.updateCharacteristicValue(accessory, service, Characteristic.Hue, hue);
                // accessory.log.debug(`${accessory.name} | Updated Hue: ${hue}`);
            }
            break;
        case "saturation":
            if (accessory.hasAttribute("saturation") && accessory.hasCommand("setSaturation")) {
                const saturation = deviceClass.clamp(Math.round(parseFloat(change.value)), 0, 100);
                deviceClass.updateCharacteristicValue(accessory, service, Characteristic.Saturation, saturation);
                // accessory.log.debug(`${accessory.name} | Updated Saturation: ${saturation}%`);
            }
            break;
        case "colorTemperature":
            if (accessory.hasAttribute("colorTemperature") && accessory.hasCommand("setColorTemperature")) {
                const mired = kelvinToMired(parseInt(change.value, 10));
                deviceClass.updateCharacteristicValue(accessory, service, Characteristic.ColorTemperature, mired);
                // accessory.log.debug(`${accessory.name} | Updated Color Temperature: ${mired} Mireds`);
            }
            break;
        default:
            accessory.log.debug(`${accessory.name} | Unhandled attribute update: ${change.attribute}`);
    }
}

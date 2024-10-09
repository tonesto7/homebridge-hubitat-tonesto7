// device_types/light.js

function clamp(value, min, max) {
    return Math.max(min, Math.min(max, value));
}

/**
 * Converts Kelvin to Mireds.
 * @param {number} kelvin - Temperature in Kelvin.
 * @returns {number} - Temperature in Mireds.
 */
function kelvinToMired(kelvin) {
    let val = Math.floor(1000000 / kelvin);
    return clamp(val, 140, 500); // HomeKit supports 140-500 Mireds
}

/**
 * Converts Mireds to Kelvin.
 * @param {number} mired - Temperature in Mireds.
 * @returns {number} - Temperature in Kelvin.
 */
function miredToKelvin(mired) {
    return Math.floor(1000000 / mired);
}

module.exports = {
    isSupported: (accessory) => {
        return (
            accessory.hasCapability("Switch Level") &&
            (accessory.hasCapability("LightBulb") || accessory.hasCapability("Bulb") || accessory.context.deviceData.name.toLowerCase().includes("light") || accessory.hasAttribute("saturation") || accessory.hasAttribute("hue") || accessory.hasAttribute("colorTemperature") || accessory.hasCapability("Color Control"))
        );
    },

    relevantAttributes: ["switch", "level", "hue", "saturation", "colorTemperature"],

    initializeAccessory: (accessory, deviceClass) => {
        const { Service, Characteristic } = deviceClass.mainPlatform;
        const service = accessory.getService(Service.Lightbulb) || accessory.addService(Service.Lightbulb);

        // On/Off Characteristic
        service
            .getCharacteristic(Characteristic.On)
            .onGet(() => {
                return accessory.context.deviceData.attributes.switch === "on";
            })
            .onSet((value) => {
                const command = value ? "on" : "off";
                accessory.log.info(`${accessory.name} | Setting light state to ${command}`);
                accessory.sendCommand(null, accessory, accessory.context.deviceData, command);
            });

        // Brightness Characteristic
        if (accessory.hasAttribute("level")) {
            service
                .getCharacteristic(Characteristic.Brightness)
                .onGet(() => {
                    let brightness = parseInt(accessory.context.deviceData.attributes.level, 10);
                    brightness = clamp(brightness, 0, 100);
                    accessory.log.debug(`${accessory.name} | Current Brightness: ${brightness}%`);
                    return isNaN(brightness) ? 0 : brightness;
                })
                .onSet((value) => {
                    const brightness = clamp(value, 0, 100);
                    accessory.log.info(`${accessory.name} | Setting brightness to ${brightness}%`);
                    accessory.sendCommand(null, accessory, accessory.context.deviceData, "setLevel", { value1: brightness });
                });
        }

        // Hue Characteristic
        if (accessory.hasAttribute("hue") && accessory.hasCommand("setHue")) {
            service
                .getCharacteristic(Characteristic.Hue)
                .setProps({
                    minValue: 0,
                    maxValue: 360,
                    minStep: 1,
                })
                .onGet(() => {
                    let hue = parseFloat(accessory.context.deviceData.attributes.hue);
                    hue = clamp(hue, 0, 360);
                    accessory.log.debug(`${accessory.name} | Current Hue: ${hue}`);
                    return isNaN(hue) ? 0 : Math.round(hue);
                })
                .onSet((value) => {
                    const hue = clamp(Math.round(value), 0, 360);
                    accessory.log.info(`${accessory.name} | Setting hue to ${hue}`);
                    accessory.sendCommand(null, accessory, accessory.context.deviceData, "setHue", { value1: hue });
                });
        }

        // Saturation Characteristic
        if (accessory.hasAttribute("saturation") && accessory.hasCommand("setSaturation")) {
            service
                .getCharacteristic(Characteristic.Saturation)
                .onGet(() => {
                    let saturation = parseFloat(accessory.context.deviceData.attributes.saturation);
                    saturation = clamp(saturation, 0, 100);
                    accessory.log.debug(`${accessory.name} | Current Saturation: ${saturation}%`);
                    return isNaN(saturation) ? 0 : Math.round(saturation);
                })
                .onSet((value) => {
                    const saturation = clamp(Math.round(value), 0, 100);
                    accessory.log.info(`${accessory.name} | Setting saturation to ${saturation}%`);
                    accessory.sendCommand(null, accessory, accessory.context.deviceData, "setSaturation", { value1: saturation });
                });
        }

        // Color Temperature Characteristic
        if (accessory.hasAttribute("colorTemperature") && accessory.hasCommand("setColorTemperature")) {
            service
                .getCharacteristic(Characteristic.ColorTemperature)
                .setProps({
                    minValue: 140, // 1000000 / 5000K
                    maxValue: 500, // 1000000 / 2000K
                })
                .onGet(() => {
                    let mired = kelvinToMired(accessory.context.deviceData.attributes.colorTemperature);
                    mired = clamp(mired, 140, 500);
                    accessory.log.debug(`${accessory.name} | Current Color Temperature: ${mired} Mireds`);
                    return isNaN(mired) ? 140 : mired;
                })
                .onSet((value) => {
                    const mired = clamp(Math.round(value), 140, 500);
                    const kelvin = miredToKelvin(mired);
                    accessory.log.info(`${accessory.name} | Setting color temperature to ${kelvin}K (${mired} Mireds)`);
                    accessory.sendCommand(null, accessory, accessory.context.deviceData, "setColorTemperature", { value1: kelvin });
                });
        }

        // Adaptive Lighting
        const canUseAL = deviceClass.configItems.adaptive_lighting !== false && accessory.isAdaptiveLightingSupported && !accessory.hasDeviceFlag("light_no_al") && accessory.hasAttribute("level") && accessory.hasAttribute("colorTemperature");

        if (canUseAL && !accessory.adaptiveLightingController) {
            addAdaptiveLightingController(accessory, service);
        } else if (!canUseAL && accessory.adaptiveLightingController) {
            removeAdaptiveLightingController(accessory);
        }

        accessory.context.deviceGroups.push("light_bulb");

        /**
         * Adds Adaptive Lighting Controller to the accessory.
         * @param {object} accessory - The accessory object.
         * @param {object} service - The HomeKit service.
         */
        function addAdaptiveLightingController(accessory, service) {
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

        /**
         * Removes Adaptive Lighting Controller from the accessory.
         * @param {object} accessory - The accessory object.
         */
        function removeAdaptiveLightingController(accessory) {
            if (accessory.adaptiveLightingController) {
                accessory.log.info(`Adaptive Lighting Not Supported... Removing Adaptive Lighting Controller from [${accessory.context.deviceData.name}]`);
                accessory.removeController(accessory.adaptiveLightingController);
                delete accessory.adaptiveLightingController;
            }
        }
    },

    handleAttributeUpdate: (accessory, change, deviceClass) => {
        const { Characteristic, Service } = deviceClass.mainPlatform;
        const service = accessory.getService(Service.Lightbulb);

        if (!service) {
            accessory.log.warn(`${accessory.name} | Lightbulb service not found`);
            return;
        }

        switch (change.attribute) {
            case "switch":
                const isOn = change.value === "on";
                service.updateCharacteristic(Characteristic.On, isOn);
                accessory.log.debug(`${accessory.name} | Updated On: ${isOn}`);
                break;
            case "level":
                const brightness = clamp(parseInt(change.value, 10), 0, 100);
                service.updateCharacteristic(Characteristic.Brightness, brightness);
                accessory.log.debug(`${accessory.name} | Updated Brightness: ${brightness}%`);
                break;
            case "hue":
                if (accessory.hasAttribute("hue") && accessory.hasCommand("setHue")) {
                    const hue = clamp(Math.round(parseFloat(change.value)), 0, 360);
                    service.updateCharacteristic(Characteristic.Hue, hue);
                    accessory.log.debug(`${accessory.name} | Updated Hue: ${hue}`);
                }
                break;
            case "saturation":
                if (accessory.hasAttribute("saturation") && accessory.hasCommand("setSaturation")) {
                    const saturation = clamp(Math.round(parseFloat(change.value)), 0, 100);
                    service.updateCharacteristic(Characteristic.Saturation, saturation);
                    accessory.log.debug(`${accessory.name} | Updated Saturation: ${saturation}%`);
                }
                break;
            case "colorTemperature":
                if (accessory.hasAttribute("colorTemperature") && accessory.hasCommand("setColorTemperature")) {
                    const mired = kelvinToMired(parseInt(change.value, 10));
                    service.updateCharacteristic(Characteristic.ColorTemperature, mired);
                    accessory.log.debug(`${accessory.name} | Updated Color Temperature: ${mired} Mireds`);
                }
                break;
            default:
                accessory.log.debug(`${accessory.name} | Unhandled attribute update: ${change.attribute}`);
        }
    },
};

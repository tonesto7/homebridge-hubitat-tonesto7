// device_types/Light.js

import HubitatAccessory from "../HubitatAccessory.js";

/**
 * Represents a Light accessory for the Hubitat platform.
 * Extends the HubitatAccessory class to provide specific functionalities for light devices.
 *
 * @class Light
 * @extends {HubitatAccessory}
 *
 * @param {Object} platform - The platform instance.
 * @param {Object} accessory - The accessory instance.
 *
 * @property {Object} deviceData - The data related to the device.
 * @property {Object} effectsMap - A map of light effects.
 *
 * @static
 * @property {Array<string>} relevantAttributes - List of relevant attributes for the light accessory.
 *
 * @method initializeService - Initializes the light service and its characteristics.
 * @method setupLightEffectsService - Sets up the light effects service if supported by the device.
 * @method updateLightEffects - Updates the light effects based on the device's attributes.
 * @method updateEffectState - Updates the current state of the light effects.
 * @method handleAttributeUpdate - Handles updates to the device's attributes.
 * @method setupAdaptiveLighting - Sets up adaptive lighting if supported by the device.
 *
 * @method kelvinToMired - Converts Kelvin to Mired.
 * @method miredToKelvin - Converts Mired to Kelvin.
 * @method hueToHomeKit - Converts device hue to HomeKit hue.
 * @method homeKitToHue - Converts HomeKit hue to device hue.
 */
export default class Light extends HubitatAccessory {
    constructor(platform, accessory) {
        super(platform, accessory);
        this.deviceData = accessory.context.deviceData;
        this.effectsMap = {};
    }

    static relevantAttributes = ["switch", "level", "hue", "saturation", "colorTemperature", "colorName", "RGB", "color", "effectName", "lightEffects"];

    /**
     * Initializes the light service and its characteristics for the accessory.
     *
     * This method sets up the following characteristics:
     * - On/Off
     * - Brightness (if supported)
     * - Hue (if supported)
     * - Saturation (if supported)
     * - Color Temperature (if supported)
     *
     * Additionally, it sets up LightEffects and Adaptive Lighting if the device supports them.
     *
     * @async
     * @returns {Promise<void>} Resolves when the service and characteristics are initialized.
     */
    async initializeService() {
        this.lightService = this.getOrAddService(this.Service.Lightbulb);

        // On/Off characteristic (no changes needed)
        this.getOrAddCharacteristic(this.lightService, this.Characteristic.On, {
            getHandler: () => this.deviceData.attributes.switch === "on",
            setHandler: (value) => {
                const command = value ? "on" : "off";
                this.log.info(`${this.accessory.displayName} | Setting light state to ${command}`);
                this.sendCommand(null, this.deviceData, command);
            },
        });

        // Brightness characteristic (no changes needed)
        if (this.hasAttribute("level") && this.hasCommand("setLevel")) {
            this.getOrAddCharacteristic(this.lightService, this.Characteristic.Brightness, {
                getHandler: () => {
                    let brightness = parseInt(this.deviceData.attributes.level, 10);
                    brightness = this.clamp(brightness, 0, 100);
                    this.log.debug(`${this.accessory.displayName} | Current Brightness: ${brightness}%`);
                    return isNaN(brightness) ? 0 : brightness;
                },
                setHandler: (value) => {
                    const brightness = this.clamp(value, 0, 100);
                    this.log.info(`${this.accessory.displayName} | Setting brightness to ${brightness}%`);
                    this.sendCommand(null, this.deviceData, "setLevel", { value1: brightness });
                },
            });
        }

        // Hue characteristic
        if (this.hasAttribute("hue") && this.hasCommand("setHue")) {
            this.getOrAddCharacteristic(this.lightService, this.Characteristic.Hue, {
                props: {
                    minValue: 0,
                    maxValue: 360,
                    minStep: 3.6, // 1% in Hubitat scale
                },
                getHandler: () => {
                    let hue = parseFloat(this.deviceData.attributes.hue);
                    hue = this.clamp(hue, 0, 100) * 3.6; // Convert 0-100 to 0-360
                    this.log.debug(`${this.accessory.displayName} | Current Hue: ${hue}`);
                    return isNaN(hue) ? 0 : hue;
                },
                setHandler: (value) => {
                    const hue = this.clamp(Math.round(value / 3.6), 0, 100); // Convert 0-360 to 0-100
                    this.log.info(`${this.accessory.displayName} | Setting hue to ${hue}`);
                    this.sendCommand(null, this.deviceData, "setHue", { value1: hue });
                },
            });
        }

        // Saturation characteristic
        if (this.hasAttribute("saturation") && this.hasCommand("setSaturation")) {
            this.getOrAddCharacteristic(this.lightService, this.Characteristic.Saturation, {
                props: {
                    minValue: 0,
                    maxValue: 100,
                },
                getHandler: () => {
                    let saturation = parseFloat(this.deviceData.attributes.saturation);
                    saturation = this.clamp(saturation, 0, 100);
                    this.log.debug(`${this.accessory.displayName} | Current Saturation: ${saturation}%`);
                    return isNaN(saturation) ? 0 : saturation;
                },
                setHandler: (value) => {
                    const saturation = this.clamp(Math.round(value), 0, 100);
                    this.log.info(`${this.accessory.displayName} | Setting saturation to ${saturation}%`);
                    this.sendCommand(null, this.deviceData, "setSaturation", { value1: saturation });
                },
            });
        }

        // Color Temperature characteristic
        if (this.hasAttribute("colorTemperature") && this.hasCommand("setColorTemperature")) {
            this.getOrAddCharacteristic(this.lightService, this.Characteristic.ColorTemperature, {
                props: {
                    minValue: 140,
                    maxValue: 500,
                },
                getHandler: () => {
                    let kelvin = parseInt(this.deviceData.attributes.colorTemperature);
                    let mired = this.kelvinToMired(kelvin);
                    mired = this.clamp(mired, 140, 500);
                    this.log.debug(`${this.accessory.displayName} | Current ColorTemperature: ${mired} Mireds (${kelvin}K)`);
                    return isNaN(mired) ? 140 : mired;
                },
                setHandler: (value) => {
                    const mired = this.clamp(Math.round(value), 140, 500);
                    const kelvin = this.miredToKelvin(mired);
                    this.log.info(`${this.accessory.displayName} | Setting color temperature to ${kelvin}K (${mired} Mireds)`);
                    this.sendCommand(null, this.deviceData, "setColorTemperature", { value1: kelvin });
                },
            });
        }

        // Set up LightEffects if the device supports it
        if (this.hasAttribute("lightEffects") && this.hasCommand("setEffect")) {
            await this.setupLightEffectsService();
        }

        await this.setupAdaptiveLighting();
        this.accessory.deviceGroups.push("light");
    }

    /**
     * Sets up the Light Effects Service for the accessory.
     *
     * This method initializes the Television service and configures the characteristics
     * for handling light effects. It sets up handlers for getting and setting the
     * active state and active identifier of the light effects.
     *
     * @async
     * @function setupLightEffectsService
     * @returns {Promise<void>} Resolves when the light effects service is set up.
     */
    async setupLightEffectsService() {
        this.televisionService = this.getOrAddService(this.Service.Television);

        this.televisionService.setCharacteristic(this.Characteristic.ConfiguredName, `${this.accessory.displayName} Effects`).setCharacteristic(this.Characteristic.SleepDiscoveryMode, this.Characteristic.SleepDiscoveryMode.ALWAYS_DISCOVERABLE);

        this.getOrAddCharacteristic(this.televisionService, this.Characteristic.Active, {
            getHandler: () => {
                return this.deviceData.attributes.effectName !== undefined && this.deviceData.attributes.effectName !== "None" ? this.Characteristic.Active.ACTIVE : this.Characteristic.Active.INACTIVE;
            },
            setHandler: (value) => {
                if (value === this.Characteristic.Active.INACTIVE) {
                    this.sendCommand(null, this.deviceData, "setEffect", { value1: 0 }); // Assuming 0 turns off the effect
                } else {
                    // If turning on, we'll set it to the first available effect
                    const firstEffectNumber = Object.keys(this.effectsMap)[0];
                    if (firstEffectNumber) {
                        // console.log("Setting effect to", firstEffectNumber);
                        this.sendCommand(null, this.deviceData, "setEffect", { value1: parseInt(firstEffectNumber) });
                    }
                }
            },
        });

        this.getOrAddCharacteristic(this.televisionService, this.Characteristic.ActiveIdentifier, {
            getHandler: () => {
                const currentEffect = this.deviceData.attributes.effectName;
                return isNaN(this.effectsMap[currentEffect]) ? 0 : this.effectsMap[currentEffect];
            },
            setHandler: (value) => {
                this.sendCommand(null, this.deviceData, "setEffect", { value1: value });
            },
        });

        await this.updateLightEffects();
    }

    /**
     * Updates the light effects for the device.
     *
     * This method performs the following steps:
     * 1. Parses the light effects from the device data.
     * 2. Removes old input services from the accessory.
     * 3. Adds new input services based on the parsed light effects.
     * 4. Updates the valid values for the ActiveIdentifier characteristic.
     * 5. Updates the current state of the effect.
     *
     * @async
     * @returns {Promise<void>} A promise that resolves when the light effects have been updated.
     */
    async updateLightEffects() {
        const effects = JSON.parse(this.deviceData.attributes.lightEffects || "{}");
        this.effectsMap = {};

        // Remove old input services
        const inputServices = this.accessory.services.filter((service) => service.UUID === this.Service.InputSource.UUID);
        inputServices.forEach((service) => {
            this.televisionService.removeLinkedService(service);
            this.accessory.removeService(service);
        });

        // Add new input services
        for (const [effectNumber, effectName] of Object.entries(effects)) {
            const inputService = this.accessory.addService(this.Service.InputSource, `effect ${effectNumber}`, effectName);
            inputService
                .setCharacteristic(this.Characteristic.Identifier, parseInt(effectNumber))
                .setCharacteristic(this.Characteristic.ConfiguredName, effectName)
                .setCharacteristic(this.Characteristic.IsConfigured, this.Characteristic.IsConfigured.CONFIGURED)
                .setCharacteristic(this.Characteristic.InputSourceType, this.Characteristic.InputSourceType.OTHER);

            this.televisionService.addLinkedService(inputService);
            this.effectsMap[effectName] = parseInt(effectNumber);
        }

        // Update the valid values for ActiveIdentifier
        const validIdentifiers = Object.values(this.effectsMap);
        this.televisionService.getCharacteristic(this.Characteristic.ActiveIdentifier).setProps({
            validValues: validIdentifiers,
        });

        // Update current state
        this.updateEffectState();
    }

    /**
     * Updates the effect state of the device.
     *
     * This method checks the current effect state of the device and updates the
     * television service's characteristics accordingly. If an effect is active,
     * it sets the Active characteristic to ACTIVE and updates the ActiveIdentifier
     * characteristic with the corresponding effect number. If no effect is active,
     * it sets the Active characteristic to INACTIVE.
     *
     * @method updateEffectState
     */
    updateEffectState() {
        const currentEffect = this.deviceData.attributes.effectName;
        const isActive = currentEffect !== undefined && currentEffect !== "None";

        this.televisionService.updateCharacteristic(this.Characteristic.Active, isActive ? this.Characteristic.Active.ACTIVE : this.Characteristic.Active.INACTIVE);

        if (isActive) {
            const effectNumber = this.effectsMap[currentEffect] || 0;
            this.televisionService.updateCharacteristic(this.Characteristic.ActiveIdentifier, effectNumber);
        }
    }

    /**
     * Handles updates to device attributes and updates the corresponding HomeKit characteristics.
     *
     * @param {Object} change - The change object containing attribute and value.
     * @param {string} change.attribute - The name of the attribute that has changed.
     * @param {string|number} change.value - The new value of the attribute.
     */
    handleAttributeUpdate(change) {
        switch (change.attribute) {
            case "switch":
                const isOn = change.value === "on";
                this.updateCharacteristicValue(this.lightService, this.Characteristic.On, isOn);
                break;
            case "level":
                const brightness = this.clamp(parseInt(change.value, 10), 0, 100);
                this.updateCharacteristicValue(this.lightService, this.Characteristic.Brightness, brightness);
                break;
            case "hue":
                if (this.hasAttribute("hue") && this.hasCommand("setHue")) {
                    const hue = this.clamp(parseFloat(change.value), 0, 100) * 3.6; // Convert 0-100 to 0-360
                    this.updateCharacteristicValue(this.lightService, this.Characteristic.Hue, hue);
                }
                break;
            case "saturation":
                if (this.hasAttribute("saturation") && this.hasCommand("setSaturation")) {
                    const saturation = this.clamp(parseFloat(change.value), 0, 100);
                    this.updateCharacteristicValue(this.lightService, this.Characteristic.Saturation, saturation);
                }
                break;
            case "colorTemperature":
                if (this.hasAttribute("colorTemperature") && this.hasCommand("setColorTemperature")) {
                    const kelvin = parseInt(change.value, 10);
                    const mired = this.clamp(this.kelvinToMired(kelvin), 140, 500);
                    this.updateCharacteristicValue(this.lightService, this.Characteristic.ColorTemperature, mired);
                }
                break;
            case "effectName":
                if (this.televisionService) {
                    this.updateEffectState();
                }
                break;

            case "lightEffects":
                this.updateLightEffects();
                break;
        }
    }

    /**
     * Sets up the adaptive lighting controller for the accessory if supported.
     *
     * This method checks if adaptive lighting can be used based on the platform configuration,
     * accessory capabilities, and device attributes. If adaptive lighting is supported and not
     * already configured, it initializes the adaptive lighting controller with the specified
     * settings and attaches event listeners for update and disable events. If adaptive lighting
     * is not supported but a controller is already configured, it removes the controller.
     *
     * @async
     * @function setupAdaptiveLighting
     * @returns {Promise<void>} A promise that resolves when the setup is complete.
     */
    async setupAdaptiveLighting() {
        const canUseAL = this.platform.config.adaptive_lighting !== false && this.accessory.isAdaptiveLightingSupported && !this.hasDeviceFlag("light_no_al") && this.hasAttribute("level") && this.hasAttribute("colorTemperature");
        if (canUseAL && !this.accessory.adaptiveLightingController) {
            const offset = this.platform.config.adaptive_lighting_offset || 0;
            const controlMode = this.homebridge.hap.AdaptiveLightingControllerMode.MANUAL;

            this.accessory.adaptiveLightingController = new this.homebridge.hap.AdaptiveLightingController(this.lightService, { controllerMode: controlMode, customTemperatureAdjustment: offset });

            this.accessory.adaptiveLightingController.on("update", (evt) => {
                this.log.info(`[${this.accessory.displayName}] Adaptive Lighting Controller Update Event: ${JSON.stringify(evt)}`);
            });
            this.accessory.adaptiveLightingController.on("disable", (evt) => {
                this.log.info(`[${this.accessory.displayName}] Adaptive Lighting Controller Disabled Event: ${JSON.stringify(evt)}`);
            });

            this.accessory.configureController(this.accessory.adaptiveLightingController);
            this.log.debug(`Adaptive Lighting Supported... Assigned Adaptive Lighting Controller to [${this.accessory.displayName}]`);
        } else if (!canUseAL && this.accessory.adaptiveLightingController) {
            this.log.warn(`Adaptive Lighting Not Supported... Removing Adaptive Lighting Controller from [${this.accessory.displayName}]`);
            this.accessory.removeController(this.accessory.adaptiveLightingController);
            delete this.accessory.adaptiveLightingController;
        }
    }

    // Transformation Functions
    /**
     * Converts a color temperature from Kelvin to Mired.
     *
     * @param {number} kelvin - The color temperature in Kelvin.
     * @returns {number} The color temperature in Mired.
     */
    kelvinToMired(kelvin) {
        return Math.floor(1000000 / kelvin);
    }

    /**
     * Converts a color temperature from mireds to kelvins.
     *
     * @param {number} mired - The color temperature in mireds.
     * @returns {number} The color temperature in kelvins.
     */
    miredToKelvin(mired) {
        return Math.floor(1000000 / mired);
    }

    /**
     * Converts a hue value from the device's range (0-100) to HomeKit's range (0-360).
     *
     * @param {number} hue - The hue value from the device, ranging from 0 to 100.
     * @returns {number} - The converted hue value in HomeKit's range, from 0 to 360.
     */
    hueToHomeKit(hue) {
        // Device Hue: 0-100 --> HomeKit Hue: 0-360
        return Math.round(hue * 3.6);
    }

    /**
     * Converts a HomeKit hue value to a device-specific hue value.
     *
     * HomeKit hue values range from 0 to 360, while device hue values range from 0 to 100.
     *
     * @param {number} homeKitHue - The hue value from HomeKit (0-360).
     * @returns {number} - The converted hue value for the device (0-100).
     */
    homeKitToHue(homeKitHue) {
        // HomeKit Hue: 0-360 --> Device Hue: 0-100
        return Math.round(homeKitHue / 3.6);
    }
}

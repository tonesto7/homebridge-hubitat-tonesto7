// device_types/Light.js

import HubitatAccessory from "../HubitatAccessory.js";

export default class Light extends HubitatAccessory {
    constructor(platform, accessory) {
        super(platform, accessory);
        this.deviceData = accessory.context.deviceData;
        this.accessory.effectsMap = {};
    }

    static relevantAttributes = ["switch", "level", "hue", "saturation", "colorTemperature", "colorName", "RGB", "color", "effectName", "lightEffects"];

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
                        this.sendCommand(null, this.deviceData, "setEffect", { value1: parseInt(firstEffectNumber) });
                    }
                }
            },
        });

        this.getOrAddCharacteristic(this.televisionService, this.Characteristic.ActiveIdentifier, {
            getHandler: () => {
                const currentEffect = this.deviceData.attributes.effectName;
                return this.effectsMap[currentEffect] || 0;
            },
            setHandler: (value) => {
                this.sendCommand(null, this.deviceData, "setEffect", { value1: value });
            },
        });

        await this.updateLightEffects();
    }

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

    updateEffectState() {
        const currentEffect = this.deviceData.attributes.effectName;
        const isActive = currentEffect !== undefined && currentEffect !== "None";

        this.televisionService.updateCharacteristic(this.Characteristic.Active, isActive ? this.Characteristic.Active.ACTIVE : this.Characteristic.Active.INACTIVE);

        if (isActive) {
            const effectNumber = this.effectsMap[currentEffect] || 0;
            this.televisionService.updateCharacteristic(this.Characteristic.ActiveIdentifier, effectNumber);
        }
    }

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
    kelvinToMired(kelvin) {
        return Math.floor(1000000 / kelvin);
    }

    miredToKelvin(mired) {
        return Math.floor(1000000 / mired);
    }

    hueToHomeKit(hue) {
        // Device Hue: 0-100 --> HomeKit Hue: 0-360
        return Math.round(hue * 3.6);
    }

    homeKitToHue(homeKitHue) {
        // HomeKit Hue: 0-360 --> Device Hue: 0-100
        return Math.round(homeKitHue / 3.6);
    }
}

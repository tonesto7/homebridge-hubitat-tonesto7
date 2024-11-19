// device_types/Light.js

import HubitatPlatformAccessory from "../HubitatPlatformAccessory.js";

export default class Light extends HubitatPlatformAccessory {
    constructor(platform, accessory) {
        super(platform, accessory);
        // this.platform = platform;
        this.api = platform.api;
        this.log = platform.log;
        this.config = platform.config;
        this.lightService = null;
        this.adaptiveLightingController = null;
        this.televisionService = null;
        this.effectsMap = {};
    }

    static relevantAttributes = ["switch", "level", "hue", "saturation", "colorTemperature", "colorName", "RGB", "color", "effectName", "lightEffects"];

    async configureServices() {
        try {
            this.lightService = this.getOrAddService(this.Service.Lightbulb, this.getServiceDisplayName(this.deviceData.name, "Light"));
            // this.markServiceForRetention(this.lightService);

            // Basic on/off
            this.getOrAddCharacteristic(this.lightService, this.Characteristic.On, {
                getHandler: () => this.getOnState(this.deviceData.attributes.switch),
                setHandler: (value) => this.setOnState(value),
            });

            // Brightness if supported
            if (this.hasAttribute("level")) {
                this.getOrAddCharacteristic(this.lightService, this.Characteristic.Brightness, {
                    getHandler: () => this.getBrightness(this.deviceData.attributes.level),
                    setHandler: (value) => this.setBrightness(value),
                    props: {
                        minStep: 1,
                        minValue: 0,
                        maxValue: 100,
                    },
                });
            }

            // Color features if supported
            if (this.hasAttribute("hue") && this.hasCommand("setHue")) {
                this.getOrAddCharacteristic(this.lightService, this.Characteristic.Hue, {
                    getHandler: () => this.getHue(this.deviceData.attributes.hue),
                    setHandler: (value) => this.setHue(value),
                    props: { minValue: 0, maxValue: 360 },
                });

                if (this.hasAttribute("saturation")) {
                    this.getOrAddCharacteristic(this.lightService, this.Characteristic.Saturation, {
                        getHandler: () => this.deviceData.attributes.saturation,
                        setHandler: (value) => this.setSaturation(value),
                        props: { minValue: 0, maxValue: 100 },
                    });
                }
            }

            // Color temperature if supported
            if (this.hasAttribute("colorTemperature") && this.hasCommand("setColorTemperature")) {
                this.getOrAddCharacteristic(this.lightService, this.Characteristic.ColorTemperature, {
                    getHandler: () => this.getColorTemperature(),
                    setHandler: (value) => this.setColorTemperature(value),
                    props: {
                        minValue: 140, // 7143K
                        maxValue: 500, // 2000K
                    },
                });
            }

            // Setup adaptive lighting if supported
            await this.configureAdaptiveLighting();

            // Add effects support if device has lightEffects attribute
            if (this.hasAttribute("lightEffects") && this.hasCommand("setEffect")) {
                await this.setupEffectsService();
            }

            return true;
        } catch (error) {
            this.logError(`Light | ${this.deviceData.name} | Error configuring services:`, error);
            throw error;
        }
    }

    // Characteristic Handlers
    getOnState(state) {
        return state === "on";
    }

    async setOnState(value) {
        await this.sendCommand(value ? "on" : "off");
    }

    getBrightness(value) {
        return this.transformBrightnessFromDevice(value);
    }

    async setBrightness(value) {
        const transformedValue = this.transformBrightnessToDevice(value);
        await this.sendCommand("setLevel", { value1: transformedValue });
    }

    // Color Value Handlers
    getHue(value) {
        return this.transformHueFromDevice(value);
    }

    async setHue(value) {
        const transformed = this.transformHueToDevice(value);
        await this.sendCommand("setHue", { value1: transformed });
    }

    async setSaturation(value) {
        await this.sendCommand("setSaturation", { value1: value });
    }

    getColorTemperature() {
        return this.kelvinToMired(this.deviceData.attributes.colorTemperature);
    }

    async setColorTemperature(value) {
        const kelvin = this.miredToKelvin(value);
        await this.sendCommand("setColorTemperature", { value1: kelvin });
    }

    isAdaptiveLightingActive() {
        return this.adaptiveLightingController ? this.adaptiveLightingController.isAdaptiveLightingActive() : false;
    }

    // Adaptive Lighting
    async configureAdaptiveLighting() {
        try {
            const canUseAL = this.adaptiveLightingSupported() && this.config.adaptive_lighting !== false && this.hasAttribute("level") && this.hasAttribute("colorTemperature") && !this.hasDeviceFlag("light_no_al");

            this.logInfo(`[${this.accessory.displayName}] Adaptive Lighting Supported: ${canUseAL}`);

            // Always remove existing controller first to prevent duplicates
            if (!canUseAL && this.adaptiveLightingController) {
                this.accessory.removeController(this.adaptiveLightingController);
                this.adaptiveLightingController = null;
            }

            // Only add new controller if AL is enabled
            if (canUseAL && !this.adaptiveLightingController) {
                const offset = this.config.adaptive_lighting_offset || 0;
                const controller = new this.api.hap.AdaptiveLightingController(this.lightService, {
                    controllerMode: this.api.hap.AdaptiveLightingControllerMode.AUTOMATIC,
                    customTemperatureAdjustment: offset,
                });

                controller.on("update", (values) => {
                    this.logInfo(`[${this.accessory.displayName}] Adaptive Lighting Update:`, values);
                });

                controller.on("disable", () => {
                    this.logInfo(`[${this.accessory.displayName}] Adaptive Lighting Disabled`);
                });

                // Store controller reference before configuring
                this.adaptiveLightingController = controller;

                // Configure the controller
                this.accessory.configureController(controller);
                this.logInfo(`[${this.accessory.displayName}] Adaptive Lighting Enabled`);
            }
        } catch (error) {
            this.logError(`[${this.accessory.displayName}] Error configuring Adaptive Lighting:`, error);
        }
    }

    async setupEffectsService() {
        this.televisionService = this.getOrAddService(this.Service.Television, this.getServiceDisplayName(this.deviceData.name, "Effects"));

        this.getOrAddCharacteristic(this.televisionService, this.Characteristic.SleepDiscoveryMode).updateValue(this.Characteristic.SleepDiscoveryMode.ALWAYS_DISCOVERABLE);

        this.getOrAddCharacteristic(this.televisionService, this.Characteristic.ConfiguredName).updateValue(`${this.accessory.displayName} Effects`);

        this.getOrAddCharacteristic(this.televisionService, this.Characteristic.Active, {
            getHandler: () => (this.deviceData.attributes.effectName !== undefined && this.deviceData.attributes.effectName !== "None" ? 1 : 0),
            setHandler: (value) => {
                if (!value) {
                    this.sendCommand("setEffect", { value1: 0 });
                } else {
                    const firstEffectNumber = Object.keys(this.effectsMap)[0];
                    if (firstEffectNumber) {
                        this.sendCommand("setEffect", { value1: parseInt(firstEffectNumber) });
                    }
                }
            },
        });

        this.getOrAddCharacteristic(this.televisionService, this.Characteristic.ActiveIdentifier, {
            getHandler: () => {
                const currentEffect = this.deviceData.attributes.effectName;
                return this.effectsMap[currentEffect] || 0;
            },
            setHandler: (value) => this.sendCommand("setEffect", { value1: value }),
        });

        await this.updateEffects();
    }

    async updateEffects() {
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
            const inputService = this.getOrAddService(this.Service.InputSource, `effect ${effectNumber}`, effectName);

            inputService.setCharacteristic(this.Characteristic.Identifier, parseInt(effectNumber)).setCharacteristic(this.Characteristic.ConfiguredName, effectName).setCharacteristic(this.Characteristic.IsConfigured, 1).setCharacteristic(this.Characteristic.InputSourceType, 0);

            this.televisionService.addLinkedService(inputService);
            this.effectsMap[effectName] = parseInt(effectNumber);
        }

        this.updateEffectState();
    }

    updateEffectState() {
        const currentEffect = this.deviceData.attributes.effectName;
        const isActive = currentEffect !== undefined && currentEffect !== "None";

        this.televisionService.updateCharacteristic(this.Characteristic.Active, isActive ? 1 : 0);

        if (isActive) {
            const effectNumber = this.effectsMap[currentEffect] || 0;
            this.televisionService.updateCharacteristic(this.Characteristic.ActiveIdentifier, effectNumber);
        }
    }

    // Value Transformations
    transformBrightnessFromDevice(value) {
        if (this.config.round_levels) {
            if (value < 5) return 0;
            if (value > 95) return 100;
        }
        return Math.max(0, Math.min(100, parseInt(value)));
    }

    transformBrightnessToDevice(value) {
        return Math.max(0, Math.min(100, parseInt(value)));
    }

    transformHueFromDevice(value) {
        return Math.max(0, Math.min(360, Math.round(value * 3.6)));
    }

    transformHueToDevice(value) {
        return Math.round(value / 3.6);
    }

    kelvinToMired(kelvin) {
        return Math.max(140, Math.min(500, Math.round(1000000 / kelvin)));
    }

    miredToKelvin(mired) {
        return Math.round(1000000 / mired);
    }

    // Attribute Updates
    async handleAttributeUpdate(change) {
        const { attribute, value } = change;

        switch (attribute) {
            case "switch":
                this.lightService.getCharacteristic(this.Characteristic.On).updateValue(this.getOnState(value));
                if (this.config.adaptive_lighting_off_when_on && this.getOnState(value) && this.isAdaptiveLightingActive()) {
                    this.adaptiveLightingController.disableAdaptiveLighting();
                }
                break;
            case "level":
                const level = this.transformBrightnessFromDevice(value);
                if (isNaN(level)) {
                    this.logWarn(`Invalid brightness level: ${value}`);
                    return;
                }
                this.lightService.getCharacteristic(this.Characteristic.Brightness).updateValue(level);
                if (this.config.adaptive_lighting_off_when_on && level > 0 && this.isAdaptiveLightingActive()) {
                    this.adaptiveLightingController.disableAdaptiveLighting();
                }
                break;
            case "hue":
                const hue = this.transformHueFromDevice(value);
                if (isNaN(hue)) {
                    this.logWarn(`Invalid hue value: ${value}`);
                    return;
                }
                this.lightService.getCharacteristic(this.Characteristic.Hue).updateValue(hue);
                break;
            case "saturation":
                if (value === null || value === undefined || isNaN(value)) {
                    this.logWarn(`Invalid saturation update value: ${value}`);
                    return;
                }
                this.lightService.getCharacteristic(this.Characteristic.Saturation).updateValue(value);
                break;
            case "colorTemperature":
                const temp = this.kelvinToMired(value);
                if (isNaN(temp)) {
                    this.logWarn(`Invalid color temperature value: ${value}`);
                    return;
                }
                this.lightService.getCharacteristic(this.Characteristic.ColorTemperature).updateValue(temp);
                break;

            case "effectName":
                if (this.televisionService) {
                    this.updateEffectState();
                }
                break;

            case "lightEffects":
                if (this.televisionService) {
                    await this.updateEffects();
                }
                break;

            default:
                this.logWarn(`Light | ${this.deviceData.name} | Unhandled attribute update: ${attribute} = ${value}`);
        }
    }

    async cleanup() {
        // Call parent cleanup
        super.cleanup();

        // Clean up Adaptive Lighting Controller
        if (this.adaptiveLightingController) {
            this.accessory.removeController(this.adaptiveLightingController);
            this.adaptiveLightingController = null;
        }

        // Clean up Effects Service
        if (this.televisionService) {
            this.televisionService = null;
        }
    }
}

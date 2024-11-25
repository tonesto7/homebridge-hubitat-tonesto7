// device_types/Light.js

import HubitatBaseAccessory from "./BaseAccessory.js";

export default class Light extends HubitatBaseAccessory {
    constructor(platform, accessory) {
        super(platform, accessory);
        this.api = platform.api;
        this.config = platform.config;
    }

    static relevantAttributes = ["switch", "level", "hue", "saturation", "colorTemperature", "colorName", "RGB", "color", "effectName", "lightEffects"];

    async configureServices() {
        this.logManager.logDebug(`[${this.accessory.displayName}] Configuring Light Services`);
        try {
            const lightService = this.getOrAddService(this.Service.Lightbulb, this.cleanServiceDisplayName(this.deviceData.name, "Light"));
            this.accessory.context.state.light.lightService = this.getServiceId(lightService);

            // Basic on/off
            this.getOrAddCharacteristic(lightService, this.Characteristic.On, {
                getHandler: () => this.getOnState(this.deviceData.attributes.switch),
                setHandler: (value) => this.setOnState(value),
            });

            // Brightness if supported
            if (this.hasAttribute("level")) {
                this.getOrAddCharacteristic(lightService, this.Characteristic.Brightness, {
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
                this.getOrAddCharacteristic(lightService, this.Characteristic.Hue, {
                    getHandler: () => this.getHue(this.deviceData.attributes.hue),
                    setHandler: (value) => this.setHue(value),
                    props: { minValue: 0, maxValue: 360 },
                });

                if (this.hasAttribute("saturation")) {
                    this.getOrAddCharacteristic(lightService, this.Characteristic.Saturation, {
                        getHandler: () => this.deviceData.attributes.saturation,
                        setHandler: (value) => this.setSaturation(value),
                        props: { minValue: 0, maxValue: 100 },
                    });
                }
            }

            // Color temperature if supported
            if (this.hasAttribute("colorTemperature") && this.hasCommand("setColorTemperature")) {
                this.getOrAddCharacteristic(lightService, this.Characteristic.ColorTemperature, {
                    getHandler: () => this.getColorTemperature(),
                    setHandler: (value) => this.setColorTemperature(value),
                    props: {
                        minValue: 140, // 7143K
                        maxValue: 500, // 2000K
                    },
                });

                // Setup adaptive lighting if supported
                await this.configureAdaptiveLighting();
            }

            // Add effects support if device has lightEffects attribute
            if (this.hasAttribute("lightEffects") && this.hasCommand("setEffect") && this.config.allow_led_effects_control) {
                await this.setupEffectsService();
            }

            return true;
        } catch (error) {
            this.logManager.logError(`Light | ${this.deviceData.name} | Error configuring services:`, error);
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
        await this.sendCommand("setLevel", [transformedValue]);
    }

    // Color Value Handlers
    getHue(value) {
        return this.transformHueFromDevice(value);
    }

    async setHue(value) {
        const hue = this.transformHueToDevice(value);
        await this.sendCommand("setHue", [hue]);
    }

    async setSaturation(saturation) {
        await this.sendCommand("setSaturation", [saturation]);
    }

    getColorTemperature() {
        return this.kelvinToMired(this.deviceData.attributes.colorTemperature);
    }

    async setColorTemperature(value) {
        const kelvin = this.miredToKelvin(value);
        await this.sendCommand("setColorTemperature", { value1: kelvin });
    }

    isAdaptiveLightingActive() {
        return this.accessory.context.state.light.adaptiveLighting.enabled;
    }

    // Adaptive Lighting
    async configureAdaptiveLighting() {
        try {
            const canUseAL = this.adaptiveLightingSupported() && this.config.adaptive_lighting !== false && this.hasAttribute("level") && this.hasAttribute("colorTemperature") && !this.hasDeviceFlag("light_no_al");

            this.logManager.logDebug(`[${this.accessory.displayName}] Adaptive Lighting Supported: ${canUseAL}`);

            if (!canUseAL) {
                // Clear adaptive lighting state from context
                this.accessory.context.state.light.adaptiveLighting = {
                    enabled: false,
                    controllerId: null,
                    offset: 0,
                    lastUpdate: null,
                };
                if (this._adaptiveLightingController) {
                    this.accessory.removeController(this._adaptiveLightingController);
                    this._adaptiveLightingController = null;
                }
                return;
            }

            // Get light service
            const lightService = this.accessory.services.find((s) => this.getServiceId(s) === this.accessory.context.state.light.lightService);
            if (!lightService) return;

            // Create new controller if needed
            if (!this._adaptiveLightingController) {
                const offset = this.config.adaptive_lighting_offset || 0;
                this._adaptiveLightingController = new this.api.hap.AdaptiveLightingController(lightService, {
                    controllerMode: this.api.hap.AdaptiveLightingControllerMode.AUTOMATIC,
                    customTemperatureAdjustment: offset,
                });

                this._adaptiveLightingController.on("update", (values) => {
                    this.logManager.logDebug(`[${this.accessory.displayName}] Adaptive Lighting Update:`, values);
                    // Store last update in context
                    this.accessory.context.state.light.adaptiveLighting.lastUpdate = Date.now();
                });

                this._adaptiveLightingController.on("disable", () => {
                    this.logManager.logWarn(`[${this.accessory.displayName}] Adaptive Lighting Disabled`);
                    this.accessory.context.state.light.adaptiveLighting.enabled = false;
                });

                // Store controller info in context
                this.accessory.context.state.light.adaptiveLighting = {
                    enabled: true,
                    controllerId: this._adaptiveLightingController.instanceID,
                    offset: offset,
                    lastUpdate: Date.now(),
                };

                // Configure the controller
                this.accessory.configureController(this._adaptiveLightingController);
                this.logManager.logDebug(`[${this.accessory.displayName}] Adaptive Lighting Enabled`);
            }
        } catch (error) {
            this.logManager.logError(`[${this.accessory.displayName}] Error configuring Adaptive Lighting:`, error);
        }
    }

    async setupEffectsService() {
        // Configure main television service
        const televisionService = this.getOrAddService(this.Service.Television, this.cleanServiceDisplayName(this.deviceData.name, "Effects"));

        // Store TV service ID in context
        this.accessory.context.state.light.televisionService = this.getServiceId(televisionService);

        // Sleep Discovery Mode
        this.getOrAddCharacteristic(televisionService, this.Characteristic.SleepDiscoveryMode, {
            getHandler: () => this.Characteristic.SleepDiscoveryMode.ALWAYS_DISCOVERABLE,
        });

        // Configured Name
        this.getOrAddCharacteristic(televisionService, this.Characteristic.ConfiguredName, {
            getHandler: () => `${this.accessory.displayName} Effects`,
        });

        // Active State
        this.getOrAddCharacteristic(televisionService, this.Characteristic.Active, {
            getHandler: () => {
                const hasEffect = this.deviceData.attributes.effectName !== undefined && this.deviceData.attributes.effectName !== "None";
                return hasEffect ? this.Characteristic.Active.ACTIVE : this.Characteristic.Active.INACTIVE;
            },
            setHandler: async (value) => {
                if (value === this.Characteristic.Active.INACTIVE) {
                    await this.sendCommand("setEffect", [0]); // Turn off effect
                } else {
                    // Turn on first available effect
                    const effects = JSON.parse(this.deviceData.attributes.lightEffects || "{}");
                    const firstEffect = Object.keys(effects)[0];
                    if (firstEffect) {
                        await this.sendCommand("setEffect", [parseInt(firstEffect)]);
                    }
                }
            },
        });

        // Effect Selection
        this.getOrAddCharacteristic(televisionService, this.Characteristic.ActiveIdentifier, {
            getHandler: () => {
                const currentEffect = this.deviceData.attributes.effectName;
                const effects = JSON.parse(this.deviceData.attributes.lightEffects || "{}");
                const effectNumber = Object.entries(effects).find(([_, name]) => name === currentEffect)?.[0];
                return effectNumber ? parseInt(effectNumber) : 0;
            },
            setHandler: async (value) => {
                await this.sendCommand("setEffect", [value]);
            },
        });

        // Add Remote Key characteristic (required for Television service)
        this.getOrAddCharacteristic(televisionService, this.Characteristic.RemoteKey);

        // Initial effects setup
        await this.updateEffects();

        return televisionService;
    }

    async updateEffects() {
        const televisionService = this.accessory.services.find((s) => this.getServiceId(s) === this.accessory.context.state.light.televisionService);
        if (!televisionService) return;

        const effects = JSON.parse(this.deviceData.attributes.lightEffects || "{}");

        // Remove old input sources
        const oldInputServices = this.accessory.services.filter((service) => service.UUID === this.Service.InputSource.UUID);

        for (const service of oldInputServices) {
            televisionService.removeLinkedService(service);
            this.accessory.removeService(service);
        }

        // Add new input sources
        for (const [effectNumber, effectName] of Object.entries(effects)) {
            const inputService = this.getOrAddService(this.Service.InputSource, effectName, `effect_${effectNumber}`);

            // Configure required characteristics
            this.getOrAddCharacteristic(inputService, this.Characteristic.Identifier, {
                getHandler: () => parseInt(effectNumber),
            });

            this.getOrAddCharacteristic(inputService, this.Characteristic.ConfiguredName, {
                getHandler: () => effectName,
            });

            this.getOrAddCharacteristic(inputService, this.Characteristic.IsConfigured, {
                getHandler: () => this.Characteristic.IsConfigured.CONFIGURED,
            });

            this.getOrAddCharacteristic(inputService, this.Characteristic.InputSourceType, {
                getHandler: () => this.Characteristic.InputSourceType.APPLICATION,
            });

            this.getOrAddCharacteristic(inputService, this.Characteristic.CurrentVisibilityState, {
                getHandler: () => this.Characteristic.CurrentVisibilityState.SHOWN,
            });

            this.getOrAddCharacteristic(inputService, this.Characteristic.Name, {
                getHandler: () => effectName,
            });

            // Link to television service
            televisionService.addLinkedService(inputService);

            // Store in context
            if (!this.accessory.context.state.light.effectsMap) {
                this.accessory.context.state.light.effectsMap = {};
            }
            this.accessory.context.state.light.effectsMap[effectName] = parseInt(effectNumber);
        }

        // Update current state
        this.updateEffectState();
    }

    updateEffectState() {
        const televisionService = this.accessory.services.find((s) => this.getServiceId(s) === this.accessory.context.state.light.televisionService);
        if (!televisionService) return;

        const currentEffect = this.deviceData.attributes.effectName;
        const isActive = currentEffect !== undefined && currentEffect !== "None";

        televisionService.updateCharacteristic(this.Characteristic.Active, isActive ? this.Characteristic.Active.ACTIVE : this.Characteristic.Active.INACTIVE);

        if (isActive) {
            const effectNumber = this.accessory.context.state.light.effectsMap[currentEffect] || 0;
            televisionService.updateCharacteristic(this.Characteristic.ActiveIdentifier, effectNumber);
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

        if (!this.lightService) {
            this.logManager.logWarn(`Light | ${this.deviceData.name} | Light service not found when handling attribute update`);
            return;
        }

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
                    this.logManager.logWarn(`Invalid brightness level: ${value}`);
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
                    this.logManager.logWarn(`Invalid hue value: ${value}`);
                    return;
                }
                this.lightService.getCharacteristic(this.Characteristic.Hue).updateValue(hue);
                break;
            case "saturation":
                if (value === null || value === undefined || isNaN(value)) {
                    this.logManager.logWarn(`Invalid saturation update value: ${value}`);
                    return;
                }
                this.lightService.getCharacteristic(this.Characteristic.Saturation).updateValue(value);
                break;
            case "colorTemperature":
                const temp = this.kelvinToMired(value);
                if (isNaN(temp)) {
                    this.logManager.logWarn(`Invalid color temperature value: ${value}`);
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
                this.logManager.logWarn(`Light | ${this.deviceData.name} | Unhandled attribute update: ${attribute} = ${value}`);
        }
    }

    async cleanup() {
        // this.lightService = null;
        // this.televisionService = null;

        // Call parent cleanup
        super.cleanup();
    }
}

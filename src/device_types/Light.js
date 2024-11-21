// device_types/Light.js

import HubitatPlatformAccessory from "../HubitatPlatformAccessory.js";

export default class Light extends HubitatPlatformAccessory {
    constructor(platform, accessory) {
        super(platform, accessory);
        this.api = platform.api;
        this.log = platform.log;
        this.config = platform.config;

        // Initialize light state in context if needed
        if (!this.accessory.context.state.light) {
            this.accessory.context.state.light = {
                lightService: null,
                televisionService: null,
                effectsMap: {},
                adaptiveLighting: {
                    enabled: false,
                    controllerId: null,
                    offset: 0,
                    lastUpdate: null,
                },
            };
        }
    }

    static relevantAttributes = ["switch", "level", "hue", "saturation", "colorTemperature", "colorName", "RGB", "color", "effectName", "lightEffects"];

    async configureServices() {
        this.logInfo(`[${this.accessory.displayName}] Configuring Light Services`);
        try {
            const lightService = this.getOrAddService(this.Service.Lightbulb, this.getServiceDisplayName(this.deviceData.name, "Light"));
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

            this.logInfo(`[${this.accessory.displayName}] Adaptive Lighting Supported: ${canUseAL}`);

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
                    this.logInfo(`[${this.accessory.displayName}] Adaptive Lighting Update:`, values);
                    // Store last update in context
                    this.accessory.context.state.light.adaptiveLighting.lastUpdate = Date.now();
                });

                this._adaptiveLightingController.on("disable", () => {
                    this.logInfo(`[${this.accessory.displayName}] Adaptive Lighting Disabled`);
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
                this.logInfo(`[${this.accessory.displayName}] Adaptive Lighting Enabled`);
            }
        } catch (error) {
            this.logError(`[${this.accessory.displayName}] Error configuring Adaptive Lighting:`, error);
        }
    }

    async setupEffectsService() {
        // Configure main television service
        const televisionService = this.getOrAddService(this.Service.Television, this.getServiceDisplayName(this.deviceData.name, "Effects"));
        this.accessory.context.state.light.televisionService = this.getServiceId(televisionService);

        // Configure required Television characteristics
        this.getOrAddCharacteristic(televisionService, this.Characteristic.Active, {
            getHandler: () => (this.deviceData.attributes.effectName !== undefined && this.deviceData.attributes.effectName !== "None" ? 1 : 0),
            setHandler: (value) => {
                if (!value) {
                    this.sendCommand("setEffect", [0]);
                } else {
                    const firstEffectNumber = Object.keys(this.effectsMap)[0];
                    if (firstEffectNumber) {
                        this.sendCommand("setEffect", [parseInt(firstEffectNumber)]);
                    }
                }
            },
        });

        this.getOrAddCharacteristic(televisionService, this.Characteristic.ActiveIdentifier, {
            getHandler: () => {
                const currentEffect = this.deviceData.attributes.effectName;
                return this.effectsMap[currentEffect] || 0;
            },
            setHandler: (value) => this.sendCommand("setEffect", [value]),
        });

        // Add required characteristics
        this.getOrAddCharacteristic(televisionService, this.Characteristic.ConfiguredName, {
            getHandler: () => `${this.accessory.displayName} Effects`,
        });

        this.getOrAddCharacteristic(televisionService, this.Characteristic.SleepDiscoveryMode, {
            getHandler: () => this.Characteristic.SleepDiscoveryMode.ALWAYS_DISCOVERABLE,
        });

        this.getOrAddCharacteristic(televisionService, this.Characteristic.RemoteKey);

        await this.updateEffects();

        this.accessory.context.state.light.effectsMap = {};
    }

    async updateEffects() {
        const effects = JSON.parse(this.deviceData.attributes.lightEffects || "{}");
        this.effectsMap = {};

        // Remove old input sources
        const inputSources = this.accessory.services.filter((service) => service.displayName && service.displayName.startsWith("effect "));
        inputSources.forEach((service) => {
            this.televisionService.removeLinkedService(service);
            this.accessory.removeService(service);
        });

        // Add new input sources
        for (const [effectNumber, effectName] of Object.entries(effects)) {
            // Create input service for each effect
            const inputService = this.getOrAddService(this.Service.InputSource, effectName, `effect_${effectNumber}`);

            // Configure required InputSource characteristics
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

            // Link the input source to the television service
            this.televisionService.addLinkedService(inputService);

            // Update our effects map
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
        // Clean up Adaptive Lighting Controller
        if (this._adaptiveLightingController) {
            this.accessory.removeController(this._adaptiveLightingController);
            this._adaptiveLightingController = null;
        }

        // Clear light state from context but maintain structure
        this.accessory.context.state.light = {
            lightService: null,
            televisionService: null,
            effectsMap: {},
            adaptiveLighting: {
                enabled: false,
                controllerId: null,
                offset: 0,
                lastUpdate: null,
            },
        };

        // Call parent cleanup
        super.cleanup();
    }
}

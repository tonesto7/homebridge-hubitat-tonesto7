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
    }

    async configureServices() {
        this.lightService = this.getOrAddService(this.Service.Lightbulb);
        // this.markServiceForRetention(this.lightService);

        // Basic on/off
        this.getOrAddCharacteristic(this.lightService, this.Characteristic.On, {
            getHandler: () => this.getOnState(),
            setHandler: (value) => this.setOnState(value),
        });

        // Brightness if supported
        if (this.hasAttribute("level")) {
            this.getOrAddCharacteristic(this.lightService, this.Characteristic.Brightness, {
                getHandler: () => this.getBrightness(),
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
            this.configureColorCharacteristics();
        }

        // Color temperature if supported
        if (this.hasAttribute("colorTemperature") && this.hasCommand("setColorTemperature")) {
            this.configureColorTemperature();
        }

        // Setup adaptive lighting if supported
        await this.configureAdaptiveLighting();
    }

    // Characteristic Handlers
    getOnState() {
        return this.deviceData.attributes.switch === "on";
    }

    async setOnState(value) {
        await this.sendCommand(value ? "on" : "off");
    }

    getBrightness() {
        return this.transformBrightnessFromDevice(this.deviceData.attributes.level);
    }

    async setBrightness(value) {
        const transformedValue = this.transformBrightnessToDevice(value);
        await this.sendCommand("setLevel", { value1: transformedValue });
    }

    // Color Related Methods
    configureColorCharacteristics() {
        this.getOrAddCharacteristic(this.lightService, this.Characteristic.Hue, {
            getHandler: () => this.getHue(),
            setHandler: (value) => this.setHue(value),
            props: { minValue: 0, maxValue: 360 },
        });

        if (this.hasAttribute("saturation")) {
            this.getOrAddCharacteristic(this.lightService, this.Characteristic.Saturation, {
                getHandler: () => this.getSaturation(),
                setHandler: (value) => this.setSaturation(value),
                props: { minValue: 0, maxValue: 100 },
            });
        }
    }

    configureColorTemperature() {
        this.getOrAddCharacteristic(this.lightService, this.Characteristic.ColorTemperature, {
            getHandler: () => this.getColorTemperature(),
            setHandler: (value) => this.setColorTemperature(value),
            props: {
                minValue: 140, // 7143K
                maxValue: 500, // 2000K
            },
        });
    }

    // Color Value Handlers
    getHue() {
        return this.transformHueFromDevice(this.deviceData.attributes.hue);
    }

    async setHue(value) {
        const transformed = this.transformHueToDevice(value);
        await this.sendCommand("setHue", { value1: transformed });
    }

    getSaturation() {
        return this.deviceData.attributes.saturation;
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

    // Adaptive Lighting
    async configureAdaptiveLighting() {
        const canUseAL = this.config.adaptive_lighting !== false && this.hasAttribute("level") && this.hasAttribute("colorTemperature") && !this.hasDeviceFlag("light_no_al");

        try {
            // Get existing AL controller if any
            const existingController = this.accessory._controllers?.find((controller) => controller.controllerId?.includes("characteristic-transition-00000043"));

            // If AL is disabled and there's a controller, remove it
            if (!canUseAL && existingController) {
                this.accessory.removeController(existingController);
                this.log.warn(`[${this.accessory.displayName}] Adaptive Lighting Disabled`);
                return;
            }

            // If AL is enabled and no controller exists, add it
            if (canUseAL && !existingController) {
                const offset = this.config.adaptive_lighting_offset || 0;
                const controller = new this.api.hap.AdaptiveLightingController(this.lightService, {
                    controllerMode: this.api.hap.AdaptiveLightingControllerMode.AUTOMATIC,
                    customTemperatureAdjustment: offset,
                });

                controller.on("update", (values) => {
                    this.log.debug(`[${this.accessory.displayName}] Adaptive Lighting Update:`, values);
                });

                controller.on("disable", () => {
                    this.log.debug(`[${this.accessory.displayName}] Adaptive Lighting Disabled`);
                });

                this.accessory.configureController(controller);
                this.log.info(`[${this.accessory.displayName}] Adaptive Lighting Enabled`);
            }
        } catch (error) {
            this.log.error(`[${this.accessory.displayName}] Error configuring Adaptive Lighting: ${error.message}`);
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
    async handleAttributeUpdate(attribute, value) {
        this.updateDeviceAttribute(attribute, value);
        switch (attribute) {
            case "switch":
                this.lightService.updateCharacteristic(this.Characteristic.On, value === "on");
                break;
            case "level":
                const level = this.transformBrightnessFromDevice(value);
                if (isNaN(level)) {
                    this.logWarn(`Invalid brightness level: ${value}`);
                    return;
                }
                this.lightService.updateCharacteristic(this.Characteristic.Brightness, level);
                break;
            case "hue":
                const hue = this.transformHueFromDevice(value);
                if (isNaN(hue)) {
                    this.logWarn(`Invalid hue value: ${value}`);
                    return;
                }
                this.lightService.updateCharacteristic(this.Characteristic.Hue, hue);
                break;
            case "saturation":
                if (value === null || value === undefined || isNaN(value)) {
                    this.logWarn(`Invalid saturation update value: ${value}`);
                    return;
                }
                this.lightService.updateCharacteristic(this.Characteristic.Saturation, value);
                break;
            case "colorTemperature":
                const temp = this.kelvinToMired(value);
                if (isNaN(temp)) {
                    this.logWarn(`Invalid color temperature value: ${value}`);
                    return;
                }
                this.lightService.updateCharacteristic(this.Characteristic.ColorTemperature, temp);
                break;
        }
    }
}

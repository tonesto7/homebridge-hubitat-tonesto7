// device_types/Light.js

import HubitatPlatformAccessory from "../HubitatPlatformAccessory.js";

export default class Light extends HubitatPlatformAccessory {
    constructor(platform, accessory) {
        super(platform, accessory);
        this.platform = platform;
        this.config = platform.config;
        this.lightService = null;
        this.adaptiveLightingController = null;
    }

    async configureServices() {
        this.lightService = this.getOrAddService(this.Service.Lightbulb);
        this.markServiceForRetention(this.lightService);

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

        if (canUseAL && !this.adaptiveLightingController) {
            await this.enableAdaptiveLighting();
        } else if (!canUseAL && this.adaptiveLightingController) {
            this.disableAdaptiveLighting();
        }
    }

    async enableAdaptiveLighting() {
        const offset = this.config.adaptive_lighting_offset || 0;
        this.adaptiveLightingController = new this.platform.api.hap.AdaptiveLightingController(this.lightService, {
            controllerMode: this.platform.api.hap.AdaptiveLightingControllerMode.AUTOMATIC,
            customTemperatureAdjustment: offset,
        });

        this.adaptiveLightingController.on("update", (values) => {
            this.platform.log.debug(`[${this.accessory.displayName}] Adaptive Lighting Update:`, values);
        });

        this.adaptiveLightingController.on("disable", () => {
            this.platform.log.debug(`[${this.accessory.displayName}] Adaptive Lighting Disabled`);
        });

        this.accessory.configureController(this.adaptiveLightingController);
    }

    disableAdaptiveLighting() {
        if (this.adaptiveLightingController) {
            this.accessory.removeController(this.adaptiveLightingController);
            this.adaptiveLightingController = null;
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
                this.lightService.updateCharacteristic(this.Characteristic.Brightness, this.transformBrightnessFromDevice(value));
                break;
            case "hue":
                this.lightService.updateCharacteristic(this.Characteristic.Hue, this.transformHueFromDevice(value));
                break;
            case "saturation":
                this.lightService.updateCharacteristic(this.Characteristic.Saturation, value);
                break;
            case "colorTemperature":
                this.lightService.updateCharacteristic(this.Characteristic.ColorTemperature, this.kelvinToMired(value));
                break;
        }
    }
}

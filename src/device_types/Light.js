// device_types/Light.js

import HubitatAccessory from "../HubitatAccessory.js";

export default class Light extends HubitatAccessory {
    constructor(platform, accessory) {
        super(platform, accessory);
        this.deviceData = accessory.context.deviceData;
        this.relevantAttributes = ["switch", "level", "hue", "saturation", "colorTemperature"];
    }

    static isSupported(accessory) {
        const match = accessory.hasCapability("SwitchLevel") && (accessory.hasCapability("LightBulb") || accessory.hasCapability("Bulb") || accessory.context.deviceData.name.toLowerCase().includes("light") || ["saturation", "hue", "colorTemperature"].some((attr) => accessory.hasAttribute(attr)) || accessory.hasCapability("ColorControl"));
        return match && accessory.deviceGroups.length > 0;
    }

    async initializeService() {
        this.lightService = this.getOrAddService(this.Service.Lightbulb);

        this.getOrAddCharacteristic(this.lightService, this.Characteristic.On, {
            getHandler: () => this.deviceData.attributes.switch === "on",
            setHandler: (value) => {
                const command = value ? "on" : "off";
                this.log.info(`${this.accessory.displayName} | Setting light state to ${command}`);
                this.sendCommand(null, this.accessory, this.deviceData, command);
            },
        });

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
                    this.sendCommand(null, this.accessory, this.deviceData, "setLevel", { value1: brightness });
                },
            });
        }

        if (this.hasAttribute("hue") && this.hasCommand("setHue")) {
            this.getOrAddCharacteristic(this.lightService, this.Characteristic.Hue, {
                props: {
                    minValue: 0,
                    maxValue: 360,
                    minStep: 1,
                },
                getHandler: () => {
                    let hue = parseFloat(this.deviceData.attributes.hue);
                    hue = this.clamp(hue, 0, 360);
                    this.log.debug(`${this.accessory.displayName} | Current Hue: ${hue}`);
                    return isNaN(hue) ? 0 : Math.round(hue);
                },
                setHandler: (value) => {
                    const hue = this.clamp(Math.round(value), 0, 360);
                    this.log.info(`${this.accessory.displayName} | Setting hue to ${hue}`);
                    this.sendCommand(null, this.accessory, this.deviceData, "setHue", { value1: hue });
                },
            });
        }

        if (this.hasAttribute("saturation") && this.hasCommand("setSaturation")) {
            this.getOrAddCharacteristic(this.lightService, this.Characteristic.Saturation, {
                getHandler: () => {
                    let saturation = parseFloat(this.deviceData.attributes.saturation);
                    saturation = this.clamp(saturation, 0, 100);
                    this.log.debug(`${this.accessory.displayName} | Current Saturation: ${saturation}%`);
                    return isNaN(saturation) ? 0 : Math.round(saturation);
                },
                setHandler: (value) => {
                    const saturation = this.clamp(Math.round(value), 0, 100);
                    this.log.info(`${this.accessory.displayName} | Setting saturation to ${saturation}%`);
                    this.sendCommand(null, this.accessory, this.deviceData, "setSaturation", { value1: saturation });
                },
            });
        }

        if (this.hasAttribute("colorTemperature") && this.hasCommand("setColorTemperature")) {
            this.getOrAddCharacteristic(this.lightService, this.Characteristic.ColorTemperature, {
                props: {
                    minValue: 140,
                    maxValue: 500,
                },
                getHandler: () => {
                    let mired = this.kelvinToMired(parseInt(this.deviceData.attributes.colorTemperature));
                    mired = this.clamp(mired, 140, 500);
                    this.log.debug(`${this.accessory.displayName} | Current ColorTemperature: ${mired} Mireds`);
                    return isNaN(mired) ? 140 : mired;
                },
                setHandler: (value) => {
                    const mired = this.clamp(Math.round(value), 140, 500);
                    const kelvin = this.miredToKelvin(mired);
                    this.log.info(`${this.accessory.displayName} | Setting color temperature to ${kelvin}K (${mired} Mireds)`);
                    this.sendCommand(null, this.accessory, this.deviceData, "setColorTemperature", { value1: kelvin });
                },
            });
        }

        this.setupAdaptiveLighting();
        this.accessory.deviceGroups.push("light");
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
                    const hue = this.clamp(Math.round(parseFloat(change.value)), 0, 360);
                    this.updateCharacteristicValue(this.lightService, this.Characteristic.Hue, hue);
                }
                break;
            case "saturation":
                if (this.hasAttribute("saturation") && this.hasCommand("setSaturation")) {
                    const saturation = this.clamp(Math.round(parseFloat(change.value)), 0, 100);
                    this.updateCharacteristicValue(this.lightService, this.Characteristic.Saturation, saturation);
                }
                break;
            case "colorTemperature":
                if (this.hasAttribute("colorTemperature") && this.hasCommand("setColorTemperature")) {
                    const mired = this.kelvinToMired(parseInt(change.value, 10));
                    this.updateCharacteristicValue(this.lightService, this.Characteristic.ColorTemperature, mired);
                }
                break;
        }
    }

    setupAdaptiveLighting() {
        const canUseAL = this.platform.config.adaptive_lighting !== false && this.accessory.isAdaptiveLightingSupported && !this.hasDeviceFlag("light_no_al") && this.hasAttribute("level") && this.hasAttribute("colorTemperature");
        console.log("canUseAL", canUseAL);
        if (canUseAL && !this.accessory.adaptiveLightingController) {
            this.addAdaptiveLightingController(this.lightService);
        } else if (!canUseAL && this.accessory.adaptiveLightingController) {
            this.removeAdaptiveLightingController();
        }
    }

    addAdaptiveLightingController(service) {
        const offset = this.platform.config.adaptive_lighting_offset || 0;
        const controlMode = this.homebridge.hap.AdaptiveLightingControllerMode.AUTOMATIC;
        this.log.debug(`Adaptive Lighting Offset: ${offset}`);
        this.log.debug(`Adaptive Lighting Control Mode: ${controlMode}`);

        if (service) {
            this.accessory.adaptiveLightingController = new this.homebridge.hap.AdaptiveLightingController(service);

            this.accessory.adaptiveLightingController.on("update", (evt) => {
                this.log.debug(`[${this.accessory.displayName}] Adaptive Lighting Controller Update Event: ${JSON.stringify(evt)}`);
            });
            this.accessory.adaptiveLightingController.on("disable", (evt) => {
                this.log.debug(`[${this.accessory.displayName}] Adaptive Lighting Controller Disabled Event: ${JSON.stringify(evt)}`);
            });

            this.accessory.configureController(this.accessory.adaptiveLightingController);
            this.log.info(`Adaptive Lighting Supported... Assigned Adaptive Lighting Controller to [${this.accessory.displayName}]`);
        } else {
            this.log.error(`${this.accessory.displayName} | Unable to add Adaptive Lighting Controller because the required service parameter was missing...`);
        }
    }

    removeAdaptiveLightingController() {
        if (this.accessory.adaptiveLightingController) {
            this.log.info(`Adaptive Lighting Not Supported... Removing Adaptive Lighting Controller from [${this.accessory.displayName}]`);
            this.accessory.removeController(this.accessory.adaptiveLightingController);
            delete this.accessory.adaptiveLightingController;
        }
    }

    kelvinToMired(kelvin) {
        let val = Math.floor(1000000 / kelvin);
        return this.clamp(val, 140, 500);
    }

    miredToKelvin(mired) {
        return Math.floor(1000000 / mired);
    }
}

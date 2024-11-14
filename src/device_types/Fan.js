// device_types/Fan.js

import HubitatPlatformAccessory from "../HubitatPlatformAccessory.js";

export default class Fan extends HubitatPlatformAccessory {
    constructor(platform, accessory) {
        super(platform, accessory);
        this.fanService = null;
    }

    async configureServices() {
        try {
            this.fanService = this.getOrAddService(this.Service.Fan);
            // this.markServiceForRetention(this.fanService);

            // Active State (On/Off)
            this.getOrAddCharacteristic(this.fanService, this.Characteristic.Active, {
                getHandler: () => this.getActiveState(),
                setHandler: async (value) => this.setActiveState(value),
            });

            // Current Fan State
            this.getOrAddCharacteristic(this.fanService, this.Characteristic.CurrentFanState, {
                getHandler: () => this.getCurrentState(),
            });

            // Rotation Speed (if supported)
            if (this.hasAttribute("speed") || this.hasAttribute("level")) {
                const spdSteps = this.hasDeviceFlag("fan_3_spd") ? 33 : this.hasDeviceFlag("fan_4_spd") ? 25 : this.hasDeviceFlag("fan_5_spd") ? 20 : 1;

                this.getOrAddCharacteristic(this.fanService, this.Characteristic.RotationSpeed, {
                    getHandler: () => this.getRotationSpeed(),
                    setHandler: async (value) => this.setRotationSpeed(value),
                    props: {
                        minStep: spdSteps,
                        minValue: 0,
                        maxValue: 100,
                    },
                });
            }

            return true;
        } catch (error) {
            this.logError("Error configuring fan services:", error);
            throw error;
        }
    }

    getActiveState() {
        return this.deviceData.attributes.switch === "on" ? this.Characteristic.Active.ACTIVE : this.Characteristic.Active.INACTIVE;
    }

    async setActiveState(value) {
        await this.sendCommand(value === this.Characteristic.Active.ACTIVE ? "on" : "off");
    }

    getCurrentState() {
        if (this.deviceData.attributes.switch !== "on") {
            return this.Characteristic.CurrentFanState.INACTIVE;
        }
        const speedAttr = this.hasAttribute("speed") ? "speed" : "level";
        return this.deviceData.attributes[speedAttr] > 0 ? this.Characteristic.CurrentFanState.BLOWING_AIR : this.Characteristic.CurrentFanState.IDLE;
    }

    getRotationSpeed() {
        if (this.deviceData.attributes.switch !== "on") return 0;

        const speedAttr = this.hasAttribute("speed") ? "speed" : "level";
        let speed = parseInt(this.deviceData.attributes[speedAttr]) || 0;

        // Round levels if configured
        if (this.platform.config.round_levels === true) {
            if (speed < 5) speed = 0;
            if (speed > 95) speed = 100;
        }

        return Math.max(0, Math.min(100, speed));
    }

    async setRotationSpeed(value) {
        if (value === 0) {
            await this.sendCommand("off");
            return;
        }

        const command = this.hasAttribute("speed") ? "setSpeed" : "setLevel";
        await this.sendCommand(command, { value1: parseInt(value) });

        // Ensure the fan is on when setting speed
        if (this.deviceData.attributes.switch !== "on") {
            await this.sendCommand("on");
        }
    }

    async handleAttributeUpdate(attribute, value) {
        this.updateDeviceAttribute(attribute, value);
        switch (attribute) {
            case "switch":
                const activeState = value === "on" ? this.Characteristic.Active.ACTIVE : this.Characteristic.Active.INACTIVE;

                this.fanService.getCharacteristic(this.Characteristic.Active).updateValue(activeState);
                this.fanService.getCharacteristic(this.Characteristic.CurrentFanState).updateValue(this.getCurrentState());

                if (value === "off") {
                    // Update rotation speed to 0 when turned off
                    const speedChar = this.fanService.getCharacteristic(this.Characteristic.RotationSpeed);
                    if (speedChar) {
                        speedChar.updateValue(0);
                    }
                }
                break;

            case "speed":
            case "level":
                if (!this.hasAttribute(attribute)) return;

                let speed = parseInt(value) || 0;
                if (this.platform.config.round_levels === true) {
                    if (speed < 5) speed = 0;
                    if (speed > 95) speed = 100;
                }

                const speedChar = this.fanService.getCharacteristic(this.Characteristic.RotationSpeed);
                if (speedChar) {
                    speedChar.updateValue(Math.max(0, Math.min(100, speed)));
                }

                this.fanService.getCharacteristic(this.Characteristic.CurrentFanState).updateValue(this.getCurrentState());
                break;

            default:
                this.logDebug(`Unhandled attribute update: ${attribute} = ${value}`);
        }
    }

    // Override cleanup
    async cleanup() {
        this.fanService = null;
        await super.cleanup();
    }
}

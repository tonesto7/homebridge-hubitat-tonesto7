// device_types/Fan.js

import HubitatBaseAccessory from "./BaseAccessory.js";

export default class Fan extends HubitatBaseAccessory {
    constructor(platform, accessory) {
        super(platform, accessory);
        this.fanService = null;
    }

    static relevantAttributes = ["switch", "speed", "level"];

    async configureServices() {
        try {
            this.fanService = this.getOrAddService(this.Service.Fanv2, this.cleanServiceDisplayName(this.deviceData.name, "Fan"));

            // Active State (On/Off)
            this.getOrAddCharacteristic(this.fanService, this.Characteristic.Active, {
                getHandler: () => this.getActiveState(this.deviceData.attributes.switch),
                setHandler: async (value) => this.setActiveState(value),
            });

            // Current Fan State
            this.getOrAddCharacteristic(this.fanService, this.Characteristic.CurrentFanState, {
                getHandler: () => this.getCurrentState(this.deviceData.attributes.switch),
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
            this.logManager.logError(`Fan | ${this.deviceData.name} | Error configuring services:`, error);
            throw error;
        }
    }

    getActiveState(state) {
        return state === "on" ? this.Characteristic.Active.ACTIVE : this.Characteristic.Active.INACTIVE;
    }

    async setActiveState(value) {
        await this.sendCommand(value === this.Characteristic.Active.ACTIVE ? "on" : "off");
    }

    getCurrentState(state) {
        if (state !== "on") {
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
        await this.sendCommand(command, [parseInt(value)]);

        // Ensure the fan is on when setting speed
        if (this.deviceData.attributes.switch !== "on") {
            await this.sendCommand("on");
        }
    }

    async handleAttributeUpdate(change) {
        const { attribute, value } = change;
        this.logManager.logInfo(`Fan | ${this.deviceData.name} | Attribute update: ${attribute} = ${value}`);

        switch (attribute) {
            case "switch":
                this.fanService.updateCharacteristic(this.Characteristic.Active, this.getActiveState(value));
                this.fanService.updateCharacteristic(this.Characteristic.CurrentFanState, this.getCurrentState(value));

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

                this.fanService.updateCharacteristic(this.Characteristic.CurrentFanState, this.getCurrentState(this.deviceData.attributes.switch));
                break;

            default:
                this.logManager.logDebug(`Fan | ${this.deviceData.name} | Unhandled attribute update: ${attribute} = ${value}`);
        }

        return true;
    }

    // Override cleanup
    async cleanup() {
        this.fanService = null;
        super.cleanup();
    }
}

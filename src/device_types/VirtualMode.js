// device_types/VirtualMode.js

import HubitatPlatformAccessory from "../HubitatPlatformAccessory.js";

export default class VirtualMode extends HubitatPlatformAccessory {
    constructor(platform, accessory) {
        super(platform, accessory);
        this.modeService = null;
    }

    static relevantAttributes = ["switch"];
    async configureServices() {
        try {
            this.modeService = this.getOrAddService(this.Service.Switch, this.getServiceDisplayName(this.deviceData.name, "Mode"));

            // On State
            this.getOrAddCharacteristic(this.modeService, this.Characteristic.On, {
                getHandler: () => this.getOnState(this.deviceData.attributes.switch),
                setHandler: async (value) => this.setOnState(value),
            });

            return true;
        } catch (error) {
            this.logError(`Virtual Mode | ${this.deviceData.name} | Error configuring services:`, error);
            throw error;
        }
    }

    getOnState(state) {
        return state === "on";
    }

    async setOnState(value) {
        if (value && this.deviceData.attributes.switch === "off") {
            await this.sendCommand("mode");
        }
    }

    async handleAttributeUpdate(change) {
        const { attribute, value } = change;

        switch (attribute) {
            case "switch":
                this.modeService.getCharacteristic(this.Characteristic.On).updateValue(this.getOnState(value));
                break;
            default:
                this.logDebug(`Virtual Mode | ${this.deviceData.name} | Unhandled attribute update: ${attribute} = ${value}`);
        }
    }

    // Override cleanup
    async cleanup() {
        this.modeService = null;
        super.cleanup();
    }
}

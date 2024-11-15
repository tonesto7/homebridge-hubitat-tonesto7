// device_types/VirtualPiston.js

import HubitatPlatformAccessory from "../HubitatPlatformAccessory.js";

export default class VirtualPiston extends HubitatPlatformAccessory {
    constructor(platform, accessory) {
        super(platform, accessory);
        this.pistonService = null;
    }

    static relevantAttributes = ["switch"];
    async configureServices() {
        try {
            this.pistonService = this.getOrAddService(this.Service.Switch, this.getServiceDisplayName(this.deviceData.name, "Piston"));

            // On State
            this.getOrAddCharacteristic(this.pistonService, this.Characteristic.On, {
                getHandler: () => false,
                setHandler: async (value) => this.setOnState(value),
            });

            return true;
        } catch (error) {
            this.logError(`Virtual Piston | ${this.deviceData.name} | Error configuring services:`, error);
            throw error;
        }
    }

    async setOnState(value) {
        if (value) {
            await this.sendCommand("piston");

            // Auto-reset switch state after 1 second
            setTimeout(() => {
                this.deviceData.attributes.switch = "off";
                this.pistonService.getCharacteristic(this.Characteristic.On).updateValue(false);
            }, 1000);
        }
    }

    async handleAttributeUpdate(change) {
        const { attribute, value } = change;

        switch (attribute) {
            case "switch":
                this.pistonService.getCharacteristic(this.Characteristic.On).updateValue(this.getOnState(value));
                break;
            default:
                this.logDebug(`Virtual Piston | ${this.deviceData.name} | Unhandled attribute update: ${attribute} = ${value}`);
        }
    }

    // Override cleanup
    async cleanup() {
        this.pistonService = null;
        super.cleanup();
    }
}

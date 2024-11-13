// device_types/VirtualPiston.js

import HubitatPlatformAccessory from "../HubitatPlatformAccessory.js";

export default class VirtualPiston extends HubitatPlatformAccessory {
    constructor(platform, accessory) {
        super(platform, accessory);
        this.pistonService = null;
    }

    async configureServices() {
        try {
            this.pistonService = this.getOrAddService(this.Service.Switch);
            this.markServiceForRetention(this.pistonService);

            // On State
            this.getOrAddCharacteristic(this.pistonService, this.Characteristic.On, {
                getHandler: () => false,
                setHandler: async (value) => this.setOnState(value),
            });

            return true;
        } catch (error) {
            this.logError("Error configuring virtual piston services:", error);
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

    async handleAttributeUpdate(attribute, value) {
        this.updateDeviceAttribute(attribute, value);

        if (attribute === "switch") {
            this.pistonService.getCharacteristic(this.Characteristic.On).updateValue(false);
        } else {
            this.logDebug(`Unhandled attribute update: ${attribute} = ${value}`);
        }
    }

    // Override cleanup
    async cleanup() {
        this.pistonService = null;
        await super.cleanup();
    }
}

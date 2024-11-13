// device_types/VirtualMode.js

import HubitatPlatformAccessory from "../HubitatPlatformAccessory.js";

export default class VirtualMode extends HubitatPlatformAccessory {
    constructor(platform, accessory) {
        super(platform, accessory);
        this.modeService = null;
    }

    async configureServices() {
        try {
            this.modeService = this.getOrAddService(this.Service.Switch);
            this.markServiceForRetention(this.modeService);

            // On State
            this.getOrAddCharacteristic(this.modeService, this.Characteristic.On, {
                getHandler: () => this.getOnState(),
                setHandler: async (value) => this.setOnState(value),
            });

            return true;
        } catch (error) {
            this.logError("Error configuring virtual mode services:", error);
            throw error;
        }
    }

    getOnState() {
        return this.deviceData.attributes.switch === "on";
    }

    async setOnState(value) {
        if (value && this.deviceData.attributes.switch === "off") {
            await this.sendCommand("mode");
        }
    }

    async handleAttributeUpdate(attribute, value) {
        this.updateDeviceAttribute(attribute, value);

        if (attribute === "switch") {
            this.modeService.getCharacteristic(this.Characteristic.On).updateValue(value === "on");
        } else {
            this.logDebug(`Unhandled attribute update: ${attribute} = ${value}`);
        }
    }

    // Override cleanup
    async cleanup() {
        this.modeService = null;
        await super.cleanup();
    }
}

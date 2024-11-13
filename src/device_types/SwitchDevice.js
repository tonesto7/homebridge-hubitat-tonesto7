// device_types/SwitchDevice.js

import HubitatPlatformAccessory from "../HubitatPlatformAccessory.js";

export default class SwitchDevice extends HubitatPlatformAccessory {
    constructor(platform, accessory) {
        super(platform, accessory);
        this.switchService = null;
    }

    async configureServices() {
        try {
            this.switchService = this.getOrAddService(this.Service.Switch);
            this.markServiceForRetention(this.switchService);

            // On/Off State
            this.getOrAddCharacteristic(this.switchService, this.Characteristic.On, {
                getHandler: () => this.getOnState(),
                setHandler: async (value) => this.setOnState(value),
            });

            return true;
        } catch (error) {
            this.logError("Error configuring switch services:", error);
            throw error;
        }
    }

    getOnState() {
        return this.deviceData.attributes.switch === "on";
    }

    async setOnState(value) {
        await this.sendCommand(value ? "on" : "off");
    }

    async handleAttributeUpdate(attribute, value) {
        this.updateDeviceAttribute(attribute, value);

        if (attribute === "switch") {
            this.switchService.getCharacteristic(this.Characteristic.On).updateValue(value === "on");
        } else {
            this.logDebug(`Unhandled attribute update: ${attribute} = ${value}`);
        }
    }

    // Override cleanup
    async cleanup() {
        this.switchService = null;
        await super.cleanup();
    }
}

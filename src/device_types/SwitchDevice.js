// device_types/SwitchDevice.js

import HubitatPlatformAccessory from "../HubitatPlatformAccessory.js";

export default class SwitchDevice extends HubitatPlatformAccessory {
    constructor(platform, accessory) {
        super(platform, accessory);
        this.switchService = null;
    }

    static relevantAttributes = ["switch"];

    async configureServices() {
        try {
            this.switchService = this.getOrAddService(this.Service.Switch, this.getServiceDisplayName(this.deviceData.name, "Switch"));

            // On/Off State
            this.getOrAddCharacteristic(this.switchService, this.Characteristic.On, {
                getHandler: () => this.getOnState(this.deviceData.attributes.switch),
                setHandler: async (value) => this.setOnState(value),
            });

            return true;
        } catch (error) {
            this.logError(`SwitchDevice | ${this.deviceData.name} | Error configuring services:`, error);
            throw error;
        }
    }

    getOnState(value) {
        return value === "on";
    }

    async setOnState(value) {
        await this.sendCommand(value ? "on" : "off");
    }

    async handleAttributeUpdate(change) {
        const { attribute, value } = change;
        switch (attribute) {
            case "switch":
                this.switchService.getCharacteristic(this.Characteristic.On).updateValue(this.getOnState(value));
                break;

            default:
                this.logDebug(`SwitchDevice | ${this.deviceData.name} | Unhandled attribute update: ${attribute} = ${value}`);
        }
    }

    // Override cleanup
    async cleanup() {
        this.switchService = null;
        super.cleanup();
    }
}

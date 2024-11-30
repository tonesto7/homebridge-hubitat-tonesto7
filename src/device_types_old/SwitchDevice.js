// device_types/SwitchDevice.js

import HubitatBaseAccessory from "./BaseAccessory.js";

export default class SwitchDevice extends HubitatBaseAccessory {
    constructor(platform, accessory) {
        super(platform, accessory);
        this.switchService = null;
    }

    static relevantAttributes = ["switch"];

    async configureServices() {
        try {
            this.switchService = this.getOrAddService(this.Service.Switch, this.cleanServiceDisplayName(this.deviceData.name, "Switch"));

            // On/Off State
            this.getOrAddCharacteristic(this.switchService, this.Characteristic.On, {
                getHandler: () => this.getOnState(this.deviceData.attributes.switch),
                setHandler: async (value) => this.setOnState(value),
            });

            return true;
        } catch (error) {
            this.logManager.logError(`SwitchDevice | ${this.deviceData.name} | Error configuring services:`, error);
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
                this.logManager.logDebug(`SwitchDevice | ${this.deviceData.name} | Unhandled attribute update: ${attribute} = ${value}`);
        }
    }

    // Override cleanup
    async cleanup() {
        this.switchService = null;
        super.cleanup();
    }
}

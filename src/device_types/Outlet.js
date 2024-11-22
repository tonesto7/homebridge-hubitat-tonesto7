// device_types/Outlet.js

import HubitatBaseAccessory from "./BaseAccessory.js";

export default class Outlet extends HubitatBaseAccessory {
    constructor(platform, accessory) {
        super(platform, accessory);
        this.outletService = null;
    }

    static relevantAttributes = ["switch"];

    async configureServices() {
        try {
            this.outletService = this.getOrAddService(this.Service.Outlet, this.cleanServiceDisplayName(this.deviceData.name, "Outlet"));

            // On/Off State
            this.getOrAddCharacteristic(this.outletService, this.Characteristic.On, {
                getHandler: () => this.getOnState(this.deviceData.attributes.switch),
                setHandler: async (value) => this.setOnState(value),
            });

            // Outlet In Use
            this.getOrAddCharacteristic(this.outletService, this.Characteristic.OutletInUse, {
                getHandler: () => this.getInUseState(this.deviceData.attributes.switch),
            });

            return true;
        } catch (error) {
            this.logManager.logError(`Outlet | ${this.deviceData.name} | Error configuring services:`, error);
            throw error;
        }
    }

    getOnState(state) {
        return state === "on";
    }

    getInUseState(state) {
        return state === "on";
    }

    async setOnState(value) {
        await this.sendCommand(value ? "on" : "off");
    }

    async handleAttributeUpdate(change) {
        const { attribute, value } = change;

        switch (attribute) {
            case "switch":
                this.outletService.getCharacteristic(this.Characteristic.On).updateValue(this.getOnState(value));
                this.outletService.getCharacteristic(this.Characteristic.OutletInUse).updateValue(this.getInUseState(value));
                break;

            default:
                this.logManager.logDebug(`Outlet | ${this.deviceData.name} | Unhandled attribute update: ${attribute} = ${value}`);
        }
    }

    // Override cleanup
    async cleanup() {
        this.outletService = null;
        super.cleanup();
    }
}

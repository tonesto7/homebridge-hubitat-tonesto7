// device_types/Valve.js

import HubitatBaseAccessory from "./BaseAccessory.js";

export default class Valve extends HubitatBaseAccessory {
    constructor(platform, accessory) {
        super(platform, accessory);
        this.valveService = null;
    }

    static relevantAttributes = ["valve"];

    async configureServices() {
        try {
            this.valveService = this.getOrAddService(this.Service.Valve, this.cleanServiceDisplayName(this.deviceData.name, "Valve"));

            // Active
            this.getOrAddCharacteristic(this.valveService, this.Characteristic.Active, {
                getHandler: () => this.getActiveState(this.deviceData.attributes.valve),
                setHandler: async (value) => this.setActiveState(value),
            });

            // In Use
            this.getOrAddCharacteristic(this.valveService, this.Characteristic.InUse, {
                getHandler: () => this.getInUseState(this.deviceData.attributes.valve),
            });

            // Valve Type (defaults to 0 - Generic Valve)
            if (!this.valveService.testCharacteristic(this.Characteristic.ValveType)) {
                this.valveService.setCharacteristic(this.Characteristic.ValveType, 0);
            }

            return true;
        } catch (error) {
            this.logManager.logError(`Valve | ${this.deviceData.name} | Error configuring services:`, error);
            throw error;
        }
    }

    getActiveState(valve) {
        return valve === "open" ? this.Characteristic.Active.ACTIVE : this.Characteristic.Active.INACTIVE;
    }

    async setActiveState(value) {
        await this.sendCommand(value === this.Characteristic.Active.ACTIVE ? "open" : "close");
    }

    getInUseState(valve) {
        return valve === "open" ? this.Characteristic.InUse.IN_USE : this.Characteristic.InUse.NOT_IN_USE;
    }

    async handleAttributeUpdate(change) {
        const { attribute, value } = change;

        switch (attribute) {
            case "valve":
                this.valveService.getCharacteristic(this.Characteristic.Active).updateValue(this.getActiveState(value));
                this.valveService.getCharacteristic(this.Characteristic.InUse).updateValue(this.getInUseState(value));
                break;
            default:
                this.logManager.logDebug(`Valve | ${this.deviceData.name} | Unhandled attribute update: ${attribute} = ${value}`);
        }
    }

    // Override cleanup
    async cleanup() {
        this.valveService = null;
        super.cleanup();
    }
}

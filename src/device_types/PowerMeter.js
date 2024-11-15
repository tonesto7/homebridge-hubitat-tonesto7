// device_types/PowerMeter.js

import HubitatPlatformAccessory from "../HubitatPlatformAccessory.js";

export default class PowerMeter extends HubitatPlatformAccessory {
    constructor(platform, accessory) {
        super(platform, accessory);
        this.powerService = null;
    }

    static relevantAttributes = ["power"];

    async configureServices() {
        try {
            // Using a custom service type for power measurement
            this.powerService = this.getOrAddService(this.platform.CommunityTypes.WattService, this.getServiceDisplayName(this.deviceData.name, "Power Meter"));

            // Configure the watts characteristic
            this.getOrAddCharacteristic(this.powerService, this.platform.CommunityTypes.Watts, {
                getHandler: () => this.getPowerValue(this.deviceData.attributes.power),
            });

            return true;
        } catch (error) {
            this.logError(`PowerMeter | ${this.deviceData.name} | Error configuring services:`, error);
            throw error;
        }
    }

    getPowerValue(value) {
        return Math.round(parseFloat(value) || 0);
    }

    async handleAttributeUpdate(change) {
        const { attribute, value } = change;

        switch (attribute) {
            case "power":
                this.powerService?.getCharacteristic(this.platform.CommunityTypes.Watts).updateValue(this.getPowerValue(value));
                break;

            default:
                this.logDebug(`PowerMeter | ${this.deviceData.name} | Unhandled attribute update: ${attribute} = ${value}`);
        }
    }

    // Override cleanup
    async cleanup() {
        this.powerService = null;
        super.cleanup();
    }
}

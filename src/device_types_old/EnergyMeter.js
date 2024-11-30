// device_types/EnergyMeter.js

import HubitatBaseAccessory from "./BaseAccessory.js";

export default class EnergyMeter extends HubitatBaseAccessory {
    constructor(platform, accessory) {
        super(platform, accessory);
        this.energyService = null;
    }

    static relevantAttributes = ["energy"];

    async configureServices() {
        try {
            // We'll use a custom service type for energy measurement
            this.energyService = this.getOrAddService(this.platform.CommunityTypes.KilowattHoursService, this.cleanServiceDisplayName(this.deviceData.name, "Energy Meter"));

            // Configure the kilowatt hours characteristic
            this.getOrAddCharacteristic(this.energyService, this.platform.CommunityTypes.KilowattHours, {
                getHandler: () => this.getEnergyValue(this.deviceData.attributes.energy),
            });

            return true;
        } catch (error) {
            this.logManager.logError(`EnergyMeter | ${this.deviceData.name} | Error configuring services:`, error);
            throw error;
        }
    }

    getEnergyValue(value) {
        return Math.round(parseFloat(value) || 0);
    }

    async handleAttributeUpdate(change) {
        const { attribute, value } = change;

        if (attribute === "energy") {
            this.energyService?.getCharacteristic(this.platform.CommunityTypes.KilowattHours).updateValue(this.getEnergyValue(value));
        } else {
            this.logManager.logDebug(`EnergyMeter | ${this.deviceData.name} | Unhandled attribute update: ${attribute} = ${value}`);
        }
    }

    // Override cleanup
    async cleanup() {
        this.energyService = null;
        super.cleanup();
    }
}

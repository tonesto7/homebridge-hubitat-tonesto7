// device_types/EnergyMeter.js

import HubitatPlatformAccessory from "../HubitatPlatformAccessory.js";

export default class EnergyMeter extends HubitatPlatformAccessory {
    constructor(platform, accessory) {
        super(platform, accessory);
        this.energyService = null;
    }

    async configureServices() {
        try {
            // We'll use a custom service type for energy measurement
            this.energyService = this.getOrAddService(this.platform.CommunityTypes.KilowattHoursService);
            // this.markServiceForRetention(this.energyService);

            // Configure the kilowatt hours characteristic
            this.getOrAddCharacteristic(this.energyService, this.platform.CommunityTypes.KilowattHours, {
                getHandler: () => this.getEnergyValue(),
            });

            return true;
        } catch (error) {
            this.logError("Error configuring energy meter services:", error);
            throw error;
        }
    }

    getEnergyValue() {
        return Math.round(parseFloat(this.deviceData.attributes.energy) || 0);
    }

    async handleAttributeUpdate(attribute, value) {
        this.updateDeviceAttribute(attribute, value);
        if (attribute === "energy") {
            this.energyService?.getCharacteristic(this.platform.CommunityTypes.KilowattHours).updateValue(Math.round(parseFloat(value) || 0));
        } else {
            this.logDebug(`Unhandled attribute update: ${attribute} = ${value}`);
        }
    }

    // Override cleanup
    async cleanup() {
        this.energyService = null;
        await super.cleanup();
    }
}

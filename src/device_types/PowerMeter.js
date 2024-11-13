// device_types/PowerMeter.js

import HubitatPlatformAccessory from "../HubitatPlatformAccessory.js";

export default class PowerMeter extends HubitatPlatformAccessory {
    constructor(platform, accessory) {
        super(platform, accessory);
        this.powerService = null;
    }

    async configureServices() {
        try {
            // Using a custom service type for power measurement
            this.powerService = this.getOrAddService(this.platform.CommunityTypes.WattService);
            this.markServiceForRetention(this.powerService);

            // Configure the watts characteristic
            this.getOrAddCharacteristic(this.powerService, this.platform.CommunityTypes.Watts, {
                getHandler: () => this.getPowerValue(),
            });

            return true;
        } catch (error) {
            this.logError("Error configuring power meter services:", error);
            throw error;
        }
    }

    getPowerValue() {
        return Math.round(parseFloat(this.deviceData.attributes.power) || 0);
    }

    async handleAttributeUpdate(attribute, value) {
        this.updateDeviceAttribute(attribute, value);

        if (attribute === "power") {
            this.powerService?.getCharacteristic(this.platform.CommunityTypes.Watts).updateValue(Math.round(parseFloat(value) || 0));
        } else {
            this.logDebug(`Unhandled attribute update: ${attribute} = ${value}`);
        }
    }

    // Override cleanup
    async cleanup() {
        this.powerService = null;
        await super.cleanup();
    }
}

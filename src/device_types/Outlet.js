// device_types/Outlet.js

import HubitatPlatformAccessory from "../HubitatPlatformAccessory.js";

export default class Outlet extends HubitatPlatformAccessory {
    constructor(platform, accessory) {
        super(platform, accessory);
        this.outletService = null;
    }

    async configureServices() {
        try {
            this.outletService = this.getOrAddService(this.Service.Outlet);
            this.markServiceForRetention(this.outletService);

            // On/Off State
            this.getOrAddCharacteristic(this.outletService, this.Characteristic.On, {
                getHandler: () => this.getOnState(),
                setHandler: async (value) => this.setOnState(value),
            });

            // Outlet In Use
            this.getOrAddCharacteristic(this.outletService, this.Characteristic.OutletInUse, {
                getHandler: () => this.getInUseState(),
            });

            return true;
        } catch (error) {
            this.logError("Error configuring outlet services:", error);
            throw error;
        }
    }

    getOnState() {
        return this.deviceData.attributes.switch === "on";
    }

    async setOnState(value) {
        await this.sendCommand(value ? "on" : "off");
    }

    getInUseState() {
        return this.deviceData.attributes.switch === "on";
    }

    async handleAttributeUpdate(attribute, value) {
        this.updateDeviceAttribute(attribute, value);

        if (attribute === "switch") {
            const isOn = value === "on";
            this.outletService.getCharacteristic(this.Characteristic.On).updateValue(isOn);
            this.outletService.getCharacteristic(this.Characteristic.OutletInUse).updateValue(isOn);
        } else {
            this.logDebug(`Unhandled attribute update: ${attribute} = ${value}`);
        }
    }

    // Override cleanup
    async cleanup() {
        this.outletService = null;
        await super.cleanup();
    }
}

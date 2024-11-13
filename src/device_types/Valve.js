// device_types/Valve.js

import HubitatPlatformAccessory from "../HubitatPlatformAccessory.js";

export default class Valve extends HubitatPlatformAccessory {
    constructor(platform, accessory) {
        super(platform, accessory);
        this.valveService = null;
    }

    async configureServices() {
        try {
            this.valveService = this.getOrAddService(this.Service.Valve);
            this.markServiceForRetention(this.valveService);

            // Active
            this.getOrAddCharacteristic(this.valveService, this.Characteristic.Active, {
                getHandler: () => this.getActiveState(),
                setHandler: async (value) => this.setActiveState(value),
            });

            // In Use
            this.getOrAddCharacteristic(this.valveService, this.Characteristic.InUse, {
                getHandler: () => this.getInUseState(),
            });

            // Valve Type (defaults to 0 - Generic Valve)
            if (!this.valveService.testCharacteristic(this.Characteristic.ValveType)) {
                this.valveService.setCharacteristic(this.Characteristic.ValveType, 0);
            }

            return true;
        } catch (error) {
            this.logError("Error configuring valve services:", error);
            throw error;
        }
    }

    getActiveState() {
        return this.deviceData.attributes.valve === "open" ? this.Characteristic.Active.ACTIVE : this.Characteristic.Active.INACTIVE;
    }

    async setActiveState(value) {
        await this.sendCommand(value === this.Characteristic.Active.ACTIVE ? "open" : "close");
    }

    getInUseState() {
        return this.deviceData.attributes.valve === "open" ? this.Characteristic.InUse.IN_USE : this.Characteristic.InUse.NOT_IN_USE;
    }

    async handleAttributeUpdate(attribute, value) {
        this.updateDeviceAttribute(attribute, value);

        if (attribute === "valve") {
            const isOpen = value === "open";
            this.valveService.getCharacteristic(this.Characteristic.Active).updateValue(isOpen ? this.Characteristic.Active.ACTIVE : this.Characteristic.Active.INACTIVE);
            this.valveService.getCharacteristic(this.Characteristic.InUse).updateValue(isOpen ? this.Characteristic.InUse.IN_USE : this.Characteristic.InUse.NOT_IN_USE);
        } else {
            this.logDebug(`Unhandled attribute update: ${attribute} = ${value}`);
        }
    }

    // Override cleanup
    async cleanup() {
        this.valveService = null;
        await super.cleanup();
    }
}

// device_types/Lock.js

import HubitatPlatformAccessory from "../HubitatPlatformAccessory.js";

export default class Lock extends HubitatPlatformAccessory {
    constructor(platform, accessory) {
        super(platform, accessory);
        this.lockService = null;
    }

    static relevantAttributes = ["lock"];

    async configureServices() {
        try {
            this.lockService = this.getOrAddService(this.Service.LockMechanism, this.getServiceDisplayName(this.deviceData.name, "Lock"));

            // Lock Current State
            this.getOrAddCharacteristic(this.lockService, this.Characteristic.LockCurrentState, {
                getHandler: () => this.getLockCurrentState(this.deviceData.attributes.lock),
            });

            // Lock Target State
            this.getOrAddCharacteristic(this.lockService, this.Characteristic.LockTargetState, {
                getHandler: () => this.getLockTargetState(this.deviceData.attributes.lock),
                setHandler: async (value) => this.setLockTargetState(value),
            });

            return true;
        } catch (error) {
            this.logError(`Lock | ${this.deviceData.name} | Error configuring services:`, error);
            throw error;
        }
    }

    getLockCurrentState(value) {
        switch (value) {
            case "locked":
                return this.Characteristic.LockCurrentState.SECURED;
            case "unlocked":
                return this.Characteristic.LockCurrentState.UNSECURED;
            default:
                return this.Characteristic.LockCurrentState.UNKNOWN;
        }
    }

    getLockTargetState(value) {
        switch (value) {
            case "locked":
                return this.Characteristic.LockTargetState.SECURED;
            case "unlocked":
                return this.Characteristic.LockTargetState.UNSECURED;
            default:
                return this.Characteristic.LockTargetState.UNSECURED;
        }
    }

    async setLockTargetState(value) {
        await this.sendCommand(value === this.Characteristic.LockTargetState.SECURED ? "lock" : "unlock");
    }

    async handleAttributeUpdate(change) {
        const { attribute, value } = change;

        switch (attribute) {
            case "lock":
                this.lockService.getCharacteristic(this.Characteristic.LockCurrentState).updateValue(this.getLockCurrentState(value));
                this.lockService.getCharacteristic(this.Characteristic.LockTargetState).updateValue(this.getLockTargetState(value));
                break;

            default:
                this.logDebug(`Lock | ${this.deviceData.name} | Unhandled attribute update: ${attribute} = ${value}`);
        }
    }

    // Override cleanup
    async cleanup() {
        this.lockService = null;
        super.cleanup();
    }
}

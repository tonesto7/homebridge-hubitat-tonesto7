// device_types/Lock.js

import HubitatBaseAccessory from "./BaseAccessory.js";

export default class Lock extends HubitatBaseAccessory {
    constructor(platform, accessory) {
        super(platform, accessory);
        this.lockService = null;
    }

    static relevantAttributes = ["lock"];

    async configureServices() {
        try {
            this.lockService = this.getOrAddService(this.Service.LockMechanism, this.cleanServiceDisplayName(this.deviceData.name, "Lock"));

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
            this.logManager.logError(`Lock | ${this.deviceData.name} | Error configuring services:`, error);
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
                this.logManager.logDebug(`Lock | ${this.deviceData.name} | Unhandled attribute update: ${attribute} = ${value}`);
        }
    }

    // Override cleanup
    async cleanup() {
        this.lockService = null;
        super.cleanup();
    }
}

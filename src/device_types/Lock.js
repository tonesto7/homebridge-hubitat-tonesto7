// device_types/Lock.js

import HubitatPlatformAccessory from "../HubitatPlatformAccessory.js";

export default class Lock extends HubitatPlatformAccessory {
    constructor(platform, accessory) {
        super(platform, accessory);
        this.lockService = null;
    }

    async configureServices() {
        try {
            this.lockService = this.getOrAddService(this.Service.LockMechanism);
            // this.markServiceForRetention(this.lockService);

            // Lock Current State
            this.getOrAddCharacteristic(this.lockService, this.Characteristic.LockCurrentState, {
                getHandler: () => this.getLockCurrentState(),
            });

            // Lock Target State
            this.getOrAddCharacteristic(this.lockService, this.Characteristic.LockTargetState, {
                getHandler: () => this.getLockTargetState(),
                setHandler: async (value) => this.setLockTargetState(value),
            });

            return true;
        } catch (error) {
            this.logError("Error configuring lock services:", error);
            throw error;
        }
    }

    getLockCurrentState() {
        switch (this.deviceData.attributes.lock) {
            case "locked":
                return this.Characteristic.LockCurrentState.SECURED;
            case "unlocked":
                return this.Characteristic.LockCurrentState.UNSECURED;
            default:
                return this.Characteristic.LockCurrentState.UNKNOWN;
        }
    }

    getLockTargetState() {
        switch (this.deviceData.attributes.lock) {
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

    async handleAttributeUpdate(attribute, value) {
        this.updateDeviceAttribute(attribute, value);

        if (attribute === "lock") {
            let currentState, targetState;
            switch (value) {
                case "locked":
                    currentState = this.Characteristic.LockCurrentState.SECURED;
                    targetState = this.Characteristic.LockTargetState.SECURED;
                    break;
                case "unlocked":
                    currentState = this.Characteristic.LockCurrentState.UNSECURED;
                    targetState = this.Characteristic.LockTargetState.UNSECURED;
                    break;
                default:
                    currentState = this.Characteristic.LockCurrentState.UNKNOWN;
                    targetState = this.Characteristic.LockTargetState.UNSECURED;
            }

            this.lockService.getCharacteristic(this.Characteristic.LockCurrentState).updateValue(currentState);
            this.lockService.getCharacteristic(this.Characteristic.LockTargetState).updateValue(targetState);
        } else {
            this.logDebug(`Unhandled attribute update: ${attribute} = ${value}`);
        }
    }

    // Override cleanup
    async cleanup() {
        this.lockService = null;
        await super.cleanup();
    }
}

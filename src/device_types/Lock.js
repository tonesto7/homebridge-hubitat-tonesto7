import HubitatAccessory from "../HubitatAccessory.js";

export default class Lock extends HubitatAccessory {
    constructor(platform, accessory) {
        super(platform, accessory);
        this.deviceData = accessory.context.deviceData;
    }

    static relevantAttributes = ["lock"];

    /**
     * Initializes the lock service for the accessory.
     *
     * This method sets up the lock service and its characteristics, including
     * the current lock state and the target lock state. It also adds the lock
     * service to the accessory's device groups.
     *
     * @async
     * @method initializeService
     * @returns {Promise<void>} Resolves when the service has been initialized.
     */
    async initializeService() {
        this.lockSvc = this.getOrAddService(this.Service.LockMechanism);

        this.getOrAddCharacteristic(this.lockSvc, this.Characteristic.LockCurrentState, {
            getHandler: () => {
                const state = this.deviceData.attributes.lock;
                const convertedState = this.convertLockState(state);
                this.log.debug(`${this.accessory.displayName} | Lock Current State: ${state} => ${convertedState}`);
                return convertedState;
            },
        });

        this.getOrAddCharacteristic(this.lockSvc, this.Characteristic.LockTargetState, {
            getHandler: () => {
                const state = this.deviceData.attributes.lock;
                return this.convertLockState(state);
            },
            setHandler: (value) => {
                const command = value === this.Characteristic.LockTargetState.SECURED ? "lock" : "unlock";
                this.log.info(`${this.accessory.displayName} | Setting lock state via command: ${command}`);
                this.sendCommand(null, this.deviceData, command);
            },
        });

        this.accessory.deviceGroups.push("lock");
    }

    /**
     * Handles updates to device attributes and updates the lock service characteristics accordingly.
     *
     * @param {Object} change - The change object containing attribute updates.
     * @param {string} change.attribute - The name of the attribute that has changed.
     * @param {any} change.value - The new value of the attribute.
     */
    handleAttributeUpdate(change) {
        if (!this.lockSvc) {
            this.log.warn(`${this.accessory.displayName} | Lock Mechanism service not found`);
            return;
        }

        if (change.attribute === "lock") {
            const convertedState = this.convertLockState(change.value);
            this.updateCharacteristicValue(this.lockSvc, this.Characteristic.LockCurrentState, convertedState);
            this.updateCharacteristicValue(this.lockSvc, this.Characteristic.LockTargetState, convertedState);
        } else {
            this.log.debug(`${this.accessory.displayName} | Unhandled attribute update: ${change.attribute}`);
        }
    }

    /**
     * Converts a lock state string to the corresponding HomeKit lock state constant.
     *
     * @param {string} state - The lock state as a string. Expected values are "locked" or "unlocked".
     * @returns {number} - The corresponding HomeKit lock state constant. Returns `this.Characteristic.LockCurrentState.SECURED` for "locked",
     *                     `this.Characteristic.LockCurrentState.UNSECURED` for "unlocked", and `this.Characteristic.LockCurrentState.UNKNOWN` for any other value.
     */
    convertLockState(state) {
        switch (state) {
            case "locked":
                return this.Characteristic.LockCurrentState.SECURED;
            case "unlocked":
                return this.Characteristic.LockCurrentState.UNSECURED;
            default:
                return this.Characteristic.LockCurrentState.UNKNOWN;
        }
    }
}

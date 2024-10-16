import HubitatAccessory from "../HubitatAccessory.js";

export default class Lock extends HubitatAccessory {
    constructor(platform, accessory) {
        super(platform, accessory);
        this.deviceData = accessory.context.deviceData;
        this.relevantAttributes = ["lock"];
    }

    static isSupported(accessory) {
        return accessory.hasCapability("Lock");
    }

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
                this.sendCommand(null, this.accessory, this.deviceData, command);
            },
        });

        this.accessory.deviceGroups.push("lock");
    }

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

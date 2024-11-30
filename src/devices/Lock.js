// devices/Lock.js
export class Lock {
    constructor(platform) {
        this.logManager = platform.logManager;
        this.Service = platform.Service;
        this.Characteristic = platform.Characteristic;
    }

    configure(accessory) {
        this.logManager.logDebug(`Configuring Lock for ${accessory.displayName}`);
        const svc = accessory.getOrAddService(this.Service.LockMechanism);
        const devData = accessory.context.deviceData;

        this._configureCurrentState(accessory, svc, devData);
        this._configureTargetState(accessory, svc, devData);

        accessory.context.deviceGroups.push("lock");
        return accessory;
    }

    _configureCurrentState(accessory, svc, devData) {
        accessory.getOrAddCharacteristic(svc, this.Characteristic.LockCurrentState, {
            getHandler: () => this._getLockCurrentState(devData.attributes.lock),
            updateHandler: (value) => this._getLockCurrentState(value),
            storeAttribute: "lock",
        });
    }

    _configureTargetState(accessory, svc, devData) {
        accessory.getOrAddCharacteristic(svc, this.Characteristic.LockTargetState, {
            getHandler: () => (devData.attributes.lock === "locked" ? this.Characteristic.LockTargetState.SECURED : this.Characteristic.LockTargetState.UNSECURED),
            setHandler: (value) => accessory.sendCommand(value === this.Characteristic.LockTargetState.SECURED ? "lock" : "unlock"),
            updateHandler: (value) => (value === "locked" ? this.Characteristic.LockTargetState.SECURED : this.Characteristic.LockTargetState.UNSECURED),
            storeAttribute: "lock",
        });
    }

    _getLockCurrentState(state) {
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

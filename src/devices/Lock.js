// devices/Lock.js
export class Lock {
    constructor(platform) {
        this.logManager = platform.logManager;
        this.Service = platform.Service;
        this.Characteristic = platform.Characteristic;
        this.generateSrvcName = platform.generateSrvcName;
    }

    static relevantAttributes = ["lock"];

    configure(accessory) {
        this.logManager.logDebug(`Configuring Lock for ${accessory.displayName}`);
        const svc = accessory.getOrAddService(this.Service.LockMechanism, accessory.displayName, "lock");
        const devData = accessory.context.deviceData;

        this._configureCurrentState(accessory, svc, devData);
        this._configureTargetState(accessory, svc, devData);

        return accessory;
    }

    _configureCurrentState(accessory, svc, devData) {
        accessory.getOrAddCharacteristic(svc, this.Characteristic.LockCurrentState, {
            getHandler: () => this._getLockCurrentState(devData.attributes.lock),
        });
    }

    _configureTargetState(accessory, svc, devData) {
        accessory.getOrAddCharacteristic(svc, this.Characteristic.LockTargetState, {
            getHandler: () => this._getLockTargetState(devData.attributes.lock),
            setHandler: (value) => accessory.sendCommand(value === this.Characteristic.LockTargetState.SECURED ? "lock" : "unlock"),
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

    _getLockTargetState(state) {
        switch (state) {
            case "locked":
                return this.Characteristic.LockTargetState.SECURED;
            default:
                return this.Characteristic.LockTargetState.UNSECURED;
        }
    }

    // Handle attribute updates
    handleAttributeUpdate(accessory, update) {
        const { attribute, value } = update;
        this.logManager.logDebug(`Lock | ${accessory.displayName} | Attribute update: ${attribute} = ${value}`);
        if (!Lock.relevantAttributes.includes(attribute)) return;

        const svc = accessory.getService(this.Service.LockMechanism, this.generateSrvcName(accessory.displayName, "Lock"));
        if (!svc) return;

        switch (attribute) {
            case "lock":
                svc.getCharacteristic(this.Characteristic.LockCurrentState).updateValue(this._getLockCurrentState(value));
                break;
            default:
                this.logManager.logWarn(`Lock | ${accessory.displayName} | Unhandled attribute update: ${attribute} = ${value}`);
        }
    }
}

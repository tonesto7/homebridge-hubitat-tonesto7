// devices/Valve.js
export class Valve {
    constructor(platform) {
        this.logManager = platform.logManager;
        this.Service = platform.Service;
        this.Characteristic = platform.Characteristic;
    }

    configure(accessory) {
        this.logManager.logDebug(`Configuring Valve for ${accessory.displayName}`);
        const svc = accessory.getOrAddService(this.Service.Valve);
        const devData = accessory.context.deviceData;

        this._configureInUse(accessory, svc, devData);
        this._configureActive(accessory, svc, devData);
        svc.setCharacteristic(this.Characteristic.ValveType, 0);

        accessory.context.deviceGroups.push("valve");
        return accessory;
    }

    _configureInUse(accessory, svc, devData) {
        accessory.getOrAddCharacteristic(svc, this.Characteristic.InUse, {
            getHandler: () => (devData.attributes.valve === "open" ? this.Characteristic.InUse.IN_USE : this.Characteristic.InUse.NOT_IN_USE),
            updateHandler: (value) => (value === "open" ? this.Characteristic.InUse.IN_USE : this.Characteristic.InUse.NOT_IN_USE),
            storeAttribute: "valve",
        });
    }

    _configureActive(accessory, svc, devData) {
        accessory.getOrAddCharacteristic(svc, this.Characteristic.Active, {
            getHandler: () => (devData.attributes.valve === "open" ? this.Characteristic.Active.ACTIVE : this.Characteristic.Active.INACTIVE),
            setHandler: (value) => accessory.sendCommand(value ? "open" : "close"),
            updateHandler: (value) => (value === "open" ? this.Characteristic.Active.ACTIVE : this.Characteristic.Active.INACTIVE),
            storeAttribute: "valve",
        });
    }
}

// devices/Valve.js
export class Valve {
    constructor(platform) {
        this.logManager = platform.logManager;
        this.Service = platform.Service;
        this.Characteristic = platform.Characteristic;
        this.generateSrvcName = platform.generateSrvcName;
    }

    static relevantAttributes = ["valve"];

    configure(accessory) {
        this.logManager.logDebug(`Configuring Valve for ${accessory.displayName}`);
        const svc = accessory.getOrAddService(this.Service.Valve, accessory.displayName, "valve");
        const devData = accessory.context.deviceData;

        this._configureInUse(accessory, svc, devData);
        this._configureActive(accessory, svc, devData);

        // Valve Type (defaults to 0 - Generic Valve)
        svc.setCharacteristic(this.Characteristic.ValveType, 0);

        return accessory;
    }

    _configureInUse(accessory, svc, devData) {
        accessory.getOrAddCharacteristic(svc, this.Characteristic.InUse, {
            getHandler: () => this._getInUseState(devData.attributes.valve),
        });
    }

    _configureActive(accessory, svc, devData) {
        accessory.getOrAddCharacteristic(svc, this.Characteristic.Active, {
            getHandler: () => this._getActiveState(devData.attributes.valve),
            setHandler: (value) => accessory.sendCommand(value ? "open" : "close"),
        });
    }

    _getInUseState(valve) {
        return valve === "open" ? this.Characteristic.InUse.IN_USE : this.Characteristic.InUse.NOT_IN_USE;
    }

    _getActiveState(valve) {
        return valve === "open" ? this.Characteristic.Active.ACTIVE : this.Characteristic.Active.INACTIVE;
    }

    // Handle attribute updates
    handleAttributeUpdate(accessory, update) {
        const { attribute, value } = update;
        this.logManager.logDebug(`Valve | ${accessory.displayName} | Attribute update: ${attribute} = ${value}`);
        if (!Valve.relevantAttributes.includes(attribute)) return;

        const svc = accessory.getService(this.Service.Valve, this.generateSrvcName(accessory.displayName, "Valve"));
        if (!svc) return;

        switch (attribute) {
            case "valve":
                svc.getCharacteristic(this.Characteristic.InUse).updateValue(this._getInUseState(value));
                svc.getCharacteristic(this.Characteristic.Active).updateValue(this._getActiveState(value));
                break;
            default:
                this.logManager.logWarn(`Valve | ${accessory.displayName} | Unhandled attribute update: ${attribute} = ${value}`);
        }
    }
}

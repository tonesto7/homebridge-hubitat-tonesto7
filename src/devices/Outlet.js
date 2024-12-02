// devices/Outlet.js
export class Outlet {
    constructor(platform) {
        this.logManager = platform.logManager;
        this.Service = platform.Service;
        this.Characteristic = platform.Characteristic;
        this.generateSrvcName = platform.generateSrvcName;
    }

    static relevantAttributes = ["switch"];

    configure(accessory) {
        this.logManager.logDebug(`Configuring Outlet for ${accessory.displayName}`);
        const svc = accessory.getOrAddService(this.Service.Outlet, this.generateSrvcName(accessory.displayName, "Outlet"));
        const devData = accessory.context.deviceData;

        accessory.getOrAddCharacteristic(svc, this.Characteristic.On, {
            getHandler: () => this._getOnState(devData.attributes.switch),
            setHandler: (value) => accessory.sendCommand(value ? "on" : "off"),
            updateHandler: (value) => this._getOnState(value),
            storeAttribute: "switch",
        });

        accessory.getOrAddCharacteristic(svc, this.Characteristic.OutletInUse, {
            getHandler: () => this._getInUseState(devData.attributes.switch),
            updateHandler: (value) => this._getInUseState(value),
            storeAttribute: "switch",
        });

        return accessory;
    }

    _getOnState(value) {
        return value === "on";
    }

    _getInUseState(value) {
        return value === "on";
    }

    // Handle attribute updates
    handleAttributeUpdate(accessory, update) {
        const { attribute, value } = update;
        this.logManager.logDebug(`Outlet | ${accessory.displayName} | Attribute update: ${attribute} = ${value}`);
        if (!Outlet.relevantAttributes.includes(attribute)) return;

        const svc = accessory.getService(this.Service.Outlet, this.generateSrvcName(accessory.displayName, "Outlet"));
        if (!svc) return;

        switch (attribute) {
            case "switch":
                svc.getCharacteristic(this.Characteristic.On).updateValue(this._getOnState(value));
                break;
            default:
                this.logManager.logWarn(`Outlet | ${accessory.displayName} | Unhandled attribute update: ${attribute} = ${value}`);
        }
    }
}

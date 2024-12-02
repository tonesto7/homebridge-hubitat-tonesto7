// devices/Switch.js
export class Switch {
    constructor(platform) {
        this.logManager = platform.logManager;
        this.Service = platform.Service;
        this.Characteristic = platform.Characteristic;
        this.generateSrvcName = platform.generateSrvcName;
    }

    static relevantAttributes = ["switch"];

    configure(accessory) {
        this.logManager.logDebug(`Configuring Switch for ${accessory.displayName}`);
        const svcName = this.generateSrvcName(accessory.displayName, "Switch");
        const svc = accessory.getOrAddService(this.Service.Switch);
        svc.setCharacteristic(this.Characteristic.Name, svcName);
        const devData = accessory.context.deviceData;

        this._configureOn(accessory, svc, devData);

        return accessory;
    }

    _configureOn(accessory, svc, devData) {
        accessory.getOrAddCharacteristic(svc, this.Characteristic.On, {
            getHandler: () => this._getOnState(devData.attributes.switch),
            setHandler: (value) => accessory.sendCommand(value ? "on" : "off"),
        });
    }

    _getOnState(value) {
        return value === "on";
    }

    // Handle attribute updates
    handleAttributeUpdate(accessory, update) {
        const { attribute, value } = update;
        this.logManager.logDebug(`Switch | ${accessory.displayName} | Attribute update: ${attribute} = ${value}`);
        if (!Switch.relevantAttributes.includes(attribute)) return;

        const svc = accessory.getService(this.Service.Switch, this.generateSrvcName(accessory.displayName, "Switch"));
        if (!svc) return;

        switch (attribute) {
            case "switch":
                svc.getCharacteristic(this.Characteristic.On).updateValue(this._getOnState(value));
                break;
            default:
                this.logManager.logWarn(`Switch | ${accessory.displayName} | Unhandled attribute update: ${attribute} = ${value}`);
        }
    }
}

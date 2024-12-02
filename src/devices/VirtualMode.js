// devices/VirtualMode.js
export class VirtualMode {
    constructor(platform) {
        this.logManager = platform.logManager;
        this.Service = platform.Service;
        this.Characteristic = platform.Characteristic;
        this.generateSrvcName = platform.generateSrvcName;
    }

    static relevantAttributes = ["switch"];

    configure(accessory) {
        this.logManager.logDebug(`Configuring Virtual Mode for ${accessory.displayName}`);
        const svc = accessory.getOrAddService(this.Service.Switch, this.generateSrvcName(accessory.displayName, "Mode"));
        const devData = accessory.context.deviceData;

        accessory.getOrAddCharacteristic(svc, this.Characteristic.On, {
            getHandler: () => this._getOnState(devData.attributes.switch),
            setHandler: (value) => {
                if (value && !this._getOnState(devData.attributes.switch)) {
                    accessory.sendCommand("mode");
                }
            },
        });

        return accessory;
    }

    _getOnState(value) {
        return value === "on";
    }

    // Handle attribute updates
    handleAttributeUpdate(accessory, update) {
        const { attribute, value } = update;
        this.logManager.logDebug(`VirtualMode | ${accessory.displayName} | Attribute update: ${attribute} = ${value}`);
        if (!VirtualMode.relevantAttributes.includes(attribute)) return;

        const svc = accessory.getService(this.Service.Switch, this.generateSrvcName(accessory.displayName, "Mode"));
        if (!svc) return;

        switch (attribute) {
            case "switch":
                svc.getCharacteristic(this.Characteristic.On).updateValue(this._getOnState(value));
                break;
            default:
                this.logManager.logWarn(`VirtualMode | ${accessory.displayName} | Unhandled attribute update: ${attribute} = ${value}`);
        }
    }
}

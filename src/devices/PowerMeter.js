// devices/PowerMeter.js
export class PowerMeter {
    constructor(platform) {
        this.logManager = platform.logManager;
        this.Service = platform.Service;
        this.Characteristic = platform.Characteristic;
        this.CommunityTypes = platform.CommunityTypes;
        this.generateSrvcName = platform.generateSrvcName;
    }

    static relevantAttributes = ["power"];

    configure(accessory) {
        this.logManager.logDebug(`Configuring Power Meter for ${accessory.displayName}`);
        const svc = accessory.getOrAddService(this.CommunityTypes.WattService, this.generateSrvcName(accessory.displayName, "Power"));
        const devData = accessory.context.deviceData;

        accessory.getOrAddCharacteristic(svc, this.CommunityTypes.Watts, {
            getHandler: () => this._getPowerValue(devData.attributes.power),
        });

        return accessory;
    }

    _getPowerValue(value) {
        return Math.round(parseFloat(value) || 0);
    }

    // Handle attribute updates
    handleAttributeUpdate(accessory, update) {
        const { attribute, value } = update;
        this.logManager.logDebug(`PowerMeter | ${accessory.displayName} | Attribute update: ${attribute} = ${value}`);
        if (!PowerMeter.relevantAttributes.includes(attribute)) return;

        const svc = accessory.getService(this.CommunityTypes.WattService, this.generateSrvcName(accessory.displayName, "Power"));
        if (!svc) return;

        switch (attribute) {
            case "power":
                svc.getCharacteristic(this.CommunityTypes.Watts).updateValue(this._getPowerValue(value));
                break;
            default:
                this.logManager.logWarn(`PowerMeter | ${accessory.displayName} | Unhandled attribute update: ${attribute} = ${value}`);
        }
    }
}

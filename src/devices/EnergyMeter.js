// devices/EnergyMeter.js
export class EnergyMeter {
    constructor(platform) {
        this.logManager = platform.logManager;
        this.Service = platform.Service;
        this.Characteristic = platform.Characteristic;
        this.CommunityTypes = platform.CommunityTypes;
        this.generateSrvcName = platform.generateSrvcName;
    }

    static relevantAttributes = ["energy"];

    configure(accessory) {
        this.logManager.logDebug(`Configuring Energy Meter for ${accessory.displayName}`);
        const svcName = this.generateSrvcName(accessory.displayName, "Energy");
        const svc = accessory.getOrAddService(this.CommunityTypes.KilowattHoursService);
        svc.setCharacteristic(this.Characteristic.Name, svcName);
        const devData = accessory.context.deviceData;

        accessory.getOrAddCharacteristic(svc, this.CommunityTypes.KilowattHours, {
            getHandler: () => this._getEnergyValue(devData.attributes.energy),
        });

        return accessory;
    }

    _getEnergyValue(value) {
        if (!value || isNaN(value) || value < 0) return 0;
        value = parseFloat(value);
        return Math.round(value);
    }

    // Handle attribute updates
    handleAttributeUpdate(accessory, update) {
        const { attribute, value } = update;
        this.logManager.logDebug(`EnergyMeter | ${accessory.displayName} | Attribute update: ${attribute} = ${value}`);
        if (!EnergyMeter.relevantAttributes.includes(attribute)) return;

        const svc = accessory.getService(this.CommunityTypes.KilowattHoursService, this.generateSrvcName(accessory.displayName, "Energy"));
        if (!svc) return;
        switch (attribute) {
            case "energy":
                svc.getCharacteristic(this.CommunityTypes.KilowattHours).updateValue(this._getEnergyValue(value));
                break;
            default:
                this.logManager.logWarn(`EnergyMeter | ${accessory.displayName} | Unhandled attribute update: ${attribute} = ${value}`);
        }
    }
}

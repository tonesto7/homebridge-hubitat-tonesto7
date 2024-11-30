// devices/EnergyMeter.js
export class EnergyMeter {
    constructor(platform) {
        this.logManager = platform.logManager;
        this.Service = platform.Service;
        this.Characteristic = platform.Characteristic;
        this.CommunityTypes = platform.CommunityTypes;
    }

    configure(accessory) {
        this.logManager.logDebug(`Configuring Energy Meter for ${accessory.displayName}`);
        const svc = accessory.getOrAddService(this.CommunityTypes.KilowattHoursService);
        const devData = accessory.context.deviceData;

        accessory.getOrAddCharacteristic(svc, this.CommunityTypes.KilowattHours, {
            getHandler: () => parseFloat(devData.attributes.energy),
            updateHandler: (value) => parseFloat(value),
            storeAttribute: "energy",
        });

        accessory.context.deviceGroups.push("energy_meter");
        return accessory;
    }
}

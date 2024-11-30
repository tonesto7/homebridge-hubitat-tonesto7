// devices/PowerMeter.js
export class PowerMeter {
    constructor(platform) {
        this.logManager = platform.logManager;
        this.Service = platform.Service;
        this.Characteristic = platform.Characteristic;
        this.CommunityTypes = platform.CommunityTypes;
    }

    configure(accessory) {
        this.logManager.logDebug(`Configuring Power Meter for ${accessory.displayName}`);
        const svc = accessory.getOrAddService(this.CommunityTypes.WattService);
        const devData = accessory.context.deviceData;

        accessory.getOrAddCharacteristic(svc, this.CommunityTypes.Watts, {
            getHandler: () => parseFloat(devData.attributes.power),
            updateHandler: (value) => parseFloat(value),
            storeAttribute: "power",
        });

        accessory.context.deviceGroups.push("power_meter");
        return accessory;
    }
}

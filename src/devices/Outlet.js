// devices/Outlet.js
export class Outlet {
    constructor(platform) {
        this.logManager = platform.logManager;
        this.Service = platform.Service;
        this.Characteristic = platform.Characteristic;
    }

    configure(accessory) {
        this.logManager.logDebug(`Configuring Outlet for ${accessory.displayName}`);
        const svc = accessory.getOrAddService(this.Service.Outlet);
        const devData = accessory.context.deviceData;

        accessory.getOrAddCharacteristic(svc, this.Characteristic.On, {
            getHandler: () => devData.attributes.switch === "on",
            setHandler: (value) => accessory.sendCommand(value ? "on" : "off"),
            updateHandler: (value) => value === "on",
            storeAttribute: "switch",
        });

        accessory.getOrAddCharacteristic(svc, this.Characteristic.OutletInUse, {
            getHandler: () => devData.attributes.switch === "on",
            updateHandler: (value) => value === "on",
            storeAttribute: "switch",
        });

        accessory.context.deviceGroups.push("outlet");
        return accessory;
    }
}

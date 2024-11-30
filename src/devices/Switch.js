// devices/Switch.js
export class Switch {
    constructor(platform) {
        this.logManager = platform.logManager;
        this.Service = platform.Service;
        this.Characteristic = platform.Characteristic;
    }

    configure(accessory) {
        this.logManager.logDebug(`Configuring Switch for ${accessory.displayName}`);
        const svc = accessory.getOrAddService(this.Service.Switch);
        const devData = accessory.context.deviceData;

        accessory.getOrAddCharacteristic(svc, this.Characteristic.On, {
            getHandler: () => devData.attributes.switch === "on",
            setHandler: (value) => accessory.sendCommand(value ? "on" : "off"),
            updateHandler: (value) => value === "on",
            storeAttribute: "switch",
        });

        accessory.context.deviceGroups.push("switch");
        return accessory;
    }
}

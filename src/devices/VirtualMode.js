// devices/VirtualMode.js
export class VirtualMode {
    constructor(platform) {
        this.logManager = platform.logManager;
        this.Service = platform.Service;
        this.Characteristic = platform.Characteristic;
    }

    configure(accessory) {
        this.logManager.logDebug(`Configuring Virtual Mode for ${accessory.displayName}`);
        const svc = accessory.getOrAddService(this.Service.Switch);
        const devData = accessory.context.deviceData;

        accessory.getOrAddCharacteristic(svc, this.Characteristic.On, {
            getHandler: () => devData.attributes.switch === "on",
            setHandler: (value) => {
                if (value && devData.attributes.switch === "off") {
                    accessory.sendCommand("mode");
                }
            },
            updateHandler: (value) => value === "on",
            storeAttribute: "switch",
        });

        accessory.context.deviceGroups.push("virtual_mode");
        return accessory;
    }
}

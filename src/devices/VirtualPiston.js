// devices/VirtualPiston.js
export class VirtualPiston {
    constructor(platform) {
        this.logManager = platform.logManager;
        this.Service = platform.Service;
        this.Characteristic = platform.Characteristic;
    }

    configure(accessory) {
        this.logManager.logDebug(`Configuring Virtual Piston for ${accessory.displayName}`);
        const svc = accessory.getOrAddService(this.Service.Switch);
        const devData = accessory.context.deviceData;

        accessory.getOrAddCharacteristic(svc, this.Characteristic.On, {
            getHandler: () => false,
            setHandler: (value) => {
                if (value) {
                    accessory.sendCommand("piston");
                    setTimeout(() => {
                        devData.attributes.switch = "off";
                        svc.getCharacteristic(this.Characteristic.On).updateValue(false);
                    }, 1000);
                }
            },
            storeAttribute: "switch",
        });

        accessory.context.deviceGroups.push("virtual_piston");
        return accessory;
    }
}

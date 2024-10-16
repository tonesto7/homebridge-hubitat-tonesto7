import HubitatAccessory from "../HubitatAccessory.js";

export default class VirtualMode extends HubitatAccessory {
    constructor(platform, accessory) {
        super(platform, accessory);
        this.deviceData = accessory.context.deviceData;
        this.relevantAttributes = ["switch"];
    }

    static isSupported(accessory) {
        return accessory.hasCapability("Mode");
    }

    async initializeService() {
        this.switchSvc = this.getOrAddService(this.Service.Switch);

        this.addServiceToKeep(this.switchSvc);

        this.getOrAddCharacteristic(this.switchSvc, this.Characteristic.On, {
            getHandler: () => {
                const isOn = this.deviceData.attributes.switch === "on";
                this.log.debug(`${this.accessory.displayName} | Virtual Mode State Retrieved: ${isOn ? "ON" : "OFF"}`);
                return isOn;
            },
            setHandler: (value) => {
                if (value && this.deviceData.attributes.switch === "off") {
                    this.log.info(`${this.accessory.displayName} | Activating Virtual Mode`);
                    this.sendCommand(null, this.accessory, this.deviceData, "mode");
                }
            },
        });

        this.accessory.deviceGroups.push("virtual_mode");
    }

    handleAttributeUpdate(change) {
        if (!this.switchSvc) {
            this.log.warn(`${this.accessory.displayName} | Virtual Mode service not found`);
            return;
        }

        if (change.attribute === "switch") {
            const isOn = change.value === "on";
            this.updateCharacteristicValue(this.switchSvc, this.Characteristic.On, isOn);
        } else {
            this.log.debug(`${this.accessory.displayName} | Unhandled attribute update: ${change.attribute}`);
        }
    }
}

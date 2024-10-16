import HubitatAccessory from "../HubitatAccessory.js";

export default class VirtualPiston extends HubitatAccessory {
    constructor(platform, accessory) {
        super(platform, accessory);
        this.deviceData = accessory.context.deviceData;
        this.relevantAttributes = ["switch"];
    }

    static isSupported(accessory) {
        return accessory.hasCapability("Piston");
    }

    async initializeService() {
        this.switchSvc = this.getOrAddService(this.Service.Switch);

        this.addServiceToKeep(this.switchSvc);

        this.getOrAddCharacteristic(this.switchSvc, this.Characteristic.On, {
            getHandler: () => {
                const isOn = this.deviceData.attributes.switch === "on";
                this.log.debug(`${this.accessory.displayName} | Virtual Piston State Retrieved: ${isOn ? "ON" : "OFF"}`);
                return isOn;
            },
            setHandler: (value) => {
                if (value) {
                    this.log.info(`${this.accessory.displayName} | Activating Virtual Piston`);
                    this.sendCommand(null, this.accessory, this.deviceData, "piston");
                    setTimeout(() => {
                        this.deviceData.attributes.switch = "off";
                        this.updateCharacteristicValue(this.switchSvc, this.Characteristic.On, false);
                        this.log.debug(`${this.accessory.displayName} | Virtual Piston deactivated after trigger`);
                    }, 1000); // Adjust timeout as needed based on piston action duration
                }
            },
        });

        this.accessory.deviceGroups.push("virtual_piston");
    }

    handleAttributeUpdate(change) {
        if (!this.switchSvc) {
            this.log.warn(`${this.accessory.displayName} | Virtual Piston service not found`);
            return;
        }

        switch (change.attribute) {
            case "switch":
                const isOn = change.value === "on";
                this.updateCharacteristicValue(this.switchSvc, this.Characteristic.On, isOn);
                break;
            case "status":
                const isActive = change.value === "online";
                this.updateCharacteristicValue(this.switchSvc, this.Characteristic.StatusActive, isActive);
                break;
            default:
                this.log.debug(`${this.accessory.displayName} | Unhandled attribute update: ${change.attribute}`);
        }
    }
}

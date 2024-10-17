import HubitatAccessory from "../HubitatAccessory.js";

export default class Switch extends HubitatAccessory {
    constructor(platform, accessory) {
        super(platform, accessory);
        this.deviceData = accessory.context.deviceData;
    }

    static relevantAttributes = ["switch"];

    async initializeService() {
        this.switchSvc = this.getOrAddService(this.Service.Switch);

        this.getOrAddCharacteristic(this.switchSvc, this.Characteristic.On, {
            getHandler: () => {
                const isOn = this.deviceData.attributes.switch === "on";
                this.log.debug(`${this.accessory.displayName} | Switch State Retrieved: ${isOn ? "ON" : "OFF"}`);
                return isOn;
            },
            setHandler: (value) => {
                const command = value ? "on" : "off";
                this.log.info(`${this.accessory.displayName} | Setting switch state to ${command}`);
                this.sendCommand(null, this.deviceData, command);
            },
        });

        this.accessory.deviceGroups.push("switch");
    }

    handleAttributeUpdate(change) {
        if (!this.switchSvc) {
            this.log.warn(`${this.accessory.displayName} | Switch service not found`);
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

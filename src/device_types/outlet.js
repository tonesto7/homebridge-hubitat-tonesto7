import HubitatAccessory from "../HubitatAccessory.js";

export default class Outlet extends HubitatAccessory {
    constructor(platform, accessory) {
        super(platform, accessory);
        this.deviceData = accessory.context.deviceData;
        this.relevantAttributes = ["switch"];
    }

    static isSupported(accessory) {
        return accessory.hasCapability("Outlet") && accessory.hasCapability("Switch");
    }

    initializeService() {
        this.outletSvc = this.getOrAddService(this.Service.Outlet);

        this.getOrAddCharacteristic(this.outletSvc, this.Characteristic.On, {
            getHandler: () => {
                const isOn = this.deviceData.attributes.switch === "on";
                this.log.debug(`${this.accessory.displayName} | Outlet State Retrieved: ${isOn ? "ON" : "OFF"}`);
                return isOn;
            },
            setHandler: (value) => {
                const command = value ? "on" : "off";
                this.log.info(`${this.accessory.displayName} | Setting outlet state to ${command}`);
                this.sendCommand(null, this.accessory, this.deviceData, command);
            },
        });

        this.getOrAddCharacteristic(this.outletSvc, this.Characteristic.OutletInUse, {
            getHandler: () => {
                const inUse = this.deviceData.attributes.switch === "on";
                this.log.debug(`${this.accessory.displayName} | Outlet In Use Retrieved: ${inUse}`);
                return inUse;
            },
        });

        this.accessory.context.deviceGroups.push("outlet");
    }

    handleAttributeUpdate(change) {
        if (!this.outletSvc) {
            this.log.warn(`${this.accessory.displayName} | Outlet service not found`);
            return;
        }

        if (change.attribute === "switch") {
            const isOn = change.value === "on";
            this.updateCharacteristicValue(this.outletSvc, this.Characteristic.On, isOn);
            this.updateCharacteristicValue(this.outletSvc, this.Characteristic.OutletInUse, isOn);
        } else {
            this.log.debug(`${this.accessory.displayName} | Unhandled attribute update: ${change.attribute}`);
        }
    }
}

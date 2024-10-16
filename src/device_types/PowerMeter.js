import HubitatAccessory from "../HubitatAccessory.js";

export default class PowerMeter extends HubitatAccessory {
    constructor(platform, accessory) {
        super(platform, accessory);
        this.deviceData = accessory.context.deviceData;
        this.relevantAttributes = ["power"];
    }

    static isSupported(accessory) {
        return accessory.hasCapability("PowerMeter") && !accessory.hasCapability("Switch");
    }

    async initializeService() {
        const serviceName = `${this.deviceData.deviceid}_PowerMeter`;
        this.powerSvc = this.accessory.getServiceByName(this.Service.Switch, serviceName) || this.accessory.addService(this.Service.Switch, serviceName, "Power Meter");

        this.addServiceToKeep(this.powerSvc);

        if (this.CommunityTypes && this.CommunityTypes.Watts) {
            this.getOrAddCharacteristic(this.powerSvc, this.CommunityTypes.Watts, {
                getHandler: () => {
                    let power = parseFloat(this.deviceData.attributes.power);
                    power = this.clamp(power, 0, 100000);
                    this.log.debug(`${this.accessory.displayName} | Power Consumption Retrieved: ${power} Watts`);
                    return typeof power === "number" ? Math.round(power) : 0;
                },
            });
        } else {
            this.log.warn(`${this.accessory.displayName} | CommunityTypes.Watts not defined. Skipping Watts characteristic.`);
        }

        this.accessory.deviceGroups.push("power_meter");
    }

    handleAttributeUpdate(change) {
        if (!this.powerSvc) {
            this.log.warn(`${this.accessory.displayName} | Power Meter service not found`);
            return;
        }

        if (change.attribute === "power" && this.CommunityTypes && this.CommunityTypes.Watts) {
            const power = this.clamp(parseFloat(change.value), 0, 100000);
            this.updateCharacteristicValue(this.powerSvc, this.CommunityTypes.Watts, Math.round(power));
        } else {
            this.log.debug(`${this.accessory.displayName} | Unhandled attribute update: ${change.attribute}`);
        }
    }
}

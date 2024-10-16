import HubitatAccessory from "../HubitatAccessory.js";

export default class EnergyMeter extends HubitatAccessory {
    constructor(platform, accessory) {
        super(platform, accessory);
        this.deviceData = accessory.context.deviceData;
        this.relevantAttributes = ["energy"];
    }

    static isSupported(accessory) {
        return accessory.hasCapability("Energy Meter") && !accessory.hasCapability("Switch");
    }

    initializeService() {
        const serviceName = `${this.deviceData.deviceid}_EnergyMeter`;
        this.energySvc = this.accessory.getServiceByName(this.Service.Switch, serviceName) || this.accessory.addService(this.Service.Switch, serviceName, "Energy Meter");

        this.addServiceToKeep(this.energySvc);

        // Kilowatt Hours Characteristic
        if (this.CommunityTypes.KilowattHours) {
            this.getOrAddCharacteristic(this.energySvc, this.CommunityTypes.KilowattHours, {
                getHandler: () => {
                    const energy = this.clamp(this.deviceData.attributes.energy, 0, 100000);
                    this.log.debug(`${this.accessory.displayName} | Energy Consumption: ${energy} kWh`);
                    return typeof energy === "number" ? Math.round(energy) : 0;
                },
            });
        } else {
            this.log.warn(`${this.accessory.displayName} | CommunityTypes.KilowattHours not defined. Skipping KilowattHours characteristic.`);
        }

        this.accessory.context.deviceGroups.push("energy_meter");
    }

    handleAttributeUpdate(change) {
        if (!this.energySvc) {
            this.log.warn(`${this.accessory.displayName} | Energy Meter service not found`);
            return;
        }

        if (change.attribute === "energy" && this.CommunityTypes && this.CommunityTypes.KilowattHours) {
            const energy = this.clamp(parseFloat(change.value), 0, 100000);
            this.updateCharacteristicValue(this.energySvc, this.CommunityTypes.KilowattHours, Math.round(energy));
        } else {
            this.log.debug(`${this.accessory.displayName} | Unhandled attribute update: ${change.attribute}`);
        }
    }
}

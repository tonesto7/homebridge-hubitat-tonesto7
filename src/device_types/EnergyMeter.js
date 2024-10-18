import HubitatAccessory from "../HubitatAccessory.js";

export default class EnergyMeter extends HubitatAccessory {
    constructor(platform, accessory) {
        super(platform, accessory);
        this.deviceData = accessory.context.deviceData;
    }

    static relevantAttributes = ["energy"];

    /**
     * Initializes the energy meter service for the accessory.
     *
     * This method sets up the energy meter service, adds it to the accessory, and
     * configures the Kilowatt Hours characteristic if available. It also ensures
     * the service is kept and logs relevant information.
     *
     * @async
     * @method initializeService
     * @returns {Promise<void>} A promise that resolves when the service is initialized.
     */
    async initializeService() {
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

        this.accessory.deviceGroups.push("energy_meter");
    }

    /**
     * Handles the update of an attribute for the energy meter.
     *
     * @param {Object} change - The change object containing attribute and value.
     * @param {string} change.attribute - The name of the attribute that has changed.
     * @param {string|number} change.value - The new value of the attribute.
     *
     * @returns {void}
     */
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

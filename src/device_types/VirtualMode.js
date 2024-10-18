import HubitatAccessory from "../HubitatAccessory.js";

export default class VirtualMode extends HubitatAccessory {
    constructor(platform, accessory) {
        super(platform, accessory);
        this.deviceData = accessory.context.deviceData;
    }

    static relevantAttributes = ["switch"];

    /**
     * Initializes the virtual mode service for the accessory.
     *
     * This method sets up the switch service and its characteristics, including
     * handlers for getting and setting the switch state. It also adds the service
     * to the list of services to keep and assigns the accessory to the "virtual_mode"
     * device group.
     *
     * @async
     * @function initializeService
     * @returns {Promise<void>} A promise that resolves when the service is initialized.
     */
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
                    this.sendCommand(null, this.deviceData, "mode");
                }
            },
        });

        this.accessory.deviceGroups.push("virtual_mode");
    }

    /**
     * Handles the attribute update for the virtual mode.
     *
     * @param {Object} change - The change object containing attribute and value.
     * @param {string} change.attribute - The name of the attribute that has changed.
     * @param {string} change.value - The new value of the attribute.
     */
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

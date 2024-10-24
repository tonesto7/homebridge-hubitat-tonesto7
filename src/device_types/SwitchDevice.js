import HubitatAccessory from "../HubitatAccessory.js";

export default class Switch extends HubitatAccessory {
    constructor(platform, accessory) {
        super(platform, accessory);
        this.deviceData = accessory.context.deviceData;
    }

    static relevantAttributes = ["switch"];

    /**
     * Initializes the switch service for the accessory.
     *
     * This method sets up the switch service and its characteristics, including handlers for getting and setting the switch state.
     * It also adds the switch to the accessory's device groups.
     *
     * @async
     * @function
     * @returns {Promise<void>} A promise that resolves when the service is initialized.
     */
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

    /**
     * Handles updates to device attributes and updates the corresponding HomeKit characteristic.
     *
     * @param {Object} change - The change object containing attribute updates.
     * @param {string} change.attribute - The name of the attribute that has changed.
     * @param {string} change.value - The new value of the attribute.
     */
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

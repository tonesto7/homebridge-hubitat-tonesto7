import HubitatAccessory from "../HubitatAccessory.js";

export default class Outlet extends HubitatAccessory {
    constructor(platform, accessory) {
        super(platform, accessory);
        this.deviceData = accessory.context.deviceData;
    }

    static relevantAttributes = ["switch"];

    /**
     * Initializes the outlet service for the accessory.
     *
     * This method sets up the outlet service and its characteristics, including:
     * - `On` characteristic: Handles getting and setting the outlet's on/off state.
     * - `OutletInUse` characteristic: Handles getting the outlet's in-use state.
     *
     * The method also adds the outlet to the accessory's device groups.
     *
     * @async
     * @function initializeService
     * @returns {Promise<void>} A promise that resolves when the service is initialized.
     */
    async initializeService() {
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
                this.sendCommand(null, this.deviceData, command);
            },
        });

        this.getOrAddCharacteristic(this.outletSvc, this.Characteristic.OutletInUse, {
            getHandler: () => {
                const inUse = this.deviceData.attributes.switch === "on";
                this.log.debug(`${this.accessory.displayName} | Outlet In Use Retrieved: ${inUse}`);
                return inUse;
            },
        });

        this.accessory.deviceGroups.push("outlet");
    }

    /**
     * Handles updates to device attributes and updates the corresponding characteristics.
     *
     * @param {Object} change - The change object containing attribute updates.
     * @param {string} change.attribute - The name of the attribute that has changed.
     * @param {string} change.value - The new value of the attribute.
     */
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

import HubitatAccessory from "../HubitatAccessory.js";

export default class FilterMaintenance extends HubitatAccessory {
    constructor(platform, accessory) {
        super(platform, accessory);
        this.deviceData = accessory.context.deviceData;
    }

    static relevantAttributes = ["filterStatus"];

    /**
     * Initializes the filter maintenance service for the accessory.
     *
     * This method sets up the FilterMaintenance service and its characteristics.
     * It adds a characteristic for FilterChangeIndication with a handler to retrieve
     * the filter status and logs the status.
     *
     * @async
     * @method initializeService
     * @returns {Promise<void>} Resolves when the service is initialized.
     */
    async initializeService() {
        this.filterSvc = this.getOrAddService(this.Service.FilterMaintenance);

        this.getOrAddCharacteristic(this.filterSvc, this.Characteristic.FilterChangeIndication, {
            getHandler: () => {
                const doReplace = this.deviceData.attributes.switch === "replace";
                this.log.debug(`${this.accessory.displayName} | FilterChangeIndication Retrieved: ${doReplace ? "REPLACE" : "OFF"}`);
                return this.getFilterStatus(this.deviceData.attributes.filterStatus);
            },
        });

        this.accessory.deviceGroups.push("filter_maintenance");
    }

    /**
     * Handles updates to device attributes and updates the FilterMaintenance service accordingly.
     *
     * @param {Object} change - The change object containing attribute updates.
     * @param {string} change.attribute - The name of the attribute that has changed.
     * @param {*} change.value - The new value of the attribute.
     *
     * @returns {void}
     */
    handleAttributeUpdate(change) {
        if (!this.filterSvc) {
            this.log.warn(`${this.accessory.displayName} | FilterMaintenance service not found`);
            return;
        }

        if (change.attribute === "filterStatus") {
            this.updateCharacteristicValue(this.filterSvc, this.Characteristic.FilterChangeIndication, this.getFilterStatus(change.value));
        } else {
            this.log.debug(`${this.accessory.displayName} | Unhandled attribute update: ${change.attribute}`);
        }
    }

    /**
     * Determines the filter status indication based on the provided filter status.
     *
     * @param {string} filterStatus - The current status of the filter. Expected values are "replace" or any other string indicating the filter is okay.
     * @returns {number} - Returns `this.Characteristic.FilterChangeIndication.CHANGE_FILTER` if the filter status is "replace", otherwise returns `this.Characteristic.FilterChangeIndication.FILTER_OK`.
     */
    getFilterStatus(filterStatus) {
        return filterStatus === "replace" ? this.Characteristic.FilterChangeIndication.CHANGE_FILTER : this.Characteristic.FilterChangeIndication.FILTER_OK;
    }
}

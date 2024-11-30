// device_types/FilterMaintenance.js

import HubitatBaseAccessory from "./BaseAccessory.js";

export default class FilterMaintenance extends HubitatBaseAccessory {
    constructor(platform, accessory) {
        super(platform, accessory);
        this.filterMaintenanceService = null;
    }

    static relevantAttributes = ["filterStatus"];

    async configureServices() {
        try {
            this.filterMaintenanceService = this.getOrAddService(this.Service.FilterMaintenance, this.cleanServiceDisplayName(this.deviceData.name, "Filter"));

            // Filter Change Indicator
            this.getOrAddCharacteristic(this.filterMaintenanceService, this.Characteristic.FilterChangeIndication, {
                getHandler: () => this.getReplaceFilterIndicator(this.deviceData.attributes.filterStatus),
            });

            // Filter Life Level (optional but helps with status reporting)
            this.getOrAddCharacteristic(this.filterMaintenanceService, this.Characteristic.FilterLifeLevel, {
                getHandler: () => this.getFilterLifeLevel(this.deviceData.attributes.filterStatus),
            });

            return true;
        } catch (error) {
            this.logManager.logError(`FilterMaintenance | ${this.deviceData.name} | Error configuring services:`, error);
            throw error;
        }
    }

    getFilterLifeLevel(status) {
        if (!status) return 100;
        return status === "replace" ? 0 : 100;
    }

    getReplaceFilterIndicator(status) {
        if (!status) return this.Characteristic.FilterChangeIndication.FILTER_OK;
        return status === "replace" ? this.Characteristic.FilterChangeIndication.CHANGE_FILTER : this.Characteristic.FilterChangeIndication.FILTER_OK;
    }

    async handleAttributeUpdate(change) {
        const { attribute, value } = change;

        switch (attribute) {
            case "filterStatus":
                this.filterMaintenanceService.getCharacteristic(this.Characteristic.FilterChangeIndication).updateValue(this.getReplaceFilterIndicator(value));
                this.filterMaintenanceService.getCharacteristic(this.Characteristic.FilterLifeLevel).updateValue(this.getFilterLifeLevel(value));

                break;

            default:
                this.logManager.logDebug(`FilterMaintenance | ${this.deviceData.name} | Unhandled attribute update: ${attribute} = ${value}`);
        }
    }

    async cleanup() {
        this.filterMaintenanceService = null;
        super.cleanup();
    }
}

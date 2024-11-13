// device_types/FilterMaintenance.js

import HubitatPlatformAccessory from "../HubitatPlatformAccessory.js";

export default class FilterMaintenance extends HubitatPlatformAccessory {
    constructor(platform, accessory) {
        super(platform, accessory);
        this.filterMaintenanceService = null;
    }

    async configureServices() {
        try {
            this.filterMaintenanceService = this.getOrAddService(this.Service.FilterMaintenance);
            this.markServiceForRetention(this.filterMaintenanceService);

            // Filter Change Indicator
            this.getOrAddCharacteristic(this.filterMaintenanceService, this.Characteristic.FilterChangeIndicator, {
                getHandler: () => this.getFilterChangeIndicator(),
            });

            return true;
        } catch (error) {
            this.logError("Error configuring filter maintenance services:", error);
            throw error;
        }
    }

    getFilterChangeIndicator() {
        return this.deviceData.attributes.filterStatus === "replace" ? this.Characteristic.FilterChangeIndicator.FILTER_CHANGE_INDICATOR_NEEDS_SERVICE : this.Characteristic.FilterChangeIndicator.FILTER_CHANGE_INDICATOR_OK;
    }

    async handleAttributeUpdate(attribute, value) {
        if (attribute === "filterStatus") {
            this.updateDeviceAttribute(attribute, value);
            this.filterMaintenanceService.getCharacteristic(this.Characteristic.FilterChangeIndicator).updateValue(this.getFilterChangeIndicator());
        }
    }

    // Override cleanup
    async cleanup() {
        this.filterMaintenanceService = null;
        await super.cleanup();
    }
}

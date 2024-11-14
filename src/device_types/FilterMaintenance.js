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

            // Filter Change Indicator
            this.getOrAddCharacteristic(this.filterMaintenanceService, this.Characteristic.FilterChangeIndication, {
                getHandler: () => {
                    const status = this.getFilterChangeIndicator();
                    return status !== undefined ? status : this.Characteristic.FilterChangeIndication.FILTER_OK;
                },
            });

            // Filter Life Level (optional but helps with status reporting)
            this.getOrAddCharacteristic(this.filterMaintenanceService, this.Characteristic.FilterLifeLevel, {
                getHandler: () => {
                    return this.deviceData.attributes.filterStatus === "replace" ? 0 : 100;
                },
            });

            return true;
        } catch (error) {
            this.logError("Error configuring filter maintenance services:", error);
            throw error;
        }
    }

    getFilterChangeIndicator() {
        const status = this.deviceData.attributes.filterStatus;
        if (!status) return undefined;

        return status === "replace" ? this.Characteristic.FilterChangeIndication.CHANGE_FILTER : this.Characteristic.FilterChangeIndication.FILTER_OK;
    }

    async handleAttributeUpdate(attribute, value) {
        if (attribute === "filterStatus") {
            this.updateDeviceAttribute(attribute, value);

            // Update both characteristics
            const changeIndication = this.getFilterChangeIndicator();
            if (changeIndication !== undefined) {
                this.filterMaintenanceService.getCharacteristic(this.Characteristic.FilterChangeIndication).updateValue(changeIndication);

                this.filterMaintenanceService.getCharacteristic(this.Characteristic.FilterLifeLevel).updateValue(value === "replace" ? 0 : 100);
            }
        }
    }

    async cleanup() {
        this.filterMaintenanceService = null;
        super.cleanup();
    }
}

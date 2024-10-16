import HubitatAccessory from "../HubitatAccessory.js";

export default class FilterMaintenance extends HubitatAccessory {
    constructor(platform, accessory) {
        super(platform, accessory);
        this.deviceData = accessory.context.deviceData;
        this.relevantAttributes = ["filterStatus"];
    }

    static isSupported(accessory) {
        return accessory.hasCapability("FilterStatus") && accessory.hasAttribute("filterStatus");
    }

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

    getFilterStatus(filterStatus) {
        return filterStatus === "replace" ? this.Characteristic.FilterChangeIndication.CHANGE_FILTER : this.Characteristic.FilterChangeIndication.FILTER_OK;
    }
}

// devices/FilterMaintenance.js
export class FilterMaintenance {
    constructor(platform) {
        this.logManager = platform.logManager;
        this.Service = platform.Service;
        this.Characteristic = platform.Characteristic;
    }

    configure(accessory) {
        this.logManager.logDebug(`Configuring Filter Maintenance for ${accessory.displayName}`);
        const svc = accessory.getOrAddService(this.Service.FilterMaintenance);
        const devData = accessory.context.deviceData;

        this._configureFilterChange(accessory, svc, devData);
        this._configureFilterLife(accessory, svc, devData);

        accessory.context.deviceGroups.push("filter_maintenance");
        return accessory;
    }

    _configureFilterChange(accessory, svc, devData) {
        accessory.getOrAddCharacteristic(svc, this.Characteristic.FilterChangeIndication, {
            getHandler: () => (devData.attributes.filterStatus === "replace" ? this.Characteristic.FilterChangeIndication.CHANGE_FILTER : this.Characteristic.FilterChangeIndication.FILTER_OK),
            updateHandler: (value) => (value === "replace" ? this.Characteristic.FilterChangeIndication.CHANGE_FILTER : this.Characteristic.FilterChangeIndication.FILTER_OK),
            storeAttribute: "filterStatus",
        });
    }

    _configureFilterLife(accessory, svc, devData) {
        accessory.getOrAddCharacteristic(svc, this.Characteristic.FilterLifeLevel, {
            getHandler: () => (devData.attributes.filterStatus === "replace" ? 0 : 100),
            updateHandler: (value) => (value === "replace" ? 0 : 100),
            storeAttribute: "filterStatus",
        });
    }
}

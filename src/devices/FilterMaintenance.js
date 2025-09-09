// devices/FilterMaintenance.js
export class FilterMaintenance {
  constructor(platform) {
    this.logManager = platform.logManager;
    this.Service = platform.Service;
    this.Characteristic = platform.Characteristic;
    this.generateSrvcName = platform.generateSrvcName;
  }

  static relevantAttributes = ["filterStatus"];

  configure(accessory) {
    this.logManager.logDebug(
      `Configuring Filter Maintenance for ${accessory.displayName}`,
    );
    const svc = accessory.getOrAddService(
      this.Service.FilterMaintenance,
      accessory.displayName,
      "filter",
    );
    const devData = accessory.context.deviceData;

    this._configureFilterChange(accessory, svc, devData);
    this._configureFilterLife(accessory, svc, devData);

    return accessory;
  }

  _configureFilterChange(accessory, svc, devData) {
    accessory.getOrAddCharacteristic(
      svc,
      this.Characteristic.FilterChangeIndication,
      {
        getHandler: () =>
          this._getFilterChangeIndication(devData.attributes.filterStatus),
      },
    );
  }

  _configureFilterLife(accessory, svc, devData) {
    accessory.getOrAddCharacteristic(svc, this.Characteristic.FilterLifeLevel, {
      getHandler: () =>
        this._getFilterLifeLevel(devData.attributes.filterStatus),
    });
  }

  _getFilterChangeIndication(value) {
    return value === "replace"
      ? this.Characteristic.FilterChangeIndication.CHANGE_FILTER
      : this.Characteristic.FilterChangeIndication.FILTER_OK;
  }

  _getFilterLifeLevel(value) {
    if (!value) return 100;
    return value === "replace" ? 0 : 100;
  }

  // Handle attribute updates
  handleAttributeUpdate(accessory, update) {
    const { attribute, value } = update;
    this.logManager.logDebug(
      `FilterMaintenance | ${accessory.displayName} | Attribute update: ${attribute} = ${value}`,
    );
    if (!FilterMaintenance.relevantAttributes.includes(attribute)) return;

    const svc = accessory.getService(
      this.Service.FilterMaintenance,
      this.generateSrvcName(accessory.displayName, "Filter"),
    );
    if (!svc) return;

    switch (attribute) {
      case "filterStatus":
        svc
          .getCharacteristic(this.Characteristic.FilterChangeIndication)
          .updateValue(this._getFilterChangeIndication(value));
        break;
      default:
        this.logManager.logWarn(
          `FilterMaintenance | ${accessory.displayName} | Unhandled attribute update: ${attribute} = ${value}`,
        );
    }
  }
}

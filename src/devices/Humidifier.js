// devices/Humidifier.js
export class Humidifier {
  constructor(platform) {
    this.logManager = platform.logManager;
    this.Service = platform.Service;
    this.Characteristic = platform.Characteristic;
  }

  configure(accessory) {
    this.logManager.logDebug(
      `Configuring Humidifier for ${accessory.displayName}`,
    );
    const svc = accessory.getOrAddService(
      this.Service.HumidifierDehumidifier,
      accessory.displayName,
      "humidifier",
    );
    const devData = accessory.context.deviceData;

    this._configureTargetState(accessory, svc);
    this._configureHumidity(accessory, svc, devData);
    this._configureActive(accessory, svc, devData);
    this._configureWaterLevel(accessory, svc, devData);

    return accessory;
  }

  _configureTargetState(accessory, svc) {
    if (
      accessory.hasCapability("Humidifier") &&
      accessory.hasCapability("Dehumidifier")
    ) {
      svc.setCharacteristic(
        this.Characteristic.TargetHumidifierDehumidifierState,
        this.Characteristic.TargetHumidifierDehumidifierState
          .HUMIDIFIER_OR_DEHUMIDIFIER,
      );
    } else if (accessory.hasCapability("Humidifier")) {
      svc
        .setCharacteristic(
          this.Characteristic.TargetHumidifierDehumidifierState,
          this.Characteristic.TargetHumidifierDehumidifierState.HUMIDIFIER,
        )
        .setCharacteristic(
          this.Characteristic.CurrentHumidifierDehumidifierState,
          this.Characteristic.CurrentHumidifierDehumidifierState.HUMIDIFYING,
        );
    } else if (accessory.hasCapability("Dehumidifier")) {
      svc
        .setCharacteristic(
          this.Characteristic.TargetHumidifierDehumidifierState,
          this.Characteristic.TargetHumidifierDehumidifierState.DEHUMIDIFIER,
        )
        .setCharacteristic(
          this.Characteristic.CurrentHumidifierDehumidifierState,
          this.Characteristic.CurrentHumidifierDehumidifierState.DEHUMIDIFYING,
        );
    }
  }

  _configureHumidity(accessory, svc, devData) {
    accessory.getOrAddCharacteristic(
      svc,
      this.Characteristic.CurrentRelativeHumidity,
      {
        getHandler: () =>
          this._clampValue(parseFloat(devData.attributes.humidity), 0, 100),
      },
    );
  }

  _configureActive(accessory, svc, devData) {
    accessory.getOrAddCharacteristic(svc, this.Characteristic.Active, {
      getHandler: () =>
        devData.attributes.switch === "on"
          ? this.Characteristic.Active.ACTIVE
          : this.Characteristic.Active.INACTIVE,
      setHandler: (value) => accessory.sendCommand(value ? "on" : "off"),
    });
  }

  _configureWaterLevel(accessory, svc, devData) {
    accessory.getOrAddCharacteristic(svc, this.Characteristic.WaterLevel, {
      getHandler: () =>
        this._clampValue(parseFloat(devData.attributes.waterLevel), 0, 100),
    });
  }

  _clampValue(value, min, max) {
    if (value === null || value === undefined || isNaN(value)) return min;
    return Math.min(Math.max(value, min), max);
  }
}

// devices/MotionSensor.js
export class MotionSensor {
  constructor(platform) {
    this.logManager = platform.logManager;
    this.Service = platform.Service;
    this.Characteristic = platform.Characteristic;
    this.generateSrvcName = platform.generateSrvcName;
  }

  static relevantAttributes = ["motion", "status", "tamper"];

  configure(accessory) {
    this.logManager.logDebug(
      `Configuring Motion Sensor for ${accessory.displayName}`,
    );
    const svc = accessory.getOrAddService(
      this.Service.MotionSensor,
      accessory.displayName,
      "motion",
    );
    const devData = accessory.context.deviceData;

    this._configureMotionDetected(accessory, svc, devData);
    this._configureStatusActive(accessory, svc, devData);
    this._configureStatusTampered(accessory, svc, devData);

    return accessory;
  }

  _configureMotionDetected(accessory, svc, devData) {
    accessory.getOrAddCharacteristic(svc, this.Characteristic.MotionDetected, {
      getHandler: () => this._getMotionState(devData.attributes.motion),
    });
  }

  _configureStatusActive(accessory, svc, devData) {
    accessory.getOrAddCharacteristic(svc, this.Characteristic.StatusActive, {
      getHandler: () => this._getStatusActiveState(devData.status),
    });
  }

  _configureStatusTampered(accessory, svc, devData) {
    accessory.getOrAddCharacteristic(svc, this.Characteristic.StatusTampered, {
      preReqChk: () => accessory.hasCapability("TamperAlert"),
      getHandler: () => this._getTamperedState(devData.attributes.tamper),
      removeIfMissingPreReq: true,
    });
  }

  _getMotionState(value) {
    return value === "active";
  }

  _getStatusActiveState(value) {
    return value !== "OFFLINE" && value !== "INACTIVE";
  }

  _getTamperedState(value) {
    return value === "detected"
      ? this.Characteristic.StatusTampered.TAMPERED
      : this.Characteristic.StatusTampered.NOT_TAMPERED;
  }

  // Handle attribute updates
  handleAttributeUpdate(accessory, update) {
    const { attribute, value } = update;
    this.logManager.logDebug(
      `MotionSensor | ${accessory.displayName} | Attribute update: ${attribute} = ${value}`,
    );
    if (!MotionSensor.relevantAttributes.includes(attribute)) return;

    const svc = accessory.getService(
      this.Service.MotionSensor,
      this.generateSrvcName(accessory.displayName, "Motion"),
    );
    if (!svc) return;

    svc
      .getCharacteristic(this.Characteristic.StatusActive)
      .updateValue(
        this._getStatusActiveState(accessory.context.deviceData.status),
      );

    switch (attribute) {
      case "motion":
        svc
          .getCharacteristic(this.Characteristic.MotionDetected)
          .updateValue(this._getMotionState(value));
        break;
      case "tamper":
        svc
          .getCharacteristic(this.Characteristic.StatusTampered)
          .updateValue(this._getTamperedState(value));
        break;
      default:
        this.logManager.logWarn(
          `MotionSensor | ${accessory.displayName} | Unhandled attribute update: ${attribute} = ${value}`,
        );
    }
  }
}

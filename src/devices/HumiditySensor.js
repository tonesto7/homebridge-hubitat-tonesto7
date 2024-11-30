// devices/HumiditySensor.js
export class HumiditySensor {
    constructor(platform) {
        this.logManager = platform.logManager;
        this.Service = platform.Service;
        this.Characteristic = platform.Characteristic;
    }

    configure(accessory) {
        this.logManager.logDebug(`Configuring Humidity Sensor for ${accessory.displayName}`);
        const svc = accessory.getOrAddService(this.Service.HumiditySensor);
        const devData = accessory.context.deviceData;

        this._configureCurrentHumidity(accessory, svc, devData);
        this._configureStatusActive(accessory, svc, devData);
        this._configureStatusTampered(accessory, svc, devData);

        accessory.context.deviceGroups.push("humidity_sensor");
        return accessory;
    }

    _configureCurrentHumidity(accessory, svc, devData) {
        accessory.getOrAddCharacteristic(svc, this.Characteristic.CurrentRelativeHumidity, {
            getHandler: () => this._clampValue(parseFloat(devData.attributes.humidity), 0, 100),
            updateHandler: (value) => this._clampValue(value, 0, 100),
            storeAttribute: "humidity",
        });
    }

    _configureStatusActive(accessory, svc, devData) {
        accessory.getOrAddCharacteristic(svc, this.Characteristic.StatusActive, {
            getHandler: () => devData.status !== "OFFLINE" && devData.status !== "INACTIVE",
            updateHandler: (value) => value !== "OFFLINE" && value !== "INACTIVE",
            storeAttribute: "status",
        });
    }

    _configureStatusTampered(accessory, svc, devData) {
        accessory.getOrAddCharacteristic(svc, this.Characteristic.StatusTampered, {
            preReqChk: () => accessory.hasCapability("TamperAlert"),
            getHandler: () => (devData.attributes.tamper === "detected" ? this.Characteristic.StatusTampered.TAMPERED : this.Characteristic.StatusTampered.NOT_TAMPERED),
            updateHandler: (value) => (value === "detected" ? this.Characteristic.StatusTampered.TAMPERED : this.Characteristic.StatusTampered.NOT_TAMPERED),
            storeAttribute: "tamper",
            removeIfMissingPreReq: true,
        });
    }

    _clampValue(value, min, max) {
        return Math.min(Math.max(value, min), max);
    }
}

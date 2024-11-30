// devices/IlluminanceSensor.js
export class IlluminanceSensor {
    constructor(platform) {
        this.logManager = platform.logManager;
        this.Service = platform.Service;
        this.Characteristic = platform.Characteristic;
    }

    configure(accessory) {
        this.logManager.logDebug(`Configuring Illuminance Sensor for ${accessory.displayName}`);
        const svc = accessory.getOrAddService(this.Service.LightSensor);
        const devData = accessory.context.deviceData;

        this._configureAmbientLight(accessory, svc, devData);
        this._configureStatusActive(accessory, svc, devData);
        this._configureStatusTampered(accessory, svc, devData);

        accessory.context.deviceGroups.push("illuminance_sensor");
        return accessory;
    }

    _configureAmbientLight(accessory, svc, devData) {
        accessory.getOrAddCharacteristic(svc, this.Characteristic.CurrentAmbientLightLevel, {
            getHandler: () => this._clampValue(parseFloat(devData.attributes.illuminance), 0, 100000),
            updateHandler: (value) => this._clampValue(value, 0, 100000),
            props: { minValue: 0, maxValue: 100000 },
            storeAttribute: "illuminance",
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

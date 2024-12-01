// devices/HumiditySensor.js
export class HumiditySensor {
    constructor(platform) {
        this.logManager = platform.logManager;
        this.Service = platform.Service;
        this.Characteristic = platform.Characteristic;
        this.generateSrvcName = platform.generateSrvcName;
    }

    static relevantAttributes = ["humidity", "status", "tamper"];

    configure(accessory) {
        this.logManager.logDebug(`Configuring Humidity Sensor for ${accessory.displayName}`);
        const svc = accessory.getOrAddService(this.Service.HumiditySensor, this.generateSrvcName(accessory.displayName, "Humidity"));
        const devData = accessory.context.deviceData;

        this._configureCurrentHumidity(accessory, svc, devData);
        this._configureStatusActive(accessory, svc, devData);
        this._configureStatusTampered(accessory, svc, devData);

        accessory.context.deviceGroups.push("humidity_sensor");
        return accessory;
    }

    _configureCurrentHumidity(accessory, svc, devData) {
        accessory.getOrAddCharacteristic(svc, this.Characteristic.CurrentRelativeHumidity, {
            getHandler: () => this._getCurrentHumidity(devData.attributes.humidity),
            updateHandler: (value) => this._getCurrentHumidity(value),
            storeAttribute: "humidity",
        });
    }

    _configureStatusActive(accessory, svc, devData) {
        accessory.getOrAddCharacteristic(svc, this.Characteristic.StatusActive, {
            getHandler: () => this._getStatusActiveState(devData.status),
            updateHandler: (value) => this._getStatusActiveState(value),
            storeAttribute: "status",
        });
    }

    _configureStatusTampered(accessory, svc, devData) {
        accessory.getOrAddCharacteristic(svc, this.Characteristic.StatusTampered, {
            preReqChk: () => accessory.hasCapability("TamperAlert"),
            getHandler: () => this._getTamperedState(devData.attributes.tamper),
            updateHandler: (value) => this._getTamperedState(value),
            storeAttribute: "tamper",
            removeIfMissingPreReq: true,
        });
    }

    _getCurrentHumidityProps() {
        return { minValue: 0, maxValue: 100 };
    }

    _getCurrentHumidity(value) {
        const props = this._getCurrentHumidityProps();
        return this._clampValue(parseFloat(value), props.minValue, props.maxValue);
    }

    _getStatusActiveState(value) {
        return value !== "OFFLINE" && value !== "INACTIVE";
    }

    _getTamperedState(value) {
        return value === "detected" ? this.Characteristic.StatusTampered.TAMPERED : this.Characteristic.StatusTampered.NOT_TAMPERED;
    }

    _clampValue(value, min, max) {
        return Math.min(Math.max(value, min), max);
    }

    // Handle attribute updates
    handleAttributeUpdate(accessory, update) {
        const { attribute, value } = update;
        this.logManager.logDebug(`HumiditySensor | ${accessory.displayName} | Attribute update: ${attribute} = ${value}`);
        if (!HumiditySensor.relevantAttributes.includes(attribute)) return;

        const svc = accessory.getService(this.Service.HumiditySensor, this.generateSrvcName(accessory.displayName, "Humidity"));
        if (!svc) return;

        svc.getCharacteristic(this.Characteristic.StatusActive).updateValue(this._getStatusActiveState(accessory.context.deviceData.status));

        switch (attribute) {
            case "humidity":
                svc.getCharacteristic(this.Characteristic.CurrentRelativeHumidity).updateValue(this._getCurrentHumidity(value));
                break;
            case "tamper":
                svc.getCharacteristic(this.Characteristic.StatusTampered).updateValue(this._getTamperedState(value));
                break;
            default:
                this.logManager.logWarn(`HumiditySensor | ${accessory.displayName} | Unhandled attribute update: ${attribute} = ${value}`);
        }
    }
}

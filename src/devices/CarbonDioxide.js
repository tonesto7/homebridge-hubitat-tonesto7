// devices/CarbonDioxide.js
export class CarbonDioxide {
    constructor(platform) {
        this.logManager = platform.logManager;
        this.Service = platform.Service;
        this.Characteristic = platform.Characteristic;
        this.generateSrvcName = platform.generateSrvcName;
    }

    static relevantAttributes = ["carbonDioxide", "status", "tamper"];

    configure(accessory) {
        this.logManager.logDebug(`Configuring CO2 Sensor for ${accessory.displayName}`);
        const svcName = this.generateSrvcName(accessory.displayName, "CO2");
        const svc = accessory.getOrAddService(this.Service.CarbonDioxideSensor, svcName);
        const devData = accessory.context.deviceData;

        this._configureCo2Detected(accessory, svc, devData);
        this._configureCo2Level(accessory, svc, devData);
        this._configureStatusActive(accessory, svc, devData);
        this._configureStatusTampered(accessory, svc, devData);

        return accessory;
    }

    _configureCo2Detected(accessory, svc, devData) {
        accessory.getOrAddCharacteristic(svc, this.Characteristic.CarbonDioxideDetected, {
            getHandler: () => this._getCo2DetectedState(devData.attributes.carbonDioxide),
        });
    }

    _configureCo2Level(accessory, svc, devData) {
        accessory.getOrAddCharacteristic(svc, this.Characteristic.CarbonDioxideLevel, {
            getHandler: () => this._getCo2Level(devData.attributes.carbonDioxidcarbonDioxideeMeasurement),
        });
    }

    _configureStatusActive(accessory, svc, devData) {
        accessory.getOrAddCharacteristic(svc, this.Characteristic.StatusActive, {
            getHandler: () => this._getActiveState(devData.status),
        });
    }

    _configureStatusTampered(accessory, svc, devData) {
        accessory.getOrAddCharacteristic(svc, this.Characteristic.StatusTampered, {
            preReqChk: () => accessory.hasCapability("TamperAlert"),
            getHandler: () => this._getTamperedState(devData.attributes.tamper),
            removeIfMissingPreReq: true,
        });
    }

    _getCo2DetectedState(value) {
        if (!value || isNaN(value)) return this.Characteristic.CarbonDioxideDetected.CO2_LEVELS_NORMAL;
        return value < 2000 ? this.Characteristic.CarbonDioxideDetected.CO2_LEVELS_NORMAL : this.Characteristic.CarbonDioxideDetected.CO2_LEVELS_ABNORMAL;
    }

    _getCo2Level(value) {
        if (!value || isNaN(value)) return 0;
        value = parseFloat(value);
        return this._clampValue(value, 0, 100000);
    }

    _getTamperedState(value) {
        return value === "detected" ? this.Characteristic.StatusTampered.TAMPERED : this.Characteristic.StatusTampered.NOT_TAMPERED;
    }

    _getActiveState(value) {
        return value !== "OFFLINE" && value !== "INACTIVE";
    }

    _clampValue(value, min, max) {
        if (value === null || value === undefined || isNaN(value)) return min;
        return Math.min(Math.max(value, min), max);
    }

    // Handle attribute updates
    handleAttributeUpdate(accessory, update) {
        const { attribute, value } = update;
        this.logManager.logDebug(`CarbonDioxide | ${accessory.displayName} | Attribute update: ${attribute} = ${value}`);
        if (!CarbonDioxide.relevantAttributes.includes(attribute)) return;

        const svc = accessory.getService(this.Service.CarbonDioxideSensor, this.generateSrvcName(accessory.displayName, "CO2"));
        if (!svc) return;

        svc.getCharacteristic(this.Characteristic.StatusActive).updateValue(this._getActiveState(accessory.context.deviceData.status));

        switch (attribute) {
            case "carbonDioxide":
                svc.getCharacteristic(this.Characteristic.CarbonDioxideLevel).updateValue(this._getCo2Level(value));
                break;
            case "tamper":
                svc.getCharacteristic(this.Characteristic.StatusTampered).updateValue(this._getTamperedState(value));
                break;
            default:
                this.logManager.logWarn(`CarbonDioxide | ${accessory.displayName} | Unhandled attribute update: ${attribute} = ${value}`);
        }
    }
}

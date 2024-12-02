// devices/CarbonMonoxide.js
export class CarbonMonoxide {
    constructor(platform) {
        this.logManager = platform.logManager;
        this.Service = platform.Service;
        this.Characteristic = platform.Characteristic;
        this.generateSrvcName = platform.generateSrvcName;
    }

    static relevantAttributes = ["carbonMonoxide", "status", "tamper"];

    configure(accessory) {
        this.logManager.logDebug(`Configuring CO Sensor for ${accessory.displayName}`);
        const svcName = this.generateSrvcName(accessory.displayName, "CO");
        const svc = accessory.getOrAddService(this.Service.CarbonMonoxideSensor);
        const devData = accessory.context.deviceData;

        this._updateSvcName(svc, svcName);
        this._configureCoDetected(accessory, svc, devData);
        this._configureStatusActive(accessory, svc, devData);
        this._configureStatusTampered(accessory, svc, devData);

        return accessory;
    }

    _updateSvcName(svc, svcName) {
        svc.getOrAddCharacteristic(this.Characteristic.Name).updateValue(svcName);
    }

    _configureCoDetected(accessory, svc, devData) {
        accessory.getOrAddCharacteristic(svc, this.Characteristic.CarbonMonoxideDetected, {
            getHandler: () => this._getCoDetectedState(devData.attributes.carbonMonoxide),
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

    _getCoDetectedState(value) {
        switch (value) {
            case "clear":
            case "tested":
                return this.Characteristic.CarbonMonoxideDetected.CO_LEVELS_NORMAL;
            default:
                return this.Characteristic.CarbonMonoxideDetected.CO_LEVELS_ABNORMAL;
        }
    }

    _getTamperedState(value) {
        return value === "detected" ? this.Characteristic.StatusTampered.TAMPERED : this.Characteristic.StatusTampered.NOT_TAMPERED;
    }

    _getActiveState(value) {
        return value !== "OFFLINE" && value !== "INACTIVE";
    }

    // Handle attribute updates
    handleAttributeUpdate(accessory, update) {
        const { attribute, value } = update;
        this.logManager.logDebug(`CarbonMonoxide | ${accessory.displayName} | Attribute update: ${attribute} = ${value}`);
        if (!CarbonMonoxide.relevantAttributes.includes(attribute)) return;

        const svc = accessory.getService(this.Service.CarbonMonoxideSensor, this.generateSrvcName(accessory.displayName, "CO"));
        if (!svc) return;

        svc.getCharacteristic(this.Characteristic.StatusActive).updateValue(this._getActiveState(accessory.context.deviceData.status));

        switch (attribute) {
            case "carbonMonoxide":
                svc.getCharacteristic(this.Characteristic.CarbonMonoxideDetected).updateValue(this._getCoDetectedState(value));
                break;
            case "tamper":
                svc.getCharacteristic(this.Characteristic.StatusTampered).updateValue(this._getTamperedState(value));
                break;
            default:
                this.logManager.logWarn(`CarbonMonoxide | ${accessory.displayName} | Unhandled attribute update: ${attribute} = ${value}`);
        }
    }
}

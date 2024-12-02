// devices/IlluminanceSensor.js
export class IlluminanceSensor {
    constructor(platform) {
        this.logManager = platform.logManager;
        this.Service = platform.Service;
        this.Characteristic = platform.Characteristic;
        this.generateSrvcName = platform.generateSrvcName;
    }

    static relevantAttributes = ["illuminance", "status", "tamper"];
    configure(accessory) {
        this.logManager.logDebug(`Configuring Illuminance Sensor for ${accessory.displayName}`);
        const svcName = this.generateSrvcName(accessory.displayName, "Illuminance");
        const svc = accessory.getOrAddService(this.Service.LightSensor);
        const devData = accessory.context.deviceData;

        this._updateSvcName(svc, svcName);
        this._configureAmbientLight(accessory, svc, devData);
        this._configureStatusActive(accessory, svc, devData);
        this._configureStatusTampered(accessory, svc, devData);

        return accessory;
    }

    _updateSvcName(svc, svcName) {
        svc.getOrAddCharacteristic(this.Characteristic.Name).updateValue(svcName);
    }

    _configureAmbientLight(accessory, svc, devData) {
        accessory.getOrAddCharacteristic(svc, this.Characteristic.CurrentAmbientLightLevel, {
            getHandler: () => this._getCurrentAmbientLightLevel(devData.attributes.illuminance),
            props: this._getCurrentAmbientLightLevelProps(),
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

    _getCurrentAmbientLightLevelProps() {
        return { minValue: 0, maxValue: 100000 };
    }

    _getCurrentAmbientLightLevel(value) {
        const props = this._getCurrentAmbientLightLevelProps();
        return this._clampValue(parseFloat(value), props.minValue, props.maxValue);
    }

    _getStatusActiveState(value) {
        return value !== "OFFLINE" && value !== "INACTIVE";
    }

    _getTamperedState(value) {
        return value === "detected" ? this.Characteristic.StatusTampered.TAMPERED : this.Characteristic.StatusTampered.NOT_TAMPERED;
    }

    _clampValue(value, min, max) {
        if (value === null || value === undefined || isNaN(value)) return min;
        return Math.min(Math.max(value, min), max);
    }

    // Handle attribute updates
    handleAttributeUpdate(accessory, update) {
        const { attribute, value } = update;
        this.logManager.logDebug(`IlluminanceSensor | ${accessory.displayName} | Attribute update: ${attribute} = ${value}`);
        if (!IlluminanceSensor.relevantAttributes.includes(attribute)) return;

        const svc = accessory.getService(this.Service.LightSensor, this.generateSrvcName(accessory.displayName, "Illuminance"));
        if (!svc) return;

        svc.getCharacteristic(this.Characteristic.StatusActive).updateValue(this._getStatusActiveState(accessory.context.deviceData.status));

        switch (attribute) {
            case "illuminance":
                svc.getCharacteristic(this.Characteristic.CurrentAmbientLightLevel).updateValue(this._getCurrentAmbientLightLevel(value));
                break;
            case "tamper":
                svc.getCharacteristic(this.Characteristic.StatusTampered).updateValue(this._getTamperedState(value));
                break;
            default:
                this.logManager.logWarn(`IlluminanceSensor | ${accessory.displayName} | Unhandled attribute update: ${attribute} = ${value}`);
        }
    }
}

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
        const svc = accessory.getOrAddService(this.Service.LightSensor, this.generateSrvcName(accessory.displayName, "Illuminance"));
        const devData = accessory.context.deviceData;

        this._configureAmbientLight(accessory, svc, devData);
        this._configureStatusActive(accessory, svc, devData);
        this._configureStatusTampered(accessory, svc, devData);

        return accessory;
    }

    _configureAmbientLight(accessory, svc, devData) {
        accessory.getOrAddCharacteristic(svc, this.Characteristic.CurrentAmbientLightLevel, {
            getHandler: () => this._getCurrentAmbientLightLevel(devData.attributes.illuminance),
            updateHandler: (value) => this._getCurrentAmbientLightLevel(value),
            props: this._getCurrentAmbientLightLevelProps(),
            storeAttribute: "illuminance",
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

// devices/LeakSensor.js
export class LeakSensor {
    constructor(platform) {
        this.logManager = platform.logManager;
        this.Service = platform.Service;
        this.Characteristic = platform.Characteristic;
        this.generateSrvcName = platform.generateSrvcName;
    }

    static relevantAttributes = ["water", "status", "tamper"];

    configure(accessory) {
        this.logManager.logDebug(`Configuring Leak Sensor for ${accessory.displayName}`);
        const svc = accessory.getOrAddService(this.Service.LeakSensor, this.generateSrvcName(accessory.displayName, "Leak"));
        const devData = accessory.context.deviceData;

        this._configureLeakDetected(accessory, svc, devData);
        this._configureStatusActive(accessory, svc, devData);
        this._configureStatusTampered(accessory, svc, devData);

        return accessory;
    }

    _configureLeakDetected(accessory, svc, devData) {
        accessory.getOrAddCharacteristic(svc, this.Characteristic.LeakDetected, {
            getHandler: () => this._getLeakState(devData.attributes.water),
            updateHandler: (value) => this._getLeakState(value),
            storeAttribute: "water",
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

    _getLeakState(value) {
        return value === "wet" ? this.Characteristic.LeakDetected.LEAK_DETECTED : this.Characteristic.LeakDetected.LEAK_NOT_DETECTED;
    }

    _getStatusActiveState(value) {
        return value !== "OFFLINE" && value !== "INACTIVE";
    }

    _getTamperedState(value) {
        return value === "detected" ? this.Characteristic.StatusTampered.TAMPERED : this.Characteristic.StatusTampered.NOT_TAMPERED;
    }

    // Handle attribute updates
    handleAttributeUpdate(accessory, update) {
        const { attribute, value } = update;
        this.logManager.logDebug(`LeakSensor | ${accessory.displayName} | Attribute update: ${attribute} = ${value}`);
        if (!LeakSensor.relevantAttributes.includes(attribute)) return;

        const svc = accessory.getService(this.Service.LeakSensor, this.generateSrvcName(accessory.displayName, "Leak"));
        if (!svc) return;

        svc.getCharacteristic(this.Characteristic.StatusActive).updateValue(this._getStatusActiveState(accessory.context.deviceData.status));

        switch (attribute) {
            case "water":
                svc.getCharacteristic(this.Characteristic.LeakDetected).updateValue(this._getLeakState(value));
                break;
            case "tamper":
                svc.getCharacteristic(this.Characteristic.StatusTampered).updateValue(this._getTamperedState(value));
                break;
            default:
                this.logManager.logWarn(`LeakSensor | ${accessory.displayName} | Unhandled attribute update: ${attribute} = ${value}`);
        }
    }
}

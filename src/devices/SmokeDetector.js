// devices/SmokeDetector.js
export class SmokeDetector {
    constructor(platform) {
        this.logManager = platform.logManager;
        this.Service = platform.Service;
        this.Characteristic = platform.Characteristic;
        this.generateSrvcName = platform.generateSrvcName;
    }

    static relevantAttributes = ["smoke", "tamper"];

    configure(accessory) {
        this.logManager.logDebug(`Configuring Smoke Detector for ${accessory.displayName}`);
        const svc = accessory.getOrAddService(this.Service.SmokeSensor, accessory.displayName, "smoke");
        const devData = accessory.context.deviceData;

        this._configureSmokeDetected(accessory, svc, devData);
        this._configureStatusActive(accessory, svc, devData);
        this._configureStatusTampered(accessory, svc, devData);

        return accessory;
    }

    _configureSmokeDetected(accessory, svc, devData) {
        accessory.getOrAddCharacteristic(svc, this.Characteristic.SmokeDetected, {
            getHandler: () => this._getSmokeState(devData.attributes.smoke),
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

    _getTamperedState(state) {
        return state === "detected" ? this.Characteristic.StatusTampered.TAMPERED : this.Characteristic.StatusTampered.NOT_TAMPERED;
    }

    _getSmokeState(state) {
        return state === "clear" ? this.Characteristic.SmokeDetected.SMOKE_NOT_DETECTED : this.Characteristic.SmokeDetected.SMOKE_DETECTED;
    }

    _getStatusActiveState(state) {
        return state !== "OFFLINE" && state !== "INACTIVE";
    }

    // Handle attribute updates
    handleAttributeUpdate(accessory, update) {
        const { attribute, value } = update;
        this.logManager.logDebug(`SmokeDetector | ${accessory.displayName} | Attribute update: ${attribute} = ${value}`);
        if (!SmokeDetector.relevantAttributes.includes(attribute)) return;

        const svc = accessory.getService(this.Service.SmokeSensor, this.generateSrvcName(accessory.displayName, "Smoke"));
        if (!svc) return;

        svc.getCharacteristic(this.Characteristic.StatusActive).updateValue(this._getStatusActiveState(accessory.context.deviceData.status));

        switch (attribute) {
            case "smoke":
                svc.getCharacteristic(this.Characteristic.SmokeDetected).updateValue(this._getSmokeState(value));
                break;
            case "tamper":
                svc.getCharacteristic(this.Characteristic.StatusTampered).updateValue(this._getTamperedState(value));
                break;
            default:
                this.logManager.logWarn(`SmokeDetector | ${accessory.displayName} | Unhandled attribute update: ${attribute} = ${value}`);
        }
    }
}

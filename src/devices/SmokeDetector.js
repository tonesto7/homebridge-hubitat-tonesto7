// devices/SmokeDetector.js
export class SmokeDetector {
    constructor(platform) {
        this.logManager = platform.logManager;
        this.Service = platform.Service;
        this.Characteristic = platform.Characteristic;
    }

    configure(accessory) {
        this.logManager.logDebug(`Configuring Smoke Detector for ${accessory.displayName}`);
        const svc = accessory.getOrAddService(this.Service.SmokeSensor);
        const devData = accessory.context.deviceData;

        this._configureSmokeDetected(accessory, svc, devData);
        this._configureStatusActive(accessory, svc, devData);
        this._configureStatusTampered(accessory, svc, devData);

        accessory.context.deviceGroups.push("smoke_detector");
        return accessory;
    }

    _configureSmokeDetected(accessory, svc, devData) {
        accessory.getOrAddCharacteristic(svc, this.Characteristic.SmokeDetected, {
            getHandler: () => (devData.attributes.smoke === "clear" ? this.Characteristic.SmokeDetected.SMOKE_NOT_DETECTED : this.Characteristic.SmokeDetected.SMOKE_DETECTED),
            updateHandler: (value) => (value === "clear" ? this.Characteristic.SmokeDetected.SMOKE_NOT_DETECTED : this.Characteristic.SmokeDetected.SMOKE_DETECTED),
            storeAttribute: "smoke",
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
}

// devices/LeakSensor.js
export class LeakSensor {
    constructor(platform) {
        this.logManager = platform.logManager;
        this.Service = platform.Service;
        this.Characteristic = platform.Characteristic;
    }

    configure(accessory) {
        this.logManager.logDebug(`Configuring Leak Sensor for ${accessory.displayName}`);
        const svc = accessory.getOrAddService(this.Service.LeakSensor);
        const devData = accessory.context.deviceData;

        this._configureLeakDetected(accessory, svc, devData);
        this._configureStatusActive(accessory, svc, devData);
        this._configureStatusTampered(accessory, svc, devData);

        accessory.context.deviceGroups.push("water_sensor");
        return accessory;
    }

    _configureLeakDetected(accessory, svc, devData) {
        accessory.getOrAddCharacteristic(svc, this.Characteristic.LeakDetected, {
            getHandler: () => (devData.attributes.water === "dry" ? this.Characteristic.LeakDetected.LEAK_NOT_DETECTED : this.Characteristic.LeakDetected.LEAK_DETECTED),
            updateHandler: (value) => (value === "dry" ? this.Characteristic.LeakDetected.LEAK_NOT_DETECTED : this.Characteristic.LeakDetected.LEAK_DETECTED),
            storeAttribute: "water",
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

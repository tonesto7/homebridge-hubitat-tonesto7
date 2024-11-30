// devices/AccelerationSensor.js
export class AccelerationSensor {
    constructor(platform) {
        this.logManager = platform.logManager;
        this.Service = platform.Service;
        this.Characteristic = platform.Characteristic;
        this.CommunityTypes = platform.CommunityTypes;
    }

    configure(accessory) {
        this.logManager.logDebug(`Configuring Acceleration Sensor for ${accessory.displayName}`);
        const svc = accessory.getOrAddService(this.Service.MotionSensor);
        const devData = accessory.context.deviceData;

        this._configureMotionDetected(accessory, svc, devData);
        this._configureStatusActive(accessory, svc, devData);
        this._configureStatusTampered(accessory, svc, devData);

        accessory.context.deviceGroups.push("acceleration_sensor");
        return accessory;
    }

    _configureMotionDetected(accessory, svc, devData) {
        accessory.getOrAddCharacteristic(svc, this.Characteristic.MotionDetected, {
            getHandler: () => devData.attributes.acceleration === "active",
            updateHandler: (value) => value === "active",
            storeAttribute: "acceleration",
        });
    }

    _configureStatusActive(accessory, svc, devData) {
        accessory.getOrAddCharacteristic(svc, this.Characteristic.StatusActive, {
            getHandler: () => {
                const status = devData.status;
                return status !== "OFFLINE" && status !== "INACTIVE";
            },
            updateHandler: (value) => value !== "OFFLINE" && value !== "INACTIVE",
            storeAttribute: "status",
        });
    }

    _configureStatusTampered(accessory, svc, devData) {
        accessory.getOrAddCharacteristic(svc, this.Characteristic.StatusTampered, {
            preReqChk: () => accessory.hasCapability("TamperAlert"),
            getHandler: () => {
                return devData.attributes.tamper === "detected" ? this.Characteristic.StatusTampered.TAMPERED : this.Characteristic.StatusTampered.NOT_TAMPERED;
            },
            updateHandler: (value) => value === "detected",
            storeAttribute: "tamper",
            removeIfMissingPreReq: true,
        });
    }
}

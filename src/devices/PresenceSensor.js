// devices/PresenceSensor.js
export class PresenceSensor {
    constructor(platform) {
        this.logManager = platform.logManager;
        this.Service = platform.Service;
        this.Characteristic = platform.Characteristic;
    }

    configure(accessory) {
        this.logManager.logDebug(`Configuring Presence Sensor for ${accessory.displayName}`);
        const svc = accessory.getOrAddService(this.Service.OccupancySensor);
        const devData = accessory.context.deviceData;

        this._configureOccupancyDetected(accessory, svc, devData);
        this._configureStatusActive(accessory, svc, devData);
        this._configureStatusTampered(accessory, svc, devData);

        accessory.context.deviceGroups.push("presence_sensor");
        return accessory;
    }

    _configureOccupancyDetected(accessory, svc, devData) {
        accessory.getOrAddCharacteristic(svc, this.Characteristic.OccupancyDetected, {
            getHandler: () => (devData.attributes.presence === "present" ? this.Characteristic.OccupancyDetected.OCCUPANCY_DETECTED : this.Characteristic.OccupancyDetected.OCCUPANCY_NOT_DETECTED),
            updateHandler: (value) => (value === "present" ? this.Characteristic.OccupancyDetected.OCCUPANCY_DETECTED : this.Characteristic.OccupancyDetected.OCCUPANCY_NOT_DETECTED),
            storeAttribute: "presence",
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

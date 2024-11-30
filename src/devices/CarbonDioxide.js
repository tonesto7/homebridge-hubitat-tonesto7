// devices/CarbonDioxide.js
export class CarbonDioxide {
    constructor(platform) {
        this.logManager = platform.logManager;
        this.Service = platform.Service;
        this.Characteristic = platform.Characteristic;
    }

    configure(accessory) {
        this.logManager.logDebug(`Configuring Carbon Dioxide Sensor for ${accessory.displayName}`);
        const svc = accessory.getOrAddService(this.Service.CarbonDioxideSensor);
        const devData = accessory.context.deviceData;

        this._configureDetected(accessory, svc, devData);
        this._configureLevel(accessory, svc, devData);
        this._configureStatusActive(accessory, svc, devData);
        this._configureStatusTampered(accessory, svc, devData);

        accessory.context.deviceGroups.push("carbon_dioxide");
        return accessory;
    }

    _configureDetected(accessory, svc, devData) {
        accessory.getOrAddCharacteristic(svc, this.Characteristic.CarbonDioxideDetected, {
            getHandler: () => {
                const level = parseInt(devData.attributes.carbonDioxideMeasurement);
                return level < 2000 ? this.Characteristic.CarbonDioxideDetected.CO2_LEVELS_NORMAL : this.Characteristic.CarbonDioxideDetected.CO2_LEVELS_ABNORMAL;
            },
            updateHandler: (value) => {
                return value < 2000 ? this.Characteristic.CarbonDioxideDetected.CO2_LEVELS_NORMAL : this.Characteristic.CarbonDioxideDetected.CO2_LEVELS_ABNORMAL;
            },
            storeAttribute: "carbonDioxideMeasurement",
        });
    }

    _configureLevel(accessory, svc, devData) {
        accessory.getOrAddCharacteristic(svc, this.Characteristic.CarbonDioxideLevel, {
            getHandler: () => {
                const level = parseFloat(devData.attributes.carbonDioxideMeasurement);
                return this._clampValue(level, 0, 100000);
            },
            updateHandler: (value) => this._clampValue(value, 0, 100000),
            storeAttribute: "carbonDioxideMeasurement",
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
            getHandler: () => {
                return devData.attributes.tamper === "detected" ? this.Characteristic.StatusTampered.TAMPERED : this.Characteristic.StatusTampered.NOT_TAMPERED;
            },
            updateHandler: (value) => {
                return value === "detected" ? this.Characteristic.StatusTampered.TAMPERED : this.Characteristic.StatusTampered.NOT_TAMPERED;
            },
            storeAttribute: "tamper",
            removeIfMissingPreReq: true,
        });
    }

    _clampValue(value, min, max) {
        return Math.min(Math.max(value, min), max);
    }
}

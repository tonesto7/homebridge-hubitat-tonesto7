// devices/AirQuality.js
export class AirQuality {
    constructor(platform) {
        this.logManager = platform.logManager;
        this.Service = platform.Service;
        this.Characteristic = platform.Characteristic;
    }

    configure(accessory) {
        this.logManager.logDebug(`Configuring Air Quality Sensor for ${accessory.displayName}`);
        const svc = accessory.getOrAddService(this.Service.AirQualitySensor);
        const devData = accessory.context.deviceData;

        svc.setCharacteristic(this.Characteristic.StatusFault, this.Characteristic.StatusFault.NO_FAULT);

        this._configureStatusActive(accessory, svc, devData);
        this._configureAirQuality(accessory, svc, devData);
        this._configureStatusLowBattery(accessory, svc, devData);
        this._configurePM25Density(accessory, svc, devData);
        this._configureStatusTampered(accessory, svc, devData);

        accessory.context.deviceGroups.push("air_quality");
        return accessory;
    }

    _getAirQualityState(aqi) {
        if (aqi <= 50) return this.Characteristic.AirQuality.EXCELLENT;
        if (aqi <= 100) return this.Characteristic.AirQuality.GOOD;
        if (aqi <= 150) return this.Characteristic.AirQuality.FAIR;
        if (aqi <= 200) return this.Characteristic.AirQuality.INFERIOR;
        return this.Characteristic.AirQuality.POOR;
    }

    _configureStatusActive(accessory, svc, devData) {
        accessory.getOrAddCharacteristic(svc, this.Characteristic.StatusActive, {
            getHandler: () => devData.status !== "OFFLINE" && devData.status !== "INACTIVE",
            updateHandler: (value) => value !== "OFFLINE" && value !== "INACTIVE",
            storeAttribute: "status",
        });
    }

    _configureAirQuality(accessory, svc, devData) {
        accessory.getOrAddCharacteristic(svc, this.Characteristic.AirQuality, {
            getHandler: () => this._getAirQualityState(devData.attributes.airQualityIndex),
            updateHandler: (value) => this._getAirQualityState(value),
            storeAttribute: "airQualityIndex",
        });
    }

    _configureStatusLowBattery(accessory, svc, devData) {
        accessory.getOrAddCharacteristic(svc, this.Characteristic.StatusLowBattery, {
            getHandler: () => {
                return devData.attributes.battery < 20 ? this.Characteristic.StatusLowBattery.BATTERY_LEVEL_LOW : this.Characteristic.StatusLowBattery.BATTERY_LEVEL_NORMAL;
            },
            updateHandler: (value) => {
                return value < 20 ? this.Characteristic.StatusLowBattery.BATTERY_LEVEL_LOW : this.Characteristic.StatusLowBattery.BATTERY_LEVEL_NORMAL;
            },
            storeAttribute: "battery",
        });
    }

    _configurePM25Density(accessory, svc, devData) {
        accessory.getOrAddCharacteristic(svc, this.Characteristic.PM2_5Density, {
            preReqChk: () => accessory.hasAttribute("pm25"),
            getHandler: () => {
                const val = parseFloat(devData.attributes.pm25);
                return this.clampValue(val, 0, 1000);
            },
            updateHandler: (value) => this.clampValue(value, 0, 1000),
            storeAttribute: "pm25",
            removeIfMissingPreReq: true,
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

    clampValue(value, min, max) {
        return Math.min(Math.max(value, min), max);
    }
}

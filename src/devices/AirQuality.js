// devices/AirQuality.js
export class AirQuality {
    constructor(platform) {
        this.logManager = platform.logManager;
        this.Service = platform.Service;
        this.Characteristic = platform.Characteristic;
        this.generateSrvcName = platform.generateSrvcName;
    }

    static relevantAttributes = ["airQualityIndex", "status", "battery", "pm25", "tamper"];

    configure(accessory) {
        this.logManager.logDebug(`Configuring Air Quality Sensor for ${accessory.displayName}`);
        const svcName = this.generateSrvcName(accessory.displayName, "Air Quality");
        const svc = accessory.getOrAddService(this.Service.AirQualitySensor);
        const devData = accessory.context.deviceData;

        svc.setCharacteristic(this.Characteristic.StatusFault, this.Characteristic.StatusFault.NO_FAULT);

        this._updateSvcName(svc, svcName);
        this._configureAirQuality(accessory, svc, devData);
        this._configureStatusActive(accessory, svc, devData);
        this._configureStatusLowBattery(accessory, svc, devData);
        this._configurePM25Density(accessory, svc, devData);
        this._configureStatusTampered(accessory, svc, devData);

        return accessory;
    }

    _updateSvcName(svc, svcName) {
        svc.getOrAddCharacteristic(this.Characteristic.Name).updateValue(svcName);
    }

    _configureAirQuality(accessory, svc, devData) {
        accessory.getOrAddCharacteristic(svc, this.Characteristic.AirQuality, {
            getHandler: () => this._getAirQualityState(devData.attributes.airQualityIndex),
        });
    }

    _configureStatusActive(accessory, svc, devData) {
        accessory.getOrAddCharacteristic(svc, this.Characteristic.StatusActive, {
            getHandler: () => this._getStatusActive(devData.status),
        });
    }

    _configureStatusLowBattery(accessory, svc, devData) {
        accessory.getOrAddCharacteristic(svc, this.Characteristic.StatusLowBattery, {
            getHandler: () => this._getStatusLowBattery(devData.attributes.battery),
        });
    }

    _configurePM25Density(accessory, svc, devData) {
        accessory.getOrAddCharacteristic(svc, this.Characteristic.PM2_5Density, {
            preReqChk: () => accessory.hasAttribute("pm25"),
            getHandler: () => this._getPM25Density(devData.attributes.pm25),
            removeIfMissingPreReq: true,
        });
    }

    _configureStatusTampered(accessory, svc, devData) {
        accessory.getOrAddCharacteristic(svc, this.Characteristic.StatusTampered, {
            preReqChk: () => accessory.hasCapability("TamperAlert"),
            getHandler: () => this._getStatusTampered(devData.attributes.tamper),
            removeIfMissingPreReq: true,
        });
    }

    _getAirQualityState(aqi) {
        if (!aqi || isNaN(aqi)) return this.Characteristic.AirQuality.UNKNOWN;
        aqi = parseInt(aqi);
        if (aqi <= 50) return this.Characteristic.AirQuality.EXCELLENT;
        else if (aqi <= 100) return this.Characteristic.AirQuality.GOOD;
        else if (aqi <= 150) return this.Characteristic.AirQuality.FAIR;
        else if (aqi <= 200) return this.Characteristic.AirQuality.INFERIOR;
        else return this.Characteristic.AirQuality.POOR;
    }

    _getStatusActive(status) {
        return status !== "OFFLINE" && status !== "INACTIVE";
    }

    _getStatusLowBattery(battery) {
        return battery < 20 ? this.Characteristic.StatusLowBattery.BATTERY_LEVEL_LOW : this.Characteristic.StatusLowBattery.BATTERY_LEVEL_NORMAL;
    }

    _getPM25Density(pm25) {
        const val = parseFloat(pm25);
        return this.clampValue(val, 0, 1000);
    }

    _getStatusTampered(tamper) {
        return tamper === "detected" ? this.Characteristic.StatusTampered.TAMPERED : this.Characteristic.StatusTampered.NOT_TAMPERED;
    }

    clampValue(value, min, max) {
        return Math.min(Math.max(value, min), max);
    }

    // Handle attribute updates
    handleAttributeUpdate(accessory, update) {
        const { attribute, value } = update;
        this.logManager.logDebug(`AirQuality | ${accessory.displayName} | Attribute update: ${attribute} = ${value}`);
        if (!AirQuality.relevantAttributes.includes(attribute)) return;

        const svc = accessory.getService(this.Service.AirQualitySensor, this.generateSrvcName(accessory.displayName, "Air Quality"));
        if (!svc) return;

        svc.getCharacteristic(this.Characteristic.StatusActive).updateValue(this._getStatusActive(accessory.context.deviceData.status));

        switch (attribute) {
            case "airQualityIndex":
                svc.getCharacteristic(this.Characteristic.AirQuality).updateValue(this._getAirQualityState(value));
                break;
            case "battery":
                svc.getCharacteristic(this.Characteristic.StatusLowBattery).updateValue(this._getStatusLowBattery(value));
                break;
            case "pm25":
                svc.getCharacteristic(this.Characteristic.PM2_5Density).updateValue(this._getPM25Density(value));
                break;
            case "tamper":
                svc.getCharacteristic(this.Characteristic.StatusTampered).updateValue(this._getStatusTampered(value));
                break;
            default:
                this.logManager.logWarn(`AirQuality | ${accessory.displayName} | Unhandled attribute update: ${attribute} = ${value}`);
        }
    }
}

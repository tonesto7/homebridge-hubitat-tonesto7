// device_types/AirQuality.js

import HubitatPlatformAccessory from "../HubitatPlatformAccessory.js";

export default class AirQuality extends HubitatPlatformAccessory {
    constructor(platform, accessory) {
        super(platform, accessory);
        this.airQualityService = null;
    }

    async configureServices() {
        try {
            this.airQualityService = this.getOrAddService(this.Service.AirQualitySensor);

            // Air Quality
            this.getOrAddCharacteristic(this.airQualityService, this.Characteristic.AirQuality, {
                getHandler: () => this.getAirQuality(),
            });

            // Status Active
            this.getOrAddCharacteristic(this.airQualityService, this.Characteristic.StatusActive, {
                getHandler: () => this.getStatusActive(),
            });

            // Status Fault
            this.getOrAddCharacteristic(this.airQualityService, this.Characteristic.StatusFault, {
                getHandler: () => this.getStatusFault(),
            });

            // PM2.5 Density if supported
            if (this.hasAttribute("pm25")) {
                this.getOrAddCharacteristic(this.airQualityService, this.Characteristic.PM2_5Density, {
                    getHandler: () => this.getPM25Density(),
                });
            }

            // Status Tampered if supported
            this.getOrAddCharacteristic(this.airQualityService, this.Characteristic.StatusTampered, {
                preReqChk: () => this.hasCapability("TamperAlert"),
                getHandler: () => this.getStatusTampered(),
                removeIfMissingPreReq: true,
            });

            return true;
        } catch (error) {
            this.logError("Error configuring air quality sensor services:", error);
            throw error;
        }
    }

    // Air Quality
    getAirQuality() {
        const aqi = parseInt(this.deviceData.attributes.airQualityIndex);

        if (aqi <= 50) return this.Characteristic.AirQuality.EXCELLENT;
        if (aqi <= 100) return this.Characteristic.AirQuality.GOOD;
        if (aqi <= 150) return this.Characteristic.AirQuality.FAIR;
        if (aqi <= 200) return this.Characteristic.AirQuality.INFERIOR;
        return this.Characteristic.AirQuality.POOR;
    }

    // Status Active
    getStatusActive() {
        return this.deviceData.attributes.status === "online";
    }

    // Status Fault
    getStatusFault() {
        return this.deviceData.attributes.status === "fault" ? this.Characteristic.StatusFault.GENERAL_FAULT : this.Characteristic.StatusFault.NO_FAULT;
    }

    // PM2.5 Density
    getPM25Density() {
        return parseFloat(this.deviceData.attributes.pm25) || 0;
    }

    // Status Tampered
    getStatusTampered() {
        return this.deviceData.attributes.tamper === "detected" ? this.Characteristic.StatusTampered.TAMPERED : this.Characteristic.StatusTampered.NOT_TAMPERED;
    }

    async handleAttributeUpdate(attribute, value) {
        this.updateDeviceAttribute(attribute, value);
        switch (attribute) {
            case "airQualityIndex":
                this.airQualityService.getCharacteristic(this.Characteristic.AirQuality).updateValue(this.getAirQuality());
                break;

            case "status":
                this.airQualityService.getCharacteristic(this.Characteristic.StatusActive).updateValue(value === "online");

                this.airQualityService.getCharacteristic(this.Characteristic.StatusFault).updateValue(value === "fault" ? this.Characteristic.StatusFault.GENERAL_FAULT : this.Characteristic.StatusFault.NO_FAULT);
                break;

            case "pm25":
                if (!this.hasAttribute("pm25")) return;

                this.airQualityService.getCharacteristic(this.Characteristic.PM2_5Density).updateValue(parseFloat(value) || 0);
                break;

            case "tamper":
                if (!this.hasCapability("TamperAlert")) return;

                this.airQualityService.getCharacteristic(this.Characteristic.StatusTampered).updateValue(value === "detected" ? this.Characteristic.StatusTampered.TAMPERED : this.Characteristic.StatusTampered.NOT_TAMPERED);
                break;

            default:
                this.logDebug(`Unhandled attribute update: ${attribute} = ${value}`);
        }
    }

    // Custom method to map AQI to PM2.5
    aqiToPm25(aqi) {
        if (aqi === undefined || aqi > 500 || aqi < 0) {
            return 0; // Error or unknown response
        } else if (aqi <= 50) {
            return 12; // Good
        } else if (aqi <= 100) {
            return 35.4; // Moderate
        } else if (aqi <= 150) {
            return 55.4; // Unhealthy for Sensitive Groups
        } else if (aqi <= 200) {
            return 150.4; // Unhealthy
        } else if (aqi <= 300) {
            return 250.4; // Very Unhealthy
        } else {
            return 350.4; // Hazardous
        }
    }

    // Custom method to convert PM2.5 to HomeKit Air Quality level
    pm25ToAirQuality(pm25) {
        if (pm25 <= 12) {
            return this.Characteristic.AirQuality.EXCELLENT;
        } else if (pm25 <= 35.4) {
            return this.Characteristic.AirQuality.GOOD;
        } else if (pm25 <= 55.4) {
            return this.Characteristic.AirQuality.FAIR;
        } else if (pm25 <= 150.4) {
            return this.Characteristic.AirQuality.INFERIOR;
        } else {
            return this.Characteristic.AirQuality.POOR;
        }
    }

    // Custom method to validate AQI value
    validateAQI(value) {
        const aqi = parseInt(value);
        if (isNaN(aqi)) return 0;
        return Math.max(0, Math.min(500, aqi));
    }

    // Custom method to validate PM2.5 value
    validatePM25(value) {
        const pm25 = parseFloat(value);
        if (isNaN(pm25)) return 0;
        return Math.max(0, Math.min(1000, pm25));
    }

    // Override cleanup to handle additional services
    async cleanup() {
        this.airQualityService = null;
        await super.cleanup();
    }
}

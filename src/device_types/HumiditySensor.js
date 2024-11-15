// device_types/HumiditySensor.js

import HubitatPlatformAccessory from "../HubitatPlatformAccessory.js";

export default class HumiditySensor extends HubitatPlatformAccessory {
    constructor(platform, accessory) {
        super(platform, accessory);
        this.humidityService = null;
    }

    static relevantAttributes = ["humidity", "status", "tamper"];

    async configureServices() {
        try {
            this.humidityService = this.getOrAddService(this.Service.HumiditySensor, this.getServiceDisplayName(this.deviceData.name, "Humidity Sensor"));

            // Current Relative Humidity
            this.getOrAddCharacteristic(this.humidityService, this.Characteristic.CurrentRelativeHumidity, {
                getHandler: () => this.getHumidity(this.deviceData.attributes.humidity),
            });

            // Status Active
            this.getOrAddCharacteristic(this.humidityService, this.Characteristic.StatusActive, {
                getHandler: () => this.getStatusActive(this.deviceData.status),
            });

            // Status Tampered (if supported)
            this.getOrAddCharacteristic(this.humidityService, this.Characteristic.StatusTampered, {
                preReqChk: () => this.hasCapability("TamperAlert"),
                getHandler: () => this.getStatusTampered(this.deviceData.attributes.tamper),
                removeIfMissingPreReq: true,
            });

            return true;
        } catch (error) {
            this.logError(`HumiditySensor | ${this.deviceData.name} | Error configuring services:`, error);
            throw error;
        }
    }

    getHumidity(value) {
        // Clamp humidity value between 0-100
        return Math.max(0, Math.min(100, Math.round(parseFloat(value))));
    }

    getStatusActive(status) {
        return status === "ACTIVE";
    }

    getStatusTampered(status) {
        return status === "detected" ? this.Characteristic.StatusTampered.TAMPERED : this.Characteristic.StatusTampered.NOT_TAMPERED;
    }

    async handleAttributeUpdate(change) {
        const { attribute, value } = change;

        switch (attribute) {
            case "humidity":
                this.humidityService.getCharacteristic(this.Characteristic.CurrentRelativeHumidity).updateValue(this.getHumidity(value));
                break;

            case "status":
                this.humidityService.getCharacteristic(this.Characteristic.StatusActive).updateValue(this.getStatusActive(value));
                break;

            case "tamper":
                if (!this.hasCapability("TamperAlert")) return;
                this.humidityService.getCharacteristic(this.Characteristic.StatusTampered).updateValue(this.getStatusTampered(value));
                break;

            default:
                this.logDebug(`HumiditySensor | ${this.deviceData.name} | Unhandled attribute update: ${attribute} = ${value}`);
        }
    }

    // Override cleanup
    async cleanup() {
        this.humidityService = null;
        super.cleanup();
    }
}

// device_types/CarbonDioxide.js

import HubitatPlatformAccessory from "../HubitatPlatformAccessory.js";

export default class CarbonDioxideSensor extends HubitatPlatformAccessory {
    constructor(platform, accessory) {
        super(platform, accessory);
        this.co2Service = null;
    }

    static relevantAttributes = ["carbonDioxide", "status", "tamper"];

    async configureServices() {
        try {
            this.co2Service = this.getOrAddService(this.Service.CarbonDioxideSensor, this.getServiceDisplayName(this.deviceData.name, "Carbon Dioxide"));

            // CO2 Detected
            this.getOrAddCharacteristic(this.co2Service, this.Characteristic.CarbonDioxideDetected, {
                getHandler: () => this.getCO2Detected(this.deviceData.attributes.carbonDioxide),
            });

            // CO2 Level
            this.getOrAddCharacteristic(this.co2Service, this.Characteristic.CarbonDioxideLevel, {
                getHandler: () => this.getCO2Level(this.deviceData.attributes.carbonDioxide),
            });

            // Status Active
            this.getOrAddCharacteristic(this.co2Service, this.Characteristic.StatusActive, {
                getHandler: () => this.getStatusActive(this.deviceData.status),
            });

            // Status Tampered (if supported)
            this.getOrAddCharacteristic(this.co2Service, this.Characteristic.StatusTampered, {
                preReqChk: () => this.hasCapability("TamperAlert"),
                getHandler: () => this.getStatusTampered(this.deviceData.attributes.tamper),
                removeIfMissingPreReq: true,
            });

            return true;
        } catch (error) {
            this.logError(`CarbonDioxide | ${this.deviceData.name} | Error configuring services:`, error);
            throw error;
        }
    }

    getCO2Detected(value) {
        const level = parseInt(value);
        return level >= 2000 ? this.Characteristic.CarbonDioxideDetected.CO2_LEVELS_ABNORMAL : this.Characteristic.CarbonDioxideDetected.CO2_LEVELS_NORMAL;
    }

    getCO2Level(value) {
        const level = parseInt(value);
        // Clamp value between 0 and 100000 ppm (reasonable max for indoor sensors)
        return Math.max(0, Math.min(100000, level));
    }

    getStatusActive(value) {
        return value === "ACTIVE";
    }

    getStatusTampered(value) {
        return value === "detected" ? this.Characteristic.StatusTampered.TAMPERED : this.Characteristic.StatusTampered.NOT_TAMPERED;
    }

    async handleAttributeUpdate(change) {
        const { attribute, value } = change;

        switch (attribute) {
            case "carbonDioxide":
                this.co2Service.getCharacteristic(this.Characteristic.CarbonDioxideDetected).updateValue(this.getCO2Detected(value));
                this.co2Service.getCharacteristic(this.Characteristic.CarbonDioxideLevel).updateValue(this.getCO2Level(value));
                break;

            case "status":
                this.co2Service.getCharacteristic(this.Characteristic.StatusActive).updateValue(this.getStatusActive(value));
                break;

            case "tamper":
                if (!this.hasCapability("TamperAlert")) return;
                this.co2Service.getCharacteristic(this.Characteristic.StatusTampered).updateValue(this.getStatusTampered(value));
                break;

            default:
                this.logDebug(`CarbonDioxide | ${this.deviceData.name} | Unhandled attribute update: ${attribute} = ${value}`);
        }
    }

    // Override cleanup
    async cleanup() {
        this.co2Service = null;
        super.cleanup();
    }
}

// device_types/CarbonDioxide.js

import HubitatPlatformAccessory from "../HubitatPlatformAccessory.js";

export default class CarbonDioxideSensor extends HubitatPlatformAccessory {
    constructor(platform, accessory) {
        super(platform, accessory);
        this.co2Service = null;
    }

    async configureServices() {
        try {
            this.co2Service = this.getOrAddService(this.Service.CarbonDioxideSensor);
            this.markServiceForRetention(this.co2Service);

            // CO2 Detected
            this.getOrAddCharacteristic(this.co2Service, this.Characteristic.CarbonDioxideDetected, {
                getHandler: () => this.getCO2Detected(),
            });

            // CO2 Level
            this.getOrAddCharacteristic(this.co2Service, this.Characteristic.CarbonDioxideLevel, {
                getHandler: () => this.getCO2Level(),
            });

            // Status Active
            this.getOrAddCharacteristic(this.co2Service, this.Characteristic.StatusActive, {
                getHandler: () => this.getStatusActive(),
            });

            // Status Tampered (if supported)
            this.getOrAddCharacteristic(this.co2Service, this.Characteristic.StatusTampered, {
                preReqChk: () => this.hasCapability("TamperAlert"),
                getHandler: () => this.getStatusTampered(),
                removeIfMissingPreReq: true,
            });

            // Status Low Battery (if supported)
            this.getOrAddCharacteristic(this.co2Service, this.Characteristic.StatusLowBattery, {
                preReqChk: () => this.hasCapability("Battery"),
                getHandler: () => this.getStatusLowBattery(),
                removeIfMissingPreReq: true,
            });

            return true;
        } catch (error) {
            this.logError("Error configuring CO2 sensor services:", error);
            throw error;
        }
    }

    getCO2Detected() {
        const level = parseInt(this.deviceData.attributes.carbonDioxide);
        return level >= 2000 ? this.Characteristic.CarbonDioxideDetected.CO2_LEVELS_ABNORMAL : this.Characteristic.CarbonDioxideDetected.CO2_LEVELS_NORMAL;
    }

    getCO2Level() {
        const level = parseInt(this.deviceData.attributes.carbonDioxide);
        // Clamp value between 0 and 100000 ppm (reasonable max for indoor sensors)
        return Math.max(0, Math.min(100000, level));
    }

    getStatusActive() {
        return this.deviceData.attributes.status === "online";
    }

    getStatusTampered() {
        return this.deviceData.attributes.tamper === "detected" ? this.Characteristic.StatusTampered.TAMPERED : this.Characteristic.StatusTampered.NOT_TAMPERED;
    }

    getStatusLowBattery() {
        const battery = this.deviceData.attributes.battery;
        return parseInt(battery) < 20 ? this.Characteristic.StatusLowBattery.BATTERY_LEVEL_LOW : this.Characteristic.StatusLowBattery.BATTERY_LEVEL_NORMAL;
    }

    async handleAttributeUpdate(attribute, value) {
        this.updateDeviceAttribute(attribute, value);
        switch (attribute) {
            case "carbonDioxide":
                const level = parseInt(value);
                const detected = level >= 2000 ? this.Characteristic.CarbonDioxideDetected.CO2_LEVELS_ABNORMAL : this.Characteristic.CarbonDioxideDetected.CO2_LEVELS_NORMAL;

                this.co2Service.getCharacteristic(this.Characteristic.CarbonDioxideDetected).updateValue(detected);

                this.co2Service.getCharacteristic(this.Characteristic.CarbonDioxideLevel).updateValue(Math.max(0, Math.min(100000, level)));
                break;

            case "status":
                this.co2Service.getCharacteristic(this.Characteristic.StatusActive).updateValue(value === "online");
                break;

            case "tamper":
                if (!this.hasCapability("TamperAlert")) return;
                this.co2Service.getCharacteristic(this.Characteristic.StatusTampered).updateValue(value === "detected" ? this.Characteristic.StatusTampered.TAMPERED : this.Characteristic.StatusTampered.NOT_TAMPERED);
                break;

            case "battery":
                if (!this.hasCapability("Battery")) return;
                this.co2Service.getCharacteristic(this.Characteristic.StatusLowBattery).updateValue(parseInt(value) < 20 ? this.Characteristic.StatusLowBattery.BATTERY_LEVEL_LOW : this.Characteristic.StatusLowBattery.BATTERY_LEVEL_NORMAL);
                break;

            default:
                this.logDebug(`Unhandled attribute update: ${attribute} = ${value}`);
        }
    }

    // Override cleanup
    async cleanup() {
        this.co2Service = null;
        await super.cleanup();
    }
}

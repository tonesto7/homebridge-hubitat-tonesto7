// device_types/CarbonMonoxide.js

import HubitatPlatformAccessory from "../HubitatPlatformAccessory.js";

export default class CarbonMonoxideSensor extends HubitatPlatformAccessory {
    constructor(platform, accessory) {
        super(platform, accessory);
        this.coService = null;
    }

    async configureServices() {
        try {
            this.coService = this.getOrAddService(this.Service.CarbonMonoxideSensor);
            // this.markServiceForRetention(this.coService);

            // CO Detected
            this.getOrAddCharacteristic(this.coService, this.Characteristic.CarbonMonoxideDetected, {
                getHandler: () => this.getCODetected(),
            });

            // Status Active
            this.getOrAddCharacteristic(this.coService, this.Characteristic.StatusActive, {
                getHandler: () => this.getStatusActive(),
            });

            // Status Tampered (if supported)
            this.getOrAddCharacteristic(this.coService, this.Characteristic.StatusTampered, {
                preReqChk: () => this.hasCapability("TamperAlert"),
                getHandler: () => this.getStatusTampered(),
                removeIfMissingPreReq: true,
            });

            // Status Low Battery (if supported)
            this.getOrAddCharacteristic(this.coService, this.Characteristic.StatusLowBattery, {
                preReqChk: () => this.hasCapability("Battery"),
                getHandler: () => this.getStatusLowBattery(),
                removeIfMissingPreReq: true,
            });

            return true;
        } catch (error) {
            this.logError("Error configuring CO sensor services:", error);
            throw error;
        }
    }

    getCODetected() {
        return this.deviceData.attributes.carbonMonoxide === "clear" ? this.Characteristic.CarbonMonoxideDetected.CO_LEVELS_NORMAL : this.Characteristic.CarbonMonoxideDetected.CO_LEVELS_ABNORMAL;
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
            case "carbonMonoxide":
                this.coService.getCharacteristic(this.Characteristic.CarbonMonoxideDetected).updateValue(value === "clear" ? this.Characteristic.CarbonMonoxideDetected.CO_LEVELS_NORMAL : this.Characteristic.CarbonMonoxideDetected.CO_LEVELS_ABNORMAL);
                break;

            case "status":
                this.coService.getCharacteristic(this.Characteristic.StatusActive).updateValue(value === "online");
                break;

            case "tamper":
                if (!this.hasCapability("TamperAlert")) return;
                this.coService.getCharacteristic(this.Characteristic.StatusTampered).updateValue(value === "detected" ? this.Characteristic.StatusTampered.TAMPERED : this.Characteristic.StatusTampered.NOT_TAMPERED);
                break;

            case "battery":
                if (!this.hasCapability("Battery")) return;
                this.coService.getCharacteristic(this.Characteristic.StatusLowBattery).updateValue(parseInt(value) < 20 ? this.Characteristic.StatusLowBattery.BATTERY_LEVEL_LOW : this.Characteristic.StatusLowBattery.BATTERY_LEVEL_NORMAL);
                break;

            default:
                this.logDebug(`Unhandled attribute update: ${attribute} = ${value}`);
        }
    }

    // Override cleanup
    async cleanup() {
        this.coService = null;
        await super.cleanup();
    }
}

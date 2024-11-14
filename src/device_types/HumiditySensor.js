// device_types/HumiditySensor.js

import HubitatPlatformAccessory from "../HubitatPlatformAccessory.js";

export default class HumiditySensor extends HubitatPlatformAccessory {
    constructor(platform, accessory) {
        super(platform, accessory);
        this.humidityService = null;
    }

    async configureServices() {
        try {
            this.humidityService = this.getOrAddService(this.Service.HumiditySensor);
            // this.markServiceForRetention(this.humidityService);

            // Current Relative Humidity
            this.getOrAddCharacteristic(this.humidityService, this.Characteristic.CurrentRelativeHumidity, {
                getHandler: () => this.getHumidity(),
            });

            // Status Active
            this.getOrAddCharacteristic(this.humidityService, this.Characteristic.StatusActive, {
                getHandler: () => this.getStatusActive(),
            });

            // Status Tampered (if supported)
            this.getOrAddCharacteristic(this.humidityService, this.Characteristic.StatusTampered, {
                preReqChk: () => this.hasCapability("TamperAlert"),
                getHandler: () => this.getStatusTampered(),
                removeIfMissingPreReq: true,
            });

            // Status Low Battery (if supported)
            this.getOrAddCharacteristic(this.humidityService, this.Characteristic.StatusLowBattery, {
                preReqChk: () => this.hasCapability("Battery"),
                getHandler: () => this.getStatusLowBattery(),
                removeIfMissingPreReq: true,
            });

            return true;
        } catch (error) {
            this.logError("Error configuring humidity sensor services:", error);
            throw error;
        }
    }

    getHumidity() {
        // Clamp humidity value between 0-100
        return Math.max(0, Math.min(100, Math.round(parseFloat(this.deviceData.attributes.humidity))));
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
            case "humidity":
                const humidity = Math.max(0, Math.min(100, Math.round(parseFloat(value))));
                this.humidityService.getCharacteristic(this.Characteristic.CurrentRelativeHumidity).updateValue(humidity);
                break;

            case "status":
                this.humidityService.getCharacteristic(this.Characteristic.StatusActive).updateValue(value === "online");
                break;

            case "tamper":
                if (!this.hasCapability("TamperAlert")) return;
                this.humidityService.getCharacteristic(this.Characteristic.StatusTampered).updateValue(value === "detected" ? this.Characteristic.StatusTampered.TAMPERED : this.Characteristic.StatusTampered.NOT_TAMPERED);
                break;

            case "battery":
                if (!this.hasCapability("Battery")) return;
                this.humidityService.getCharacteristic(this.Characteristic.StatusLowBattery).updateValue(parseInt(value) < 20 ? this.Characteristic.StatusLowBattery.BATTERY_LEVEL_LOW : this.Characteristic.StatusLowBattery.BATTERY_LEVEL_NORMAL);
                break;

            default:
                this.logDebug(`Unhandled attribute update: ${attribute} = ${value}`);
        }
    }

    // Override cleanup
    async cleanup() {
        this.humidityService = null;
        await super.cleanup();
    }
}

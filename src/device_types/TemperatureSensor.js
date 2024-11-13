// device_types/TemperatureSensor.js

import HubitatPlatformAccessory from "../HubitatPlatformAccessory.js";

export default class TemperatureSensor extends HubitatPlatformAccessory {
    constructor(platform, accessory) {
        super(platform, accessory);
        this.temperatureService = null;
    }

    async configureServices() {
        try {
            this.temperatureService = this.getOrAddService(this.Service.TemperatureSensor);
            this.markServiceForRetention(this.temperatureService);

            // Current Temperature
            this.getOrAddCharacteristic(this.temperatureService, this.Characteristic.CurrentTemperature, {
                getHandler: () => this.getCurrentTemperature(),
                props: {
                    minValue: -100,
                    maxValue: 200,
                },
            });

            // Status Tampered (if supported)
            this.getOrAddCharacteristic(this.temperatureService, this.Characteristic.StatusTampered, {
                preReqChk: () => this.hasCapability("TamperAlert"),
                getHandler: () => this.getStatusTampered(),
                removeIfMissingPreReq: true,
            });

            // Status Low Battery (if supported)
            this.getOrAddCharacteristic(this.temperatureService, this.Characteristic.StatusLowBattery, {
                preReqChk: () => this.hasCapability("Battery"),
                getHandler: () => this.getStatusLowBattery(),
                removeIfMissingPreReq: true,
            });

            return true;
        } catch (error) {
            this.logError("Error configuring temperature sensor services:", error);
            throw error;
        }
    }

    getCurrentTemperature() {
        return this.platform.accessories.transforms.tempConversion(this.deviceData.attributes.temperature);
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
            case "temperature":
                this.temperatureService.getCharacteristic(this.Characteristic.CurrentTemperature).updateValue(this.platform.accessories.transforms.tempConversion(value));
                break;

            case "tamper":
                if (!this.hasCapability("TamperAlert")) return;
                this.temperatureService.getCharacteristic(this.Characteristic.StatusTampered).updateValue(value === "detected" ? this.Characteristic.StatusTampered.TAMPERED : this.Characteristic.StatusTampered.NOT_TAMPERED);
                break;

            case "battery":
                if (!this.hasCapability("Battery")) return;
                this.temperatureService.getCharacteristic(this.Characteristic.StatusLowBattery).updateValue(parseInt(value) < 20 ? this.Characteristic.StatusLowBattery.BATTERY_LEVEL_LOW : this.Characteristic.StatusLowBattery.BATTERY_LEVEL_NORMAL);
                break;

            default:
                this.logDebug(`Unhandled attribute update: ${attribute} = ${value}`);
        }
    }

    // Override cleanup
    async cleanup() {
        this.temperatureService = null;
        await super.cleanup();
    }
}

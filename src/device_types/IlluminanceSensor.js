// device_types/IlluminanceSensor.js

import HubitatPlatformAccessory from "../HubitatPlatformAccessory.js";

export default class IlluminanceSensor extends HubitatPlatformAccessory {
    constructor(platform, accessory) {
        super(platform, accessory);
        this.lightSensorService = null;
    }

    async configureServices() {
        try {
            this.lightSensorService = this.getOrAddService(this.Service.LightSensor);
            this.markServiceForRetention(this.lightSensorService);

            // Current Ambient Light Level
            this.getOrAddCharacteristic(this.lightSensorService, this.Characteristic.CurrentAmbientLightLevel, {
                getHandler: () => this.getLightLevel(),
                props: {
                    minValue: 0,
                    maxValue: 100000,
                },
            });

            // Status Active
            this.getOrAddCharacteristic(this.lightSensorService, this.Characteristic.StatusActive, {
                getHandler: () => this.getStatusActive(),
            });

            // Status Tampered (if supported)
            this.getOrAddCharacteristic(this.lightSensorService, this.Characteristic.StatusTampered, {
                preReqChk: () => this.hasCapability("TamperAlert"),
                getHandler: () => this.getStatusTampered(),
                removeIfMissingPreReq: true,
            });

            // Status Low Battery (if supported)
            this.getOrAddCharacteristic(this.lightSensorService, this.Characteristic.StatusLowBattery, {
                preReqChk: () => this.hasCapability("Battery"),
                getHandler: () => this.getStatusLowBattery(),
                removeIfMissingPreReq: true,
            });

            return true;
        } catch (error) {
            this.logError("Error configuring illuminance sensor services:", error);
            throw error;
        }
    }

    getLightLevel() {
        const illuminance = parseFloat(this.deviceData.attributes.illuminance);
        if (isNaN(illuminance)) return undefined;
        return Math.round(Math.ceil(illuminance));
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
            case "illuminance":
                const illuminance = parseFloat(value);
                if (!isNaN(illuminance)) {
                    this.lightSensorService.getCharacteristic(this.Characteristic.CurrentAmbientLightLevel).updateValue(Math.round(Math.ceil(illuminance)));
                }
                break;

            case "status":
                this.lightSensorService.getCharacteristic(this.Characteristic.StatusActive).updateValue(value === "online");
                break;

            case "tamper":
                if (!this.hasCapability("TamperAlert")) return;
                this.lightSensorService.getCharacteristic(this.Characteristic.StatusTampered).updateValue(value === "detected" ? this.Characteristic.StatusTampered.TAMPERED : this.Characteristic.StatusTampered.NOT_TAMPERED);
                break;

            case "battery":
                if (!this.hasCapability("Battery")) return;
                this.lightSensorService.getCharacteristic(this.Characteristic.StatusLowBattery).updateValue(parseInt(value) < 20 ? this.Characteristic.StatusLowBattery.BATTERY_LEVEL_LOW : this.Characteristic.StatusLowBattery.BATTERY_LEVEL_NORMAL);
                break;

            default:
                this.logDebug(`Unhandled attribute update: ${attribute} = ${value}`);
        }
    }

    // Override cleanup
    async cleanup() {
        this.lightSensorService = null;
        await super.cleanup();
    }
}

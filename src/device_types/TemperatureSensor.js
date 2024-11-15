// device_types/TemperatureSensor.js

import HubitatPlatformAccessory from "../HubitatPlatformAccessory.js";

export default class TemperatureSensor extends HubitatPlatformAccessory {
    constructor(platform, accessory) {
        super(platform, accessory);
        this.temperatureService = null;
    }

    static relevantAttributes = ["temperature", "tamper", "status"];

    async configureServices() {
        try {
            this.temperatureService = this.getOrAddService(this.Service.TemperatureSensor, this.getServiceDisplayName(this.deviceData.name, "Temp Sensor"));

            // Current Temperature
            this.getOrAddCharacteristic(this.temperatureService, this.Characteristic.CurrentTemperature, {
                getHandler: () => this.getCurrentTemperature(this.deviceData.attributes.temperature),
                props: {
                    minValue: -100,
                    maxValue: 200,
                },
            });

            // Status Active
            this.getOrAddCharacteristic(this.temperatureService, this.Characteristic.StatusActive, {
                getHandler: () => this.getStatusActive(this.deviceData.status),
            });

            // Status Tampered (if supported)
            this.getOrAddCharacteristic(this.temperatureService, this.Characteristic.StatusTampered, {
                preReqChk: () => this.hasCapability("TamperAlert"),
                getHandler: () => this.getStatusTampered(this.deviceData.attributes.tamper),
                removeIfMissingPreReq: true,
            });

            return true;
        } catch (error) {
            this.logError(`TemperatureSensor | ${this.deviceData.name} | Error configuring services:`, error);
            throw error;
        }
    }

    getCurrentTemperature(value) {
        return this.transformTemperatureToHomeKit(value);
    }

    getStatusTampered(value) {
        return value === "detected" ? this.Characteristic.StatusTampered.TAMPERED : this.Characteristic.StatusTampered.NOT_TAMPERED;
    }

    getStatusActive(value) {
        return value === "ACTIVE";
    }

    async handleAttributeUpdate(change) {
        const { attribute, value } = change;

        switch (attribute) {
            case "temperature":
                this.temperatureService.getCharacteristic(this.Characteristic.CurrentTemperature).updateValue(this.getCurrentTemperature(value));
                break;

            case "tamper":
                if (!this.hasCapability("TamperAlert")) return;
                this.temperatureService.getCharacteristic(this.Characteristic.StatusTampered).updateValue(this.getStatusTampered(value));
                break;

            case "status":
                this.temperatureService.getCharacteristic(this.Characteristic.StatusActive).updateValue(this.getStatusActive(value));
                break;

            default:
                this.logDebug(`TemperatureSensor | ${this.deviceData.name} | Unhandled attribute update: ${attribute} = ${value}`);
                break;
        }
    }

    async cleanup() {
        this.temperatureService = null;
        super.cleanup();
    }
}

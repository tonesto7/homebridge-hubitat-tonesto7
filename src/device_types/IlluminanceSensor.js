// device_types/IlluminanceSensor.js

import HubitatPlatformAccessory from "../HubitatPlatformAccessory.js";

export default class IlluminanceSensor extends HubitatPlatformAccessory {
    constructor(platform, accessory) {
        super(platform, accessory);
        this.lightSensorService = null;
    }

    static relevantAttributes = ["illuminance", "status", "tamper"];

    async configureServices() {
        try {
            this.lightSensorService = this.getOrAddService(this.Service.LightSensor, this.getServiceDisplayName(this.deviceData.name, "Light Sensor"));

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
                getHandler: () => this.getStatusActive(this.deviceData.status),
            });

            // Status Tampered (if supported)
            this.getOrAddCharacteristic(this.lightSensorService, this.Characteristic.StatusTampered, {
                preReqChk: () => this.hasCapability("TamperAlert"),
                getHandler: () => this.getStatusTampered(this.deviceData.attributes.tamper),
                removeIfMissingPreReq: true,
            });

            return true;
        } catch (error) {
            this.logError(`IlluminanceSensor | ${this.deviceData.name} | Error configuring services:`, error);
            throw error;
        }
    }

    getLightLevel() {
        const illuminance = parseFloat(this.deviceData.attributes.illuminance);
        if (isNaN(illuminance)) return undefined;
        return Math.round(Math.ceil(illuminance));
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
            case "illuminance":
                const illuminance = this.getLightLevel(value);
                if (!isNaN(illuminance)) {
                    this.lightSensorService.getCharacteristic(this.Characteristic.CurrentAmbientLightLevel).updateValue(illuminance);
                }
                break;

            case "status":
                this.lightSensorService.getCharacteristic(this.Characteristic.StatusActive).updateValue(this.getStatusActive(value));
                break;

            case "tamper":
                if (!this.hasCapability("TamperAlert")) return;
                this.lightSensorService.getCharacteristic(this.Characteristic.StatusTampered).updateValue(this.getStatusTampered(value));
                break;

            default:
                this.logDebug(`IlluminanceSensor | ${this.deviceData.name} | Unhandled attribute update: ${attribute} = ${value}`);
        }
    }

    // Override cleanup
    async cleanup() {
        this.lightSensorService = null;
        super.cleanup();
    }
}

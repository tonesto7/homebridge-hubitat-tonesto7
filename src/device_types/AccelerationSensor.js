// device_types/AccelerationSensor.js

import HubitatPlatformAccessory from "../HubitatPlatformAccessory.js";

export default class AccelerationSensor extends HubitatPlatformAccessory {
    constructor(platform, accessory) {
        super(platform, accessory);
        this.accelerationService = null;
    }

    static relevantAttributes = ["acceleration", "status", "tamper"];

    async configureServices() {
        try {
            // Use motion sensor service type for acceleration
            this.accelerationService = this.getOrAddService(this.Service.MotionSensor, this.getServiceDisplayName(this.deviceData.name, "Acceleration Sensor"));

            // Motion Detected (used for acceleration state)
            this.getOrAddCharacteristic(this.accelerationService, this.Characteristic.MotionDetected, {
                getHandler: () => this.deviceData.attributes.acceleration === "active",
            });

            // Status Active
            this.getOrAddCharacteristic(this.accelerationService, this.Characteristic.StatusActive, {
                getHandler: () => this.deviceData.status === "ACTIVE",
            });

            // Status Tampered (if supported)
            this.getOrAddCharacteristic(this.accelerationService, this.Characteristic.StatusTampered, {
                preReqChk: () => this.hasCapability("TamperAlert"),
                getHandler: () => (this.deviceData.attributes.tamper === "detected" ? this.Characteristic.StatusTampered.TAMPERED : this.Characteristic.StatusTampered.NOT_TAMPERED),
                removeIfMissingPreReq: true,
            });

            return true;
        } catch (error) {
            this.logError(`AccelerationSensor | ${this.deviceData.name} | Error configuring services:`, error);
            throw error;
        }
    }

    async handleAttributeUpdate(change) {
        const { attribute, value } = change;

        switch (attribute) {
            case "acceleration":
                this.accelerationService.getCharacteristic(this.Characteristic.MotionDetected).updateValue(value === "active");
                break;

            case "status":
                this.accelerationService.getCharacteristic(this.Characteristic.StatusActive).updateValue(value === "ACTIVE");
                break;

            case "tamper":
                if (!this.hasCapability("TamperAlert")) return;

                this.accelerationService.getCharacteristic(this.Characteristic.StatusTampered).updateValue(value === "detected" ? this.Characteristic.StatusTampered.TAMPERED : this.Characteristic.StatusTampered.NOT_TAMPERED);
                break;

            case "battery":
                this.accelerationService.getCharacteristic(this.Characteristic.StatusLowBattery).updateValue(parseInt(value) < 20 ? this.Characteristic.StatusLowBattery.BATTERY_LEVEL_LOW : this.Characteristic.StatusLowBattery.BATTERY_LEVEL_NORMAL);
                break;

            default:
                this.logDebug(`AccelerationSensor | ${this.deviceData.name} | Unhandled attribute update: ${attribute} = ${value}`);
        }
    }

    // Override cleanup to handle additional services
    async cleanup() {
        this.accelerationService = null;
        super.cleanup();
    }
}

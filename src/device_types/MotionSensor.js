// device_types/MotionSensor.js

import HubitatPlatformAccessory from "../HubitatPlatformAccessory.js";

export default class MotionSensor extends HubitatPlatformAccessory {
    constructor(platform, accessory) {
        super(platform, accessory);
        this.motionService = null;
    }

    static relevantAttributes = ["motion", "status", "tamper"];

    async configureServices() {
        try {
            this.motionService = this.getOrAddService(this.Service.MotionSensor, this.getServiceDisplayName(this.deviceData.name, "Motion Sensor"));

            // Motion Detected
            this.getOrAddCharacteristic(this.motionService, this.Characteristic.MotionDetected, {
                getHandler: () => this.getMotionDetected(this.deviceData.attributes.motion),
            });

            // Status Active
            this.getOrAddCharacteristic(this.motionService, this.Characteristic.StatusActive, {
                getHandler: () => this.getStatusActive(this.deviceData.status),
            });

            // Status Tampered (if supported)
            this.getOrAddCharacteristic(this.motionService, this.Characteristic.StatusTampered, {
                preReqChk: () => this.hasCapability("TamperAlert"),
                getHandler: () => this.getStatusTampered(this.deviceData.attributes.tamper),
                removeIfMissingPreReq: true,
            });

            return true;
        } catch (error) {
            this.logError(`MotionSensor | ${this.deviceData.name} | Error configuring services:`, error);
            throw error;
        }
    }

    getMotionDetected(value) {
        return value === "active";
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
            case "motion":
                this.motionService.getCharacteristic(this.Characteristic.MotionDetected).updateValue(this.getMotionDetected(value));
                break;

            case "status":
                this.motionService.getCharacteristic(this.Characteristic.StatusActive).updateValue(this.getStatusActive(value));
                break;

            case "tamper":
                if (!this.hasCapability("TamperAlert")) return;
                this.motionService.getCharacteristic(this.Characteristic.StatusTampered).updateValue(this.getStatusTampered(value));
                break;

            default:
                this.logDebug(`MotionSensor | ${this.deviceData.name} | Unhandled attribute update: ${attribute} = ${value}`);
        }
    }

    // Override cleanup
    async cleanup() {
        this.motionService = null;
        super.cleanup();
    }
}

// device_types/SmokeDetector.js

import HubitatBaseAccessory from "./BaseAccessory.js";

export default class SmokeDetector extends HubitatBaseAccessory {
    constructor(platform, accessory) {
        super(platform, accessory);
        this.smokeService = null;
    }

    static relevantAttributes = ["smoke", "status", "tamper"];

    async configureServices() {
        try {
            this.smokeService = this.getOrAddService(this.Service.SmokeSensor, this.cleanServiceDisplayName(this.deviceData.name, "Smoke Detector"));

            // Smoke Detected
            this.getOrAddCharacteristic(this.smokeService, this.Characteristic.SmokeDetected, {
                getHandler: () => this.getSmokeDetected(this.deviceData.attributes.smoke),
            });

            // Status Active
            this.getOrAddCharacteristic(this.smokeService, this.Characteristic.StatusActive, {
                getHandler: () => this.getStatusActive(this.deviceData.status),
            });

            // Status Tampered (if supported)
            this.getOrAddCharacteristic(this.smokeService, this.Characteristic.StatusTampered, {
                preReqChk: () => this.hasCapability("TamperAlert"),
                getHandler: () => this.getStatusTampered(this.deviceData.attributes.tamper),
                removeIfMissingPreReq: true,
            });

            return true;
        } catch (error) {
            this.logManager.logError(`SmokeDetector | ${this.deviceData.name} | Error configuring services:`, error);
            throw error;
        }
    }

    getSmokeDetected(value) {
        return value === "clear" ? this.Characteristic.SmokeDetected.SMOKE_NOT_DETECTED : this.Characteristic.SmokeDetected.SMOKE_DETECTED;
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
            case "smoke":
                this.smokeService.getCharacteristic(this.Characteristic.SmokeDetected).updateValue(this.getSmokeDetected(value));
                break;

            case "status":
                this.smokeService.getCharacteristic(this.Characteristic.StatusActive).updateValue(this.getStatusActive(value));
                break;

            case "tamper":
                if (!this.hasCapability("TamperAlert")) return;
                this.smokeService.getCharacteristic(this.Characteristic.StatusTampered).updateValue(this.getStatusTampered(value));
                break;

            default:
                this.logManager.logDebug(`SmokeDetector | ${this.deviceData.name} | Unhandled attribute update: ${attribute} = ${value}`);
        }
    }

    // Override cleanup
    async cleanup() {
        this.smokeService = null;
        super.cleanup();
    }
}

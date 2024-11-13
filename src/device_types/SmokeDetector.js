// device_types/SmokeDetector.js

import HubitatPlatformAccessory from "../HubitatPlatformAccessory.js";

export default class SmokeDetector extends HubitatPlatformAccessory {
    constructor(platform, accessory) {
        super(platform, accessory);
        this.smokeService = null;
    }

    async configureServices() {
        try {
            this.smokeService = this.getOrAddService(this.Service.SmokeSensor);
            this.markServiceForRetention(this.smokeService);

            // Smoke Detected
            this.getOrAddCharacteristic(this.smokeService, this.Characteristic.SmokeDetected, {
                getHandler: () => this.getSmokeDetected(),
            });

            // Status Active
            this.getOrAddCharacteristic(this.smokeService, this.Characteristic.StatusActive, {
                getHandler: () => this.getStatusActive(),
            });

            // Status Tampered (if supported)
            this.getOrAddCharacteristic(this.smokeService, this.Characteristic.StatusTampered, {
                preReqChk: () => this.hasCapability("TamperAlert"),
                getHandler: () => this.getStatusTampered(),
                removeIfMissingPreReq: true,
            });

            return true;
        } catch (error) {
            this.logError("Error configuring smoke detector services:", error);
            throw error;
        }
    }

    getSmokeDetected() {
        return this.deviceData.attributes.smoke === "clear" ? this.Characteristic.SmokeDetected.SMOKE_NOT_DETECTED : this.Characteristic.SmokeDetected.SMOKE_DETECTED;
    }

    getStatusActive() {
        return this.deviceData.attributes.status === "online";
    }

    getStatusTampered() {
        return this.deviceData.attributes.tamper === "detected" ? this.Characteristic.StatusTampered.TAMPERED : this.Characteristic.StatusTampered.NOT_TAMPERED;
    }

    async handleAttributeUpdate(attribute, value) {
        this.updateDeviceAttribute(attribute, value);

        switch (attribute) {
            case "smoke":
                this.smokeService.getCharacteristic(this.Characteristic.SmokeDetected).updateValue(value === "clear" ? this.Characteristic.SmokeDetected.SMOKE_NOT_DETECTED : this.Characteristic.SmokeDetected.SMOKE_DETECTED);
                break;

            case "status":
                this.smokeService.getCharacteristic(this.Characteristic.StatusActive).updateValue(value === "online");
                break;

            case "tamper":
                if (!this.hasCapability("TamperAlert")) return;
                this.smokeService.getCharacteristic(this.Characteristic.StatusTampered).updateValue(value === "detected" ? this.Characteristic.StatusTampered.TAMPERED : this.Characteristic.StatusTampered.NOT_TAMPERED);
                break;

            default:
                this.logDebug(`Unhandled attribute update: ${attribute} = ${value}`);
        }
    }

    // Override cleanup
    async cleanup() {
        this.smokeService = null;
        await super.cleanup();
    }
}

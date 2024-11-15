// device_types/LeakSensor.js

import HubitatPlatformAccessory from "../HubitatPlatformAccessory.js";

export default class LeakSensor extends HubitatPlatformAccessory {
    constructor(platform, accessory) {
        super(platform, accessory);
        this.leakService = null;
    }

    static relevantAttributes = ["water", "status", "tamper"];

    async configureServices() {
        try {
            this.leakService = this.getOrAddService(this.Service.LeakSensor, this.getServiceDisplayName(this.deviceData.name, "Leak Sensor"));

            // Leak Detected
            this.getOrAddCharacteristic(this.leakService, this.Characteristic.LeakDetected, {
                getHandler: () => this.getLeakDetected(this.deviceData.attributes.water),
            });

            // Status Active
            this.getOrAddCharacteristic(this.leakService, this.Characteristic.StatusActive, {
                getHandler: () => this.getStatusActive(),
            });

            // Status Tampered (if supported)
            this.getOrAddCharacteristic(this.leakService, this.Characteristic.StatusTampered, {
                preReqChk: () => this.hasCapability("TamperAlert"),
                getHandler: () => this.getStatusTampered(),
                removeIfMissingPreReq: true,
            });

            return true;
        } catch (error) {
            this.logError(`LeakSensor | ${this.deviceData.name} | Error configuring services:`, error);
            throw error;
        }
    }

    getLeakDetected(status) {
        return status === "dry" ? this.Characteristic.LeakDetected.LEAK_NOT_DETECTED : this.Characteristic.LeakDetected.LEAK_DETECTED;
    }

    getStatusActive(status) {
        return status === "ACTIVE";
    }

    getStatusTampered(status) {
        return status === "detected" ? this.Characteristic.StatusTampered.TAMPERED : this.Characteristic.StatusTampered.NOT_TAMPERED;
    }

    async handleAttributeUpdate(attribute, value) {
        this.updateDeviceAttribute(attribute, value);

        switch (attribute) {
            case "water":
                this.leakService.getCharacteristic(this.Characteristic.LeakDetected).updateValue(this.getLeakDetected(value));
                break;

            case "status":
                this.leakService.getCharacteristic(this.Characteristic.StatusActive).updateValue(this.getStatusActive(value));
                break;

            case "tamper":
                if (!this.hasCapability("TamperAlert")) return;
                this.leakService.getCharacteristic(this.Characteristic.StatusTampered).updateValue(this.getStatusTampered(value));
                break;

            default:
                this.logDebug(`LeakSensor | ${this.deviceData.name} | Unhandled attribute update: ${attribute} = ${value}`);
        }
    }

    // Override cleanup
    async cleanup() {
        this.leakService = null;
        super.cleanup();
    }
}

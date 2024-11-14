// device_types/MotionSensor.js

import HubitatPlatformAccessory from "../HubitatPlatformAccessory.js";

export default class MotionSensor extends HubitatPlatformAccessory {
    constructor(platform, accessory) {
        super(platform, accessory);
        this.motionService = null;
    }

    async configureServices() {
        try {
            this.motionService = this.getOrAddService(this.Service.MotionSensor);
            // console.log(`${this.deviceData.name} | Motion service created: ${this.motionService.UUID}`);
            // this.markServiceForRetention(this.motionService);
            // console.log(`${this.deviceData.name} | Active services after marking:`, Array.from(this.activeServices));

            // Motion Detected
            this.getOrAddCharacteristic(this.motionService, this.Characteristic.MotionDetected, {
                getHandler: () => this.getMotionDetected(),
            });

            // Status Active
            this.getOrAddCharacteristic(this.motionService, this.Characteristic.StatusActive, {
                getHandler: () => this.getStatusActive(),
            });

            // Status Tampered (if supported)
            this.getOrAddCharacteristic(this.motionService, this.Characteristic.StatusTampered, {
                preReqChk: () => this.hasCapability("TamperAlert"),
                getHandler: () => this.getStatusTampered(),
                removeIfMissingPreReq: true,
            });

            // Status Low Battery (if supported)
            this.getOrAddCharacteristic(this.motionService, this.Characteristic.StatusLowBattery, {
                preReqChk: () => this.hasCapability("Battery"),
                getHandler: () => this.getStatusLowBattery(),
                removeIfMissingPreReq: true,
            });

            return true;
        } catch (error) {
            console.error("Error configuring motion sensor services:", error);
            throw error;
        }
    }

    getMotionDetected() {
        return this.deviceData.attributes.motion === "active";
    }

    getStatusActive() {
        return this.deviceData.status === "ACTIVE";
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
            case "motion":
                this.motionService.getCharacteristic(this.Characteristic.MotionDetected).updateValue(value === "active");
                break;

            case "status":
                this.motionService.getCharacteristic(this.Characteristic.StatusActive).updateValue(value === "online");
                break;

            case "tamper":
                if (!this.hasCapability("TamperAlert")) return;
                this.motionService.getCharacteristic(this.Characteristic.StatusTampered).updateValue(value === "detected" ? this.Characteristic.StatusTampered.TAMPERED : this.Characteristic.StatusTampered.NOT_TAMPERED);
                break;

            case "battery":
                if (!this.hasCapability("Battery")) return;
                this.motionService.getCharacteristic(this.Characteristic.StatusLowBattery).updateValue(parseInt(value) < 20 ? this.Characteristic.StatusLowBattery.BATTERY_LEVEL_LOW : this.Characteristic.StatusLowBattery.BATTERY_LEVEL_NORMAL);
                break;

            default:
                this.logDebug(`Unhandled attribute update: ${attribute} = ${value}`);
        }
    }

    // Override cleanup
    async cleanup() {
        this.motionService = null;
        super.cleanup();
    }
}

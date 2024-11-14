// device_types/AccelerationSensor.js

import HubitatPlatformAccessory from "../HubitatPlatformAccessory.js";

export default class AccelerationSensor extends HubitatPlatformAccessory {
    constructor(platform, accessory) {
        super(platform, accessory);
        this.accelerationService = null;
    }

    async configureServices() {
        try {
            // Use motion sensor service type for acceleration
            this.accelerationService = this.getOrAddService(this.Service.MotionSensor);

            // Motion Detected (used for acceleration state)
            this.getOrAddCharacteristic(this.accelerationService, this.Characteristic.MotionDetected, {
                getHandler: () => this.getAccelerationState(),
            });

            // Status Active
            this.getOrAddCharacteristic(this.accelerationService, this.Characteristic.StatusActive, {
                getHandler: () => this.getStatusActive(),
            });

            // Status Tampered (if supported)
            this.getOrAddCharacteristic(this.accelerationService, this.Characteristic.StatusTampered, {
                preReqChk: () => this.hasCapability("TamperAlert"),
                getHandler: () => this.getStatusTampered(),
                removeIfMissingPreReq: true,
            });

            // Status Low Battery (if supported)
            this.getOrAddCharacteristic(this.accelerationService, this.Characteristic.StatusLowBattery, {
                preReqChk: () => this.hasCapability("Battery"),
                getHandler: () => this.getStatusLowBattery(),
                removeIfMissingPreReq: true,
            });

            return true;
        } catch (error) {
            this.logError("Error configuring acceleration sensor services:", error);
            throw error;
        }
    }

    // Acceleration State
    getAccelerationState() {
        return this.deviceData.attributes.acceleration === "active";
    }

    // Status Active
    getStatusActive() {
        return this.deviceData.attributes.status === "online";
    }

    // Status Tampered
    getStatusTampered() {
        return this.deviceData.attributes.tamper === "detected" ? this.Characteristic.StatusTampered.TAMPERED : this.Characteristic.StatusTampered.NOT_TAMPERED;
    }

    // Battery Level
    getBatteryLevel() {
        const battery = this.deviceData.attributes.battery;
        return Math.max(0, Math.min(100, parseInt(battery) || 0));
    }

    // Charging State
    getChargingState() {
        // Most battery-powered sensors are not rechargeable
        return this.Characteristic.ChargingState.NOT_CHARGEABLE;
    }

    // Status Low Battery
    getStatusLowBattery() {
        const battery = this.deviceData.attributes.battery;
        return parseInt(battery) < 20 ? this.Characteristic.StatusLowBattery.BATTERY_LEVEL_LOW : this.Characteristic.StatusLowBattery.BATTERY_LEVEL_NORMAL;
    }

    async handleAttributeUpdate(attribute, value) {
        this.updateDeviceAttribute(attribute, value);
        switch (attribute) {
            case "acceleration":
                this.accelerationService.getCharacteristic(this.Characteristic.MotionDetected).updateValue(value === "active");
                break;

            case "status":
                this.accelerationService.getCharacteristic(this.Characteristic.StatusActive).updateValue(value === "online");
                break;

            case "tamper":
                if (!this.hasCapability("TamperAlert")) return;

                this.accelerationService.getCharacteristic(this.Characteristic.StatusTampered).updateValue(value === "detected" ? this.Characteristic.StatusTampered.TAMPERED : this.Characteristic.StatusTampered.NOT_TAMPERED);
                break;

            default:
                this.logDebug(`Unhandled attribute update: ${attribute} = ${value}`);
        }
    }

    // Override cleanup to handle additional services
    async cleanup() {
        this.accelerationService = null;
        await super.cleanup();
    }
}

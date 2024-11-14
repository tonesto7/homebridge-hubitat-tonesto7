// device_types/LeakSensor.js

import HubitatPlatformAccessory from "../HubitatPlatformAccessory.js";

export default class LeakSensor extends HubitatPlatformAccessory {
    constructor(platform, accessory) {
        super(platform, accessory);
        this.leakService = null;
    }

    async configureServices() {
        try {
            this.leakService = this.getOrAddService(this.Service.LeakSensor);
            // this.markServiceForRetention(this.leakService);

            // Leak Detected
            this.getOrAddCharacteristic(this.leakService, this.Characteristic.LeakDetected, {
                getHandler: () => this.getLeakDetected(),
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

            // Status Low Battery (if supported)
            this.getOrAddCharacteristic(this.leakService, this.Characteristic.StatusLowBattery, {
                preReqChk: () => this.hasCapability("Battery"),
                getHandler: () => this.getStatusLowBattery(),
                removeIfMissingPreReq: true,
            });

            return true;
        } catch (error) {
            this.logError("Error configuring leak sensor services:", error);
            throw error;
        }
    }

    getLeakDetected() {
        return this.deviceData.attributes.water === "dry" ? this.Characteristic.LeakDetected.LEAK_NOT_DETECTED : this.Characteristic.LeakDetected.LEAK_DETECTED;
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
            case "water":
                this.leakService.getCharacteristic(this.Characteristic.LeakDetected).updateValue(value === "dry" ? this.Characteristic.LeakDetected.LEAK_NOT_DETECTED : this.Characteristic.LeakDetected.LEAK_DETECTED);
                break;

            case "status":
                this.leakService.getCharacteristic(this.Characteristic.StatusActive).updateValue(value === "online");
                break;

            case "tamper":
                if (!this.hasCapability("TamperAlert")) return;
                this.leakService.getCharacteristic(this.Characteristic.StatusTampered).updateValue(value === "detected" ? this.Characteristic.StatusTampered.TAMPERED : this.Characteristic.StatusTampered.NOT_TAMPERED);
                break;

            case "battery":
                if (!this.hasCapability("Battery")) return;
                this.leakService.getCharacteristic(this.Characteristic.StatusLowBattery).updateValue(parseInt(value) < 20 ? this.Characteristic.StatusLowBattery.BATTERY_LEVEL_LOW : this.Characteristic.StatusLowBattery.BATTERY_LEVEL_NORMAL);
                break;

            default:
                this.logDebug(`Unhandled attribute update: ${attribute} = ${value}`);
        }
    }

    // Override cleanup
    async cleanup() {
        this.leakService = null;
        await super.cleanup();
    }
}

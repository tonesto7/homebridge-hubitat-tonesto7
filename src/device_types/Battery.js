// device_types/Battery.js

import HubitatPlatformAccessory from "../HubitatPlatformAccessory.js";

export default class Battery extends HubitatPlatformAccessory {
    constructor(platform, accessory) {
        super(platform, accessory);
        this.batteryService = null;
    }

    static relevantAttributes = ["battery", "powerSource"];

    async configureServices() {
        try {
            this.batteryService = this.getOrAddService(this.Service.Battery, this.getServiceDisplayName(this.deviceData.name, "Battery"));

            // Battery Level
            this.getOrAddCharacteristic(this.batteryService, this.Characteristic.BatteryLevel, {
                getHandler: () => this.getBatteryLevel(this.deviceData.attributes.battery),
            });

            // Status Low Battery
            this.getOrAddCharacteristic(this.batteryService, this.Characteristic.StatusLowBattery, {
                getHandler: () => this.getStatusLowBattery(this.deviceData.attributes.battery),
            });

            // Charging State
            this.getOrAddCharacteristic(this.batteryService, this.Characteristic.ChargingState, {
                getHandler: () => this.getChargingState(),
            });

            return true;
        } catch (error) {
            this.logError(`Battery | ${this.deviceData.name} | Error configuring services:`, error);
            throw error;
        }
    }

    getBatteryLevel(value) {
        return Math.max(0, Math.min(100, parseInt(value) || 0));
    }

    getStatusLowBattery(value) {
        return parseInt(value) < 20 ? this.Characteristic.StatusLowBattery.BATTERY_LEVEL_LOW : this.Characteristic.StatusLowBattery.BATTERY_LEVEL_NORMAL;
    }

    getChargingState(value) {
        switch (value) {
            case "mains":
            case "dc":
            case "USB Cable":
                return this.Characteristic.ChargingState.CHARGING;
            case "battery":
                return this.Characteristic.ChargingState.NOT_CHARGING;
            default:
                return this.Characteristic.ChargingState.NOT_CHARGEABLE;
        }
    }

    async handleAttributeUpdate(change) {
        const { attribute, value } = change;

        switch (attribute) {
            case "battery":
                this.batteryService.getCharacteristic(this.Characteristic.BatteryLevel).updateValue(this.getBatteryLevel(value));
                this.batteryService.getCharacteristic(this.Characteristic.StatusLowBattery).updateValue(this.getStatusLowBattery(value));
                break;

            case "powerSource":
                this.batteryService.getCharacteristic(this.Characteristic.ChargingState).updateValue(this.getChargingState(value));
                break;

            default:
                this.logDebug(`Battery | ${this.deviceData.name} | Unhandled attribute update: ${attribute} = ${value}`);
        }
    }

    // Override cleanup
    async cleanup() {
        this.batteryService = null;
        super.cleanup();
    }
}

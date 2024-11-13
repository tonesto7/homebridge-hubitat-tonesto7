// device_types/Battery.js

import HubitatPlatformAccessory from "../HubitatPlatformAccessory.js";

export default class Battery extends HubitatPlatformAccessory {
    constructor(platform, accessory) {
        super(platform, accessory);
        this.batteryService = null;
    }

    async configureServices() {
        try {
            this.batteryService = this.getOrAddService(this.Service.Battery);
            this.markServiceForRetention(this.batteryService);

            // Battery Level
            this.getOrAddCharacteristic(this.batteryService, this.Characteristic.BatteryLevel, {
                getHandler: () => this.getBatteryLevel(),
            });

            // Status Low Battery
            this.getOrAddCharacteristic(this.batteryService, this.Characteristic.StatusLowBattery, {
                getHandler: () => this.getStatusLowBattery(),
            });

            // Charging State
            this.getOrAddCharacteristic(this.batteryService, this.Characteristic.ChargingState, {
                getHandler: () => this.getChargingState(),
            });

            return true;
        } catch (error) {
            this.logError("Error configuring battery services:", error);
            throw error;
        }
    }

    getBatteryLevel() {
        const battery = this.deviceData.attributes.battery;
        return Math.max(0, Math.min(100, parseInt(battery) || 0));
    }

    getStatusLowBattery() {
        const battery = this.deviceData.attributes.battery;
        return parseInt(battery) < 20 ? this.Characteristic.StatusLowBattery.BATTERY_LEVEL_LOW : this.Characteristic.StatusLowBattery.BATTERY_LEVEL_NORMAL;
    }

    getChargingState() {
        const powerSource = this.deviceData.attributes.powerSource;
        switch (powerSource) {
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

    async handleAttributeUpdate(attribute, value) {
        this.updateDeviceAttribute(attribute, value);
        switch (attribute) {
            case "battery":
                const batteryLevel = Math.max(0, Math.min(100, parseInt(value) || 0));
                const lowBattery = batteryLevel < 20 ? this.Characteristic.StatusLowBattery.BATTERY_LEVEL_LOW : this.Characteristic.StatusLowBattery.BATTERY_LEVEL_NORMAL;

                this.batteryService.getCharacteristic(this.Characteristic.BatteryLevel).updateValue(batteryLevel);
                this.batteryService.getCharacteristic(this.Characteristic.StatusLowBattery).updateValue(lowBattery);
                break;

            case "powerSource":
                let chargingState;
                switch (value) {
                    case "mains":
                    case "dc":
                    case "USB Cable":
                        chargingState = this.Characteristic.ChargingState.CHARGING;
                        break;
                    case "battery":
                        chargingState = this.Characteristic.ChargingState.NOT_CHARGING;
                        break;
                    default:
                        chargingState = this.Characteristic.ChargingState.NOT_CHARGEABLE;
                }
                this.batteryService.getCharacteristic(this.Characteristic.ChargingState).updateValue(chargingState);
                break;

            default:
                this.logDebug(`Unhandled attribute update: ${attribute} = ${value}`);
        }
    }

    // Override cleanup
    async cleanup() {
        this.batteryService = null;
        await super.cleanup();
    }
}

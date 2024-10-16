import HubitatAccessory from "../HubitatAccessory.js";

export default class Battery extends HubitatAccessory {
    constructor(platform, accessory) {
        super(platform, accessory);
        this.deviceData = accessory.context.deviceData;
        this.relevantAttributes = ["battery", "powerSource"];
    }

    static isSupported(accessory) {
        return accessory.hasCapability("Battery");
    }

    initializeService() {
        this.batterySvc = this.getOrAddService(this.Service.Battery);

        // Battery Level
        this.getOrAddCharacteristic(this.batterySvc, this.Characteristic.BatteryLevel, {
            getHandler: () => {
                const battery = this.clamp(this.deviceData.attributes.battery, 0, 100);
                this.log.debug(`${this.accessory.displayName} | Battery Level: ${battery}%`);
                return battery;
            },
        });

        // Status Low Battery
        this.getOrAddCharacteristic(this.batterySvc, this.Characteristic.StatusLowBattery, {
            getHandler: () => {
                const battery = this.deviceData.attributes.battery;
                const lowBattery = battery < 20 ? this.Characteristic.StatusLowBattery.BATTERY_LEVEL_LOW : this.Characteristic.StatusLowBattery.BATTERY_LEVEL_NORMAL;
                this.log.debug(`${this.accessory.displayName} | Battery Level: ${battery}% => StatusLowBattery: ${lowBattery}`);
                return lowBattery;
            },
        });

        // Charging State
        this.getOrAddCharacteristic(this.batterySvc, this.Characteristic.ChargingState, {
            getHandler: () => {
                const powerSource = this.deviceData.attributes.powerSource;
                const chargingState = this.getChargeState(powerSource);
                if (chargingState !== 2) {
                    this.log.debug(`${this.accessory.displayName} | Power Source: ${powerSource} => Charging State: ${chargingState}`);
                }
                return chargingState;
            },
        });

        this.accessory.context.deviceGroups.push("battery");
    }

    handleAttributeUpdate(change) {
        if (!this.batterySvc) {
            this.log.warn(`${this.accessory.displayName} | Battery service not found`);
            return;
        }

        switch (change.attribute) {
            case "battery":
                const batteryLevel = this.clamp(parseInt(change.value), 0, 100);
                const lowBattery = batteryLevel < 20 ? this.Characteristic.StatusLowBattery.BATTERY_LEVEL_LOW : this.Characteristic.StatusLowBattery.BATTERY_LEVEL_NORMAL;
                this.updateCharacteristicValue(this.batterySvc, this.Characteristic.BatteryLevel, batteryLevel);
                this.updateCharacteristicValue(this.batterySvc, this.Characteristic.StatusLowBattery, lowBattery);
                break;
            case "powerSource":
                const chargingState = this.getChargeState(change.value);
                this.updateCharacteristicValue(this.batterySvc, this.Characteristic.ChargingState, chargingState);
                break;
            default:
                this.log.debug(`${this.accessory.displayName} | Unhandled attribute update: ${change.attribute}`);
        }
    }

    getChargeState(powerSource) {
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
}

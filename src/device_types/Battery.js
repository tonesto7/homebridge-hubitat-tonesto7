import HubitatAccessory from "../HubitatAccessory.js";

export default class Battery extends HubitatAccessory {
    constructor(platform, accessory) {
        super(platform, accessory);
        this.deviceData = accessory.context.deviceData;
    }

    /**
     * @constant {string[]} relevantAttributes - An array of relevant attribute names for the device.
     * @default ["battery", "powerSource"]
     */
    static relevantAttributes = ["battery", "powerSource"];

    /**
     * Initializes the battery service for the accessory.
     *
     * This method sets up the Battery service and its characteristics:
     * - Battery Level: Retrieves and logs the battery level, clamped between 0 and 100.
     * - Status Low Battery: Determines and logs if the battery level is low (below 20%).
     * - Charging State: Retrieves and logs the charging state based on the power source.
     *
     * The method also adds the "battery" group to the accessory's device groups.
     *
     * @async
     * @returns {Promise<void>} A promise that resolves when the service is initialized.
     */
    async initializeService() {
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

        this.accessory.deviceGroups.push("battery");
    }

    /**
     * Handles updates to device attributes and updates the corresponding characteristics.
     *
     * @param {Object} change - The change object containing attribute updates.
     * @param {string} change.attribute - The name of the attribute that has changed.
     * @param {string|number} change.value - The new value of the attribute.
     *
     * @returns {void}
     *
     * @example
     * handleAttributeUpdate({ attribute: 'battery', value: '75' });
     * handleAttributeUpdate({ attribute: 'powerSource', value: 'mains' });
     */
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

    /**
     * Determines the charging state based on the provided power source.
     *
     * @param {string} powerSource - The type of power source (e.g., "mains", "dc", "USB Cable", "battery").
     * @returns {number} - The charging state corresponding to the power source.
     *                      - ChargingState.CHARGING for "mains", "dc", or "USB Cable".
     *                      - ChargingState.NOT_CHARGING for "battery".
     *                      - ChargingState.NOT_CHARGEABLE for any other power source.
     */
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

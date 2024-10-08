// device_types/battery.js

module.exports = {
    isSupported: (accessory) => accessory.hasCapability("Battery"),

    initializeAccessory: (accessory, deviceTypes) => {
        const { Service, Characteristic } = deviceTypes.mainPlatform;
        const service = accessory.getService(Service.Battery) || accessory.addService(Service.Battery);

        /**
         * Clamps a value between a minimum and maximum.
         * @param {number} value - The value to clamp.
         * @param {number} min - The minimum allowable value.
         * @param {number} max - The maximum allowable value.
         * @returns {number} - The clamped value.
         */
        function clamp(value, min, max) {
            return Math.max(min, Math.min(max, value));
        }

        // Battery Level
        service.getCharacteristic(Characteristic.BatteryLevel).onGet(() => {
            const battery = clamp(accessory.context.deviceData.attributes.battery, 0, 100);
            accessory.log.debug(`${accessory.name} | Battery Level: ${battery}%`);
            return battery;
        });

        // Status Low Battery
        service.getCharacteristic(Characteristic.StatusLowBattery).onGet(() => {
            const battery = accessory.context.deviceData.attributes.battery;
            const lowBattery = battery < 20 ? Characteristic.StatusLowBattery.BATTERY_LEVEL_LOW : Characteristic.StatusLowBattery.BATTERY_LEVEL_NORMAL;
            accessory.log.debug(`${accessory.name} | Battery Level: ${battery}% => StatusLowBattery: ${lowBattery}`);
            return lowBattery;
        });

        // Charging State
        service.getCharacteristic(Characteristic.ChargingState).onGet(() => {
            const powerSource = accessory.context.deviceData.attributes.powerSource;
            let chargingState;
            switch (powerSource) {
                case "mains":
                case "dc":
                case "USB Cable":
                    chargingState = Characteristic.ChargingState.CHARGING;
                    break;
                case "battery":
                    chargingState = Characteristic.ChargingState.NOT_CHARGING;
                    break;
                default:
                    chargingState = Characteristic.ChargingState.NOT_CHARGEABLE;
            }
            accessory.log.debug(`${accessory.name} | Power Source: ${powerSource} => Charging State: ${chargingState}`);
            return chargingState;
        });

        accessory.context.deviceGroups.push("battery");
    },
};

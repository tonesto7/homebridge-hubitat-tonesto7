// device_types/battery.js

module.exports = {
    isSupported: (accessory) => accessory.hasCapability("Battery"),

    relevantAttributes: ["battery", "powerSource"],

    initializeAccessory: (accessory, deviceClass) => {
        const { Service, Characteristic } = deviceClass.mainPlatform;
        const service = accessory.getService(Service.Battery) || accessory.addService(Service.Battery);

        // Battery Level
        service.getCharacteristic(Characteristic.BatteryLevel).onGet(() => {
            const battery = deviceClass.clamp(accessory.context.deviceData.attributes.battery, 0, 100);
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
            let chargingState = Characteristic.ChargingState.NOT_CHARGEABLE;
            switch (powerSource) {
                case "mains":
                case "dc":
                case "USB Cable":
                    chargingState = Characteristic.ChargingState.CHARGING;
                    break;
                case "battery":
                    chargingState = Characteristic.ChargingState.NOT_CHARGING;
                    break;
            }
            if (chargingState !== 2) {
                accessory.log.debug(`${accessory.name} | Power Source: ${powerSource} => Charging State: ${chargingState}`);
            }
            return chargingState;
        });

        accessory.context.deviceGroups.push("battery");
    },

    handleAttributeUpdate: (accessory, change, deviceClass) => {
        const { Characteristic, Service } = deviceClass.mainPlatform;
        const service = accessory.getService(Service.Battery);

        if (!service) {
            accessory.log.warn(`${accessory.name} | Battery service not found`);
            return;
        }

        switch (change.attribute) {
            case "battery":
                const batteryLevel = deviceClass.clamp(parseInt(change.value), 0, 100);
                service.updateCharacteristic(Characteristic.BatteryLevel, batteryLevel);
                const lowBattery = batteryLevel < 20 ? Characteristic.StatusLowBattery.BATTERY_LEVEL_LOW : Characteristic.StatusLowBattery.BATTERY_LEVEL_NORMAL;
                service.updateCharacteristic(Characteristic.StatusLowBattery, lowBattery);
                accessory.log.debug(`${accessory.name} | Updated Battery Level: ${batteryLevel}%, Low Battery: ${lowBattery}`);
                break;
            case "powerSource":
                let chargingState;
                switch (change.value) {
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
                service.updateCharacteristic(Characteristic.ChargingState, chargingState);
                accessory.log.debug(`${accessory.name} | Updated Charging State: ${chargingState}`);
                break;
            default:
                accessory.log.debug(`${accessory.name} | Unhandled attribute update: ${change.attribute}`);
        }
    },
};

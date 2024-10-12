// device_types/battery.js

let DeviceClass, Characteristic, Service, CommunityTypes;

export function init(_deviceClass, _Characteristic, _Service, _CommunityTypes) {
    DeviceClass = _deviceClass;
    Characteristic = _Characteristic;
    Service = _Service;
    CommunityTypes = _CommunityTypes;
}

export function isSupported(accessory) {
    return accessory.hasCapability("Battery");
}

export const relevantAttributes = ["battery", "powerSource"];

export function initializeAccessory(accessory) {
    const batterySvc = DeviceClass.getOrAddService(accessory, Service.Battery);

    // Battery Level
    DeviceClass.getOrAddCharacteristic(accessory, batterySvc, Characteristic.BatteryLevel, {
        getHandler: function () {
            const battery = DeviceClass.clamp(accessory.context.deviceData.attributes.battery, 0, 100);
            accessory.log.debug(`${accessory.name} | Battery Level: ${battery}%`);
            return battery;
        },
    });

    // Status Low Battery
    DeviceClass.getOrAddCharacteristic(accessory, batterySvc, Characteristic.StatusLowBattery, {
        getHandler: function () {
            const battery = accessory.context.deviceData.attributes.battery;
            const lowBattery = battery < 20 ? Characteristic.StatusLowBattery.BATTERY_LEVEL_LOW : Characteristic.StatusLowBattery.BATTERY_LEVEL_NORMAL;
            accessory.log.debug(`${accessory.name} | Battery Level: ${battery}% => StatusLowBattery: ${lowBattery}`);
            return lowBattery;
        },
    });

    // Charging State
    DeviceClass.getOrAddCharacteristic(accessory, batterySvc, Characteristic.ChargingState, {
        getHandler: function () {
            const powerSource = accessory.context.deviceData.attributes.powerSource;
            const chargingState = getChargeState(powerSource);
            if (chargingState !== 2) {
                accessory.log.debug(`${accessory.name} | Power Source: ${powerSource} => Charging State: ${chargingState}`);
            }
            return chargingState;
        },
    });

    accessory.context.deviceGroups.push("battery");
}

export function handleAttributeUpdate(accessory, change) {
    const batterySvc = accessory.getService(Service.Battery);

    if (!batterySvc) {
        accessory.log.warn(`${accessory.name} | Battery service not found`);
        return;
    }

    switch (change.attribute) {
        case "battery":
            const batteryLevel = DeviceClass.clamp(parseInt(change.value), 0, 100);
            const lowBattery = batteryLevel < 20 ? Characteristic.StatusLowBattery.BATTERY_LEVEL_LOW : Characteristic.StatusLowBattery.BATTERY_LEVEL_NORMAL;
            DeviceClass.updateCharacteristicValue(accessory, batterySvc, Characteristic.BatteryLevel, batteryLevel);
            DeviceClass.updateCharacteristicValue(accessory, batterySvc, Characteristic.StatusLowBattery, lowBattery);
            // accessory.log.debug(`${accessory.name} | Updated Battery Level: ${batteryLevel}%, Low Battery: ${lowBattery}`);
            break;
        case "powerSource":
            const chargingState = getChargeState(change.value);
            DeviceClass.updateCharacteristicValue(accessory, batterySvc, Characteristic.ChargingState, chargingState);
            break;
        default:
            accessory.log.debug(`${accessory.name} | Unhandled attribute update: ${change.attribute}`);
    }
}

function getChargeState(powerSource) {
    switch (powerSource) {
        case "mains":
        case "dc":
        case "USB Cable":
            return Characteristic.ChargingState.CHARGING;
        case "battery":
            return Characteristic.ChargingState.NOT_CHARGING;
        default:
            return Characteristic.ChargingState.NOT_CHARGEABLE;
    }
}

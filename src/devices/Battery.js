// devices/Battery.js
export class Battery {
    constructor(platform) {
        this.logManager = platform.logManager;
        this.Service = platform.Service;
        this.Characteristic = platform.Characteristic;
    }

    configure(accessory) {
        this.logManager.logDebug(`Configuring Battery for ${accessory.displayName}`);
        const svc = accessory.getOrAddService(this.Service.Battery);
        const devData = accessory.context.deviceData;

        this._configureBatteryLevel(accessory, svc, devData);
        this._configureStatusLowBattery(accessory, svc, devData);
        this._configureChargingState(accessory, svc, devData);

        accessory.context.deviceGroups.push("battery");
        return accessory;
    }

    _configureBatteryLevel(accessory, svc, devData) {
        accessory.getOrAddCharacteristic(svc, this.Characteristic.BatteryLevel, {
            getHandler: () => {
                const level = parseInt(devData.attributes.battery);
                return this._clampValue(level, 0, 100);
            },
            updateHandler: (value) => this._clampValue(value, 0, 100),
            storeAttribute: "battery",
        });
    }

    _configureStatusLowBattery(accessory, svc, devData) {
        accessory.getOrAddCharacteristic(svc, this.Characteristic.StatusLowBattery, {
            getHandler: () => {
                return devData.attributes.battery < 20 ? this.Characteristic.StatusLowBattery.BATTERY_LEVEL_LOW : this.Characteristic.StatusLowBattery.BATTERY_LEVEL_NORMAL;
            },
            updateHandler: (value) => {
                return value < 20 ? this.Characteristic.StatusLowBattery.BATTERY_LEVEL_LOW : this.Characteristic.StatusLowBattery.BATTERY_LEVEL_NORMAL;
            },
            storeAttribute: "battery",
        });
    }

    _configureChargingState(accessory, svc, devData) {
        accessory.getOrAddCharacteristic(svc, this.Characteristic.ChargingState, {
            getHandler: () => this._getChargingState(devData.attributes.powerSource),
            updateHandler: (value) => this._getChargingState(value),
            storeAttribute: "powerSource",
        });
    }

    _getChargingState(source) {
        switch (source) {
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

    _clampValue(value, min, max) {
        return Math.min(Math.max(value, min), max);
    }
}

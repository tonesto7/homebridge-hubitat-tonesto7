// devices/Battery.js
export class Battery {
    constructor(platform) {
        this.logManager = platform.logManager;
        this.Service = platform.Service;
        this.Characteristic = platform.Characteristic;
        this.generateSrvcName = platform.generateSrvcName;
    }

    static relevantAttributes = ["battery", "powerSource"];

    configure(accessory) {
        this.logManager.logDebug(`Configuring Battery for ${accessory.displayName}`);
        const svc = accessory.getOrAddService(this.Service.Battery, this.generateSrvcName(accessory.displayName, "Battery"));
        const devData = accessory.context.deviceData;

        this._configureBatteryLevel(accessory, svc, devData);
        this._configureStatusLowBattery(accessory, svc, devData);
        this._configureChargingState(accessory, svc, devData);

        return accessory;
    }

    _configureBatteryLevel(accessory, svc, devData) {
        accessory.getOrAddCharacteristic(svc, this.Characteristic.BatteryLevel, {
            getHandler: () => this._getBatteryLevel(devData.attributes.battery),
            updateHandler: (value) => this._getBatteryLevel(value),
            storeAttribute: "battery",
        });
    }

    _configureStatusLowBattery(accessory, svc, devData) {
        accessory.getOrAddCharacteristic(svc, this.Characteristic.StatusLowBattery, {
            getHandler: () => this._getLowBatteryStatus(devData.attributes.battery),
            updateHandler: (value) => this._getLowBatteryStatus(value),
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

    _getBatteryLevel(value) {
        if (!value || isNaN(value)) return 0;
        value = parseFloat(value);
        return this._clampValue(value, 0, 100);
    }

    _getLowBatteryStatus(value) {
        if (!value || isNaN(value)) return this.Characteristic.StatusLowBattery.BATTERY_LEVEL_NORMAL;
        value = parseFloat(value);
        return value < 20 ? this.Characteristic.StatusLowBattery.BATTERY_LEVEL_LOW : this.Characteristic.StatusLowBattery.BATTERY_LEVEL_NORMAL;
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
        if (value === null || value === undefined || isNaN(value)) return min;
        return Math.min(Math.max(value, min), max);
    }

    // Handle attribute updates
    handleAttributeUpdate(accessory, update) {
        const { attribute, value } = update;
        this.logManager.logDebug(`Battery | ${accessory.displayName} | Attribute update: ${attribute} = ${value}`);
        if (!Battery.relevantAttributes.includes(attribute)) return;

        const svc = accessory.getService(this.Service.Battery, this.generateSrvcName(accessory.displayName, "Battery"));
        if (!svc) return;

        switch (attribute) {
            case "battery":
                svc.getCharacteristic(this.Characteristic.BatteryLevel).updateValue(this._getBatteryLevel(value));
                break;
            case "powerSource":
                svc.getCharacteristic(this.Characteristic.ChargingState).updateValue(this._getChargingState(value));
                break;
            default:
                this.logManager.logWarn(`Battery | ${accessory.displayName} | Unhandled attribute update: ${attribute} = ${value}`);
        }
    }
}

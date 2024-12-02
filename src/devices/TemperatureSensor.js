// devices/TemperatureSensor.js
export class TemperatureSensor {
    constructor(platform) {
        this.logManager = platform.logManager;
        this.Service = platform.Service;
        this.Characteristic = platform.Characteristic;
        this.tempUnit = platform.configManager.getTempUnit();
        this.generateSrvcName = platform.generateSrvcName;
    }

    static relevantAttributes = ["temperature", "tamper"];

    configure(accessory) {
        this.logManager.logDebug(`Configuring Temperature Sensor for ${accessory.displayName}`);
        const svcName = this.generateSrvcName(accessory.displayName, "Temperature");
        const svc = accessory.getOrAddService(this.Service.TemperatureSensor, svcName);
        const devData = accessory.context.deviceData;

        this._updateSvcName(svc, svcName);
        this._configureCurrentTemperature(accessory, svc, devData);
        this._configureStatusActive(accessory, svc, devData);
        this._configureStatusTampered(accessory, svc, devData);

        return accessory;
    }

    _updateSvcName(svc, svcName) {
        svc.getOrAddCharacteristic(this.Characteristic.Name).updateValue(svcName);
    }

    _configureCurrentTemperature(accessory, svc, devData) {
        accessory.getOrAddCharacteristic(svc, this.Characteristic.CurrentTemperature, {
            getHandler: () => this._getCurrentTemperature(accessory, devData.attributes.temperature),
            props: this._getTemperatureProps(),
        });
    }

    _configureStatusActive(accessory, svc, devData) {
        accessory.getOrAddCharacteristic(svc, this.Characteristic.StatusActive, {
            getHandler: () => this._getActiveState(devData.status),
        });
    }

    _configureStatusTampered(accessory, svc, devData) {
        accessory.getOrAddCharacteristic(svc, this.Characteristic.StatusTampered, {
            preReqChk: () => accessory.hasCapability("TamperAlert"),
            getHandler: () => this._getTamperedState(devData.attributes.tamper),
            removeIfMissingPreReq: true,
        });
    }

    _getCurrentTemperature(accessory, value) {
        const props = this._getTemperatureProps();
        if (value === null || value === undefined || isNaN(value)) {
            this.logManager.logWarn(`TemperatureSensor | ${accessory.displayName} | _getCurrentTemperature | Invalid temperature value: ${value} | Returning ${props.minValue}`);
            return props.minValue;
        }

        const convertedTemp = this._convertToHomeKitTemp(parseFloat(value));
        const clampedTemp = this._clampValue(convertedTemp, props.minValue, props.maxValue);

        // Log warnings if temperature is out of range
        if (convertedTemp < props.minValue) {
            this.logManager.logWarn(`Temperature value ${convertedTemp}°C below minimum (${props.minValue}°C), clamping to ${props.minValue}°C`);
        } else if (convertedTemp > props.maxValue) {
            this.logManager.logWarn(`Temperature value ${convertedTemp}°C above maximum (${props.maxValue}°C), clamping to ${props.maxValue}°C`);
        }

        return clampedTemp;
    }

    _getActiveState(state) {
        return state !== "OFFLINE" && state !== "INACTIVE";
    }

    _getTamperedState(state) {
        return state === "detected" ? this.Characteristic.StatusTampered.TAMPERED : this.Characteristic.StatusTampered.NOT_TAMPERED;
    }

    _getTemperatureProps() {
        return {
            minValue: -50, // -50°C = -100°F
            maxValue: 100, // 100°C = 200°F
        };
    }

    _convertToHomeKitTemp(temp) {
        if (temp === null || temp === undefined || isNaN(temp)) {
            this.logManager.logWarn(`TemperatureSensor | _convertToHomeKitTemp | Invalid value: ${temp} | Returning 0`);
            return 0;
        }
        // If temp is in F, convert to C for HomeKit
        return this.tempUnit === "F" ? (temp - 32) / 1.8 : temp;
    }

    _convertFromHomeKitTemp(temp) {
        if (temp === null || temp === undefined || isNaN(temp)) {
            this.logManager.logWarn(`TemperatureSensor | _convertFromHomeKitTemp | Invalid value: ${temp} | Returning null`);
            return null;
        }
        return this.tempUnit === "F" ? temp * 1.8 + 32 : temp;
    }

    _clampValue(value, min, max) {
        if (value === null || value === undefined || isNaN(value)) {
            this.logManager.logWarn(`TemperatureSensor | _clampValue | Invalid value: ${value} | Returning ${min}`);
            return min;
        }
        return Math.min(Math.max(value, min), max);
    }

    // Handle attribute updates
    handleAttributeUpdate(accessory, update) {
        const { attribute, value } = update;
        this.logManager.logDebug(`TemperatureSensor | ${accessory.displayName} | Attribute update: ${attribute} = ${value}`);
        if (!TemperatureSensor.relevantAttributes.includes(attribute)) return;

        const svc = accessory.getService(this.Service.TemperatureSensor, this.generateSrvcName(accessory.displayName, "Temperature"));
        if (!svc) return;

        switch (attribute) {
            case "temperature":
                svc.getCharacteristic(this.Characteristic.CurrentTemperature).updateValue(this._getCurrentTemperature(accessory, value));
                break;
            case "tamper":
                svc.getCharacteristic(this.Characteristic.StatusTampered).updateValue(this._getTamperedState(value));
                break;
            default:
                this.logManager.logWarn(`TemperatureSensor | ${accessory.displayName} | Unhandled attribute update: ${attribute} = ${value}`);
        }
    }
}

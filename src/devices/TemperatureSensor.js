// devices/TemperatureSensor.js
export class TemperatureSensor {
    constructor(platform) {
        this.logManager = platform.logManager;
        this.Service = platform.Service;
        this.Characteristic = platform.Characteristic;
        this.tempUnit = platform.configManager.getTempUnit();
    }

    configure(accessory) {
        this.logManager.logDebug(`Configuring Temperature Sensor for ${accessory.displayName}`);
        const svc = accessory.getOrAddService(this.Service.TemperatureSensor);
        const devData = accessory.context.deviceData;

        this._configureCurrentTemperature(accessory, svc, devData);
        this._configureStatusTampered(accessory, svc, devData);

        accessory.context.deviceGroups.push("temperature_sensor");
        return accessory;
    }

    _configureCurrentTemperature(accessory, svc, devData) {
        accessory.getOrAddCharacteristic(svc, this.Characteristic.CurrentTemperature, {
            getHandler: () => {
                const temp = parseFloat(devData.attributes.temperature);
                return this.tempUnit === "F" ? (temp - 32) / 1.8 : temp;
            },
            updateHandler: (value) => {
                const temp = parseFloat(value);
                return this.tempUnit === "F" ? (temp - 32) / 1.8 : temp;
            },
            props: { minValue: -100, maxValue: 200 },
            storeAttribute: "temperature",
        });
    }

    _configureStatusTampered(accessory, svc, devData) {
        accessory.getOrAddCharacteristic(svc, this.Characteristic.StatusTampered, {
            preReqChk: () => accessory.hasCapability("TamperAlert"),
            getHandler: () => (devData.attributes.tamper === "detected" ? this.Characteristic.StatusTampered.TAMPERED : this.Characteristic.StatusTampered.NOT_TAMPERED),
            updateHandler: (value) => (value === "detected" ? this.Characteristic.StatusTampered.TAMPERED : this.Characteristic.StatusTampered.NOT_TAMPERED),
            storeAttribute: "tamper",
            removeIfMissingPreReq: true,
        });
    }
}

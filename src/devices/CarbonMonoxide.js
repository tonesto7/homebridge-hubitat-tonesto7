// devices/CarbonMonoxide.js
export class CarbonMonoxide {
    constructor(platform) {
        this.logManager = platform.logManager;
        this.Service = platform.Service;
        this.Characteristic = platform.Characteristic;
    }

    configure(accessory) {
        this.logManager.logDebug(`Configuring Carbon Monoxide Sensor for ${accessory.displayName}`);
        const svc = accessory.getOrAddService(this.Service.CarbonMonoxideSensor);
        const devData = accessory.context.deviceData;

        this._configureDetected(accessory, svc, devData);
        this._configureStatusActive(accessory, svc, devData);
        this._configureStatusTampered(accessory, svc, devData);

        accessory.context.deviceGroups.push("carbon_monoxide");
        return accessory;
    }

    _configureDetected(accessory, svc, devData) {
        accessory.getOrAddCharacteristic(svc, this.Characteristic.CarbonMonoxideDetected, {
            getHandler: () => {
                return devData.attributes.carbonMonoxide === "clear" ? this.Characteristic.CarbonMonoxideDetected.CO_LEVELS_NORMAL : this.Characteristic.CarbonMonoxideDetected.CO_LEVELS_ABNORMAL;
            },
            updateHandler: (value) => {
                return value === "clear" ? this.Characteristic.CarbonMonoxideDetected.CO_LEVELS_NORMAL : this.Characteristic.CarbonMonoxideDetected.CO_LEVELS_ABNORMAL;
            },
            storeAttribute: "carbonMonoxide",
        });
    }

    _configureStatusActive(accessory, svc, devData) {
        accessory.getOrAddCharacteristic(svc, this.Characteristic.StatusActive, {
            getHandler: () => devData.status !== "OFFLINE" && devData.status !== "INACTIVE",
            updateHandler: (value) => value !== "OFFLINE" && value !== "INACTIVE",
            storeAttribute: "status",
        });
    }

    _configureStatusTampered(accessory, svc, devData) {
        accessory.getOrAddCharacteristic(svc, this.Characteristic.StatusTampered, {
            preReqChk: () => accessory.hasCapability("TamperAlert"),
            getHandler: () => {
                return devData.attributes.tamper === "detected" ? this.Characteristic.StatusTampered.TAMPERED : this.Characteristic.StatusTampered.NOT_TAMPERED;
            },
            updateHandler: (value) => {
                return value === "detected" ? this.Characteristic.StatusTampered.TAMPERED : this.Characteristic.StatusTampered.NOT_TAMPERED;
            },
            storeAttribute: "tamper",
            removeIfMissingPreReq: true,
        });
    }
}

import HubitatAccessory from "../HubitatAccessory.js";

export default class HumiditySensor extends HubitatAccessory {
    constructor(platform, accessory) {
        super(platform, accessory);
        this.deviceData = accessory.context.deviceData;
        this.relevantAttributes = ["humidity", "status", "tamper"];
    }

    static isSupported(accessory) {
        return accessory.hasCapability("RelativeHumidityMeasurement") && accessory.hasAttribute("humidity") && !(accessory.hasCapability("Thermostat") || accessory.hasCapability("ThermostatOperatingState") || accessory.hasCapability("HumidityControl") || accessory.hasAttribute("thermostatOperatingState"));
    }

    initializeService() {
        this.humiditySvc = this.getOrAddService(this.Service.HumiditySensor);

        this.getOrAddCharacteristic(this.humiditySvc, this.Characteristic.CurrentRelativeHumidity, {
            getHandler: () => {
                let humidity = parseFloat(this.deviceData.attributes.humidity);
                humidity = this.clamp(humidity, 0, 100);
                this.log.debug(`${this.accessory.displayName} | Current Humidity: ${humidity}%`);
                return Math.round(humidity);
            },
        });

        this.getOrAddCharacteristic(this.humiditySvc, this.Characteristic.StatusActive, {
            getHandler: () => {
                const isActive = this.deviceData.status === "ACTIVE";
                this.log.debug(`${this.accessory.displayName} | Status Active: ${isActive}`);
                return isActive;
            },
        });

        this.getOrAddCharacteristic(this.humiditySvc, this.Characteristic.StatusTampered, {
            preReqChk: () => this.hasCapability("TamperAlert"),
            getHandler: () => {
                const isTampered = this.deviceData.attributes.tamper === "detected";
                this.log.debug(`${this.accessory.displayName} | Status Tampered: ${isTampered}`);
                return isTampered;
            },
            removeIfMissingPreReq: true,
        });

        this.accessory.context.deviceGroups.push("humidity_sensor");
    }

    handleAttributeUpdate(change) {
        if (!this.humiditySvc) {
            this.log.warn(`${this.accessory.displayName} | Humidity Sensor service not found`);
            return;
        }

        switch (change.attribute) {
            case "humidity": {
                const humidity = this.clamp(parseFloat(change.value), 0, 100);
                this.updateCharacteristicValue(this.humiditySvc, this.Characteristic.CurrentRelativeHumidity, Math.round(humidity));
                break;
            }
            case "status": {
                const isActive = change.value === "ACTIVE";
                this.updateCharacteristicValue(this.humiditySvc, this.Characteristic.StatusActive, isActive);
                break;
            }
            case "tamper": {
                if (this.hasCapability("TamperAlert")) {
                    const isTampered = change.value === "detected";
                    this.updateCharacteristicValue(this.humiditySvc, this.Characteristic.StatusTampered, isTampered);
                }
                break;
            }
            default:
                this.log.debug(`${this.accessory.displayName} | Unhandled attribute update: ${change.attribute}`);
        }
    }
}

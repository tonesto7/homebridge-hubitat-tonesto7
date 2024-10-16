import HubitatAccessory from "../HubitatAccessory.js";

export default class IlluminanceSensor extends HubitatAccessory {
    constructor(platform, accessory) {
        super(platform, accessory);
        this.deviceData = accessory.context.deviceData;
        this.relevantAttributes = ["illuminance", "status", "tamper"];
    }

    static isSupported(accessory) {
        return accessory.hasCapability("IlluminanceMeasurement");
    }

    async initializeService() {
        this.lightSensorSvc = this.getOrAddService(this.Service.LightSensor);

        this.getOrAddCharacteristic(this.lightSensorSvc, this.Characteristic.CurrentAmbientLightLevel, {
            props: {
                minValue: 0,
                maxValue: 100000,
                minStep: 1,
            },
            getHandler: () => {
                let illuminance = parseFloat(this.deviceData.attributes.illuminance);
                illuminance = this.clamp(illuminance, 0, 100000);
                illuminance = isNaN(illuminance) ? 0 : Math.round(Math.ceil(illuminance));
                this.log.debug(`${this.accessory.displayName} | Current Ambient Light Level: ${illuminance} lux`);
                return illuminance;
            },
        });

        this.getOrAddCharacteristic(this.lightSensorSvc, this.Characteristic.StatusActive, {
            getHandler: () => {
                const isActive = this.deviceData.status === "ACTIVE";
                this.log.debug(`${this.accessory.displayName} | Status Active: ${isActive}`);
                return isActive;
            },
        });

        this.getOrAddCharacteristic(this.lightSensorSvc, this.Characteristic.StatusTampered, {
            preReqChk: () => this.hasCapability("TamperAlert"),
            getHandler: () => {
                const isTampered = this.deviceData.attributes.tamper === "detected";
                this.log.debug(`${this.accessory.displayName} | Status Tampered: ${isTampered}`);
                return isTampered;
            },
            removeIfMissingPreReq: true,
        });

        this.accessory.deviceGroups.push("illuminance_sensor");
    }

    handleAttributeUpdate(change) {
        if (!this.lightSensorSvc) {
            this.log.warn(`${this.accessory.displayName} | Light Sensor service not found`);
            return;
        }

        switch (change.attribute) {
            case "illuminance":
                const illuminance = this.clamp(parseFloat(change.value), 0, 100000);
                this.updateCharacteristicValue(this.lightSensorSvc, this.Characteristic.CurrentAmbientLightLevel, Math.round(Math.ceil(illuminance)));
                break;
            case "status":
                this.updateCharacteristicValue(this.lightSensorSvc, this.Characteristic.StatusActive, change.value === "ACTIVE");
                break;
            case "tamper":
                if (this.hasCapability("TamperAlert")) {
                    this.updateCharacteristicValue(this.lightSensorSvc, this.Characteristic.StatusTampered, change.value === "detected");
                }
                break;
            default:
                this.log.debug(`${this.accessory.displayName} | Unhandled attribute update: ${change.attribute}`);
        }
    }
}

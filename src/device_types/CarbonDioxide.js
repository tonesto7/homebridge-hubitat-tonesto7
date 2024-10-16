import HubitatAccessory from "../HubitatAccessory.js";

export default class CarbonDioxideSensor extends HubitatAccessory {
    constructor(platform, accessory) {
        super(platform, accessory);
        this.deviceData = accessory.context.deviceData;
        this.relevantAttributes = ["carbonDioxide", "status", "tamper"];
    }

    static isSupported(accessory) {
        return accessory.hasCapability("CarbonDioxideMeasurement") && accessory.hasAttribute("carbonDioxide");
    }

    async initializeService() {
        this.carbonDioxideSvc = this.getOrAddService(this.Service.CarbonDioxideSensor);

        // Carbon Dioxide Detected
        this.getOrAddCharacteristic(this.carbonDioxideSvc, this.Characteristic.CarbonDioxideDetected, {
            getHandler: () => {
                const co2Level = this.clamp(this.deviceData.attributes.carbonDioxide, 0, 10000);
                this.log.debug(`${this.accessory.displayName} | CO2 Level: ${co2Level} ppm`);
                return co2Level < 2000 ? this.Characteristic.CarbonDioxideDetected.CO2_LEVELS_NORMAL : this.Characteristic.CarbonDioxideDetected.CO2_LEVELS_ABNORMAL;
            },
        });

        // Carbon Dioxide Level
        this.getOrAddCharacteristic(this.carbonDioxideSvc, this.Characteristic.CarbonDioxideLevel, {
            getHandler: () => {
                const co2Level = this.clamp(parseInt(this.deviceData.attributes.carbonDioxide, 10), 0, 10000);
                this.log.debug(`${this.accessory.displayName} | Carbon Dioxide Level: ${co2Level} ppm`);
                return co2Level;
            },
        });

        // Status Active
        this.getOrAddCharacteristic(this.carbonDioxideSvc, this.Characteristic.StatusActive, {
            getHandler: () => {
                const isActive = this.deviceData.status === "ACTIVE";
                this.log.debug(`${this.accessory.displayName} | Status Active: ${isActive}`);
                return isActive;
            },
        });

        // Status Tampered (if supported)
        this.getOrAddCharacteristic(this.carbonDioxideSvc, this.Characteristic.StatusTampered, {
            preReqChk: () => this.hasCapability("TamperAlert"),
            getHandler: () => {
                const isTampered = this.deviceData.attributes.tamper === "detected";
                this.log.debug(`${this.accessory.displayName} | Status Tampered: ${isTampered}`);
                return isTampered;
            },
            removeIfMissingPreReq: true,
        });

        this.accessory.deviceGroups.push("carbon_dioxide");
    }

    handleAttributeUpdate(change) {
        if (!this.carbonDioxideSvc) {
            this.log.warn(`${this.accessory.displayName} | Carbon Dioxide Sensor service not found`);
            return;
        }

        switch (change.attribute) {
            case "carbonDioxide": {
                const co2Level = this.clamp(parseInt(change.value, 10), 0, 10000);
                const co2Detected = co2Level < 2000 ? this.Characteristic.CarbonDioxideDetected.CO2_LEVELS_NORMAL : this.Characteristic.CarbonDioxideDetected.CO2_LEVELS_ABNORMAL;
                this.updateCharacteristicValue(this.carbonDioxideSvc, this.Characteristic.CarbonDioxideDetected, co2Detected);
                this.updateCharacteristicValue(this.carbonDioxideSvc, this.Characteristic.CarbonDioxideLevel, co2Level);
                break;
            }
            case "status": {
                const isActive = change.value === "ACTIVE";
                this.updateCharacteristicValue(this.carbonDioxideSvc, this.Characteristic.StatusActive, isActive);
                break;
            }
            case "tamper": {
                if (this.hasCapability("TamperAlert")) {
                    const isTampered = change.value === "detected";
                    this.updateCharacteristicValue(this.carbonDioxideSvc, this.Characteristic.StatusTampered, isTampered);
                }
                break;
            }
            default:
                this.log.debug(`${this.accessory.displayName} | Unhandled attribute update: ${change.attribute}`);
                break;
        }
    }
}
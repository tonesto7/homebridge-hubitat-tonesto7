import HubitatAccessory from "../HubitatAccessory.js";

export default class CarbonDioxideSensor extends HubitatAccessory {
    constructor(platform, accessory) {
        super(platform, accessory);
        this.deviceData = accessory.context.deviceData;
    }

    static relevantAttributes = ["carbonDioxide", "status", "tamper"];

    /**
     * Initializes the Carbon Dioxide service for the accessory.
     *
     * This method sets up the Carbon Dioxide Sensor service and its characteristics:
     * - Carbon Dioxide Detected: Indicates if the CO2 levels are normal or abnormal.
     * - Carbon Dioxide Level: Reports the current CO2 level in parts per million (ppm).
     * - Status Active: Indicates if the device is currently active.
     * - Status Tampered: Indicates if the device has been tampered with (if supported).
     *
     * The method also adds the accessory to the "carbon_dioxide" device group.
     *
     * @async
     * @returns {Promise<void>} A promise that resolves when the service is initialized.
     */
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

    /**
     * Handles updates to device attributes and updates the corresponding HomeKit characteristics.
     *
     * @param {Object} change - The change object containing attribute updates.
     * @param {string} change.attribute - The name of the attribute that has changed.
     * @param {string|number} change.value - The new value of the attribute.
     *
     * @returns {void}
     *
     * @example
     * handleAttributeUpdate({ attribute: "carbonDioxide", value: "1500" });
     *
     * @example
     * handleAttributeUpdate({ attribute: "status", value: "ACTIVE" });
     *
     * @example
     * handleAttributeUpdate({ attribute: "tamper", value: "detected" });
     */
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

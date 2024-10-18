import HubitatAccessory from "../HubitatAccessory.js";

export default class CarbonMonoxideSensor extends HubitatAccessory {
    constructor(platform, accessory) {
        super(platform, accessory);
        this.deviceData = accessory.context.deviceData;
    }

    static relevantAttributes = ["carbonMonoxide", "status", "tamper"];

    /**
     * Initializes the Carbon Monoxide service for the accessory.
     *
     * This method sets up the Carbon Monoxide Sensor service and its characteristics:
     * - Carbon Monoxide Detected: Indicates whether carbon monoxide is detected.
     * - Status Active: Indicates whether the device is active.
     * - Status Tampered: Indicates whether the device has been tampered with (if supported).
     *
     * It also adds the accessory to the "carbon_monoxide" device group.
     *
     * @async
     * @returns {Promise<void>} A promise that resolves when the service is initialized.
     */
    async initializeService() {
        this.carbonMonoxideSvc = this.getOrAddService(this.Service.CarbonMonoxideSensor);

        // Carbon Monoxide Detected
        this.getOrAddCharacteristic(this.carbonMonoxideSvc, this.Characteristic.CarbonMonoxideDetected, {
            getHandler: () => {
                const coStatus = this.deviceData.attributes.carbonMonoxide;
                this.log.debug(`${this.accessory.displayName} | Carbon Monoxide Status: ${coStatus}`);
                return coStatus === "clear" ? this.Characteristic.CarbonMonoxideDetected.CO_LEVELS_NORMAL : this.Characteristic.CarbonMonoxideDetected.CO_LEVELS_ABNORMAL;
            },
        });

        // Status Active
        this.getOrAddCharacteristic(this.carbonMonoxideSvc, this.Characteristic.StatusActive, {
            getHandler: () => {
                const isActive = this.deviceData.status === "ACTIVE";
                this.log.debug(`${this.accessory.displayName} | Status Active: ${isActive}`);
                return isActive;
            },
        });

        // Status Tampered (if supported)
        this.getOrAddCharacteristic(this.carbonMonoxideSvc, this.Characteristic.StatusTampered, {
            preReqChk: () => this.hasCapability("TamperAlert"),
            getHandler: () => {
                const isTampered = this.deviceData.attributes.tamper === "detected";
                this.log.debug(`${this.accessory.displayName} | Status Tampered: ${isTampered}`);
                return isTampered;
            },
            removeIfMissingPreReq: true,
        });

        this.accessory.deviceGroups.push("carbon_monoxide");
    }

    /**
     * Handles updates to the attributes of the Carbon Monoxide sensor.
     *
     * @param {Object} change - The change object containing attribute updates.
     * @param {string} change.attribute - The name of the attribute that has changed.
     * @param {string} change.value - The new value of the attribute.
     *
     * @returns {void}
     *
     * @example
     * handleAttributeUpdate({ attribute: 'carbonMonoxide', value: 'clear' });
     */
    handleAttributeUpdate(change) {
        if (!this.carbonMonoxideSvc) {
            this.log.warn(`${this.accessory.displayName} | Carbon Monoxide Sensor service not found`);
            return;
        }

        switch (change.attribute) {
            case "carbonMonoxide": {
                const coStatus = change.value === "clear" ? this.Characteristic.CarbonMonoxideDetected.CO_LEVELS_NORMAL : this.Characteristic.CarbonMonoxideDetected.CO_LEVELS_ABNORMAL;
                this.updateCharacteristicValue(this.carbonMonoxideSvc, this.Characteristic.CarbonMonoxideDetected, coStatus);
                break;
            }
            case "status": {
                const isActive = change.value === "ACTIVE";
                this.updateCharacteristicValue(this.carbonMonoxideSvc, this.Characteristic.StatusActive, isActive);
                break;
            }
            case "tamper": {
                if (this.hasCapability("TamperAlert")) {
                    const isTampered = change.value === "detected";
                    this.updateCharacteristicValue(this.carbonMonoxideSvc, this.Characteristic.StatusTampered, isTampered);
                }
                break;
            }
            default:
                this.log.debug(`${this.accessory.displayName} | Unhandled attribute update: ${change.attribute}`);
        }
    }
}

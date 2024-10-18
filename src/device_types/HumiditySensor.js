import HubitatAccessory from "../HubitatAccessory.js";

export default class HumiditySensor extends HubitatAccessory {
    constructor(platform, accessory) {
        super(platform, accessory);
        this.deviceData = accessory.context.deviceData;
    }

    static relevantAttributes = ["humidity", "status", "tamper"];

    /**
     * Initializes the humidity sensor service and its characteristics.
     *
     * This method sets up the humidity sensor service and adds the necessary characteristics:
     * - CurrentRelativeHumidity: Retrieves and logs the current humidity, clamped between 0 and 100.
     * - StatusActive: Checks and logs if the device status is active.
     * - StatusTampered: Checks and logs if the device has been tampered with, if the device has the "TamperAlert" capability.
     *
     * Additionally, it adds the device to the "humidity_sensor" group.
     *
     * @async
     * @returns {Promise<void>} A promise that resolves when the service is initialized.
     */
    async initializeService() {
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

        this.accessory.deviceGroups.push("humidity_sensor");
    }

    /**
     * Handles updates to device attributes and updates the corresponding HomeKit characteristics.
     *
     * @param {Object} change - The change object containing attribute updates.
     * @param {string} change.attribute - The name of the attribute that has changed.
     * @param {string|number} change.value - The new value of the attribute.
     *
     * @returns {void}
     */
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

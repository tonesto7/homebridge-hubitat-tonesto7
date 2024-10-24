import HubitatAccessory from "../HubitatAccessory.js";

export default class TemperatureSensor extends HubitatAccessory {
    constructor(platform, accessory) {
        super(platform, accessory);
        this.deviceData = accessory.context.deviceData;
    }

    static relevantAttributes = ["temperature", "tamper", "status"];

    /**
     * Initializes the temperature sensor service and its characteristics.
     *
     * This method sets up the temperature sensor service and adds the necessary characteristics:
     * - CurrentTemperature: Retrieves the current temperature from the device data.
     * - StatusTampered: Checks if the device has been tampered with, based on the TamperAlert capability.
     * - StatusActive: Checks if the device is currently active.
     *
     * Characteristics are configured with appropriate properties and handlers for retrieving their values.
     * The temperature sensor service is added to the accessory's device groups.
     *
     * @async
     * @returns {Promise<void>} Resolves when the service and characteristics are initialized.
     */
    async initializeService() {
        this.temperatureSvc = this.getOrAddService(this.Service.TemperatureSensor);

        this.getOrAddCharacteristic(this.temperatureSvc, this.Characteristic.CurrentTemperature, {
            props: {
                minValue: -100,
                maxValue: 200,
                minStep: 0.1,
            },
            getHandler: () => {
                let temp = parseFloat(this.deviceData.attributes.temperature);
                temp = isNaN(temp) ? 0 : this.convertTemperature(temp);
                this.log.debug(`${this.accessory.displayName} | Temperature Sensor CurrentTemperature Retrieved: ${temp} ${this.platform.getTempUnit()}`);
                return temp;
            },
        });

        this.getOrAddCharacteristic(this.temperatureSvc, this.Characteristic.StatusTampered, {
            preReqChk: () => this.hasCapability("TamperAlert"),
            getHandler: () => {
                const isTampered = this.deviceData.attributes.tamper === "detected";
                this.log.debug(`${this.accessory.displayName} | Temperature Sensor StatusTampered Retrieved: ${isTampered}`);
                return isTampered;
            },
            removeIfMissingPreReq: true,
        });

        this.getOrAddCharacteristic(this.temperatureSvc, this.Characteristic.StatusActive, {
            getHandler: () => {
                const isActive = this.deviceData.status === "ACTIVE";
                this.log.debug(`${this.accessory.displayName} | Temperature Sensor StatusActive Retrieved: ${isActive}`);
                return isActive;
            },
        });

        this.accessory.deviceGroups.push("temperature_sensor");
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
        if (!this.temperatureSvc) {
            this.log.warn(`${this.accessory.displayName} | Temperature Sensor service not found`);
            return;
        }

        switch (change.attribute) {
            case "temperature": {
                let temp = parseFloat(change.value);
                temp = isNaN(temp) ? 0 : this.convertTemperature(temp);
                this.updateCharacteristicValue(this.temperatureSvc, this.Characteristic.CurrentTemperature, temp);
                break;
            }
            case "tamper": {
                if (this.hasCapability("TamperAlert")) {
                    const isTampered = change.value === "detected";
                    this.updateCharacteristicValue(this.temperatureSvc, this.Characteristic.StatusTampered, isTampered);
                }
                break;
            }
            case "status": {
                const isActive = change.value === "ACTIVE";
                this.updateCharacteristicValue(this.temperatureSvc, this.Characteristic.StatusActive, isActive);
                break;
            }
            default:
                this.log.debug(`${this.accessory.displayName} | Unhandled attribute update: ${change.attribute}`);
        }
    }

    /**
     * Converts the given temperature to Celsius if the platform's temperature unit is Fahrenheit.
     * Clamps the resulting temperature within the range of -100 to 200.
     *
     * @param {number} temp - The temperature to be converted.
     * @returns {number} - The converted and clamped temperature.
     */
    convertTemperature(temp) {
        if (this.platform.getTempUnit() === "F") {
            const tempOut = Math.round((temp - 32) / 1.8, 1);
            return this.clamp(tempOut, -100, 200);
        }
        return this.clamp(temp, -100, 200);
    }
}

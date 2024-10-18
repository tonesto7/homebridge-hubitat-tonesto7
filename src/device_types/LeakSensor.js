import HubitatAccessory from "../HubitatAccessory.js";

export default class LeakSensor extends HubitatAccessory {
    constructor(platform, accessory) {
        super(platform, accessory);
        this.deviceData = accessory.context.deviceData;
    }

    static relevantAttributes = ["water", "status", "tamper"];

    /**
     * Initializes the leak sensor service and its characteristics.
     *
     * This method sets up the LeakSensor service and adds the necessary characteristics:
     * - LeakDetected: Indicates if a leak is detected.
     * - StatusActive: Indicates if the water sensor is active.
     * - StatusTampered: Indicates if the water sensor has been tampered with.
     *
     * Characteristics are added with handlers to retrieve their current values from the device data.
     *
     * @async
     * @method initializeService
     * @returns {Promise<void>} A promise that resolves when the service is initialized.
     */
    async initializeService() {
        this.leakSensorSvc = this.getOrAddService(this.Service.LeakSensor);

        this.getOrAddCharacteristic(this.leakSensorSvc, this.Characteristic.LeakDetected, {
            getHandler: () => {
                const leak = this.convertWaterStatus(this.deviceData.attributes.water);
                this.log.debug(`${this.accessory.displayName} | Leak Detected Retrieved: ${leak}`);
                return leak;
            },
        });

        this.getOrAddCharacteristic(this.leakSensorSvc, this.Characteristic.StatusActive, {
            getHandler: () => {
                const isActive = this.deviceData.status === "ACTIVE";
                this.log.debug(`${this.accessory.displayName} | Water Sensor Status Active Retrieved: ${isActive}`);
                return isActive;
            },
        });

        this.getOrAddCharacteristic(this.leakSensorSvc, this.Characteristic.StatusTampered, {
            preReqChk: () => this.hasCapability("TamperAlert"),
            getHandler: () => {
                const isTampered = this.deviceData.attributes.tamper === "detected";
                this.log.debug(`${this.accessory.displayName} | Water Sensor Status Tampered Retrieved: ${isTampered}`);
                return isTampered;
            },
            removeIfMissingPreReq: true,
        });

        this.accessory.deviceGroups.push("leak_sensor");
    }

    /**
     * Handles updates to the attributes of the leak sensor.
     *
     * @param {Object} change - The change object containing attribute updates.
     * @param {string} change.attribute - The name of the attribute that has changed.
     * @param {string} change.value - The new value of the attribute.
     */
    handleAttributeUpdate(change) {
        if (!this.leakSensorSvc) {
            this.log.warn(`${this.accessory.displayName} | Leak Sensor service not found`);
            return;
        }

        switch (change.attribute) {
            case "water":
                const leakDetected = this.convertWaterStatus(change.value);
                this.updateCharacteristicValue(this.leakSensorSvc, this.Characteristic.LeakDetected, leakDetected);
                this.log.debug(`${this.accessory.displayName} | Updated Leak Detected: ${leakDetected}`);
                break;
            case "status":
                const isActive = change.value === "ACTIVE";
                this.updateCharacteristicValue(this.leakSensorSvc, this.Characteristic.StatusActive, isActive);
                this.log.debug(`${this.accessory.displayName} | Updated Status Active: ${isActive}`);
                break;
            case "tamper":
                if (this.hasCapability("TamperAlert")) {
                    const isTampered = change.value === "detected";
                    this.updateCharacteristicValue(this.leakSensorSvc, this.Characteristic.StatusTampered, isTampered);
                    this.log.debug(`${this.accessory.displayName} | Updated Status Tampered: ${isTampered}`);
                }
                break;
            default:
                this.log.debug(`${this.accessory.displayName} | Unhandled attribute update: ${change.attribute}`);
        }
    }

    /**
     * Converts the water status to the corresponding HomeKit leak detection characteristic.
     *
     * @param {string} status - The water status, either "dry" or another value indicating a leak.
     * @returns {number} - Returns `LEAK_NOT_DETECTED` if the status is "dry", otherwise returns `LEAK_DETECTED`.
     */
    convertWaterStatus(status) {
        return status === "dry" ? this.Characteristic.LeakDetected.LEAK_NOT_DETECTED : this.Characteristic.LeakDetected.LEAK_DETECTED;
    }
}

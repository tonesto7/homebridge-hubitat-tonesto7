import HubitatAccessory from "../HubitatAccessory.js";

export default class SmokeDetector extends HubitatAccessory {
    constructor(platform, accessory) {
        super(platform, accessory);
        this.deviceData = accessory.context.deviceData;
    }

    static relevantAttributes = ["smoke", "status", "tamper"];

    /**
     * Initializes the smoke detector service and its characteristics.
     *
     * This method sets up the smoke sensor service and adds the necessary characteristics
     * for smoke detection, status active, and status tampered. It also includes handlers
     * for retrieving the current state of these characteristics and logs the retrieved values.
     *
     * Characteristics initialized:
     * - SmokeDetected: Retrieves the smoke detection status.
     * - StatusActive: Retrieves the active status of the smoke detector.
     * - StatusTampered: Retrieves the tampered status of the smoke detector (if the device has the TamperAlert capability).
     *
     * Additionally, this method adds the smoke detector to the accessory's device groups.
     *
     * @async
     * @returns {Promise<void>} A promise that resolves when the service is initialized.
     */
    async initializeService() {
        this.smokeSensorSvc = this.getOrAddService(this.Service.SmokeSensor);

        this.getOrAddCharacteristic(this.smokeSensorSvc, this.Characteristic.SmokeDetected, {
            getHandler: () => {
                const smoke = this.convertSmokeStatus(this.deviceData.attributes.smoke);
                this.log.debug(`${this.accessory.displayName} | Smoke Detected Retrieved: ${smoke}`);
                return smoke;
            },
        });

        this.getOrAddCharacteristic(this.smokeSensorSvc, this.Characteristic.StatusActive, {
            getHandler: () => {
                const isActive = this.deviceData.status === "ACTIVE";
                this.log.debug(`${this.accessory.displayName} | Smoke Detector Status Active Retrieved: ${isActive}`);
                return isActive;
            },
        });

        this.getOrAddCharacteristic(this.smokeSensorSvc, this.Characteristic.StatusTampered, {
            preReqChk: () => this.hasCapability("TamperAlert"),
            getHandler: () => {
                const isTampered = this.deviceData.attributes.tamper === "detected";
                this.log.debug(`${this.accessory.displayName} | Smoke Detector Status Tampered Retrieved: ${isTampered}`);
                return isTampered;
            },
            removeIfMissingPreReq: true,
        });

        this.accessory.deviceGroups.push("smoke_detector");
    }

    /**
     * Handles updates to the attributes of the smoke detector device.
     *
     * @param {Object} change - The object containing the attribute change details.
     * @param {string} change.attribute - The name of the attribute that has changed.
     * @param {string} change.value - The new value of the attribute.
     *
     * @returns {void}
     *
     * @description
     * This method updates the characteristics of the smoke detector service based on the attribute changes.
     * It handles the following attributes:
     * - "smoke": Updates the smoke detection status.
     * - "status": Updates the active status of the device.
     * - "tamper": Updates the tamper status if the device has the TamperAlert capability.
     *
     * If the attribute is not handled, a debug log is generated.
     */
    handleAttributeUpdate(change) {
        if (!this.smokeSensorSvc) {
            this.log.warn(`${this.accessory.displayName} | Smoke Sensor service not found`);
            return;
        }

        switch (change.attribute) {
            case "smoke": {
                const smokeDetected = this.convertSmokeStatus(change.value);
                this.updateCharacteristicValue(this.smokeSensorSvc, this.Characteristic.SmokeDetected, smokeDetected);
                break;
            }
            case "status": {
                const isActive = change.value === "ACTIVE";
                this.updateCharacteristicValue(this.smokeSensorSvc, this.Characteristic.StatusActive, isActive);
                break;
            }
            case "tamper": {
                if (this.hasCapability("TamperAlert")) {
                    const isTampered = change.value === "detected";
                    this.updateCharacteristicValue(this.smokeSensorSvc, this.Characteristic.StatusTampered, isTampered);
                }
                break;
            }
            default:
                this.log.debug(`${this.accessory.displayName} | Unhandled attribute update: ${change.attribute}`);
        }
    }

    /**
     * Converts the smoke status from a string to a corresponding HomeKit characteristic value.
     *
     * @param {string} smokeStatus - The smoke status, expected to be either "clear" or another value indicating smoke detected.
     * @returns {number} - Returns the HomeKit characteristic value for smoke detection status.
     */
    convertSmokeStatus(smokeStatus) {
        return smokeStatus === "clear" ? this.Characteristic.SmokeDetected.SMOKE_NOT_DETECTED : this.Characteristic.SmokeDetected.SMOKE_DETECTED;
    }
}

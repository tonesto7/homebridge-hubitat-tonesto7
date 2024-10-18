import HubitatAccessory from "../HubitatAccessory.js";

export default class MotionSensor extends HubitatAccessory {
    constructor(platform, accessory) {
        super(platform, accessory);
        this.deviceData = accessory.context.deviceData;
    }

    static relevantAttributes = ["motion", "tamper", "status"];

    /**
     * Initializes the motion sensor service and its characteristics.
     *
     * This method sets up the motion sensor service (`motionSvc`) and adds the following characteristics:
     * - `MotionDetected`: Indicates if motion is detected.
     * - `StatusActive`: Indicates if the device status is active.
     * - `StatusTampered`: Indicates if the device has been tampered with (only if the device has the `TamperAlert` capability).
     *
     * It also adds the device to the `motion_sensor` group.
     *
     * @async
     * @returns {Promise<void>} Resolves when the service and characteristics are initialized.
     */
    async initializeService() {
        this.motionSvc = this.getOrAddService(this.Service.MotionSensor);

        this.getOrAddCharacteristic(this.motionSvc, this.Characteristic.MotionDetected, {
            getHandler: () => {
                const motionDetected = this.deviceData.attributes.motion === "active";
                this.log.debug(`${this.accessory.displayName} | Motion Detected: ${motionDetected}`);
                return motionDetected;
            },
        });

        this.getOrAddCharacteristic(this.motionSvc, this.Characteristic.StatusActive, {
            getHandler: () => {
                const isActive = this.deviceData.status === "ACTIVE";
                this.log.debug(`${this.accessory.displayName} | Status Active: ${isActive}`);
                return isActive;
            },
        });

        this.getOrAddCharacteristic(this.motionSvc, this.Characteristic.StatusTampered, {
            preReqChk: () => this.hasCapability("TamperAlert"),
            getHandler: () => {
                const isTampered = this.deviceData.attributes.tamper === "detected";
                this.log.debug(`${this.accessory.displayName} | Status Tampered: ${isTampered}`);
                return isTampered;
            },
            removeIfMissingPreReq: true,
        });

        this.accessory.deviceGroups.push("motion_sensor");
    }

    /**
     * Handles updates to device attributes and updates the corresponding HomeKit characteristics.
     *
     * @param {Object} change - The change object containing attribute updates.
     * @param {string} change.attribute - The name of the attribute that has changed.
     * @param {string} change.value - The new value of the attribute.
     *
     * @returns {void}
     */
    handleAttributeUpdate(change) {
        if (!this.motionSvc) {
            this.log.warn(`${this.accessory.displayName} | Motion Sensor service not found`);
            return;
        }

        switch (change.attribute) {
            case "motion":
                this.updateCharacteristicValue(this.motionSvc, this.Characteristic.MotionDetected, change.value === "active");
                break;
            case "tamper":
                if (this.hasCapability("TamperAlert")) {
                    const isTampered = change.value === "detected";
                    this.updateCharacteristicValue(this.motionSvc, this.Characteristic.StatusTampered, isTampered);
                }
                break;
            case "status":
                const isActive = change.value === "ACTIVE";
                this.updateCharacteristicValue(this.motionSvc, this.Characteristic.StatusActive, isActive);
                break;
            default:
                this.log.debug(`${this.accessory.displayName} | Unhandled attribute update: ${change.attribute}`);
        }
    }
}

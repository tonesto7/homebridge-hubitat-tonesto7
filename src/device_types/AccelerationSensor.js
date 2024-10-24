// device_types/acceleration_sensor.js

import HubitatAccessory from "../HubitatAccessory.js";

export default class AccelerationSensor extends HubitatAccessory {
    constructor(platform, accessory) {
        super(platform, accessory);
        this.deviceData = accessory.context.deviceData;
    }

    static relevantAttributes = ["acceleration", "tamper", "status"];

    /**
     * Checks if the accessory supports the AccelerationSensor capability.
     *
     * @param {Object} accessory - The accessory to check.
     * @returns {boolean} True if the accessory has the AccelerationSensor capability, otherwise false.
     */
    static isSupported(accessory) {
        return accessory.hasCapability("AccelerationSensor");
    }

    /**
     * Initializes the motion service for the acceleration sensor device.
     *
     * This method sets up the following characteristics for the motion service:
     * - Motion Detected: Indicates if motion is detected based on the device's acceleration attribute.
     * - Status Active: Indicates if the device is active based on the device's status.
     * - Status Tampered: Indicates if the device has been tampered with, if the device supports the TamperAlert capability.
     *
     * Additionally, it adds the device to the "acceleration_sensor" device group.
     *
     * @async
     * @returns {Promise<void>} A promise that resolves when the service is initialized.
     */
    async initializeService() {
        this.motionSvc = this.getOrAddService(this.Service.MotionSensor);

        // Motion Detected Characteristic
        this.getOrAddCharacteristic(this.motionSvc, this.Characteristic.MotionDetected, {
            getHandler: () => {
                const motionDetected = this.deviceData.attributes.acceleration === "active";
                this.log.debug(`${this.accessory.displayName} | Motion Detected Retrieved: ${motionDetected}`);
                return motionDetected;
            },
        });

        // Status Active Characteristic
        this.getOrAddCharacteristic(this.motionSvc, this.Characteristic.StatusActive, {
            getHandler: () => {
                const isActive = this.deviceData.status === "ACTIVE";
                this.log.debug(`${this.accessory.displayName} | Status Active Retrieved: ${isActive}`);
                return isActive;
            },
        });

        // Status Tampered Characteristic (if supported)
        this.getOrAddCharacteristic(this.motionSvc, this.Characteristic.StatusTampered, {
            preReqChk: () => this.hasCapability("TamperAlert"),
            getHandler: () => {
                const isTampered = this.deviceData.attributes.tamper === "detected";
                this.log.debug(`${this.accessory.displayName} | Status Tampered Retrieved: ${isTampered}`);
                return isTampered;
            },
            removeIfMissingPreReq: true,
        });

        this.accessory.deviceGroups.push("acceleration_sensor");
    }

    /**
     * Handles updates to device attributes and updates the corresponding HomeKit characteristics.
     *
     * @param {Object} change - The change object containing attribute updates.
     * @param {string} change.attribute - The name of the attribute that has changed.
     * @param {string} change.value - The new value of the attribute.
     */
    handleAttributeUpdate(change) {
        if (!this.motionSvc) {
            this.log.warn(`${this.accessory.displayName} | Motion Sensor service not found`);
            return;
        }

        switch (change.attribute) {
            case "acceleration":
                this.updateCharacteristicValue(this.motionSvc, this.Characteristic.MotionDetected, change.value === "active");
                break;
            case "tamper":
                if (this.hasCapability("TamperAlert")) {
                    this.updateCharacteristicValue(this.motionSvc, this.Characteristic.StatusTampered, change.value === "detected");
                }
                break;
            case "status":
                this.updateCharacteristicValue(this.motionSvc, this.Characteristic.StatusActive, change.value === "ACTIVE");
                break;
            default:
                this.log.debug(`${this.accessory.displayName} | Unhandled attribute update: ${change.attribute}`);
        }
    }
}

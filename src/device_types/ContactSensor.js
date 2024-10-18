import HubitatAccessory from "../HubitatAccessory.js";

export default class ContactSensor extends HubitatAccessory {
    constructor(platform, accessory) {
        super(platform, accessory);
        this.deviceData = accessory.context.deviceData;
    }

    static relevantAttributes = ["contact", "status", "tamper"];

    /**
     * Initializes the contact sensor service and its characteristics.
     *
     * This method sets up the following characteristics for the contact sensor:
     * - ContactSensorState: Retrieves the current contact status of the device.
     * - StatusActive: Indicates whether the device is active.
     * - StatusTampered: Indicates whether the device has been tampered with, if supported.
     *
     * Additionally, it adds the contact sensor to the accessory's device groups.
     *
     * @async
     * @method initializeService
     * @returns {Promise<void>} A promise that resolves when the service is initialized.
     */
    async initializeService() {
        this.contactSvc = this.getOrAddService(this.Service.ContactSensor);

        // Contact Sensor State
        this.getOrAddCharacteristic(this.contactSvc, this.Characteristic.ContactSensorState, {
            getHandler: () => {
                const status = this.deviceData.attributes.contact;
                return this.convertContactStatus(status);
            },
        });

        // Status Active
        this.getOrAddCharacteristic(this.contactSvc, this.Characteristic.StatusActive, {
            getHandler: () => {
                const isActive = this.deviceData.status === "ACTIVE";
                this.log.debug(`${this.accessory.displayName} | StatusActive: ${isActive}`);
                return isActive;
            },
        });

        // Status Tampered (if supported)
        this.getOrAddCharacteristic(this.contactSvc, this.Characteristic.StatusTampered, {
            preReqChk: () => this.hasCapability("TamperAlert"),
            getHandler: () => {
                const isTampered = this.deviceData.attributes.tamper === "detected";
                this.log.debug(`${this.accessory.displayName} | StatusTampered: ${isTampered}`);
                return isTampered;
            },
            removeIfMissingPreReq: true,
        });

        this.accessory.deviceGroups.push("contact_sensor");
    }

    /**
     * Handles updates to device attributes and updates the corresponding HomeKit characteristics.
     *
     * @param {Object} change - The change object containing attribute updates.
     * @param {string} change.attribute - The name of the attribute that has changed.
     * @param {string} change.value - The new value of the attribute.
     */
    handleAttributeUpdate(change) {
        if (!this.contactSvc) {
            this.log.warn(`${this.accessory.displayName} | Contact Sensor service not found`);
            return;
        }

        switch (change.attribute) {
            case "contact": {
                const contactState = this.convertContactStatus(change.value);
                this.updateCharacteristicValue(this.contactSvc, this.Characteristic.ContactSensorState, contactState);
                break;
            }
            case "status": {
                const isActive = change.value === "ACTIVE";
                this.updateCharacteristicValue(this.contactSvc, this.Characteristic.StatusActive, isActive);
                break;
            }
            case "tamper": {
                if (this.hasCapability("TamperAlert")) {
                    const isTampered = change.value === "detected";
                    this.updateCharacteristicValue(this.contactSvc, this.Characteristic.StatusTampered, isTampered);
                }
                break;
            }
            default:
                this.log.debug(`${this.accessory.displayName} | Unhandled attribute update: ${change.attribute}`);
        }
    }

    /**
     * Converts the contact sensor status to the corresponding HomeKit characteristic state.
     *
     * @param {string} status - The status of the contact sensor, expected to be either "closed" or "open".
     * @returns {number} - Returns the HomeKit characteristic state:
     *                     `this.Characteristic.ContactSensorState.CONTACT_DETECTED` if the status is "closed",
     *                     `this.Characteristic.ContactSensorState.CONTACT_NOT_DETECTED` otherwise.
     */
    convertContactStatus(status) {
        return status === "closed" ? this.Characteristic.ContactSensorState.CONTACT_DETECTED : this.Characteristic.ContactSensorState.CONTACT_NOT_DETECTED;
    }
}

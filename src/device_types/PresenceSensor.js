import HubitatAccessory from "../HubitatAccessory.js";

export default class PresenceSensor extends HubitatAccessory {
    constructor(platform, accessory) {
        super(platform, accessory);
        this.deviceData = accessory.context.deviceData;
    }

    static relevantAttributes = ["presence", "status", "tamper"];

    /**
     * Initializes the occupancy service for the presence sensor.
     *
     * This method sets up the occupancy service and its characteristics:
     * - OccupancyDetected: Retrieves the occupancy status based on the device's presence attribute.
     * - StatusActive: Retrieves the active status of the presence sensor.
     * - StatusTampered: Retrieves the tampered status if the device has the TamperAlert capability.
     *
     * It also adds the presence sensor to the accessory's device groups.
     *
     * @async
     * @returns {Promise<void>} A promise that resolves when the service is initialized.
     */
    async initializeService() {
        this.occupancySvc = this.getOrAddService(this.Service.OccupancySensor);

        this.getOrAddCharacteristic(this.occupancySvc, this.Characteristic.OccupancyDetected, {
            getHandler: () => {
                const occupancy = this.convertPresence(this.deviceData.attributes.presence);
                this.log.debug(`${this.accessory.displayName} | Occupancy Detected Retrieved: ${occupancy}`);
                return occupancy;
            },
        });

        this.getOrAddCharacteristic(this.occupancySvc, this.Characteristic.StatusActive, {
            getHandler: () => {
                const isActive = this.deviceData.status === "ACTIVE";
                this.log.debug(`${this.accessory.displayName} | Presence Sensor Status Active Retrieved: ${isActive}`);
                return isActive;
            },
        });

        this.getOrAddCharacteristic(this.occupancySvc, this.Characteristic.StatusTampered, {
            preReqChk: () => this.hasCapability("TamperAlert"),
            getHandler: () => {
                const isTampered = this.deviceData.attributes.tamper === "detected";
                this.log.debug(`${this.accessory.displayName} | Presence Sensor Status Tampered Retrieved: ${isTampered}`);
                return isTampered;
            },
            removeIfMissingPreReq: true,
        });

        this.accessory.deviceGroups.push("presence_sensor");
    }

    /**
     * Handles updates to device attributes and updates the corresponding HomeKit characteristics.
     *
     * @param {Object} change - The object containing the attribute change information.
     * @param {string} change.attribute - The name of the attribute that has changed.
     * @param {string} change.value - The new value of the attribute.
     */
    handleAttributeUpdate(change) {
        if (!this.occupancySvc) {
            this.log.warn(`${this.accessory.displayName} | Occupancy Sensor service not found`);
            return;
        }

        switch (change.attribute) {
            case "presence":
                const occupancy = this.convertPresence(change.value);
                this.updateCharacteristicValue(this.occupancySvc, this.Characteristic.OccupancyDetected, occupancy);
                break;
            case "status":
                const isActive = change.value === "ACTIVE";
                this.updateCharacteristicValue(this.occupancySvc, this.Characteristic.StatusActive, isActive);
                break;
            case "tamper":
                if (this.hasCapability("TamperAlert")) {
                    const isTampered = change.value === "detected";
                    this.updateCharacteristicValue(this.occupancySvc, this.Characteristic.StatusTampered, isTampered);
                }
                break;
            default:
                this.log.debug(`${this.accessory.displayName} | Unhandled attribute update: ${change.attribute}`);
        }
    }

    /**
     * Converts the presence status to the corresponding occupancy detection characteristic.
     *
     * @param {string} presence - The presence status, expected to be "present" or "not present".
     * @returns {number} - The occupancy detection characteristic, either OCCUPANCY_DETECTED or OCCUPANCY_NOT_DETECTED.
     */
    convertPresence(presence) {
        return presence === "present" ? this.Characteristic.OccupancyDetected.OCCUPANCY_DETECTED : this.Characteristic.OccupancyDetected.OCCUPANCY_NOT_DETECTED;
    }
}

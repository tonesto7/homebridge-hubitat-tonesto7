// device_types/PresenceSensor.js

import HubitatBaseAccessory from "./BaseAccessory.js";

export default class PresenceSensor extends HubitatBaseAccessory {
    constructor(platform, accessory) {
        super(platform, accessory);
        this.occupancyService = null;
    }

    static relevantAttributes = ["presence", "status", "tamper"];

    async configureServices() {
        try {
            this.occupancyService = this.getOrAddService(this.Service.OccupancySensor, this.cleanServiceDisplayName(this.deviceData.name, "Presence Sensor"));

            // Occupancy Detected
            this.getOrAddCharacteristic(this.occupancyService, this.Characteristic.OccupancyDetected, {
                getHandler: () => this.getOccupancyDetected(this.deviceData.attributes.presence),
            });

            // Status Active
            this.getOrAddCharacteristic(this.occupancyService, this.Characteristic.StatusActive, {
                getHandler: () => this.getStatusActive(this.deviceData.status),
            });

            // Status Tampered (if supported)
            this.getOrAddCharacteristic(this.occupancyService, this.Characteristic.StatusTampered, {
                preReqChk: () => this.hasCapability("TamperAlert"),
                getHandler: () => this.getStatusTampered(this.deviceData.attributes.tamper),
                removeIfMissingPreReq: true,
            });

            return true;
        } catch (error) {
            this.logManager.logError(`PresenceSensor | ${this.deviceData.name} | Error configuring services:`, error);
            throw error;
        }
    }

    getOccupancyDetected(value) {
        return value === "present" ? this.Characteristic.OccupancyDetected.OCCUPANCY_DETECTED : this.Characteristic.OccupancyDetected.OCCUPANCY_NOT_DETECTED;
    }

    getStatusActive(value) {
        return value === "ACTIVE";
    }

    getStatusTampered(value) {
        return value === "detected" ? this.Characteristic.StatusTampered.TAMPERED : this.Characteristic.StatusTampered.NOT_TAMPERED;
    }

    async handleAttributeUpdate(change) {
        const { attribute, value } = change;

        switch (attribute) {
            case "presence":
                this.occupancyService.getCharacteristic(this.Characteristic.OccupancyDetected).updateValue(this.getOccupancyDetected(value));
                break;

            case "status":
                this.occupancyService.getCharacteristic(this.Characteristic.StatusActive).updateValue(this.getStatusActive(value));
                break;

            case "tamper":
                if (!this.hasCapability("TamperAlert")) return;
                this.occupancyService.getCharacteristic(this.Characteristic.StatusTampered).updateValue(this.getStatusTampered(value));
                break;

            default:
                this.logManager.logDebug(`PresenceSensor | ${this.deviceData.name} | Unhandled attribute update: ${attribute} = ${value}`);
        }
    }

    // Override cleanup
    async cleanup() {
        this.occupancyService = null;
        super.cleanup();
    }
}

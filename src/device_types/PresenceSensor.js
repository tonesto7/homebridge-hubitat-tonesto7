// device_types/PresenceSensor.js

import HubitatPlatformAccessory from "../HubitatPlatformAccessory.js";

export default class PresenceSensor extends HubitatPlatformAccessory {
    constructor(platform, accessory) {
        super(platform, accessory);
        this.occupancyService = null;
    }

    async configureServices() {
        try {
            this.occupancyService = this.getOrAddService(this.Service.OccupancySensor);
            // this.markServiceForRetention(this.occupancyService);

            // Occupancy Detected
            this.getOrAddCharacteristic(this.occupancyService, this.Characteristic.OccupancyDetected, {
                getHandler: () => this.getOccupancyDetected(),
            });

            // Status Active
            this.getOrAddCharacteristic(this.occupancyService, this.Characteristic.StatusActive, {
                getHandler: () => this.getStatusActive(),
            });

            // Status Tampered (if supported)
            this.getOrAddCharacteristic(this.occupancyService, this.Characteristic.StatusTampered, {
                preReqChk: () => this.hasCapability("TamperAlert"),
                getHandler: () => this.getStatusTampered(),
                removeIfMissingPreReq: true,
            });

            return true;
        } catch (error) {
            this.logError("Error configuring presence sensor services:", error);
            throw error;
        }
    }

    getOccupancyDetected() {
        return this.deviceData.attributes.presence === "present" ? this.Characteristic.OccupancyDetected.OCCUPANCY_DETECTED : this.Characteristic.OccupancyDetected.OCCUPANCY_NOT_DETECTED;
    }

    getStatusActive() {
        return this.deviceData.attributes.status === "online";
    }

    getStatusTampered() {
        return this.deviceData.attributes.tamper === "detected" ? this.Characteristic.StatusTampered.TAMPERED : this.Characteristic.StatusTampered.NOT_TAMPERED;
    }

    async handleAttributeUpdate(attribute, value) {
        this.updateDeviceAttribute(attribute, value);

        switch (attribute) {
            case "presence":
                this.occupancyService.getCharacteristic(this.Characteristic.OccupancyDetected).updateValue(value === "present" ? this.Characteristic.OccupancyDetected.OCCUPANCY_DETECTED : this.Characteristic.OccupancyDetected.OCCUPANCY_NOT_DETECTED);
                break;

            case "status":
                this.occupancyService.getCharacteristic(this.Characteristic.StatusActive).updateValue(value === "online");
                break;

            case "tamper":
                if (!this.hasCapability("TamperAlert")) return;
                this.occupancyService.getCharacteristic(this.Characteristic.StatusTampered).updateValue(value === "detected" ? this.Characteristic.StatusTampered.TAMPERED : this.Characteristic.StatusTampered.NOT_TAMPERED);
                break;

            default:
                this.logDebug(`Unhandled attribute update: ${attribute} = ${value}`);
        }
    }

    // Override cleanup
    async cleanup() {
        this.occupancyService = null;
        await super.cleanup();
    }
}

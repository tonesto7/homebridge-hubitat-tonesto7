// device_types/CarbonMonoxide.js

import HubitatBaseAccessory from "./BaseAccessory.js";

export default class CarbonMonoxideSensor extends HubitatBaseAccessory {
    constructor(platform, accessory) {
        super(platform, accessory);
        this.coService = null;
    }

    static relevantAttributes = ["carbonMonoxide", "status", "tamper"];

    async configureServices() {
        try {
            this.coService = this.getOrAddService(this.Service.CarbonMonoxideSensor, this.cleanServiceDisplayName(this.deviceData.name, "Carbon Monoxide"));

            // CO Detected
            this.getOrAddCharacteristic(this.coService, this.Characteristic.CarbonMonoxideDetected, {
                getHandler: () => this.getCODetected(),
            });

            // Status Active
            this.getOrAddCharacteristic(this.coService, this.Characteristic.StatusActive, {
                getHandler: () => this.getStatusActive(),
            });

            // Status Tampered (if supported)
            this.getOrAddCharacteristic(this.coService, this.Characteristic.StatusTampered, {
                preReqChk: () => this.hasCapability("TamperAlert"),
                getHandler: () => this.getStatusTampered(),
                removeIfMissingPreReq: true,
            });

            return true;
        } catch (error) {
            this.logManager.logError(`CarbonMonoxide | ${this.deviceData.name} | Error configuring services:`, error);
            throw error;
        }
    }

    getCODetected() {
        return this.deviceData.attributes.carbonMonoxide === "clear" ? this.Characteristic.CarbonMonoxideDetected.CO_LEVELS_NORMAL : this.Characteristic.CarbonMonoxideDetected.CO_LEVELS_ABNORMAL;
    }

    getStatusActive() {
        return this.deviceData.status === "ACTIVE";
    }

    getStatusTampered() {
        return this.deviceData.attributes.tamper === "detected" ? this.Characteristic.StatusTampered.TAMPERED : this.Characteristic.StatusTampered.NOT_TAMPERED;
    }

    async handleAttributeUpdate(change) {
        const { attribute, value } = change;

        switch (attribute) {
            case "carbonMonoxide":
                this.coService.getCharacteristic(this.Characteristic.CarbonMonoxideDetected).updateValue(value === "clear" ? this.Characteristic.CarbonMonoxideDetected.CO_LEVELS_NORMAL : this.Characteristic.CarbonMonoxideDetected.CO_LEVELS_ABNORMAL);
                break;

            case "status":
                this.coService.getCharacteristic(this.Characteristic.StatusActive).updateValue(value === "ACTIVE");
                break;

            case "tamper":
                if (!this.hasCapability("TamperAlert")) return;
                this.coService.getCharacteristic(this.Characteristic.StatusTampered).updateValue(value === "detected" ? this.Characteristic.StatusTampered.TAMPERED : this.Characteristic.StatusTampered.NOT_TAMPERED);
                break;

            default:
                this.logManager.logDebug(`CarbonMonoxide | ${this.deviceData.name} | Unhandled attribute update: ${attribute} = ${value}`);
        }
    }

    // Override cleanup
    async cleanup() {
        this.coService = null;
        super.cleanup();
    }
}

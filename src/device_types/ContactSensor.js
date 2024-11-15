// device_types/ContactSensor.js

import HubitatPlatformAccessory from "../HubitatPlatformAccessory.js";

export default class ContactSensor extends HubitatPlatformAccessory {
    constructor(platform, accessory) {
        super(platform, accessory);
        this.contactService = null;
    }

    static relevantAttributes = ["contact", "status", "tamper"];

    async configureServices() {
        try {
            this.contactService = this.getOrAddService(this.Service.ContactSensor, this.getServiceDisplayName(this.deviceData.name, "Contact Sensor"));
            // this.markServiceForRetention(this.contactService);

            // Contact Sensor State
            this.getOrAddCharacteristic(this.contactService, this.Characteristic.ContactSensorState, {
                getHandler: () => this.getContactState(),
            });

            // Status Active
            this.getOrAddCharacteristic(this.contactService, this.Characteristic.StatusActive, {
                getHandler: () => this.getStatusActive(),
            });

            // Status Tampered (if supported)
            this.getOrAddCharacteristic(this.contactService, this.Characteristic.StatusTampered, {
                preReqChk: () => this.hasCapability("TamperAlert"),
                getHandler: () => this.getStatusTampered(),
                removeIfMissingPreReq: true,
            });

            return true;
        } catch (error) {
            this.logError(`ContactSensor | ${this.deviceData.name} | Error configuring services:`, error);
            throw error;
        }
    }

    getContactState() {
        return this.deviceData.attributes.contact === "closed" ? this.Characteristic.ContactSensorState.CONTACT_DETECTED : this.Characteristic.ContactSensorState.CONTACT_NOT_DETECTED;
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
            case "contact":
                this.contactService.getCharacteristic(this.Characteristic.ContactSensorState).updateValue(value === "closed" ? this.Characteristic.ContactSensorState.CONTACT_DETECTED : this.Characteristic.ContactSensorState.CONTACT_NOT_DETECTED);
                break;

            case "status":
                this.contactService.getCharacteristic(this.Characteristic.StatusActive).updateValue(value === "ACTIVE");
                break;

            case "tamper":
                if (!this.hasCapability("TamperAlert")) return;
                this.contactService.getCharacteristic(this.Characteristic.StatusTampered).updateValue(value === "detected" ? this.Characteristic.StatusTampered.TAMPERED : this.Characteristic.StatusTampered.NOT_TAMPERED);
                break;

            default:
                this.logDebug(`ContactSensor | ${this.deviceData.name} | Unhandled attribute update: ${attribute} = ${value}`);
        }
    }

    // Override cleanup
    async cleanup() {
        this.contactService = null;
        super.cleanup();
    }
}

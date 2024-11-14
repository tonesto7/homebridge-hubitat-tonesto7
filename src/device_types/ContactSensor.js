// device_types/ContactSensor.js

import HubitatPlatformAccessory from "../HubitatPlatformAccessory.js";

export default class ContactSensor extends HubitatPlatformAccessory {
    constructor(platform, accessory) {
        super(platform, accessory);
        this.contactService = null;
    }

    async configureServices() {
        try {
            this.contactService = this.getOrAddService(this.Service.ContactSensor);
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

            // Status Low Battery (if supported)
            this.getOrAddCharacteristic(this.contactService, this.Characteristic.StatusLowBattery, {
                preReqChk: () => this.hasCapability("Battery"),
                getHandler: () => this.getStatusLowBattery(),
                removeIfMissingPreReq: true,
            });

            return true;
        } catch (error) {
            this.logError("Error configuring contact sensor services:", error);
            throw error;
        }
    }

    getContactState() {
        return this.deviceData.attributes.contact === "closed" ? this.Characteristic.ContactSensorState.CONTACT_DETECTED : this.Characteristic.ContactSensorState.CONTACT_NOT_DETECTED;
    }

    getStatusActive() {
        return this.deviceData.attributes.status === "online";
    }

    getStatusTampered() {
        return this.deviceData.attributes.tamper === "detected" ? this.Characteristic.StatusTampered.TAMPERED : this.Characteristic.StatusTampered.NOT_TAMPERED;
    }

    getStatusLowBattery() {
        const battery = this.deviceData.attributes.battery;
        return parseInt(battery) < 20 ? this.Characteristic.StatusLowBattery.BATTERY_LEVEL_LOW : this.Characteristic.StatusLowBattery.BATTERY_LEVEL_NORMAL;
    }

    async handleAttributeUpdate(attribute, value) {
        this.updateDeviceAttribute(attribute, value);
        switch (attribute) {
            case "contact":
                this.contactService.getCharacteristic(this.Characteristic.ContactSensorState).updateValue(value === "closed" ? this.Characteristic.ContactSensorState.CONTACT_DETECTED : this.Characteristic.ContactSensorState.CONTACT_NOT_DETECTED);
                break;

            case "status":
                this.contactService.getCharacteristic(this.Characteristic.StatusActive).updateValue(value === "online");
                break;

            case "tamper":
                if (!this.hasCapability("TamperAlert")) return;
                this.contactService.getCharacteristic(this.Characteristic.StatusTampered).updateValue(value === "detected" ? this.Characteristic.StatusTampered.TAMPERED : this.Characteristic.StatusTampered.NOT_TAMPERED);
                break;

            case "battery":
                if (!this.hasCapability("Battery")) return;
                this.contactService.getCharacteristic(this.Characteristic.StatusLowBattery).updateValue(parseInt(value) < 20 ? this.Characteristic.StatusLowBattery.BATTERY_LEVEL_LOW : this.Characteristic.StatusLowBattery.BATTERY_LEVEL_NORMAL);
                break;

            default:
                this.logDebug(`Unhandled attribute update: ${attribute} = ${value}`);
        }
    }

    // Override cleanup
    async cleanup() {
        this.contactService = null;
        await super.cleanup();
    }
}

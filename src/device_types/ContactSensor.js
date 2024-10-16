import HubitatAccessory from "../HubitatAccessory.js";

export default class ContactSensor extends HubitatAccessory {
    constructor(platform, accessory) {
        super(platform, accessory);
        this.deviceData = accessory.context.deviceData;
        this.relevantAttributes = ["contact", "status", "tamper"];
    }

    static isSupported(accessory) {
        return accessory.hasCapability("ContactSensor") && !accessory.hasCapability("GarageDoorControl");
    }

    initializeService() {
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

        this.accessory.context.deviceGroups.push("contact_sensor");
    }

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

    convertContactStatus(status) {
        return status === "closed" ? this.Characteristic.ContactSensorState.CONTACT_DETECTED : this.Characteristic.ContactSensorState.CONTACT_NOT_DETECTED;
    }
}

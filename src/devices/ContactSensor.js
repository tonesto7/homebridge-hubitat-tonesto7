// devices/ContactSensor.js

export class ContactSensor {
    constructor(platform) {
        this.logManager = platform.logManager;
        this.Service = platform.Service;
        this.Characteristic = platform.Characteristic;
        this.generateSrvcName = platform.generateSrvcName;
    }

    static relevantAttributes = ["contact", "status", "tamper"];

    configure(accessory) {
        this.logManager.logDebug(`Configuring Contact Sensor for ${accessory.displayName}`);
        const svc = accessory.getOrAddService(this.Service.ContactSensor, accessory.displayName, "contact");
        const devData = accessory.context.deviceData;

        this._configureContactState(accessory, svc, devData);
        this._configureStatusActive(accessory, svc, devData);
        this._configureStatusTampered(accessory, svc, devData);

        return accessory;
    }

    _configureContactState(accessory, svc, devData) {
        accessory.getOrAddCharacteristic(svc, this.Characteristic.ContactSensorState, {
            getHandler: () => this._getContactState(devData.attributes.contact),
        });
    }

    _configureStatusActive(accessory, svc, devData) {
        accessory.getOrAddCharacteristic(svc, this.Characteristic.StatusActive, {
            getHandler: () => this._getActiveState(devData.status),
        });
    }

    _configureStatusTampered(accessory, svc, devData) {
        accessory.getOrAddCharacteristic(svc, this.Characteristic.StatusTampered, {
            preReqChk: () => accessory.hasCapability("TamperAlert"),
            getHandler: () => this._getTamperedState(devData.attributes.tamper),
            removeIfMissingPreReq: true,
        });
    }

    _getContactState(value) {
        return value === "closed" ? this.Characteristic.ContactSensorState.CONTACT_DETECTED : this.Characteristic.ContactSensorState.CONTACT_NOT_DETECTED;
    }

    _getTamperedState(value) {
        return value === "detected" ? this.Characteristic.StatusTampered.TAMPERED : this.Characteristic.StatusTampered.NOT_TAMPERED;
    }

    _getActiveState(value) {
        return value !== "OFFLINE" && value !== "INACTIVE";
    }

    // Handle attribute updates
    handleAttributeUpdate(accessory, update) {
        const { attribute, value } = update;
        this.logManager.logDebug(`ContactSensor | ${accessory.displayName} | Attribute update: ${attribute} = ${value}`);
        if (!ContactSensor.relevantAttributes.includes(attribute)) return;

        const svc = accessory.getService(this.Service.ContactSensor, this.generateSrvcName(accessory.displayName, "Contact"));
        if (!svc) return;

        svc.getCharacteristic(this.Characteristic.StatusActive).updateValue(this._getActiveState(accessory.context.deviceData.status));

        switch (attribute) {
            case "contact":
                svc.getCharacteristic(this.Characteristic.ContactSensorState).updateValue(this._getContactState(value));
                break;
            case "tamper":
                svc.getCharacteristic(this.Characteristic.StatusTampered).updateValue(this._getTamperedState(value));
                break;
            default:
                this.logManager.logWarn(`ContactSensor | ${accessory.displayName} | Unhandled attribute update: ${attribute} = ${value}`);
        }
    }
}

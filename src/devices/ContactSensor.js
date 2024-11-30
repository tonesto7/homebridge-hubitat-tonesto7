// devices/ContactSensor.js
export class ContactSensor {
    constructor(platform) {
        this.logManager = platform.logManager;
        this.Service = platform.Service;
        this.Characteristic = platform.Characteristic;
    }

    configure(accessory) {
        console.log(`Configuring Contact Sensor for ${accessory.displayName}`);
        const svc = accessory.getOrAddService(this.Service.ContactSensor);
        const devData = accessory.context.deviceData;

        this._configureContactState(accessory, svc, devData);
        this._configureStatusActive(accessory, svc, devData);
        this._configureStatusTampered(accessory, svc, devData);

        accessory.context.deviceGroups.push("contact_sensor");
        return accessory;
    }

    _configureContactState(accessory, svc, devData) {
        accessory.getOrAddCharacteristic(svc, this.Characteristic.ContactSensorState, {
            getHandler: () => {
                return devData.attributes.contact === "closed" ? this.Characteristic.ContactSensorState.CONTACT_DETECTED : this.Characteristic.ContactSensorState.CONTACT_NOT_DETECTED;
            },
            updateHandler: (value) => {
                return value === "closed" ? this.Characteristic.ContactSensorState.CONTACT_DETECTED : this.Characteristic.ContactSensorState.CONTACT_NOT_DETECTED;
            },
            storeAttribute: "contact",
        });
    }

    _configureStatusActive(accessory, svc, devData) {
        accessory.getOrAddCharacteristic(svc, this.Characteristic.StatusActive, {
            getHandler: () => devData.status !== "OFFLINE" && devData.status !== "INACTIVE",
            updateHandler: (value) => value !== "OFFLINE" && value !== "INACTIVE",
            storeAttribute: "status",
        });
    }

    _configureStatusTampered(accessory, svc, devData) {
        accessory.getOrAddCharacteristic(svc, this.Characteristic.StatusTampered, {
            preReqChk: () => accessory.hasCapability("TamperAlert"),
            getHandler: () => {
                return devData.attributes.tamper === "detected" ? this.Characteristic.StatusTampered.TAMPERED : this.Characteristic.StatusTampered.NOT_TAMPERED;
            },
            updateHandler: (value) => {
                return value === "detected" ? this.Characteristic.StatusTampered.TAMPERED : this.Characteristic.StatusTampered.NOT_TAMPERED;
            },
            storeAttribute: "tamper",
            removeIfMissingPreReq: true,
        });
    }
}

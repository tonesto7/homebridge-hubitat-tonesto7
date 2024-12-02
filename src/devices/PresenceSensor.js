// devices/PresenceSensor.js
export class PresenceSensor {
    constructor(platform) {
        this.logManager = platform.logManager;
        this.Service = platform.Service;
        this.Characteristic = platform.Characteristic;
        this.generateSrvcName = platform.generateSrvcName;
    }

    static relevantAttributes = ["presence", "tamper"];

    configure(accessory) {
        this.logManager.logDebug(`Configuring Presence Sensor for ${accessory.displayName}`);
        const svc = accessory.getOrAddService(this.Service.OccupancySensor, accessory.displayName, "presence");
        const devData = accessory.context.deviceData;

        this._configureOccupancyDetected(accessory, svc, devData);
        this._configureStatusActive(accessory, svc, devData);
        this._configureStatusTampered(accessory, svc, devData);

        return accessory;
    }

    _configureOccupancyDetected(accessory, svc, devData) {
        accessory.getOrAddCharacteristic(svc, this.Characteristic.OccupancyDetected, {
            getHandler: () => this._getPresenceState(devData.attributes.presence),
        });
    }

    _configureStatusActive(accessory, svc, devData) {
        accessory.getOrAddCharacteristic(svc, this.Characteristic.StatusActive, {
            getHandler: () => this._getStatusActiveState(devData.status),
        });
    }

    _configureStatusTampered(accessory, svc, devData) {
        accessory.getOrAddCharacteristic(svc, this.Characteristic.StatusTampered, {
            preReqChk: () => accessory.hasCapability("TamperAlert"),
            getHandler: () => this._getTamperedState(devData.attributes.tamper),
            removeIfMissingPreReq: true,
        });
    }

    _getPresenceState(value) {
        return value === "present" ? this.Characteristic.OccupancyDetected.OCCUPANCY_DETECTED : this.Characteristic.OccupancyDetected.OCCUPANCY_NOT_DETECTED;
    }

    _getStatusActiveState(value) {
        return value !== "OFFLINE" && value !== "INACTIVE";
    }

    _getTamperedState(value) {
        return value === "detected" ? this.Characteristic.StatusTampered.TAMPERED : this.Characteristic.StatusTampered.NOT_TAMPERED;
    }

    // Handle attribute updates
    handleAttributeUpdate(accessory, update) {
        const { attribute, value } = update;
        this.logManager.logDebug(`PresenceSensor | ${accessory.displayName} | Attribute update: ${attribute} = ${value}`);
        if (!PresenceSensor.relevantAttributes.includes(attribute)) return;

        const svc = accessory.getService(this.Service.OccupancySensor, this.generateSrvcName(accessory.displayName, "Presence"));
        if (!svc) return;

        svc.getCharacteristic(this.Characteristic.StatusActive).updateValue(this._getStatusActiveState(accessory.context.deviceData.status));

        switch (attribute) {
            case "presence":
                svc.getCharacteristic(this.Characteristic.OccupancyDetected).updateValue(this._getPresenceState(value));
                break;
            case "tamper":
                svc.getCharacteristic(this.Characteristic.StatusTampered).updateValue(this._getTamperedState(value));
                break;
            default:
                this.logManager.logWarn(`PresenceSensor | ${accessory.displayName} | Unhandled attribute update: ${attribute} = ${value}`);
        }
    }
}

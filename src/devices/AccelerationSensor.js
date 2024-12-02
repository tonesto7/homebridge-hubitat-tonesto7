// devices/AccelerationSensor.js
export class AccelerationSensor {
    constructor(platform) {
        this.logManager = platform.logManager;
        this.Service = platform.Service;
        this.Characteristic = platform.Characteristic;
        this.CommunityTypes = platform.CommunityTypes;
        this.generateSrvcName = platform.generateSrvcName;
    }

    static relevantAttributes = ["acceleration", "status", "tamper"];

    configure(accessory) {
        this.logManager.logDebug(`Configuring Acceleration Sensor for ${accessory.displayName}`);
        const svcName = this.generateSrvcName(accessory.displayName, "Acceleration");
        const svc = accessory.getOrAddService(this.Service.MotionSensor);
        const devData = accessory.context.deviceData;

        this._updateSvcName(svc, svcName);
        this._configureMotionDetected(accessory, svc, devData);
        this._configureStatusActive(accessory, svc, devData);
        this._configureStatusTampered(accessory, svc, devData);

        return accessory;
    }

    _updateSvcName(svc, svcName) {
        svc.getOrAddCharacteristic(this.Characteristic.Name).updateValue(svcName);
    }

    _configureMotionDetected(accessory, svc, devData) {
        accessory.getOrAddCharacteristic(svc, this.Characteristic.MotionDetected, {
            getHandler: () => this._getMotionDetected(devData.attributes.acceleration),
        });
    }

    _configureStatusActive(accessory, svc, devData) {
        accessory.getOrAddCharacteristic(svc, this.Characteristic.StatusActive, {
            getHandler: () => {
                const status = devData.status;
                return this._getStatusActive(status);
            },
        });
    }

    _configureStatusTampered(accessory, svc, devData) {
        accessory.getOrAddCharacteristic(svc, this.Characteristic.StatusTampered, {
            preReqChk: () => accessory.hasCapability("TamperAlert"),
            getHandler: () => {
                return this._getStatusTampered(devData.attributes.tamper);
            },
            removeIfMissingPreReq: true,
        });
    }

    _getMotionDetected(value) {
        return value === "active";
    }

    _getStatusActive(value) {
        return value !== "OFFLINE" && value !== "INACTIVE";
    }

    _getStatusTampered(value) {
        return value === "detected" ? this.Characteristic.StatusTampered.TAMPERED : this.Characteristic.StatusTampered.NOT_TAMPERED;
    }

    // Handle attribute updates
    handleAttributeUpdate(accessory, update) {
        const { attribute, value } = update;
        if (!AccelerationSensor.relevantAttributes.includes(attribute)) return;

        this.logManager.logDebug(`AccelerationSensor | ${accessory.displayName} | Attribute update: ${attribute} = ${value}`);

        const svc = accessory.getService(this.Service.Lightbulb);
        if (!svc) {
            this.logManager.logWarn(`AccelerationSensor | ${accessory.displayName} | No service found`);
            return;
        }

        svc.getCharacteristic(this.Characteristic.StatusActive).updateValue(this._getStatusActive(accessory.context.deviceData.status));

        switch (attribute) {
            case "acceleration":
                svc.getCharacteristic(this.Characteristic.MotionDetected).updateValue(this._getMotionDetected(value));
                break;
            case "tamper":
                svc.getCharacteristic(this.Characteristic.StatusTampered).updateValue(this._getStatusTampered(value));
                break;

            default:
                this.logManager.logWarn(`AccelerationSensor | ${accessory.displayName} | Unhandled attribute update: ${attribute} = ${value}`);
        }
    }
}

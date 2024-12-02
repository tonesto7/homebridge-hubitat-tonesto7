// devices/AlarmSystem.js
export class AlarmSystem {
    constructor(platform) {
        this.logManager = platform.logManager;
        this.Service = platform.Service;
        this.Characteristic = platform.Characteristic;
        this.generateSrvcName = platform.generateSrvcName;
    }

    static relevantAttributes = ["alarmSystemStatus"];
    configure(accessory) {
        this.logManager.logDebug(`Configuring Alarm System for ${accessory.displayName}`);
        const svcName = this.generateSrvcName(accessory.displayName, "Alarm System");
        const svc = accessory.getOrAddService(this.Service.SecuritySystem, svcName);
        const devData = accessory.context.deviceData;

        this._configureCurrentState(accessory, svc, devData);
        this._configureTargetState(accessory, svc, devData);

        return accessory;
    }

    _configureCurrentState(accessory, svc, devData) {
        accessory.getOrAddCharacteristic(svc, this.Characteristic.SecuritySystemCurrentState, {
            getHandler: () => this._getSecuritySystemCurrentState(devData.attributes.alarmSystemStatus),
        });
    }

    _configureTargetState(accessory, svc, devData) {
        accessory.getOrAddCharacteristic(svc, this.Characteristic.SecuritySystemTargetState, {
            getHandler: () => this._getSecuritySystemTargetState(devData.attributes.alarmSystemStatus),
            setHandler: (value) => {
                const cmdStr = this._getSecuritySystemTargetStateCmd(value);
                accessory.sendCommand(cmdStr);
            },
        });
    }

    _getSecuritySystemCurrentState(value) {
        switch (value) {
            case "armedHome":
                return this.Characteristic.SecuritySystemCurrentState.STAY_ARM;
            case "armedNight":
                return this.Characteristic.SecuritySystemCurrentState.NIGHT_ARM;
            case "armedAway":
                return this.Characteristic.SecuritySystemCurrentState.AWAY_ARM;
            case "intrusion":
            case "intrusion-home":
            case "intrusion-away":
            case "intrusion-night":
                return this.Characteristic.SecuritySystemCurrentState.ALARM_TRIGGERED;
            default:
                return this.Characteristic.SecuritySystemCurrentState.DISARMED;
        }
    }

    _getSecuritySystemTargetState(value) {
        switch (value) {
            case "armedHome":
            case "intrusion-home":
                return this.Characteristic.SecuritySystemTargetState.STAY_ARM;
            case "armedNight":
            case "intrusion-night":
                return this.Characteristic.SecuritySystemTargetState.NIGHT_ARM;
            case "armedAway":
            case "intrusion-away":
                return this.Characteristic.SecuritySystemTargetState.AWAY_ARM;
            default:
                return this.Characteristic.SecuritySystemTargetState.DISARM;
        }
    }

    _getSecuritySystemTargetStateCmd(value) {
        switch (value) {
            case this.Characteristic.SecuritySystemTargetState.STAY_ARM:
                return "armHome";
            case this.Characteristic.SecuritySystemTargetState.AWAY_ARM:
                return "armAway";
            case this.Characteristic.SecuritySystemTargetState.NIGHT_ARM:
                return "armNight";
            default:
                return "disarm";
        }
    }

    // Handle attribute updates
    handleAttributeUpdate(accessory, update) {
        const { attribute, value } = update;
        this.logManager.logDebug(`AlarmSystem | ${accessory.displayName} | Attribute update: ${attribute} = ${value}`);
        if (!AlarmSystem.relevantAttributes.includes(attribute)) return;

        const svc = accessory.getService(this.Service.SecuritySystem, this.generateSrvcName(accessory.displayName, "Alarm System"));
        if (!svc) return;

        switch (attribute) {
            case "alarmSystemStatus":
                svc.getCharacteristic(this.Characteristic.SecuritySystemCurrentState).updateValue(this._getSecuritySystemCurrentState(value));
                break;
            default:
                this.logManager.logWarn(`AlarmSystem | ${accessory.displayName} | Unhandled attribute update: ${attribute} = ${value}`);
        }
    }
}

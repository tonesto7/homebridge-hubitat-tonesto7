import HubitatAccessory from "../HubitatAccessory.js";

export default class AlarmSystem extends HubitatAccessory {
    constructor(platform, accessory) {
        super(platform, accessory);
        this.deviceData = accessory.context.deviceData;
        this.relevantAttributes = ["alarmSystemStatus"];
    }

    static isSupported(accessory) {
        return accessory.hasAttribute("alarmSystemStatus");
    }

    initializeService() {
        this.securitySystemSvc = this.getOrAddService(this.Service.SecuritySystem);

        // Current State
        this.getOrAddCharacteristic(this.securitySystemSvc, this.Characteristic.SecuritySystemCurrentState, {
            getHandler: () => {
                const state = this.deviceData.attributes.alarmSystemStatus;
                const currentState = this.convertAlarmState(state);
                this.log.debug(`${this.accessory.displayName} | Alarm System Current State: ${currentState}`);
                return currentState;
            },
        });

        // Target State
        this.getOrAddCharacteristic(this.securitySystemSvc, this.Characteristic.SecuritySystemTargetState, {
            getHandler: () => {
                const state = this.deviceData.attributes.alarmSystemStatus;
                const targetState = this.convertAlarmState(state);
                this.log.debug(`${this.accessory.displayName} | Alarm System Target State: ${targetState}`);
                return targetState;
            },
            setHandler: (value) => {
                const cmd = this.convertAlarmCmd(value);
                this.log.info(`${this.accessory.displayName} | Setting alarm system state via command: ${cmd}`);
                this.sendCommand(null, this.accessory, this.deviceData, cmd);
            },
        });

        this.accessory.context.deviceGroups.push("alarm_system");
    }

    handleAttributeUpdate(change) {
        if (!this.securitySystemSvc) {
            this.log.warn(`${this.accessory.displayName} | SecuritySystem service not found`);
            return;
        }

        switch (change.attribute) {
            case "alarmSystemStatus":
                const currentState = this.convertAlarmState(change.value);
                this.updateCharacteristicValue(this.securitySystemSvc, this.Characteristic.SecuritySystemCurrentState, currentState);
                this.updateCharacteristicValue(this.securitySystemSvc, this.Characteristic.SecuritySystemTargetState, currentState);
                break;
            default:
                this.log.debug(`${this.accessory.displayName} | Unhandled attribute update: ${change.attribute}`);
                break;
        }
    }

    convertAlarmState(value) {
        switch (value) {
            case "armedHome":
                return this.Characteristic.SecuritySystemCurrentState.STAY_ARM;
            case "armedNight":
                return this.Characteristic.SecuritySystemCurrentState.NIGHT_ARM;
            case "armedAway":
                return this.Characteristic.SecuritySystemCurrentState.AWAY_ARM;
            case "disarmed":
                return this.Characteristic.SecuritySystemCurrentState.DISARMED;
            case "intrusion":
            case "intrusion-home":
            case "intrusion-away":
            case "intrusion-night":
                return this.Characteristic.SecuritySystemCurrentState.ALARM_TRIGGERED;
            default:
                return this.Characteristic.SecuritySystemCurrentState.DISARMED;
        }
    }

    convertAlarmCmd(value) {
        switch (value) {
            case this.Characteristic.SecuritySystemTargetState.STAY_ARM:
                return "armHome";
            case this.Characteristic.SecuritySystemTargetState.AWAY_ARM:
                return "armAway";
            case this.Characteristic.SecuritySystemTargetState.NIGHT_ARM:
                return "armNight";
            case this.Characteristic.SecuritySystemTargetState.DISARM:
                return "disarm";
            default:
                return "disarm";
        }
    }
}

// devices/AlarmSystem.js
export class AlarmSystem {
    constructor(platform) {
        this.logManager = platform.logManager;
        this.Service = platform.Service;
        this.Characteristic = platform.Characteristic;
    }

    configure(accessory) {
        this.logManager.logDebug(`Configuring Alarm System for ${accessory.displayName}`);
        const svc = accessory.getOrAddService(this.Service.SecuritySystem);
        const devData = accessory.context.deviceData;

        this._configureCurrentState(accessory, svc, devData);
        this._configureTargetState(accessory, svc, devData);

        accessory.context.deviceGroups.push("alarm_system");
        return accessory;
    }

    _configureCurrentState(accessory, svc, devData) {
        const currentStateMappings = {
            disarmed: this.Characteristic.SecuritySystemCurrentState.DISARMED,
            armedHome: this.Characteristic.SecuritySystemCurrentState.STAY_ARM,
            armedAway: this.Characteristic.SecuritySystemCurrentState.AWAY_ARM,
            armedNight: this.Characteristic.SecuritySystemCurrentState.NIGHT_ARM,
            intrusion: this.Characteristic.SecuritySystemCurrentState.ALARM_TRIGGERED,
            "intrusion-home": this.Characteristic.SecuritySystemCurrentState.ALARM_TRIGGERED,
            "intrusion-away": this.Characteristic.SecuritySystemCurrentState.ALARM_TRIGGERED,
            "intrusion-night": this.Characteristic.SecuritySystemCurrentState.ALARM_TRIGGERED,
        };

        accessory.getOrAddCharacteristic(svc, this.Characteristic.SecuritySystemCurrentState, {
            getHandler: () => {
                const val = devData.attributes.alarmSystemStatus;
                return currentStateMappings[val] || this.Characteristic.SecuritySystemCurrentState.DISARMED;
            },
            updateHandler: (value) => currentStateMappings[value] || this.Characteristic.SecuritySystemCurrentState.DISARMED,
            storeAttribute: "alarmSystemStatus",
        });
    }

    _configureTargetState(accessory, svc, devData) {
        const targetStateMappings = {
            disarmed: this.Characteristic.SecuritySystemTargetState.DISARM,
            armedHome: this.Characteristic.SecuritySystemTargetState.STAY_ARM,
            armedAway: this.Characteristic.SecuritySystemTargetState.AWAY_ARM,
            armedNight: this.Characteristic.SecuritySystemTargetState.NIGHT_ARM,
        };

        accessory.getOrAddCharacteristic(svc, this.Characteristic.SecuritySystemTargetState, {
            getHandler: () => {
                const val = devData.attributes.alarmSystemStatus;
                return targetStateMappings[val] || this.Characteristic.SecuritySystemTargetState.DISARM;
            },
            setHandler: (value) => {
                const cmdMappings = {
                    [this.Characteristic.SecuritySystemTargetState.DISARM]: "disarm",
                    [this.Characteristic.SecuritySystemTargetState.STAY_ARM]: "armHome",
                    [this.Characteristic.SecuritySystemTargetState.AWAY_ARM]: "armAway",
                    [this.Characteristic.SecuritySystemTargetState.NIGHT_ARM]: "armNight",
                };
                accessory.sendCommand(cmdMappings[value] || "disarm");
            },
            updateHandler: (value) => targetStateMappings[value] || this.Characteristic.SecuritySystemTargetState.DISARM,
            storeAttribute: "alarmSystemStatus",
        });
    }
}

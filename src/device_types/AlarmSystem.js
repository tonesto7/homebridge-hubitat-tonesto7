// device_types/AlarmSystem.js

import HubitatBaseAccessory from "./BaseAccessory.js";

export default class AlarmSystem extends HubitatBaseAccessory {
    constructor(platform, accessory) {
        super(platform, accessory);
        this.alarmService = null;
    }

    static relevantAttributes = ["alarmSystemStatus"];

    async configureServices() {
        try {
            this.alarmService = this.getOrAddService(this.Service.SecuritySystem, this.cleanServiceDisplayName(this.deviceData.name, "Alarm System"));

            // Configure Current State
            this.getOrAddCharacteristic(this.alarmService, this.Characteristic.SecuritySystemCurrentState, {
                getHandler: () => this.getCurrentState(this.deviceData.attributes.alarmSystemStatus),
            });

            // Configure Target State
            this.getOrAddCharacteristic(this.alarmService, this.Characteristic.SecuritySystemTargetState, {
                getHandler: () => this.getTargetState(this.deviceData.attributes.alarmSystemStatus),
                setHandler: async (value) => this.setTargetState(value),
            });

            return true;
        } catch (error) {
            this.logManager.logError(`AlarmSystem | ${this.deviceData.name} | Error configuring alarm system services:`, error);
            throw error;
        }
    }

    getCurrentState(value) {
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

    getTargetState(value) {
        switch (value) {
            case "armedHome":
            case "intrusion-home":
                return this.Characteristic.SecuritySystemCurrentState.STAY_ARM;
            case "armedNight":
            case "intrusion-night":
                return this.Characteristic.SecuritySystemCurrentState.NIGHT_ARM;
            case "armedAway":
            case "intrusion-away":
                return this.Characteristic.SecuritySystemCurrentState.AWAY_ARM;
            case "disarmed":
                return this.Characteristic.SecuritySystemCurrentState.DISARMED;
            default:
                return this.Characteristic.SecuritySystemCurrentState.DISARMED;
        }
    }

    async setTargetState(value) {
        let command;
        switch (value) {
            case this.Characteristic.SecuritySystemCurrentState.STAY_ARM:
                command = "armHome";
                break;
            case this.Characteristic.SecuritySystemCurrentState.AWAY_ARM:
                command = "armAway";
                break;
            case this.Characteristic.SecuritySystemCurrentState.NIGHT_ARM:
                command = "armNight";
                break;
            case this.Characteristic.SecuritySystemCurrentState.DISARMED:
                command = "disarm";
                break;
            default:
                command = "disarm";
        }
        await this.sendCommand(command);
    }

    async handleAttributeUpdate(change) {
        const { attribute, value } = change;

        if (attribute === "alarmSystemStatus") {
            // Update current state
            this.alarmService.getCharacteristic(this.Characteristic.SecuritySystemCurrentState).updateValue(this.getCurrentState(value));

            // Update target state
            this.alarmService.getCharacteristic(this.Characteristic.SecuritySystemTargetState).updateValue(this.getTargetState(value));
        } else {
            this.logManager.logDebug(`AlarmSystem | ${this.deviceData.name} | Unhandled attribute update: ${attribute} = ${value}`);
        }
    }

    // Override cleanup
    async cleanup() {
        this.alarmService = null;
        await super.cleanup();
    }
}

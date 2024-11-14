// device_types/AlarmSystem.js

import HubitatPlatformAccessory from "../HubitatPlatformAccessory.js";

export default class AlarmSystem extends HubitatPlatformAccessory {
    constructor(platform, accessory) {
        super(platform, accessory);
        this.alarmService = null;
    }

    async configureServices() {
        try {
            this.alarmService = this.getOrAddService(this.Service.SecuritySystem);

            // Configure Current State
            this.getOrAddCharacteristic(this.alarmService, this.Characteristic.SecuritySystemCurrentState, {
                getHandler: () => this.getCurrentState(),
            });

            // Configure Target State
            this.getOrAddCharacteristic(this.alarmService, this.Characteristic.SecuritySystemTargetState, {
                getHandler: () => this.getTargetState(),
                setHandler: async (value) => this.setTargetState(value),
            });

            return true;
        } catch (error) {
            this.logError("Error configuring alarm system services:", error);
            throw error;
        }
    }

    getCurrentState() {
        const val = this.deviceData.attributes.alarmSystemStatus;
        switch (val) {
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

    getTargetState() {
        const val = this.deviceData.attributes.alarmSystemStatus;
        switch (val) {
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

    async handleAttributeUpdate(attribute, value) {
        this.updateDeviceAttribute(attribute, value);

        if (attribute === "alarmSystemStatus") {
            // Update current state
            this.alarmService.getCharacteristic(this.Characteristic.SecuritySystemCurrentState).updateValue(this.getCurrentState());

            // Update target state
            this.alarmService.getCharacteristic(this.Characteristic.SecuritySystemTargetState).updateValue(this.getTargetState());
        } else {
            this.logDebug(`Unhandled attribute update: ${attribute} = ${value}`);
        }
    }

    // Override cleanup
    async cleanup() {
        this.alarmService = null;
        await super.cleanup();
    }
}

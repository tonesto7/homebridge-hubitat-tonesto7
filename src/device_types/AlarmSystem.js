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
            this.markServiceForRetention(this.alarmService);

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
        return this.platform.accessories.transforms.convertAlarmState(this.deviceData.attributes.alarmSystemStatus);
    }

    getTargetState() {
        return this.platform.accessories.transforms.convertAlarmTargetState(this.deviceData.attributes.alarmSystemStatus);
    }

    async setTargetState(value) {
        const command = this.platform.accessories.transforms.convertAlarmCmd(value);
        await this.sendCommand(command);
    }

    async handleAttributeUpdate(attribute, value) {
        if (attribute !== "alarmSystemStatus") return;
        this.updateDeviceAttribute(attribute, value);

        // Update current state
        const currentState = this.platform.accessories.transforms.convertAlarmState(value);
        this.alarmService.getCharacteristic(this.Characteristic.SecuritySystemCurrentState).updateValue(currentState);

        // Update target state
        const targetState = this.platform.accessories.transforms.convertAlarmTargetState(value);
        this.alarmService.getCharacteristic(this.Characteristic.SecuritySystemTargetState).updateValue(targetState);
    }

    // Override cleanup
    async cleanup() {
        this.alarmService = null;
        await super.cleanup();
    }
}

import HubitatAccessory from "../HubitatAccessory.js";

export default class AlarmSystem extends HubitatAccessory {
    constructor(platform, accessory) {
        super(platform, accessory);
        this.deviceData = accessory.context.deviceData;
    }

    /**
     * @constant {string[]} relevantAttributes - An array of relevant attribute names for the AlarmSystem.
     */
    static relevantAttributes = ["alarmSystemStatus"];

    /**
     * Initializes the security system service and its characteristics.
     *
     * This method sets up the security system service and adds the necessary characteristics
     * for the current state and target state of the alarm system. It also defines handlers
     * for getting and setting these states.
     *
     * @async
     * @method initializeService
     * @returns {Promise<void>} Resolves when the service and characteristics are initialized.
     */
    async initializeService() {
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
                this.sendCommand(null, this.deviceData, cmd);
            },
        });

        this.accessory.deviceGroups.push("alarm_system");
    }

    /**
     * Handles updates to device attributes and updates the security system service accordingly.
     *
     * @param {Object} change - The change object containing attribute updates.
     * @param {string} change.attribute - The name of the attribute that has changed.
     * @param {any} change.value - The new value of the attribute.
     */
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

    /**
     * Converts the given alarm state value to the corresponding HomeKit security system state.
     *
     * @param {string} value - The alarm state value to convert. Possible values are:
     *   - "armedHome"
     *   - "armedNight"
     *   - "armedAway"
     *   - "disarmed"
     *   - "intrusion"
     *   - "intrusion-home"
     *   - "intrusion-away"
     *   - "intrusion-night"
     * @returns {number} - The corresponding HomeKit security system state. Possible return values are:
     *   - this.Characteristic.SecuritySystemCurrentState.STAY_ARM
     *   - this.Characteristic.SecuritySystemCurrentState.NIGHT_ARM
     *   - this.Characteristic.SecuritySystemCurrentState.AWAY_ARM
     *   - this.Characteristic.SecuritySystemCurrentState.DISARMED
     *   - this.Characteristic.SecuritySystemCurrentState.ALARM_TRIGGERED
     */
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

    /**
     * Converts a security system target state to a corresponding alarm command.
     *
     * @param {number} value - The target state value from the security system.
     * @returns {string} The corresponding alarm command.
     *
     * Possible values for `value`:
     * - `this.Characteristic.SecuritySystemTargetState.STAY_ARM` - Returns "armHome".
     * - `this.Characteristic.SecuritySystemTargetState.AWAY_ARM` - Returns "armAway".
     * - `this.Characteristic.SecuritySystemTargetState.NIGHT_ARM` - Returns "armNight".
     * - `this.Characteristic.SecuritySystemTargetState.DISARM` - Returns "disarm".
     * - Any other value - Returns "disarm".
     */
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

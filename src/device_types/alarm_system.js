// device_types/alarm_system.js

/**
 * Converts alarm system status to HomeKit current state.
 * @param {string} value - Alarm system status.
 * @returns {number} - Corresponding HomeKit SecuritySystemCurrentState.
 */
function convertAlarmState(value, Characteristic) {
    switch (value) {
        case "armedHome":
            return Characteristic.SecuritySystemCurrentState.STAY_ARM;
        case "armedNight":
            return Characteristic.SecuritySystemCurrentState.NIGHT_ARM;
        case "armedAway":
            return Characteristic.SecuritySystemCurrentState.AWAY_ARM;
        case "disarmed":
            return Characteristic.SecuritySystemCurrentState.DISARMED;
        case "intrusion":
        case "intrusion-home":
        case "intrusion-away":
        case "intrusion-night":
            return Characteristic.SecuritySystemCurrentState.ALARM_TRIGGERED;
        default:
            return Characteristic.SecuritySystemCurrentState.DISARMED;
    }
}

/**
 * Converts HomeKit target state to alarm system command.
 * @param {number} value - HomeKit SecuritySystemTargetState.
 * @returns {string} - Corresponding alarm system command.
 */
function convertAlarmCmd(value, Characteristic) {
    switch (value) {
        case Characteristic.SecuritySystemTargetState.STAY_ARM:
            return "armHome";
        case Characteristic.SecuritySystemTargetState.AWAY_ARM:
            return "armAway";
        case Characteristic.SecuritySystemTargetState.NIGHT_ARM:
            return "armNight";
        case Characteristic.SecuritySystemTargetState.DISARM:
            return "disarm";
        default:
            return "disarm";
    }
}

module.exports = {
    isSupported: (accessory) => accessory.hasAttribute("alarmSystemStatus"),

    relevantAttributes: ["alarmSystemStatus"],

    initializeAccessory: (accessory, deviceClass) => {
        const { Service, Characteristic } = deviceClass.platform;
        const service = accessory.getService(Service.SecuritySystem) || accessory.addService(Service.SecuritySystem);

        // Current State
        service.getCharacteristic(Characteristic.SecuritySystemCurrentState).onGet(() => {
            const state = accessory.context.deviceData.attributes.alarmSystemStatus;
            const currentState = convertAlarmState(state, Characteristic);
            accessory.log.debug(`${accessory.name} | Alarm System Current State: ${currentState}`);
            return currentState;
        });

        // Target State
        service
            .getCharacteristic(Characteristic.SecuritySystemTargetState)
            .onGet(() => {
                const state = accessory.context.deviceData.attributes.alarmSystemStatus;
                const targetState = convertAlarmState(state, Characteristic);
                accessory.log.debug(`${accessory.name} | Alarm System Target State: ${targetState}`);
                return targetState;
            })
            .onSet((value) => {
                const cmd = convertAlarmCmd(value, Characteristic);
                accessory.log.info(`${accessory.name} | Setting alarm system state via command: ${cmd}`);
                accessory.sendCommand(null, accessory, accessory.context.deviceData, cmd);
            });

        accessory.context.deviceGroups.push("alarm_system");
    },

    handleAttributeUpdate: (accessory, change, deviceClass) => {
        const { Characteristic, Service } = deviceClass.platform;
        const service = accessory.getService(Service.SecuritySystem);

        if (!service) {
            accessory.log.warn(`${accessory.name} | Security System service not found`);
            return;
        }

        if (change.attribute === "alarmSystemStatus") {
            const currentState = convertAlarmState(change.value, Characteristic);
            service.updateCharacteristic(Characteristic.SecuritySystemCurrentState, currentState);
            service.updateCharacteristic(Characteristic.SecuritySystemTargetState, currentState);
            accessory.log.debug(`${accessory.name} | Updated Security System State: ${currentState}`);
        } else {
            accessory.log.debug(`${accessory.name} | Unhandled attribute update: ${change.attribute}`);
        }
    },
};

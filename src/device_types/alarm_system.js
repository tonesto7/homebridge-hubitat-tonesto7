// device_types/alarm_system.js

export const isSupported = (accessory) => accessory.hasAttribute("alarmSystemStatus");

export const relevantAttributes = ["alarmSystemStatus"];

export function initializeAccessory(accessory, deviceClass) {
    const { Service, Characteristic } = deviceClass.platform;
    const service = deviceClass.getOrAddService(accessory, Service.SecuritySystem);

    // Current State
    // service.getCharacteristic(Characteristic.SecuritySystemCurrentState).onGet(() => {
    //     const state = accessory.context.deviceData.attributes.alarmSystemStatus;
    //     const currentState = convertAlarmState(state, Characteristic);
    //     accessory.log.debug(`${accessory.name} | Alarm System Current State: ${currentState}`);
    //     return currentState;
    // });

    deviceClass.getOrAddCharacteristic(accessory, service, Characteristic.SecuritySystemCurrentState, {
        getHandler: function () {
            const state = accessory.context.deviceData.attributes.alarmSystemStatus;
            const currentState = convertAlarmState(state, Characteristic);
            accessory.log.debug(`${accessory.name} | Alarm System Current State: ${currentState}`);
            return currentState;
        },
    });

    // Target State
    // service
    //     .getCharacteristic(Characteristic.SecuritySystemTargetState)
    //     .onGet(() => {
    //         const state = accessory.context.deviceData.attributes.alarmSystemStatus;
    //         const targetState = convertAlarmState(state, Characteristic);
    //         accessory.log.debug(`${accessory.name} | Alarm System Target State: ${targetState}`);
    //         return targetState;
    //     })
    //     .onSet((value) => {
    //         const cmd = convertAlarmCmd(value, Characteristic);
    //         accessory.log.info(`${accessory.name} | Setting alarm system state via command: ${cmd}`);
    //         accessory.sendCommand(null, accessory, accessory.context.deviceData, cmd);
    //     });

    deviceClass.getOrAddCharacteristic(accessory, service, Characteristic.SecuritySystemTargetState, {
        getHandler: function () {
            const state = accessory.context.deviceData.attributes.alarmSystemStatus;
            const targetState = convertAlarmState(state, Characteristic);
            accessory.log.debug(`${accessory.name} | Alarm System Target State: ${targetState}`);
            return targetState;
        },
        setHandler: function (value) {
            const cmd = convertAlarmCmd(value, Characteristic);
            accessory.log.info(`${accessory.name} | Setting alarm system state via command: ${cmd}`);
            accessory.sendCommand(null, accessory, accessory.context.deviceData, cmd);
        },
    });

    accessory.context.deviceGroups.push("alarm_system");
}

export function handleAttributeUpdate(accessory, change, deviceClass) {
    const { Characteristic, Service } = deviceClass.platform;
    const service = accessory.getService(Service.SecuritySystem);

    if (!service) {
        accessory.log.warn(`${accessory.name} | Security System service not found`);
        return;
    }

    switch (change.attribute) {
        case "alarmSystemStatus":
            const currentState = convertAlarmState(change.value, Characteristic);
            deviceClass.updateCharacteristicValue(service, Characteristic.SecuritySystemCurrentState, currentState);
            deviceClass.updateCharacteristicValue(service, Characteristic.SecuritySystemTargetState, currentState);
            // service.updateCharacteristic(Characteristic.SecuritySystemCurrentState, currentState);
            // service.updateCharacteristic(Characteristic.SecuritySystemTargetState, currentState);
            // accessory.log.debug(`${accessory.name} | Updated Security System State: ${currentState}`);
            break;
        default:
            accessory.log.debug(`${accessory.name} | Unhandled attribute update: ${change.attribute}`);
            break;
    }
}

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

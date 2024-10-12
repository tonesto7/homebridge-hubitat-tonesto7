// device_types/alarm_system.js

let DeviceClass, Characteristic, Service, CommunityTypes;

export function init(_deviceClass, _Characteristic, _Service, _CommunityTypes) {
    DeviceClass = _deviceClass;
    Characteristic = _Characteristic;
    Service = _Service;
    CommunityTypes = _CommunityTypes;
}

export const isSupported = (accessory) => accessory.hasAttribute("alarmSystemStatus");

export const relevantAttributes = ["alarmSystemStatus"];

export function initializeAccessory(accessory) {
    const securitySystemSvc = DeviceClass.getOrAddService(accessory, Service.SecuritySystem);

    // Current State
    DeviceClass.getOrAddCharacteristic(accessory, securitySystemSvc, Characteristic.SecuritySystemCurrentState, {
        getHandler: function () {
            const state = accessory.context.deviceData.attributes.alarmSystemStatus;
            const currentState = convertAlarmState(state);
            accessory.log.debug(`${accessory.name} | Alarm System Current State: ${currentState}`);
            return currentState;
        },
    });

    // Target State
    DeviceClass.getOrAddCharacteristic(accessory, securitySystemSvc, Characteristic.SecuritySystemTargetState, {
        getHandler: function () {
            const state = accessory.context.deviceData.attributes.alarmSystemStatus;
            const targetState = convertAlarmState(state);
            accessory.log.debug(`${accessory.name} | Alarm System Target State: ${targetState}`);
            return targetState;
        },
        setHandler: function (value) {
            const cmd = convertAlarmCmd(value);
            accessory.log.info(`${accessory.name} | Setting alarm system state via command: ${cmd}`);
            accessory.sendCommand(null, accessory, accessory.context.deviceData, cmd);
        },
    });

    accessory.context.deviceGroups.push("alarm_system");
}

export function handleAttributeUpdate(accessory, change) {
    const securitySystemSvc = accessory.getService(Service.SecuritySystem);
    if (!securitySystemSvc) {
        accessory.log.warn(`${accessory.name} | SecuritySystem service not found`);
        return;
    }

    switch (change.attribute) {
        case "alarmSystemStatus":
            const currentState = convertAlarmState(change.value);
            DeviceClass.updateCharacteristicValue(securitySystemSvc, Characteristic.SecuritySystemCurrentState, currentState);
            DeviceClass.updateCharacteristicValue(securitySystemSvc, Characteristic.SecuritySystemTargetState, currentState);
            // accessory.log.debug(`${accessory.name} | Updated Security System State: ${currentState}`);
            break;
        default:
            accessory.log.debug(`${accessory.name} | Unhandled attribute update: ${change.attribute}`);
            break;
    }
}

function convertAlarmState(value) {
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

function convertAlarmCmd(value) {
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

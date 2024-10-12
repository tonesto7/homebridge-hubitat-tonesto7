// device_types/thermostat_fan.js

let DeviceClass, Characteristic, Service, CommunityTypes;

export function init(_deviceClass, _Characteristic, _Service, _CommunityTypes) {
    DeviceClass = _deviceClass;
    Characteristic = _Characteristic;
    Service = _Service;
    CommunityTypes = _CommunityTypes;
}

export function isSupported(accessory) {
    return accessory.hasCapability("Thermostat") && accessory.hasAttribute("thermostatFanMode") && accessory.hasCommand("fanAuto") && accessory.hasCommand("fanOn");
}

export const relevantAttributes = ["thermostatFanMode"];

export function initializeAccessory(accessory) {
    const fanV2Svc = DeviceClass.getOrAddService(accessory, Service.Fanv2);

    DeviceClass.getOrAddCharacteristic(accessory, fanV2Svc, Characteristic.Active, {
        getHandler: function () {
            const mode = accessory.context.deviceData.attributes.thermostatFanMode;
            console.log("current thermostatFanMode:", mode);
            const activeState = convertFanModeToActive(mode);
            console.log("current activeState:", activeState);
            accessory.log.debug(`${accessory.name} | Thermostat Fan Active State Retrieved: ${activeState}`);
            return activeState;
        },
        setHandler: function (value) {
            const mode = value === Characteristic.Active.ACTIVE ? "on" : "auto";
            accessory.log.info(`${accessory.name} | Setting thermostat fan mode to ${mode}`);
            accessory.sendCommand(null, accessory, accessory.context.deviceData, mode === "on" ? "fanOn" : "fanAuto");
        },
    });

    DeviceClass.getOrAddCharacteristic(accessory, fanV2Svc, Characteristic.CurrentFanState, {
        getHandler: function () {
            const mode = accessory.context.deviceData.attributes.thermostatFanMode;
            const currentState = convertFanModeToCurrentState(mode);
            accessory.log.debug(`${accessory.name} | Thermostat Fan Current State Retrieved: ${currentState}`);
            return currentState;
        },
    });

    DeviceClass.getOrAddCharacteristic(accessory, fanV2Svc, Characteristic.TargetFanState, {
        getHandler: function () {
            const mode = accessory.context.deviceData.attributes.thermostatFanMode;
            const targetState = mode === "auto" ? Characteristic.TargetFanState.AUTO : Characteristic.TargetFanState.MANUAL;
            accessory.log.debug(`${accessory.name} | Thermostat Fan Target State Retrieved: ${targetState}`);
            return targetState;
        },
        setHandler: function (value) {
            const mode = convertTargetFanState(value);
            accessory.log.info(`${accessory.name} | Setting thermostat fan mode to ${mode}`);
            accessory.sendCommand(null, accessory, accessory.context.deviceData, mode === "on" ? "fanOn" : "fanAuto");
        },
    });

    accessory.context.deviceGroups.push("thermostat_fan");
}

export function handleAttributeUpdate(accessory, change) {
    const fanV2Svc = accessory.getService(Service.Fanv2);

    if (!fanV2Svc) {
        accessory.log.warn(`${accessory.name} | Thermostat Fan service not found`);
        return;
    }

    if (change.attribute === "thermostatFanMode") {
        const activeState = convertFanModeToActive(change.value);
        const currentState = convertFanModeToCurrentState(change.value);
        const targetState = change.value === "auto" ? Characteristic.TargetFanState.AUTO : Characteristic.TargetFanState.MANUAL;
        DeviceClass.updateCharacteristicValue(accessory, fanV2Svc, Characteristic.Active, activeState);
        DeviceClass.updateCharacteristicValue(accessory, fanV2Svc, Characteristic.CurrentFanState, currentState);
        DeviceClass.updateCharacteristicValue(accessory, fanV2Svc, Characteristic.TargetFanState, targetState);
        // accessory.log.debug(`${accessory.name} | Updated Thermostat Fan: Active: ${activeState}, Current: ${currentState}, Target: ${targetState}`);
    } else {
        accessory.log.debug(`${accessory.name} | Unhandled attribute update: ${change.attribute}`);
    }
}

function convertFanModeToActive(mode) {
    return mode !== "auto" ? Characteristic.Active.ACTIVE : Characteristic.Active.INACTIVE;
}

function convertFanModeToCurrentState(mode) {
    return mode === "on" ? Characteristic.CurrentFanState.BLOWING_AIR : Characteristic.CurrentFanState.IDLE;
}

function convertTargetFanState(value) {
    return value === Characteristic.TargetFanState.AUTO ? "auto" : "on";
}

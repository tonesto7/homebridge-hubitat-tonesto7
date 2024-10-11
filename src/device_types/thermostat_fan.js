// device_types/thermostat_fan.js

export function isSupported(accessory) {
    return accessory.hasCapability("Thermostat") && accessory.hasAttribute("thermostatFanMode") && accessory.hasCommand("fanAuto") && accessory.hasCommand("fanOn");
}

export const relevantAttributes = ["thermostatFanMode"];

export function initializeAccessory(accessory, deviceClass) {
    const { Service, Characteristic } = deviceClass.platform;
    const service = deviceClass.getOrAddService(accessory, Service.Fanv2);

    deviceClass.getOrAddCharacteristic(accessory, service, Characteristic.Active, {
        getHandler: function () {
            const mode = accessory.context.deviceData.attributes.thermostatFanMode;
            const activeState = convertFanModeToActive(mode, Characteristic);
            accessory.log.debug(`${accessory.name} | Thermostat Fan Active State Retrieved: ${activeState}`);
            return activeState;
        },
        setHandler: function (value) {
            const mode = value === Characteristic.Active.ACTIVE ? "on" : "auto";
            accessory.log.info(`${accessory.name} | Setting thermostat fan mode to ${mode}`);
            accessory.sendCommand(null, accessory, accessory.context.deviceData, mode === "on" ? "fanOn" : "fanAuto");
        },
    });

    deviceClass.getOrAddCharacteristic(accessory, service, Characteristic.CurrentFanState, {
        getHandler: function () {
            const mode = accessory.context.deviceData.attributes.thermostatFanMode;
            const currentState = convertFanModeToCurrentState(mode, Characteristic);
            accessory.log.debug(`${accessory.name} | Thermostat Fan Current State Retrieved: ${currentState}`);
            return currentState;
        },
    });

    deviceClass.getOrAddCharacteristic(accessory, service, Characteristic.TargetFanState, {
        getHandler: function () {
            const mode = accessory.context.deviceData.attributes.thermostatFanMode;
            const targetState = mode === "auto" ? Characteristic.TargetFanState.AUTO : Characteristic.TargetFanState.MANUAL;
            accessory.log.debug(`${accessory.name} | Thermostat Fan Target State Retrieved: ${targetState}`);
            return targetState;
        },
        setHandler: function (value) {
            const mode = convertTargetFanState(value, Characteristic);
            accessory.log.info(`${accessory.name} | Setting thermostat fan mode to ${mode}`);
            accessory.sendCommand(null, accessory, accessory.context.deviceData, mode === "on" ? "fanOn" : "fanAuto");
        },
    });

    accessory.context.deviceGroups.push("thermostat_fan");
}

export function handleAttributeUpdate(accessory, change, deviceClass) {
    const { Characteristic, Service } = deviceClass.platform;
    const service = accessory.getService(Service.Fanv2);

    if (!service) {
        accessory.log.warn(`${accessory.name} | Thermostat Fan service not found`);
        return;
    }

    if (change.attribute === "thermostatFanMode") {
        const activeState = convertFanModeToActive(change.value, Characteristic);
        const currentState = convertFanModeToCurrentState(change.value, Characteristic);
        const targetState = change.value === "auto" ? Characteristic.TargetFanState.AUTO : Characteristic.TargetFanState.MANUAL;

        deviceClass.updateCharacteristicValue(accessory, service, Characteristic.Active, activeState);
        deviceClass.updateCharacteristicValue(accessory, service, Characteristic.CurrentFanState, currentState);
        deviceClass.updateCharacteristicValue(accessory, service, Characteristic.TargetFanState, targetState);

        // accessory.log.debug(`${accessory.name} | Updated Thermostat Fan: Active: ${activeState}, Current: ${currentState}, Target: ${targetState}`);
    } else {
        accessory.log.debug(`${accessory.name} | Unhandled attribute update: ${change.attribute}`);
    }
}

function convertFanModeToActive(mode, Characteristic) {
    return mode !== "auto" ? Characteristic.Active.ACTIVE : Characteristic.Active.INACTIVE;
}

function convertFanModeToCurrentState(mode, Characteristic) {
    return mode === "on" ? Characteristic.CurrentFanState.BLOWING_AIR : Characteristic.CurrentFanState.IDLE;
}

function convertTargetFanState(value, Characteristic) {
    return value === Characteristic.TargetFanState.AUTO ? "auto" : "on";
}

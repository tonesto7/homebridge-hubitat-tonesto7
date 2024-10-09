// device_types/thermostat_fan.js

function convertFanModeToActive(mode, Characteristic) {
    return mode !== "auto" ? Characteristic.Active.ACTIVE : Characteristic.Active.INACTIVE;
}

function convertFanModeToCurrentState(mode, Characteristic) {
    return mode === "on" ? Characteristic.CurrentFanState.BLOWING_AIR : Characteristic.CurrentFanState.IDLE;
}

function convertTargetFanState(value, Characteristic) {
    return value === Characteristic.TargetFanState.AUTO ? "auto" : "on";
}

module.exports = {
    isSupported: (accessory) => accessory.hasCapability("Thermostat") && accessory.hasAttribute("thermostatFanMode") && accessory.hasCommand("fanAuto") && accessory.hasCommand("fanOn"),
    relevantAttributes: ["thermostatFanMode"],

    initializeAccessory: (accessory, deviceClass) => {
        const { Service, Characteristic } = deviceClass.mainPlatform;
        const service = accessory.getService(Service.Fanv2) || accessory.addService(Service.Fanv2);

        // Active Characteristic
        service
            .getCharacteristic(Characteristic.Active)
            .onGet(() => {
                const mode = accessory.context.deviceData.attributes.thermostatFanMode;
                const activeState = convertFanModeToActive(mode, Characteristic);
                accessory.log.debug(`${accessory.name} | Thermostat Fan Active State Retrieved: ${activeState}`);
                return activeState;
            })
            .onSet((value) => {
                const mode = value === Characteristic.Active.ACTIVE ? "on" : "auto";
                accessory.log.info(`${accessory.name} | Setting thermostat fan mode to ${mode}`);
                accessory.sendCommand(null, accessory, accessory.context.deviceData, mode === "on" ? "fanOn" : "fanAuto");
            });

        // Current Fan State Characteristic
        service
            .getCharacteristic(Characteristic.CurrentFanState)
            .onGet(() => {
                const mode = accessory.context.deviceData.attributes.thermostatFanMode;
                const currentState = convertFanModeToCurrentState(mode, Characteristic);
                accessory.log.debug(`${accessory.name} | Thermostat Fan Current State Retrieved: ${currentState}`);
                return currentState;
            })
            .onSet(() => {
                accessory.log.warn(`${accessory.name} | Attempted to set CurrentFanState characteristic, which is read-only.`);
            });

        // Target Fan State Characteristic
        service
            .getCharacteristic(Characteristic.TargetFanState)
            .onGet(() => {
                const mode = accessory.context.deviceData.attributes.thermostatFanMode;
                const targetState = mode === "auto" ? Characteristic.TargetFanState.AUTO : Characteristic.TargetFanState.MANUAL;
                accessory.log.debug(`${accessory.name} | Thermostat Fan Target State Retrieved: ${targetState}`);
                return targetState;
            })
            .onSet((value) => {
                const mode = convertTargetFanState(value, Characteristic);
                accessory.log.info(`${accessory.name} | Setting thermostat fan mode to ${mode}`);
                accessory.sendCommand(null, accessory, accessory.context.deviceData, mode === "on" ? "fanOn" : "fanAuto");
            });

        accessory.context.deviceGroups.push("thermostat_fan");
    },

    handleAttributeUpdate: (accessory, change, deviceClass) => {
        const { Characteristic, Service } = deviceClass.mainPlatform;
        const service = accessory.getService(Service.Fanv2);

        if (!service) {
            accessory.log.warn(`${accessory.name} | Thermostat Fan service not found`);
            return;
        }

        if (change.attribute === "thermostatFanMode") {
            const activeState = convertFanModeToActive(change.value, Characteristic);
            const currentState = convertFanModeToCurrentState(change.value, Characteristic);
            const targetState = change.value === "auto" ? Characteristic.TargetFanState.AUTO : Characteristic.TargetFanState.MANUAL;

            service.updateCharacteristic(Characteristic.Active, activeState);
            service.updateCharacteristic(Characteristic.CurrentFanState, currentState);
            service.updateCharacteristic(Characteristic.TargetFanState, targetState);

            accessory.log.debug(`${accessory.name} | Updated Thermostat Fan: Active: ${activeState}, Current: ${currentState}, Target: ${targetState}`);
        } else {
            accessory.log.debug(`${accessory.name} | Unhandled attribute update: ${change.attribute}`);
        }
    },
};

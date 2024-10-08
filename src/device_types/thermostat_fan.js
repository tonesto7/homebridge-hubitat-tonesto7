// device_types/thermostat_fan.js

module.exports = {
    isSupported: (accessory) => accessory.hasCapability("Thermostat") && accessory.hasAttribute("thermostatFanMode") && accessory.hasCommand("fanAuto") && accessory.hasCommand("fanOn"),

    initializeAccessory: (accessory, deviceTypes) => {
        const { Service, Characteristic } = deviceTypes.mainPlatform;
        const service = accessory.getService(Service.Fanv2) || accessory.addService(Service.Fanv2);

        /**
         * Converts thermostat fan mode to HomeKit Active state.
         * @param {string} mode - The thermostat fan mode from the device.
         * @returns {number} - HomeKit Active state.
         */
        function convertFanModeToActive(mode) {
            return mode !== "auto" ? Characteristic.Active.ACTIVE : Characteristic.Active.INACTIVE;
        }

        /**
         * Converts thermostat fan mode to HomeKit CurrentFanState.
         * @param {string} mode - The thermostat fan mode from the device.
         * @returns {number} - HomeKit CurrentFanState.
         */
        function convertFanModeToCurrentState(mode) {
            return mode === "on" ? Characteristic.CurrentFanState.BLOWING_AIR : Characteristic.CurrentFanState.IDLE;
        }

        /**
         * Converts HomeKit TargetFanState to thermostat fan mode.
         * @param {number} value - HomeKit TargetFanState.
         * @returns {string} - Corresponding thermostat fan mode.
         */
        function convertTargetFanState(value) {
            return value === Characteristic.TargetFanState.AUTO ? "auto" : "on";
        }

        // Active Characteristic
        service
            .getCharacteristic(Characteristic.Active)
            .onGet(() => {
                const mode = accessory.context.deviceData.attributes.thermostatFanMode;
                const activeState = convertFanModeToActive(mode);
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
                const currentState = convertFanModeToCurrentState(mode);
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
                const mode = convertTargetFanState(value);
                accessory.log.info(`${accessory.name} | Setting thermostat fan mode to ${mode}`);
                accessory.sendCommand(null, accessory, accessory.context.deviceData, mode === "on" ? "fanOn" : "fanAuto");
            });

        accessory.context.deviceGroups.push("thermostat_fan");
    },
};

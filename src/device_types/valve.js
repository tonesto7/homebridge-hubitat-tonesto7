// device_types/valve.js

module.exports = {
    isSupported: (accessory) => accessory.hasCapability("Valve"),

    initializeAccessory: (accessory, deviceTypes) => {
        const { Service, Characteristic } = deviceTypes.mainPlatform;
        const service = accessory.getService(Service.Valve) || accessory.addService(Service.Valve);

        /**
         * Converts valve state string to HomeKit Active state.
         * @param {string} state - The valve state from the device.
         * @returns {number} - HomeKit Active state.
         */
        function convertValveState(state) {
            return state === "open" ? Characteristic.Active.ACTIVE : Characteristic.Active.INACTIVE;
        }

        /**
         * Converts valve state string to HomeKit InUse state.
         * @param {string} state - The valve state from the device.
         * @returns {number} - HomeKit InUse state.
         */
        function convertInUseState(state) {
            return state === "open" ? Characteristic.InUse.IN_USE : Characteristic.InUse.NOT_IN_USE;
        }

        // Active Characteristic
        service
            .getCharacteristic(Characteristic.Active)
            .onGet(() => {
                const isActive = convertValveState(accessory.context.deviceData.attributes.valve);
                accessory.log.debug(`${accessory.name} | Valve Active State Retrieved: ${isActive}`);
                return isActive;
            })
            .onSet((value) => {
                const command = value === Characteristic.Active.ACTIVE ? "open" : "close";
                accessory.log.info(`${accessory.name} | Setting valve state via command: ${command}`);
                accessory.sendCommand(null, accessory, accessory.context.deviceData, command);
            });

        // InUse Characteristic
        service
            .getCharacteristic(Characteristic.InUse)
            .onGet(() => {
                const inUse = convertInUseState(accessory.context.deviceData.attributes.valve);
                accessory.log.debug(`${accessory.name} | Valve InUse State Retrieved: ${inUse}`);
                return inUse;
            })
            .onSet(() => {
                accessory.log.warn(`${accessory.name} | Attempted to set InUse characteristic, which is read-only.`);
            });

        // Valve Type Characteristic
        if (!service.testCharacteristic(Characteristic.ValveType)) {
            service.addCharacteristic(Characteristic.ValveType);
        }
        service.updateCharacteristic(Characteristic.ValveType, Characteristic.ValveType.GENERIC_VALVE);

        accessory.context.deviceGroups.push("valve");
    },
};

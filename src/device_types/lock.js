// device_types/lock.js

module.exports = {
    isSupported: (accessory) => accessory.hasCapability("Lock"),

    initializeAccessory: (accessory, deviceTypes) => {
        const { Service, Characteristic } = deviceTypes.mainPlatform;
        const service = accessory.getService(Service.LockMechanism) || accessory.addService(Service.LockMechanism);

        /**
         * Converts lock state string to HomeKit LockCurrentState.
         * @param {string} state - The lock state from the device.
         * @returns {number} - HomeKit LockCurrentState.
         */
        function convertLockState(state) {
            switch (state) {
                case "locked":
                    return Characteristic.LockCurrentState.SECURED;
                case "unlocked":
                    return Characteristic.LockCurrentState.UNSECURED;
                default:
                    return Characteristic.LockCurrentState.UNKNOWN;
            }
        }

        // Lock Current State
        service.getCharacteristic(Characteristic.LockCurrentState).onGet(() => {
            const state = accessory.context.deviceData.attributes.lock;
            const convertedState = convertLockState(state);
            accessory.log.debug(`${accessory.name} | Lock Current State: ${state} => ${convertedState}`);
            return convertedState;
        });

        // Lock Target State
        service
            .getCharacteristic(Characteristic.LockTargetState)
            .onGet(() => {
                const state = accessory.context.deviceData.attributes.lock;
                return convertLockState(state);
            })
            .onSet((value) => {
                const command = value === Characteristic.LockTargetState.SECURED ? "lock" : "unlock";
                accessory.log.info(`${accessory.name} | Setting lock state via command: ${command}`);
                accessory.sendCommand(null, accessory, accessory.context.deviceData, command);
            });

        accessory.context.deviceGroups.push("lock");
    },
};

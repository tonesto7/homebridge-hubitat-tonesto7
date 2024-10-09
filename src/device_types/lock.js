// device_types/lock.js

/**
 * Converts lock state string to HomeKit LockCurrentState.
 * @param {string} state - The lock state from the device.
 * @returns {number} - HomeKit LockCurrentState.
 */
function convertLockState(state, Characteristic) {
    switch (state) {
        case "locked":
            return Characteristic.LockCurrentState.SECURED;
        case "unlocked":
            return Characteristic.LockCurrentState.UNSECURED;
        default:
            return Characteristic.LockCurrentState.UNKNOWN;
    }
}

module.exports = {
    isSupported: (accessory) => accessory.hasCapability("Lock"),
    relevantAttributes: ["lock"],

    initializeAccessory: (accessory, deviceClass) => {
        const { Service, Characteristic } = deviceClass.mainPlatform;
        const service = accessory.getService(Service.LockMechanism) || accessory.addService(Service.LockMechanism);

        // Lock Current State
        service.getCharacteristic(Characteristic.LockCurrentState).onGet(() => {
            const state = accessory.context.deviceData.attributes.lock;
            const convertedState = convertLockState(state, Characteristic);
            accessory.log.debug(`${accessory.name} | Lock Current State: ${state} => ${convertedState}`);
            return convertedState;
        });

        // Lock Target State
        service
            .getCharacteristic(Characteristic.LockTargetState)
            .onGet(() => {
                const state = accessory.context.deviceData.attributes.lock;
                return convertLockState(state, Characteristic);
            })
            .onSet((value) => {
                const command = value === Characteristic.LockTargetState.SECURED ? "lock" : "unlock";
                accessory.log.info(`${accessory.name} | Setting lock state via command: ${command}`);
                accessory.sendCommand(null, accessory, accessory.context.deviceData, command);
            });

        accessory.context.deviceGroups.push("lock");
    },

    handleAttributeUpdate: (accessory, change, deviceClass) => {
        const { Characteristic, Service } = deviceClass.mainPlatform;
        const service = accessory.getService(Service.LockMechanism);

        if (!service) {
            accessory.log.warn(`${accessory.name} | Lock Mechanism service not found`);
            return;
        }

        if (change.attribute === "lock") {
            const convertedState = convertLockState(change.value, Characteristic);
            service.updateCharacteristic(Characteristic.LockCurrentState, convertedState);
            service.updateCharacteristic(Characteristic.LockTargetState, convertedState);
            accessory.log.debug(`${accessory.name} | Updated Lock State: ${change.value} => ${convertedState}`);
        } else {
            accessory.log.debug(`${accessory.name} | Unhandled attribute update: ${change.attribute}`);
        }
    },
};

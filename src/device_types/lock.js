// device_types/lock.js

export function isSupported(accessory) {
    return accessory.hasCapability("Lock");
}

export const relevantAttributes = ["lock"];

export function initializeAccessory(accessory, deviceClass) {
    const { Service, Characteristic } = deviceClass.platform;
    const service = deviceClass.getOrAddService(accessory, Service.LockMechanism);

    deviceClass.getOrAddCharacteristic(accessory, service, Characteristic.LockCurrentState, {
        getHandler: function () {
            const state = accessory.context.deviceData.attributes.lock;
            const convertedState = convertLockState(state, Characteristic);
            accessory.log.debug(`${accessory.name} | Lock Current State: ${state} => ${convertedState}`);
            return convertedState;
        },
    });

    deviceClass.getOrAddCharacteristic(accessory, service, Characteristic.LockTargetState, {
        getHandler: function () {
            const state = accessory.context.deviceData.attributes.lock;
            return convertLockState(state, Characteristic);
        },
        setHandler: function (value) {
            const command = value === Characteristic.LockTargetState.SECURED ? "lock" : "unlock";
            accessory.log.info(`${accessory.name} | Setting lock state via command: ${command}`);
            accessory.sendCommand(null, accessory, accessory.context.deviceData, command);
        },
    });

    accessory.context.deviceGroups.push("lock");
}

export function handleAttributeUpdate(accessory, change, deviceClass) {
    const { Characteristic, Service } = deviceClass.platform;
    const service = accessory.getService(Service.LockMechanism);

    if (!service) {
        accessory.log.warn(`${accessory.name} | Lock Mechanism service not found`);
        return;
    }

    if (change.attribute === "lock") {
        const convertedState = convertLockState(change.value, Characteristic);
        deviceClass.updateCharacteristicValue(accessory, service, Characteristic.LockCurrentState, convertedState);
        deviceClass.updateCharacteristicValue(accessory, service, Characteristic.LockTargetState, convertedState);
        // accessory.log.debug(`${accessory.name} | Updated Lock State: ${change.value} => ${convertedState}`);
    } else {
        accessory.log.debug(`${accessory.name} | Unhandled attribute update: ${change.attribute}`);
    }
}

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

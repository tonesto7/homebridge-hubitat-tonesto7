// device_types/lock.js

let DeviceClass, Characteristic, Service, CommunityTypes;

export async function init(_deviceClass, _Characteristic, _Service, _CommunityTypes) {
    DeviceClass = _deviceClass;
    Characteristic = _Characteristic;
    Service = _Service;
    CommunityTypes = _CommunityTypes;
}

export function isSupported(accessory) {
    return accessory.hasCapability("Lock");
}

export const relevantAttributes = ["lock"];

export async function initializeService(accessory) {
    const lockSvc = DeviceClass.getOrAddService(accessory, Service.LockMechanism);

    DeviceClass.getOrAddCharacteristic(accessory, lockSvc, Characteristic.LockCurrentState, {
        getHandler: function () {
            const state = accessory.context.deviceData.attributes.lock;
            const convertedState = convertLockState(state);
            accessory.log.debug(`${accessory.name} | Lock Current State: ${state} => ${convertedState}`);
            return convertedState;
        },
    });

    DeviceClass.getOrAddCharacteristic(accessory, lockSvc, Characteristic.LockTargetState, {
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

export async function handleAttributeUpdate(accessory, change) {
    const lockSvc = accessory.getService(Service.LockMechanism);

    if (!lockSvc) {
        accessory.log.warn(`${accessory.name} | Lock Mechanism service not found`);
        return;
    }

    if (change.attribute === "lock") {
        const convertedState = convertLockState(change.value);
        DeviceClass.updateCharacteristicValue(accessory, lockSvc, Characteristic.LockCurrentState, convertedState);
        DeviceClass.updateCharacteristicValue(accessory, lockSvc, Characteristic.LockTargetState, convertedState);
        // accessory.log.debug(`${accessory.name} | Updated Lock State: ${change.value} => ${convertedState}`);
    } else {
        accessory.log.debug(`${accessory.name} | Unhandled attribute update: ${change.attribute}`);
    }
}

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

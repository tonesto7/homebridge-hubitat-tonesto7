// device_types/garage_door.js

let DeviceClass, Characteristic, Service, CommunityTypes;

export async function init(_deviceClass, _Characteristic, _Service, _CommunityTypes) {
    DeviceClass = _deviceClass;
    Characteristic = _Characteristic;
    Service = _Service;
    CommunityTypes = _CommunityTypes;
}

export function isSupported(accessory) {
    return accessory.hasCapability("GarageDoorControl");
}

export const relevantAttributes = ["door", "obstruction"];

export async function initializeService(accessory) {
    const garageDoorSvc = DeviceClass.getOrAddService(accessory, Service.GarageDoorOpener);

    DeviceClass.getOrAddCharacteristic(accessory, garageDoorSvc, Characteristic.CurrentDoorState, {
        getHandler: function () {
            const state = accessory.context.deviceData.attributes.door;
            const convertedState = convertDoorState(state, Characteristic);
            accessory.log.debug(`${accessory.name} | Current Door State: ${state} => ${convertedState}`);
            return convertedState;
        },
    });

    DeviceClass.getOrAddCharacteristic(accessory, garageDoorSvc, Characteristic.TargetDoorState, {
        getHandler: function () {
            const currentState = accessory.context.deviceData.attributes.door;
            return currentState === "open" || currentState === "opening" ? Characteristic.TargetDoorState.OPEN : Characteristic.TargetDoorState.CLOSED;
        },
        setHandler: function (value) {
            const command = value === Characteristic.TargetDoorState.OPEN ? "open" : "close";
            accessory.log.info(`${accessory.name} | Setting garage door state via command: ${command}`);
            accessory.sendCommand(null, accessory, accessory.context.deviceData, command);
        },
    });

    DeviceClass.getOrAddCharacteristic(accessory, garageDoorSvc, Characteristic.ObstructionDetected, {
        getHandler: function () {
            const obstruction = accessory.context.deviceData.attributes.obstruction === "detected";
            accessory.log.debug(`${accessory.name} | Obstruction Detected: ${obstruction}`);
            return obstruction;
        },
    });

    accessory.context.deviceGroups.push("garage_door");
}

export async function handleAttributeUpdate(accessory, change) {
    const garageDoorSvc = accessory.getService(Service.GarageDoorOpener);

    if (!garageDoorSvc) {
        accessory.log.warn(`${accessory.name} | GarageDoorOpener service not found`);
        return;
    }

    switch (change.attribute) {
        case "door": {
            const currentState = convertDoorState(change.value);
            const targetState = change.value === "open" || change.value === "opening" ? Characteristic.TargetDoorState.OPEN : Characteristic.TargetDoorState.CLOSED;
            DeviceClass.updateCharacteristicValue(accessory, garageDoorSvc, Characteristic.CurrentDoorState, currentState);
            DeviceClass.updateCharacteristicValue(accessory, garageDoorSvc, Characteristic.TargetDoorState, targetState);
            accessory.log.debug(`${accessory.name} | Updated Door State: ${change.value} => Current: ${currentState}, Target: ${targetState}`);
            break;
        }
        case "obstruction": {
            const obstruction = change.value === "detected";
            DeviceClass.updateCharacteristicValue(accessory, garageDoorSvc, Characteristic.ObstructionDetected, obstruction);
            // accessory.log.debug(`${accessory.name} | Updated Obstruction Detected: ${obstruction}`);
            break;
        }
        default:
            accessory.log.debug(`${accessory.name} | Unhandled attribute update: ${change.attribute}`);
    }
}

function convertDoorState(state) {
    switch (state) {
        case "open":
            return Characteristic.CurrentDoorState.OPEN;
        case "opening":
            return Characteristic.CurrentDoorState.OPENING;
        case "closed":
            return Characteristic.CurrentDoorState.CLOSED;
        case "closing":
            return Characteristic.CurrentDoorState.CLOSING;
        default:
            return Characteristic.CurrentDoorState.STOPPED;
    }
}

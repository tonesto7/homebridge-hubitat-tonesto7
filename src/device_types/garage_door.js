// device_types/garage_door.js

export function isSupported(accessory) {
    return accessory.hasCapability("GarageDoorControl");
}

export const relevantAttributes = ["door", "obstruction"];

export function initializeAccessory(accessory, deviceClass) {
    const { Service, Characteristic } = deviceClass.platform;
    const service = deviceClass.getOrAddService(accessory, Service.GarageDoorOpener);

    deviceClass.getOrAddCharacteristic(accessory, service, Characteristic.CurrentDoorState, {
        getHandler: function () {
            const state = accessory.context.deviceData.attributes.door;
            const convertedState = convertDoorState(state, Characteristic);
            accessory.log.debug(`${accessory.name} | Current Door State: ${state} => ${convertedState}`);
            return convertedState;
        },
    });

    deviceClass.getOrAddCharacteristic(accessory, service, Characteristic.TargetDoorState, {
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

    deviceClass.getOrAddCharacteristic(accessory, service, Characteristic.ObstructionDetected, {
        getHandler: function () {
            const obstruction = accessory.context.deviceData.attributes.obstruction === "detected";
            accessory.log.debug(`${accessory.name} | Obstruction Detected: ${obstruction}`);
            return obstruction;
        },
    });

    accessory.context.deviceGroups.push("garage_door");
}

export function handleAttributeUpdate(accessory, change, deviceClass) {
    const { Characteristic, Service } = deviceClass.platform;
    const service = accessory.getService(Service.GarageDoorOpener);

    if (!service) {
        accessory.log.warn(`${accessory.name} | Garage Door Opener service not found`);
        return;
    }

    switch (change.attribute) {
        case "door": {
            const currentState = convertDoorState(change.value, Characteristic);
            deviceClass.updateCharacteristicValue(accessory, service, Characteristic.CurrentDoorState, currentState);
            const targetState = change.value === "open" || change.value === "opening" ? Characteristic.TargetDoorState.OPEN : Characteristic.TargetDoorState.CLOSED;
            deviceClass.updateCharacteristicValue(accessory, service, Characteristic.TargetDoorState, targetState);
            accessory.log.debug(`${accessory.name} | Updated Door State: ${change.value} => Current: ${currentState}, Target: ${targetState}`);
            break;
        }
        case "obstruction": {
            const obstruction = change.value === "detected";
            deviceClass.updateCharacteristicValue(accessory, service, Characteristic.ObstructionDetected, obstruction);
            // accessory.log.debug(`${accessory.name} | Updated Obstruction Detected: ${obstruction}`);
            break;
        }
        default:
            accessory.log.debug(`${accessory.name} | Unhandled attribute update: ${change.attribute}`);
    }
}

function convertDoorState(state, Characteristic) {
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

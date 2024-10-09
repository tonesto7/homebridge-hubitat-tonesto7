// device_types/garage_door.js

/**
 * Converts door state string to HomeKit DoorState.
 * @param {string} state - The door state from the device.
 * @returns {number} - HomeKit DoorState.
 */
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

module.exports = {
    isSupported: (accessory) => accessory.hasCapability("GarageDoorControl"),
    relevantAttributes: ["door", "obstruction"],

    initializeAccessory: (accessory, deviceClass) => {
        const { Service, Characteristic } = deviceClass.mainPlatform;
        const service = accessory.getService(Service.GarageDoorOpener) || accessory.addService(Service.GarageDoorOpener);

        // Current Door State
        service.getCharacteristic(Characteristic.CurrentDoorState).onGet(() => {
            const state = accessory.context.deviceData.attributes.door;
            const convertedState = convertDoorState(state, Characteristic);
            accessory.log.debug(`${accessory.name} | Current Door State: ${state} => ${convertedState}`);
            return convertedState;
        });

        // Target Door State
        service
            .getCharacteristic(Characteristic.TargetDoorState)
            .onGet(() => {
                const currentState = accessory.context.deviceData.attributes.door;
                return currentState === "open" || currentState === "opening" ? Characteristic.TargetDoorState.OPEN : Characteristic.TargetDoorState.CLOSED;
            })
            .onSet((value) => {
                const command = value === Characteristic.TargetDoorState.OPEN ? "open" : "close";
                accessory.log.info(`${accessory.name} | Setting garage door state via command: ${command}`);
                accessory.sendCommand(null, accessory, accessory.context.deviceData, command);
            });

        // Obstruction Detected
        service.getCharacteristic(Characteristic.ObstructionDetected).onGet(() => {
            const obstruction = accessory.context.deviceData.attributes.obstruction === "detected";
            accessory.log.debug(`${accessory.name} | Obstruction Detected: ${obstruction}`);
            return obstruction;
        });

        accessory.context.deviceGroups.push("garage_door");
    },

    handleAttributeUpdate: (accessory, change, deviceClass) => {
        const { Characteristic, Service } = deviceClass.mainPlatform;
        const service = accessory.getService(Service.GarageDoorOpener);

        if (!service) {
            accessory.log.warn(`${accessory.name} | Garage Door Opener service not found`);
            return;
        }

        switch (change.attribute) {
            case "door":
                const currentState = convertDoorState(change.value, Characteristic);
                service.updateCharacteristic(Characteristic.CurrentDoorState, currentState);
                const targetState = change.value === "open" || change.value === "opening" ? Characteristic.TargetDoorState.OPEN : Characteristic.TargetDoorState.CLOSED;
                service.updateCharacteristic(Characteristic.TargetDoorState, targetState);
                accessory.log.debug(`${accessory.name} | Updated Door State: ${change.value} => Current: ${currentState}, Target: ${targetState}`);
                break;
            case "obstruction":
                const obstruction = change.value === "detected";
                service.updateCharacteristic(Characteristic.ObstructionDetected, obstruction);
                accessory.log.debug(`${accessory.name} | Updated Obstruction Detected: ${obstruction}`);
                break;
            default:
                accessory.log.debug(`${accessory.name} | Unhandled attribute update: ${change.attribute}`);
        }
    },
};

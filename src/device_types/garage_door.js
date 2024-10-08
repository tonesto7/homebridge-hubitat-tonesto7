// device_types/garage_door.js

module.exports = {
    isSupported: (accessory) => accessory.hasCapability("GarageDoorControl"),

    initializeAccessory: (accessory, deviceTypes) => {
        const { Service, Characteristic } = deviceTypes.mainPlatform;
        const service = accessory.getService(Service.GarageDoorOpener) || accessory.addService(Service.GarageDoorOpener);

        /**
         * Converts door state string to HomeKit DoorState.
         * @param {string} state - The door state from the device.
         * @returns {number} - HomeKit DoorState.
         */
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

        // Current Door State
        service.getCharacteristic(Characteristic.CurrentDoorState).onGet(() => {
            const state = accessory.context.deviceData.attributes.door;
            const convertedState = convertDoorState(state);
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
};

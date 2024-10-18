import HubitatAccessory from "../HubitatAccessory.js";

export default class GarageDoor extends HubitatAccessory {
    constructor(platform, accessory) {
        super(platform, accessory);
        this.deviceData = accessory.context.deviceData;
    }

    static relevantAttributes = ["door", "obstruction"];

    /**
     * Initializes the garage door service and its characteristics.
     *
     * This method sets up the garage door service (`GarageDoorOpener`) and adds the following characteristics:
     * - `CurrentDoorState`: Retrieves and converts the current state of the garage door.
     * - `TargetDoorState`: Retrieves the target state of the garage door and sets it based on the given value.
     * - `ObstructionDetected`: Checks if an obstruction is detected.
     *
     * It also adds the garage door to the accessory's device groups.
     *
     * @async
     * @method initializeService
     * @returns {Promise<void>} A promise that resolves when the service is initialized.
     */
    async initializeService() {
        this.garageDoorSvc = this.getOrAddService(this.Service.GarageDoorOpener);

        this.getOrAddCharacteristic(this.garageDoorSvc, this.Characteristic.CurrentDoorState, {
            getHandler: () => {
                const state = this.deviceData.attributes.door;
                const convertedState = this.convertDoorState(state);
                this.log.debug(`${this.accessory.displayName} | Current Door State: ${state} => ${convertedState}`);
                return convertedState;
            },
        });

        this.getOrAddCharacteristic(this.garageDoorSvc, this.Characteristic.TargetDoorState, {
            getHandler: () => {
                const currentState = this.deviceData.attributes.door;
                return currentState === "open" || currentState === "opening" ? this.Characteristic.TargetDoorState.OPEN : this.Characteristic.TargetDoorState.CLOSED;
            },
            setHandler: (value) => {
                const command = value === this.Characteristic.TargetDoorState.OPEN ? "open" : "close";
                this.log.info(`${this.accessory.displayName} | Setting garage door state via command: ${command}`);
                this.sendCommand(null, this.deviceData, command);
            },
        });

        this.getOrAddCharacteristic(this.garageDoorSvc, this.Characteristic.ObstructionDetected, {
            getHandler: () => {
                const obstruction = this.deviceData.attributes.obstruction === "detected";
                this.log.debug(`${this.accessory.displayName} | Obstruction Detected: ${obstruction}`);
                return obstruction;
            },
        });

        this.accessory.deviceGroups.push("garage_door");
    }

    /**
     * Handles updates to the attributes of the garage door device.
     *
     * @param {Object} change - The change object containing attribute updates.
     * @param {string} change.attribute - The name of the attribute that has changed.
     * @param {string} change.value - The new value of the attribute.
     *
     * @returns {void}
     *
     * @example
     * handleAttributeUpdate({ attribute: 'door', value: 'open' });
     *
     * @description
     * This method updates the state of the garage door based on the attribute changes.
     * It handles the 'door' and 'obstruction' attributes specifically, updating the
     * corresponding characteristics of the garage door service. If the attribute is
     * not recognized, it logs a debug message.
     */
    handleAttributeUpdate(change) {
        if (!this.garageDoorSvc) {
            this.log.warn(`${this.accessory.displayName} | GarageDoorOpener service not found`);
            return;
        }

        switch (change.attribute) {
            case "door": {
                const currentState = this.convertDoorState(change.value);
                const targetState = change.value === "open" || change.value === "opening" ? this.Characteristic.TargetDoorState.OPEN : this.Characteristic.TargetDoorState.CLOSED;
                this.updateCharacteristicValue(this.garageDoorSvc, this.Characteristic.CurrentDoorState, currentState);
                this.updateCharacteristicValue(this.garageDoorSvc, this.Characteristic.TargetDoorState, targetState);
                this.log.debug(`${this.accessory.displayName} | Updated Door State: ${change.value} => Current: ${currentState}, Target: ${targetState}`);
                break;
            }
            case "obstruction": {
                const obstruction = change.value === "detected";
                this.updateCharacteristicValue(this.garageDoorSvc, this.Characteristic.ObstructionDetected, obstruction);
                break;
            }
            default:
                this.log.debug(`${this.accessory.displayName} | Unhandled attribute update: ${change.attribute}`);
        }
    }

    /**
     * Converts a door state string to the corresponding HomeKit characteristic value.
     *
     * @param {string} state - The state of the door, which can be "open", "opening", "closed", or "closing".
     * @returns {number} - The corresponding HomeKit characteristic value for the door state.
     */
    convertDoorState(state) {
        switch (state) {
            case "open":
                return this.Characteristic.CurrentDoorState.OPEN;
            case "opening":
                return this.Characteristic.CurrentDoorState.OPENING;
            case "closed":
                return this.Characteristic.CurrentDoorState.CLOSED;
            case "closing":
                return this.Characteristic.CurrentDoorState.CLOSING;
            default:
                return this.Characteristic.CurrentDoorState.STOPPED;
        }
    }
}

import HubitatAccessory from "../HubitatAccessory.js";

export default class GarageDoor extends HubitatAccessory {
    constructor(platform, accessory) {
        super(platform, accessory);
        this.deviceData = accessory.context.deviceData;
    }

    static relevantAttributes = ["door", "obstruction"];

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

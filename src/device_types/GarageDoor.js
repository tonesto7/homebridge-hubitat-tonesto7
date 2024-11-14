// device_types/GarageDoor.js

import HubitatPlatformAccessory from "../HubitatPlatformAccessory.js";

export default class GarageDoor extends HubitatPlatformAccessory {
    constructor(platform, accessory) {
        super(platform, accessory);
        this.doorService = null;
    }

    async configureServices() {
        try {
            this.doorService = this.getOrAddService(this.Service.GarageDoorOpener);
            // this.markServiceForRetention(this.doorService);

            // Current Door State
            this.getOrAddCharacteristic(this.doorService, this.Characteristic.CurrentDoorState, {
                getHandler: () => this.getCurrentDoorState(),
            });

            // Target Door State
            this.getOrAddCharacteristic(this.doorService, this.Characteristic.TargetDoorState, {
                getHandler: () => this.getTargetDoorState(),
                setHandler: async (value) => this.setTargetDoorState(value),
            });

            // Obstruction Detected (always false as not supported by most Hubitat garage door devices)
            this.getOrAddCharacteristic(this.doorService, this.Characteristic.ObstructionDetected, {
                getHandler: () => false,
            });

            return true;
        } catch (error) {
            this.logError("Error configuring garage door services:", error);
            throw error;
        }
    }

    getCurrentDoorState() {
        switch (this.deviceData.attributes.door) {
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

    getTargetDoorState() {
        switch (this.deviceData.attributes.door) {
            case "closed":
            case "closing":
                return this.Characteristic.TargetDoorState.CLOSED;
            case "open":
            case "opening":
                return this.Characteristic.TargetDoorState.OPEN;
            default:
                return this.Characteristic.TargetDoorState.OPEN;
        }
    }

    async setTargetDoorState(value) {
        const command = value === this.Characteristic.TargetDoorState.OPEN ? "open" : "close";
        await this.sendCommand(command);
    }

    async handleAttributeUpdate(attribute, value) {
        this.updateDeviceAttribute(attribute, value);
        if (attribute === "door") {
            // Update current state
            let currentState;
            switch (value) {
                case "open":
                    currentState = this.Characteristic.CurrentDoorState.OPEN;
                    break;
                case "opening":
                    currentState = this.Characteristic.CurrentDoorState.OPENING;
                    break;
                case "closed":
                    currentState = this.Characteristic.CurrentDoorState.CLOSED;
                    break;
                case "closing":
                    currentState = this.Characteristic.CurrentDoorState.CLOSING;
                    break;
                default:
                    currentState = this.Characteristic.CurrentDoorState.STOPPED;
            }
            this.doorService.getCharacteristic(this.Characteristic.CurrentDoorState).updateValue(currentState);

            // Update target state
            const targetState = value === "closed" || value === "closing" ? this.Characteristic.TargetDoorState.CLOSED : this.Characteristic.TargetDoorState.OPEN;
            this.doorService.getCharacteristic(this.Characteristic.TargetDoorState).updateValue(targetState);
        } else {
            this.logDebug(`Unhandled attribute update: ${attribute} = ${value}`);
        }
    }

    // Override cleanup
    async cleanup() {
        this.doorService = null;
        await super.cleanup();
    }
}

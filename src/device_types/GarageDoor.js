// device_types/GarageDoor.js

import HubitatPlatformAccessory from "../HubitatPlatformAccessory.js";

export default class GarageDoor extends HubitatPlatformAccessory {
    constructor(platform, accessory) {
        super(platform, accessory);
        this.doorService = null;
    }

    static relevantAttributes = ["door"];

    async configureServices() {
        try {
            this.doorService = this.getOrAddService(this.Service.GarageDoorOpener, this.getServiceDisplayName(this.deviceData.name, "Garage Door"));

            // Current Door State
            this.getOrAddCharacteristic(this.doorService, this.Characteristic.CurrentDoorState, {
                getHandler: () => this.getCurrentDoorState(this.deviceData.attributes.door),
            });

            // Target Door State
            this.getOrAddCharacteristic(this.doorService, this.Characteristic.TargetDoorState, {
                getHandler: () => this.getTargetDoorState(this.deviceData.attributes.door),
                setHandler: async (value) => this.setTargetDoorState(value),
            });

            // Obstruction Detected (always false as not supported by most Hubitat garage door devices)
            this.getOrAddCharacteristic(this.doorService, this.Characteristic.ObstructionDetected, {
                getHandler: () => false,
            });

            return true;
        } catch (error) {
            this.logError(`GarageDoor | ${this.deviceData.name} | Error configuring services:`, error);
            throw error;
        }
    }

    getCurrentDoorState(value) {
        switch (value) {
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

    getTargetDoorState(value) {
        switch (value) {
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

    async handleAttributeUpdate(change) {
        const { attribute, value } = change;

        switch (attribute) {
            case "door":
                // Update current state
                this.doorService.getCharacteristic(this.Characteristic.CurrentDoorState).updateValue(this.getCurrentDoorState(value));

                // Update target state
                this.doorService.getCharacteristic(this.Characteristic.TargetDoorState).updateValue(this.getTargetDoorState(value));
                break;

            default:
                this.logDebug(`GarageDoor | ${this.deviceData.name} | Unhandled attribute update: ${attribute} = ${value}`);
        }
    }

    // Override cleanup
    async cleanup() {
        this.doorService = null;
        super.cleanup();
    }
}

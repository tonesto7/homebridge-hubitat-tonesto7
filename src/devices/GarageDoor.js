// devices/GarageDoor.js
export class GarageDoor {
    constructor(platform) {
        this.logManager = platform.logManager;
        this.Service = platform.Service;
        this.Characteristic = platform.Characteristic;
    }

    configure(accessory) {
        this.logManager.logDebug(`Configuring Garage Door for ${accessory.displayName}`);
        const svc = accessory.getOrAddService(this.Service.GarageDoorOpener);
        const devData = accessory.context.deviceData;

        this._configureCurrentDoorState(accessory, svc, devData);
        this._configureTargetDoorState(accessory, svc, devData);
        this._configureObstruction(accessory, svc);

        accessory.context.deviceGroups.push("garage_door");
        return accessory;
    }

    _configureCurrentDoorState(accessory, svc, devData) {
        const currentDoorStateMappings = {
            open: this.Characteristic.CurrentDoorState.OPEN,
            opening: this.Characteristic.CurrentDoorState.OPENING,
            closed: this.Characteristic.CurrentDoorState.CLOSED,
            closing: this.Characteristic.CurrentDoorState.CLOSING,
            unknown: this.Characteristic.CurrentDoorState.STOPPED,
        };

        accessory.getOrAddCharacteristic(svc, this.Characteristic.CurrentDoorState, {
            getHandler: () => currentDoorStateMappings[devData.attributes.door] || this.Characteristic.CurrentDoorState.STOPPED,
            updateHandler: (value) => currentDoorStateMappings[value] || this.Characteristic.CurrentDoorState.STOPPED,
            storeAttribute: "door",
        });
    }

    _configureTargetDoorState(accessory, svc, devData) {
        accessory.getOrAddCharacteristic(svc, this.Characteristic.TargetDoorState, {
            getHandler: () => (devData.attributes.door === "closed" ? this.Characteristic.TargetDoorState.CLOSED : this.Characteristic.TargetDoorState.OPEN),
            setHandler: (value) => accessory.sendCommand(value === this.Characteristic.TargetDoorState.OPEN ? "open" : "close"),
            updateHandler: (value) => (value === "closed" ? this.Characteristic.TargetDoorState.CLOSED : this.Characteristic.TargetDoorState.OPEN),
            storeAttribute: "door",
        });
    }

    _configureObstruction(accessory, svc) {
        accessory.getOrAddCharacteristic(svc, this.Characteristic.ObstructionDetected).updateValue(false);
    }
}

// devices/GarageDoor.js
export class GarageDoor {
    constructor(platform) {
        this.logManager = platform.logManager;
        this.Service = platform.Service;
        this.Characteristic = platform.Characteristic;
        this.generateSrvcName = platform.generateSrvcName;
    }

    static relevantAttributes = ["door"];

    configure(accessory) {
        this.logManager.logDebug(`Configuring Garage Door for ${accessory.displayName}`);
        const svcName = this.generateSrvcName(accessory.displayName, "Garage Door");
        const svc = accessory.getOrAddService(this.Service.GarageDoorOpener, accessory.displayName, "garageDoor");
        const devData = accessory.context.deviceData;

        this._configureCurrentDoorState(accessory, svc, devData);
        this._configureTargetDoorState(accessory, svc, devData);

        svc.getCharacteristic(this.Characteristic.ObstructionDetected).updateValue(false);

        return accessory;
    }

    _configureCurrentDoorState(accessory, svc, devData) {
        accessory.getOrAddCharacteristic(svc, this.Characteristic.CurrentDoorState, {
            getHandler: () => this._getCurrentDoorState(devData.attributes.door),
        });
    }

    _configureTargetDoorState(accessory, svc, devData) {
        accessory.getOrAddCharacteristic(svc, this.Characteristic.TargetDoorState, {
            getHandler: () => this._getTargetDoorState(devData.attributes.door),
            setHandler: (value) => accessory.sendCommand(value === this.Characteristic.TargetDoorState.OPEN ? "open" : "close"),
        });
    }

    _getCurrentDoorState(value) {
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

    _getTargetDoorState(value) {
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

    // Handle attribute updates
    handleAttributeUpdate(accessory, update) {
        const { attribute, value } = update;
        this.logManager.logDebug(`GarageDoor | ${accessory.displayName} | Attribute update: ${attribute} = ${value}`);
        if (!GarageDoor.relevantAttributes.includes(attribute)) return;

        const svc = accessory.getService(this.Service.GarageDoorOpener, this.generateSrvcName(accessory.displayName, "Garage Door"));
        if (!svc) return;

        switch (attribute) {
            case "door":
                svc.getCharacteristic(this.Characteristic.CurrentDoorState).updateValue(this._getCurrentDoorState(value));
                break;
            default:
                this.logManager.logWarn(`GarageDoor | ${accessory.displayName} | Unhandled attribute update: ${attribute} = ${value}`);
        }
    }
}

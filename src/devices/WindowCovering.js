// devices/WindowCovering.js
export class WindowCovering {
    constructor(platform) {
        this.logManager = platform.logManager;
        this.Service = platform.Service;
        this.Characteristic = platform.Characteristic;
    }

    configure(accessory) {
        this.logManager.logDebug(`Configuring Window Covering for ${accessory.displayName}`);
        const svc = accessory.getOrAddService(this.Service.WindowCovering);
        const devData = accessory.context.deviceData;
        const positionAttr = accessory.hasCommand("setPosition") ? "position" : "level";

        this._configureCurrentPosition(accessory, svc, devData, positionAttr);
        this._configureTargetPosition(accessory, svc, devData, positionAttr);
        this._configurePositionState(accessory, svc, devData);
        this._configureObstruction(accessory, svc);

        accessory.context.deviceGroups.push("window_shade");
        return accessory;
    }

    _configureCurrentPosition(accessory, svc, devData, positionAttr) {
        accessory.getOrAddCharacteristic(svc, this.Characteristic.CurrentPosition, {
            getHandler: () => parseInt(devData.attributes[positionAttr]),
            updateHandler: (value) => parseInt(value),
            props: { steps: 10 },
            storeAttribute: positionAttr,
        });
    }

    _configureTargetPosition(accessory, svc, devData, positionAttr) {
        accessory.getOrAddCharacteristic(svc, this.Characteristic.TargetPosition, {
            getHandler: () => parseInt(devData.attributes[positionAttr]),
            setHandler: (value) => {
                if (accessory.hasCommand("close") && value <= 2) {
                    accessory.sendCommand("close");
                } else {
                    const v = value <= 2 ? 0 : value >= 98 ? 100 : value;
                    accessory.sendCommand(accessory.hasCommand("setPosition") ? "setPosition" : "setLevel", [v]);
                }
            },
            updateHandler: (value) => (value <= 2 ? 0 : value >= 98 ? 100 : value),
            storeAttribute: positionAttr,
        });
    }

    _configurePositionState(accessory, svc, devData) {
        accessory.getOrAddCharacteristic(svc, this.Characteristic.PositionState, {
            getHandler: () => this._getPositionState(devData.attributes.windowShade),
            updateHandler: (value) => this._getPositionState(value),
            storeAttribute: "windowShade",
        });
    }

    _configureObstruction(accessory, svc) {
        svc.setCharacteristic(this.Characteristic.ObstructionDetected, false).setCharacteristic(this.Characteristic.HoldPosition, false);
    }

    _getPositionState(state) {
        switch (state) {
            case "opening":
                return this.Characteristic.PositionState.INCREASING;
            case "closing":
                return this.Characteristic.PositionState.DECREASING;
            default:
                return this.Characteristic.PositionState.STOPPED;
        }
    }
}

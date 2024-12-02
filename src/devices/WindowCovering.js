// devices/WindowCovering.js
export class WindowCovering {
    constructor(platform) {
        this.logManager = platform.logManager;
        this.Service = platform.Service;
        this.Characteristic = platform.Characteristic;
        this.generateSrvcName = platform.generateSrvcName;
    }

    static relevantAttributes = ["windowShade", "position", "level"];

    configure(accessory) {
        this.logManager.logDebug(`Configuring Window Covering for ${accessory.displayName}`);
        const svcName = this.generateSrvcName(accessory.displayName, "Shade");
        const svc = accessory.getOrAddService(this.Service.WindowCovering);
        const devData = accessory.context.deviceData;
        const positionAttr = accessory.hasCommand("setPosition") ? "position" : "level";

        this._updateSvcName(svc, svcName);
        this._configureCurrentPosition(accessory, svc, devData, positionAttr);
        this._configureTargetPosition(accessory, svc, devData, positionAttr);
        this._configurePositionState(accessory, svc, devData);
        this._configureObstruction(accessory, svc);

        return accessory;
    }

    _updateSvcName(svc, svcName) {
        svc.getOrAddCharacteristic(this.Characteristic.Name).updateValue(svcName);
    }

    _configureCurrentPosition(accessory, svc, devData, positionAttr) {
        accessory.getOrAddCharacteristic(svc, this.Characteristic.CurrentPosition, {
            getHandler: () => this._getCurrentPosition(devData.attributes[positionAttr]),
            props: this._getCoveringProps(),
        });
    }

    _configureTargetPosition(accessory, svc, devData, positionAttr) {
        accessory.getOrAddCharacteristic(svc, this.Characteristic.TargetPosition, {
            getHandler: () => this._getTargetPosition(parseInt(devData.attributes[positionAttr])),
            setHandler: (value) => {
                if (accessory.hasCommand("close") && value <= 2) {
                    accessory.sendCommand("close");
                } else {
                    const v = this._getTargetPosition(value);
                    accessory.sendCommand(accessory.hasCommand("setPosition") ? "setPosition" : "setLevel", [v]);
                }
            },
        });
    }

    _configurePositionState(accessory, svc, devData) {
        accessory.getOrAddCharacteristic(svc, this.Characteristic.PositionState, {
            getHandler: () => this._getPositionState(devData.attributes.windowShade),
        });
    }

    _getCoveringProps() {
        return {
            steps: 10,
            minValue: 0,
            maxValue: 100,
        };
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

    _getCurrentPosition(value) {
        return this._clampValue(value, 0, 100);
    }

    _getTargetPosition(value) {
        return this._clampValue(value <= 2 ? 0 : value >= 98 ? 100 : value, 0, 100);
    }

    _clampValue(value, min, max) {
        if (value === null || value === undefined || isNaN(value)) return min;
        return Math.max(min, Math.min(value, max));
    }

    // Handle attribute updates
    handleAttributeUpdate(accessory, update) {
        const { attribute, value } = update;
        this.logManager.logDebug(`WindowCovering | ${accessory.displayName} | Attribute update: ${attribute} = ${value}`);
        if (!WindowCovering.relevantAttributes.includes(attribute)) return;

        const svc = accessory.getService(this.Service.WindowCovering, this.generateSrvcName(accessory.displayName, "Shade"));
        if (!svc) return;

        switch (attribute) {
            case "windowShade":
                svc.getCharacteristic(this.Characteristic.PositionState).updateValue(this._getPositionState(value));
                break;
            case "position":
            case "level":
                svc.getCharacteristic(this.Characteristic.CurrentPosition).updateValue(this._getCurrentPosition(value));
                break;
            default:
                this.logManager.logWarn(`WindowCovering | ${accessory.displayName} | Unhandled attribute update: ${attribute} = ${value}`);
        }
    }
}

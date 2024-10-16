import HubitatAccessory from "../HubitatAccessory.js";

export default class WindowCovering extends HubitatAccessory {
    constructor(platform, accessory) {
        super(platform, accessory);
        this.deviceData = accessory.context.deviceData;
        this.relevantAttributes = ["position", "level", "windowShade"];
    }

    static isSupported(accessory) {
        return accessory.hasCapability("WindowShade") && !(accessory.hasCapability("Speaker") || accessory.hasCapability("Fan") || accessory.hasCapability("FanControl"));
    }

    initializeService() {
        this.windowCoverSvc = this.getOrAddService(this.Service.WindowCovering);

        // Determine position attribute
        this.positionAttr = this.hasCommand("setPosition") ? "position" : this.hasAttribute("level") ? "level" : undefined;
        if (!this.positionAttr) {
            this.log.warn(`${this.accessory.displayName} | Window Shade does not have a valid position attribute or command.`);
            return;
        }

        this.getOrAddCharacteristic(this.windowCoverSvc, this.Characteristic.CurrentPosition, {
            getHandler: () => {
                let position = parseInt(this.deviceData.attributes[this.positionAttr], 10);
                position = this.clamp(position, 0, 100);
                this.log.debug(`${this.accessory.displayName} | Window Shade Current Position Retrieved: ${position}%`);
                return isNaN(position) ? 0 : position;
            },
        });

        this.getOrAddCharacteristic(this.windowCoverSvc, this.Characteristic.TargetPosition, {
            getHandler: () => {
                let position = parseInt(this.deviceData.attributes[this.positionAttr], 10);
                position = this.clamp(position, 0, 100);
                this.log.debug(`${this.accessory.displayName} | Window Shade Target Position Retrieved: ${position}%`);
                return isNaN(position) ? 0 : position;
            },
            setHandler: (value) => {
                let target = this.clamp(value, 0, 100);
                const command = this.hasCommand("setPosition") ? "setPosition" : "setLevel";
                this.log.info(`${this.accessory.displayName} | Setting window shade target position to ${target}% via command: ${command}`);
                this.sendCommand(null, this.accessory, this.deviceData, command, { value1: target });
            },
        });

        this.getOrAddCharacteristic(this.windowCoverSvc, this.Characteristic.PositionState, {
            getHandler: () => {
                const state = this.deviceData.attributes.windowShade;
                const positionState = this.convertPositionState(state);
                this.log.debug(`${this.accessory.displayName} | Window Shade Position State Retrieved: ${positionState}`);
                return positionState;
            },
        });

        this.getOrAddCharacteristic(this.windowCoverSvc, this.Characteristic.ObstructionDetected, {
            getHandler: () => {
                this.log.debug(`${this.accessory.displayName} | Window Shade Obstruction Detected Retrieved: false`);
                return false;
            },
        });

        this.getOrAddCharacteristic(this.windowCoverSvc, this.Characteristic.HoldPosition, {
            setHandler: (value) => {
                if (value) {
                    this.log.info(`${this.accessory.displayName} | Pausing window shade movement via command: pause`);
                    this.sendCommand(null, this.accessory, this.deviceData, "pause");
                }
            },
            getHandler: () => {
                this.log.debug(`${this.accessory.displayName} | Window Shade HoldPosition Retrieved: 0`);
                return 0;
            },
        });

        this.accessory.context.deviceGroups.push("window_covering");
    }

    handleAttributeUpdate(change) {
        if (!this.windowCoverSvc) {
            this.log.warn(`${this.accessory.displayName} | Window Covering service not found`);
            return;
        }

        switch (change.attribute) {
            case "position":
            case "level":
                if (change.attribute === this.positionAttr) {
                    let position = this.clamp(parseInt(change.value, 10), 0, 100);
                    this.updateCharacteristicValue(this.windowCoverSvc, this.Characteristic.CurrentPosition, position);
                    this.updateCharacteristicValue(this.windowCoverSvc, this.Characteristic.TargetPosition, position);
                }
                break;
            case "windowShade":
                const positionState = this.convertPositionState(change.value);
                this.updateCharacteristicValue(this.windowCoverSvc, this.Characteristic.PositionState, positionState);
                break;
            default:
                this.log.debug(`${this.accessory.displayName} | Unhandled attribute update: ${change.attribute}`);
        }
    }

    convertPositionState(state) {
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

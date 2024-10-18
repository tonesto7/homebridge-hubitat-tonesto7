import HubitatAccessory from "../HubitatAccessory.js";

export default class WindowCovering extends HubitatAccessory {
    constructor(platform, accessory) {
        super(platform, accessory);
        this.deviceData = accessory.context.deviceData;
    }

    static relevantAttributes = ["position", "level", "windowShade"];

    /**
     * Initializes the window covering service for the accessory.
     *
     * This method sets up the characteristics for the window covering service, including:
     * - CurrentPosition: Retrieves the current position of the window shade.
     * - TargetPosition: Retrieves and sets the target position of the window shade.
     * - PositionState: Retrieves the current state of the window shade's position.
     * - ObstructionDetected: Checks if there is any obstruction detected.
     * - HoldPosition: Pauses the window shade movement.
     *
     * It also determines the appropriate position attribute based on available commands and attributes.
     * If no valid position attribute or command is found, a warning is logged.
     *
     * @async
     * @returns {Promise<void>} Resolves when the service is initialized.
     */
    async initializeService() {
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
                this.sendCommand(null, this.deviceData, command, { value1: target });
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
                    this.sendCommand(null, this.deviceData, "pause");
                }
            },
            getHandler: () => {
                this.log.debug(`${this.accessory.displayName} | Window Shade HoldPosition Retrieved: 0`);
                return 0;
            },
        });

        this.accessory.deviceGroups.push("window_covering");
    }

    /**
     * Handles updates to device attributes and updates the corresponding HomeKit characteristics.
     *
     * @param {Object} change - The change object containing attribute updates.
     * @param {string} change.attribute - The name of the attribute that has changed.
     * @param {string|number} change.value - The new value of the attribute.
     *
     * @returns {void}
     */
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

    /**
     * Converts a string representing the position state of a window covering
     * to the corresponding HomeKit characteristic value.
     *
     * @param {string} state - The state of the window covering, which can be "opening", "closing", or any other value.
     * @returns {number} - The corresponding HomeKit characteristic value for the position state.
     *                     - INCREASING if the state is "opening".
     *                     - DECREASING if the state is "closing".
     *                     - STOPPED for any other state.
     */
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

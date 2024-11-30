// device_types/WindowCovering.js

import HubitatBaseAccessory from "./BaseAccessory.js";

export default class WindowCovering extends HubitatBaseAccessory {
    constructor(platform, accessory) {
        super(platform, accessory);
        this.shadeService = null;
        this.usePosition = this.hasCommand("setPosition");
        this.positionAttr = this.usePosition ? "position" : "level";
    }

    static relevantAttributes = ["position", "level", "windowShade"];

    async configureServices() {
        try {
            this.shadeService = this.getOrAddService(this.Service.WindowCovering, this.cleanServiceDisplayName(this.deviceData.name, "Window Covering"));

            // Current Position
            this.getOrAddCharacteristic(this.shadeService, this.Characteristic.CurrentPosition, {
                getHandler: () => this.getCurrentPosition(this.deviceData.attributes[this.positionAttr]),
                props: {
                    minValue: 0,
                    maxValue: 100,
                    minStep: 1,
                },
            });

            // Target Position
            this.getOrAddCharacteristic(this.shadeService, this.Characteristic.TargetPosition, {
                getHandler: () => this.getTargetPosition(this.deviceData.attributes[this.positionAttr]),
                setHandler: async (value) => this.setTargetPosition(value),
                props: {
                    minValue: 0,
                    maxValue: 100,
                    minStep: 1,
                },
            });

            // Position State
            this.getOrAddCharacteristic(this.shadeService, this.Characteristic.PositionState, {
                getHandler: () => this.getPositionState(this.deviceData.attributes.windowShade),
            });

            // Obstruction Detection
            this.getOrAddCharacteristic(this.shadeService, this.Characteristic.ObstructionDetected, {
                getHandler: () => false,
            });

            // Hold Position
            this.getOrAddCharacteristic(this.shadeService, this.Characteristic.HoldPosition, {
                getHandler: () => false,
                setHandler: async () => {},
            });

            return true;
        } catch (error) {
            this.logManager.logError(`WindowCovering | ${this.deviceData.name} | Error configuring services:`, error);
            throw error;
        }
    }

    getCurrentPosition(value) {
        const position = parseInt(value);
        return this.validatePosition(position);
    }

    getTargetPosition(value) {
        const position = parseInt(value);
        return this.validatePosition(position);
    }

    validatePosition(position) {
        if (isNaN(position)) return 0;
        return Math.max(0, Math.min(100, position));
    }

    async setTargetPosition(value) {
        try {
            if (this.hasCommand("close") && value <= 2) {
                await this.sendCommand("close");
                return;
            }

            let targetValue = value;
            if (value <= 2) targetValue = 0;
            if (value >= 98) targetValue = 100;

            const command = this.usePosition ? "setPosition" : "setLevel";
            await this.sendCommand(command, [targetValue]);
        } catch (error) {
            this.logManager.logError("WindowCovering | Error setting target position:", error);
        }
    }

    getPositionState(value) {
        switch (value) {
            case "opening":
                return this.Characteristic.PositionState.INCREASING;
            case "closing":
                return this.Characteristic.PositionState.DECREASING;
            default:
                return this.Characteristic.PositionState.STOPPED;
        }
    }

    async handleAttributeUpdate(change) {
        const { attribute, value } = change;

        switch (attribute) {
            case "position":
            case "level":
                if (attribute !== this.positionAttr) return;
                this.shadeService.getCharacteristic(this.Characteristic.CurrentPosition).updateValue(this.getCurrentPosition(value));
                this.shadeService.getCharacteristic(this.Characteristic.TargetPosition).updateValue(this.getTargetPosition(value));
                break;

            case "windowShade":
                this.shadeService.getCharacteristic(this.Characteristic.PositionState).updateValue(this.getPositionState(value));
                break;

            default:
                this.logManager.logDebug(`WindowCovering | ${this.deviceData.name} | Unhandled attribute update: ${attribute} = ${value}`);
        }
    }

    async cleanup() {
        this.shadeService = null;
        super.cleanup();
    }
}

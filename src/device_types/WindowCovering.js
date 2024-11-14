// device_types/WindowCovering.js

import HubitatPlatformAccessory from "../HubitatPlatformAccessory.js";

export default class WindowCovering extends HubitatPlatformAccessory {
    constructor(platform, accessory) {
        super(platform, accessory);
        this.shadeService = null;
        this.usePosition = this.hasCommand("setPosition");
        this.positionAttr = this.usePosition ? "position" : "level";
    }

    async configureServices() {
        try {
            this.shadeService = this.getOrAddService(this.Service.WindowCovering);

            // Current Position
            this.getOrAddCharacteristic(this.shadeService, this.Characteristic.CurrentPosition, {
                getHandler: () => {
                    const position = this.getCurrentPosition();
                    return isNaN(position) ? 0 : position;
                },
                props: {
                    minValue: 0,
                    maxValue: 100,
                    minStep: 1,
                },
            });

            // Target Position
            this.getOrAddCharacteristic(this.shadeService, this.Characteristic.TargetPosition, {
                getHandler: () => {
                    const position = this.getTargetPosition();
                    return isNaN(position) ? 0 : position;
                },
                setHandler: async (value) => this.setTargetPosition(value),
                props: {
                    minValue: 0,
                    maxValue: 100,
                    minStep: 1,
                },
            });

            // Position State
            this.getOrAddCharacteristic(this.shadeService, this.Characteristic.PositionState, {
                getHandler: () => this.getPositionState(),
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
            this.logError("Error configuring window covering services:", error);
            throw error;
        }
    }

    getCurrentPosition() {
        const position = parseInt(this.deviceData.attributes[this.positionAttr]);
        return this.validatePosition(position);
    }

    getTargetPosition() {
        const position = parseInt(this.deviceData.attributes[this.positionAttr]);
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
            await this.sendCommand(command, { value1: targetValue });
        } catch (error) {
            this.logError("Error setting target position:", error);
        }
    }

    getPositionState() {
        switch (this.deviceData.attributes.windowShade) {
            case "opening":
                return this.Characteristic.PositionState.INCREASING;
            case "closing":
                return this.Characteristic.PositionState.DECREASING;
            default:
                return this.Characteristic.PositionState.STOPPED;
        }
    }

    async handleAttributeUpdate(attribute, value) {
        this.updateDeviceAttribute(attribute, value);

        switch (attribute) {
            case "position":
            case "level":
                if (attribute !== this.positionAttr) return;
                const position = this.validatePosition(parseInt(value));
                this.shadeService.getCharacteristic(this.Characteristic.CurrentPosition).updateValue(position);
                this.shadeService.getCharacteristic(this.Characteristic.TargetPosition).updateValue(position);
                break;

            case "windowShade":
                const state = this.getPositionState();
                this.shadeService.getCharacteristic(this.Characteristic.PositionState).updateValue(state);
                break;
        }
    }

    async cleanup() {
        this.shadeService = null;
        await super.cleanup();
    }
}

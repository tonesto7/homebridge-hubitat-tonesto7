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
            this.markServiceForRetention(this.shadeService);

            // Current Position
            this.getOrAddCharacteristic(this.shadeService, this.Characteristic.CurrentPosition, {
                getHandler: () => this.getCurrentPosition(),
                props: { steps: 10 },
            });

            // Target Position
            this.getOrAddCharacteristic(this.shadeService, this.Characteristic.TargetPosition, {
                getHandler: () => this.getTargetPosition(),
                setHandler: async (value) => this.setTargetPosition(value),
            });

            // Position State
            this.getOrAddCharacteristic(this.shadeService, this.Characteristic.PositionState, {
                getHandler: () => this.getPositionState(),
            });

            // Obstruction Detection (always false as not supported)
            this.getOrAddCharacteristic(this.shadeService, this.Characteristic.ObstructionDetected, {
                getHandler: () => false,
            });

            // Hold Position (not actively used but required)
            this.shadeService.getCharacteristic(this.Characteristic.HoldPosition).updateValue(false);

            return true;
        } catch (error) {
            this.logError("Error configuring window covering services:", error);
            throw error;
        }
    }

    getCurrentPosition() {
        return parseInt(this.deviceData.attributes[this.positionAttr]);
    }

    getTargetPosition() {
        return parseInt(this.deviceData.attributes[this.positionAttr]);
    }

    async setTargetPosition(value) {
        if (this.hasCommand("close") && value <= 2) {
            await this.sendCommand("close");
        } else {
            let targetValue = value;
            if (value <= 2) targetValue = 0;
            if (value >= 98) targetValue = 100;

            const command = this.usePosition ? "setPosition" : "setLevel";
            await this.sendCommand(command, { value1: targetValue });
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
                const position = parseInt(value);
                this.shadeService.getCharacteristic(this.Characteristic.CurrentPosition).updateValue(position);
                this.shadeService.getCharacteristic(this.Characteristic.TargetPosition).updateValue(position);
                break;

            case "windowShade":
                let state;
                switch (value) {
                    case "opening":
                        state = this.Characteristic.PositionState.INCREASING;
                        break;
                    case "closing":
                        state = this.Characteristic.PositionState.DECREASING;
                        break;
                    default:
                        state = this.Characteristic.PositionState.STOPPED;
                }
                this.shadeService.getCharacteristic(this.Characteristic.PositionState).updateValue(state);
                break;

            default:
                this.logDebug(`Unhandled attribute update: ${attribute} = ${value}`);
        }
    }

    // Override cleanup
    async cleanup() {
        this.shadeService = null;
        await super.cleanup();
    }
}

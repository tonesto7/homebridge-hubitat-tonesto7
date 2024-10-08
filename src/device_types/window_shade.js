// device_types/window_shade.js

module.exports = {
    isSupported: (accessory) => accessory.hasCapability("WindowShade") && !(accessory.hasCapability("Speaker") || accessory.hasCapability("Fan") || accessory.hasCapability("FanControl")),

    initializeAccessory: (accessory, deviceTypes) => {
        const { Service, Characteristic } = deviceTypes.mainPlatform;
        const service = accessory.getService(Service.WindowCovering) || accessory.addService(Service.WindowCovering);

        /**
         * Clamps a value between a minimum and maximum.
         * @param {number} value - The value to clamp.
         * @param {number} min - The minimum allowable value.
         * @param {number} max - The maximum allowable value.
         * @returns {number} - The clamped value.
         */
        function clamp(value, min, max) {
            return Math.max(min, Math.min(max, value));
        }

        // Determine position attribute
        const positionAttr = accessory.hasCommand("setPosition") ? "position" : accessory.hasAttribute("level") ? "level" : undefined;
        if (!positionAttr) {
            accessory.log.warn(`${accessory.name} | Window Shade does not have a valid position attribute or command.`);
            return;
        }

        /**
         * Converts window shade state to HomeKit PositionState.
         * @param {string} state - The window shade state from the device.
         * @returns {number} - HomeKit PositionState.
         */
        function convertPositionState(state) {
            if (state === "opening") return Characteristic.PositionState.INCREASING;
            if (state === "closing") return Characteristic.PositionState.DECREASING;
            return Characteristic.PositionState.STOPPED;
        }

        // Current Position Characteristic
        service
            .getCharacteristic(Characteristic.CurrentPosition)
            .onGet(() => {
                let position = parseInt(accessory.context.deviceData.attributes[positionAttr], 10);
                position = clamp(position, 0, 100);
                accessory.log.debug(`${accessory.name} | Window Shade Current Position Retrieved: ${position}%`);
                return isNaN(position) ? 0 : position;
            })
            .onSet(() => {
                accessory.log.warn(`${accessory.name} | Attempted to set CurrentPosition characteristic, which is read-only.`);
            });

        // Target Position Characteristic
        service
            .getCharacteristic(Characteristic.TargetPosition)
            .onGet(() => {
                let position = parseInt(accessory.context.deviceData.attributes[positionAttr], 10);
                position = clamp(position, 0, 100);
                accessory.log.debug(`${accessory.name} | Window Shade Target Position Retrieved: ${position}%`);
                return isNaN(position) ? 0 : position;
            })
            .onSet((value) => {
                let target = clamp(value, 0, 100);
                accessory.log.info(`${accessory.name} | Setting window shade target position to ${target}% via command: ${accessory.hasCommand("setPosition") ? "setPosition" : "setLevel"}`);
                accessory.sendCommand(null, accessory, accessory.context.deviceData, accessory.hasCommand("setPosition") ? "setPosition" : "setLevel", { value1: target });
            });

        // Position State Characteristic
        service
            .getCharacteristic(Characteristic.PositionState)
            .onGet(() => {
                const state = accessory.context.deviceData.attributes.windowShade;
                const positionState = convertPositionState(state);
                accessory.log.debug(`${accessory.name} | Window Shade Position State Retrieved: ${positionState}`);
                return positionState;
            })
            .onSet(() => {
                accessory.log.warn(`${accessory.name} | Attempted to set PositionState characteristic, which is read-only.`);
            });

        // Obstruction Detected Characteristic
        service
            .getCharacteristic(Characteristic.ObstructionDetected)
            .onGet(() => {
                // Assuming no obstruction detection implemented
                accessory.log.debug(`${accessory.name} | Window Shade Obstruction Detected Retrieved: false`);
                return false;
            })
            .onSet(() => {
                accessory.log.warn(`${accessory.name} | Attempted to set ObstructionDetected characteristic, which is read-only.`);
            });

        // Hold Position Characteristic
        service
            .getCharacteristic(Characteristic.HoldPosition)
            .onSet((value) => {
                if (value) {
                    accessory.log.info(`${accessory.name} | Pausing window shade movement via command: pause`);
                    accessory.sendCommand(null, accessory, accessory.context.deviceData, "pause");
                }
            })
            .onGet(() => {
                // HoldPosition is typically write-only, returning 0
                accessory.log.debug(`${accessory.name} | Window Shade HoldPosition Retrieved: 0`);
                return 0;
            });

        // Status Active Characteristic
        service
            .getCharacteristic(Characteristic.StatusActive)
            .onGet(() => {
                const isActive = accessory.context.deviceData.status === "online";
                accessory.log.debug(`${accessory.name} | Window Shade Status Active Retrieved: ${isActive}`);
                return isActive;
            })
            .onSet(() => {
                accessory.log.warn(`${accessory.name} | Attempted to set StatusActive characteristic, which is read-only.`);
            });

        accessory.context.deviceGroups.push("window_shade");
    },
};

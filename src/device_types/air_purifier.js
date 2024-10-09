// device_types/air_purifier.js

module.exports = {
    isSupported: (accessory) => accessory.hasCapability("AirPurifier"),

    relevantAttributes: ["switch", "fanMode", "status", "tamper"],

    initializeAccessory: (accessory, deviceClass) => {
        const { Service, Characteristic, CommunityTypes } = deviceClass.platform;

        // Ensure CommunityTypes.NewAirPurifierService exists
        if (!CommunityTypes || !CommunityTypes.NewAirPurifierService) {
            accessory.log.warn(`${accessory.name} | CommunityTypes.NewAirPurifierService is not defined.`);
            return;
        }

        const service = accessory.getService(CommunityTypes.NewAirPurifierService) || accessory.addService(CommunityTypes.NewAirPurifierService);

        /**
         * Converts fan mode string to HomeKit FanOscilationMode.
         * @param {string} mode - The fan mode from the device.
         * @returns {number} - HomeKit FanOscilationMode.
         */
        function convertFanMode(mode) {
            switch (mode) {
                case "low":
                    return CommunityTypes.FanOscilationMode.LOW;
                case "medium":
                    return CommunityTypes.FanOscilationMode.MEDIUM;
                case "high":
                    return CommunityTypes.FanOscilationMode.HIGH;
                case "sleep":
                    return CommunityTypes.FanOscilationMode.SLEEP;
                default:
                    accessory.log.warn(`${accessory.name} | Unsupported fan mode: ${mode}`);
                    return CommunityTypes.FanOscilationMode.SLEEP; // Default mode
            }
        }

        /**
         * Converts HomeKit FanOscilationMode to device-specific fan mode.
         * @param {number} mode - HomeKit FanOscilationMode.
         * @returns {string} - Corresponding device fan mode.
         */
        function convertFanModeToDevice(mode) {
            switch (mode) {
                case CommunityTypes.FanOscilationMode.LOW:
                    return "low";
                case CommunityTypes.FanOscilationMode.MEDIUM:
                    return "medium";
                case CommunityTypes.FanOscilationMode.HIGH:
                    return "high";
                case CommunityTypes.FanOscilationMode.SLEEP:
                default:
                    return "sleep";
            }
        }

        /**
         * Converts air purifier state to HomeKit CurrentAirPurifierState.
         * @param {string} state - The air purifier state from the device.
         * @returns {number} - HomeKit CurrentAirPurifierState.
         */
        function convertAirPurifierState(state) {
            accessory.log.debug(`${accessory.name} | Air Purifier State: ${state}`);
            switch (state) {
                case "purifying":
                    return Characteristic.CurrentAirPurifierState.PURIFYING_AIR;
                case "idle":
                    return Characteristic.CurrentAirPurifierState.IDLE;
                case "inactive":
                default:
                    return Characteristic.CurrentAirPurifierState.INACTIVE;
            }
        }

        // Active Characteristic
        service
            .getCharacteristic(Characteristic.Active)
            .onGet(() => {
                const isActive = accessory.context.deviceData.attributes.switch === "on";
                accessory.log.debug(`${accessory.name} | Active State Retrieved: ${isActive ? "ACTIVE" : "INACTIVE"}`);
                return isActive ? Characteristic.Active.ACTIVE : Characteristic.Active.INACTIVE;
            })
            .onSet((value) => {
                const command = value === Characteristic.Active.ACTIVE ? "on" : "off";
                accessory.log.info(`${accessory.name} | Setting Air Purifier Active State via command: ${command}`);
                accessory.sendCommand(null, accessory, accessory.context.deviceData, command);
            });

        // Current Air Purifier State Characteristic
        service
            .getCharacteristic(Characteristic.CurrentAirPurifierState)
            .onGet(() => {
                const state = accessory.context.deviceData.attributes.switch === "on" ? "purifying" : "inactive";
                const currentState = convertAirPurifierState(state);
                accessory.log.debug(`${accessory.name} | Current Air Purifier State Retrieved: ${currentState}`);
                return currentState;
            })
            .onSet(() => {
                accessory.log.warn(`${accessory.name} | Attempted to set CurrentAirPurifierState characteristic, which is read-only.`);
            });

        // Fan Oscillation Mode Characteristic
        if (CommunityTypes && CommunityTypes.FanOscilationMode) {
            service
                .getCharacteristic(CommunityTypes.FanOscilationMode)
                .onGet(() => {
                    const fanMode = accessory.context.deviceData.attributes.fanMode || "sleep";
                    const convertedMode = convertFanMode(fanMode);
                    accessory.log.debug(`${accessory.name} | Fan Oscillation Mode Retrieved: ${convertedMode}`);
                    return convertedMode;
                })
                .onSet((value) => {
                    const mode = convertFanModeToDevice(value);
                    accessory.log.info(`${accessory.name} | Setting Fan Oscillation Mode to: ${mode}`);
                    accessory.sendCommand(null, accessory, accessory.context.deviceData, "setFanMode", { value1: mode });
                });
        } else {
            accessory.log.warn(`${accessory.name} | CommunityTypes.FanOscilationMode is not defined.`);
        }

        // Status Active Characteristic
        service
            .getCharacteristic(Characteristic.StatusActive)
            .onGet(() => {
                const isActive = accessory.context.deviceData.status === "online";
                accessory.log.debug(`${accessory.name} | Status Active Retrieved: ${isActive}`);
                return isActive;
            })
            .onSet(() => {
                accessory.log.warn(`${accessory.name} | Attempted to set StatusActive characteristic, which is read-only.`);
            });

        // Status Tampered Characteristic (if supported)
        if (accessory.hasCapability("TamperAlert")) {
            service
                .getCharacteristic(Characteristic.StatusTampered)
                .onGet(() => {
                    const isTampered = accessory.context.deviceData.attributes.tamper === "detected";
                    accessory.log.debug(`${accessory.name} | Status Tampered Retrieved: ${isTampered}`);
                    return isTampered;
                })
                .onSet(() => {
                    accessory.log.warn(`${accessory.name} | Attempted to set StatusTampered characteristic, which is read-only.`);
                });
        } else {
            service.removeCharacteristic(Characteristic.StatusTampered);
        }

        accessory.context.deviceGroups.push("air_purifier");
    },

    andleAttributeUpdate: (accessory, change, deviceClass) => {
        const { Characteristic, CommunityTypes } = deviceClass.platform;
        const service = accessory.getService(CommunityTypes.NewAirPurifierService);

        if (!service) {
            accessory.log.warn(`${accessory.name} | Air Purifier service not found`);
            return;
        }

        switch (change.attribute) {
            case "switch":
                const isActive = change.value === "on";
                service.updateCharacteristic(Characteristic.Active, isActive ? Characteristic.Active.ACTIVE : Characteristic.Active.INACTIVE);
                service.updateCharacteristic(Characteristic.CurrentAirPurifierState, isActive ? Characteristic.CurrentAirPurifierState.PURIFYING_AIR : Characteristic.CurrentAirPurifierState.INACTIVE);
                accessory.log.debug(`${accessory.name} | Updated Active: ${isActive} and CurrentAirPurifierState: ${isActive ? "PURIFYING_AIR" : "INACTIVE"}`);
                break;
            case "fanMode":
                if (CommunityTypes && CommunityTypes.FanOscilationMode) {
                    const fanMode = convertFanMode(change.value);
                    service.updateCharacteristic(CommunityTypes.FanOscilationMode, fanMode);
                    accessory.log.debug(`${accessory.name} | Updated Fan Oscillation Mode: ${fanMode}`);
                }
                break;
            case "status":
                const isOnline = change.value === "online";
                service.updateCharacteristic(Characteristic.StatusActive, isOnline);
                accessory.log.debug(`${accessory.name} | Updated Status Active: ${isOnline}`);
                break;
            case "tamper":
                if (accessory.hasCapability("TamperAlert")) {
                    const isTampered = change.value === "detected";
                    service.updateCharacteristic(Characteristic.StatusTampered, isTampered);
                    accessory.log.debug(`${accessory.name} | Updated Status Tampered: ${isTampered}`);
                }
                break;
            default:
                accessory.log.debug(`${accessory.name} | Unhandled attribute update: ${change.attribute}`);
        }
    },
};

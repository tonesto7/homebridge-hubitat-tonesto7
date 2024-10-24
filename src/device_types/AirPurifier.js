// device_types/AirPurifier.js

import CommunityTypes from "../libs/CommunityTypes.js";
import HubitatAccessory from "../HubitatAccessory.js";

export default class Button extends HubitatAccessory {
    constructor(platform, accessory) {
        super(platform, accessory);
        this.deviceData = accessory.context.deviceData;
    }

    /**
     * @constant {string[]} relevantAttributes - An array of relevant attribute names for the Air Purifier device type.
     * @default ["switch", "fanMode", "tamper"]
     */
    static relevantAttributes = ["switch", "fanMode", "tamper"];

    /**
     * Initializes the Air Purifier service and its characteristics.
     *
     * This method ensures that the necessary community types and characteristics for the Air Purifier service are defined and added to the accessory.
     * It sets up handlers for getting and setting the state of the air purifier, including its active state, current state, fan oscillation mode, and tamper status.
     *
     * Characteristics initialized:
     * - Active
     * - CurrentAirPurifierState
     * - FanOscilationMode (if defined in CommunityTypes)
     * - StatusTampered
     *
     * The method also adds the air purifier to the accessory's device groups.
     *
     * @async
     * @returns {Promise<void>} Resolves when the service and characteristics are initialized.
     */
    async initializeService() {
        // Ensure CommunityTypes.NewAirPurifierService exists
        if (!CommunityTypes || !CommunityTypes.NewAirPurifierService) {
            accessory.log.warn(`${this.accessory.name} | CommunityTypes.NewAirPurifierService is not defined.`);
            return;
        }

        this.airPurifierSvc = this.getOrAddService(CommunityTypes.NewAirPurifierService);

        this.getOrAddCharacteristic(this.airPurifierSvc, this.Characteristic.Active, {
            getHandler: function () {
                const isActive = this.deviceData.attributes.switch === "on";
                accessory.log.debug(`${this.accessory.name} | Active State Retrieved: ${isActive ? "ACTIVE" : "INACTIVE"}`);
                return isActive ? this.Characteristic.Active.ACTIVE : this.Characteristic.Active.INACTIVE;
            },
            setHandler: function () {
                const command = value === thisCharacteristic.Active.ACTIVE ? "on" : "off";
                accessory.log.info(`${this.accessory.name} | Setting Air Purifier Active State via command: ${command}`);
                accessory.sendCommand(null, this.accessory, this.deviceData, command);
            },
        });

        // Current Air Purifier State Characteristic
        this.getOrAddCharacteristic(this.airPurifierSvc, this.Characteristic.CurrentAirPurifierState, {
            getHandler: function () {
                const state = this.deviceData.attributes.switch === "on" ? "purifying" : "inactive";
                const currentState = convertAirPurifierState(state);
                accessory.log.debug(`${this.accessory.name} | Current Air Purifier State Retrieved: ${currentState}`);
                return currentState;
            },
            setHandler: function () {
                accessory.log.warn(`${this.accessory.name} | Attempted to set CurrentAirPurifierState characteristic, which is read-only.`);
            },
        });

        // Fan Oscillation Mode Characteristic
        if (CommunityTypes && CommunityTypes.FanOscilationMode) {
            this.getOrAddCharacteristic(this.airPurifierSvc, CommunityTypes.FanOscilationMode, {
                getHandler: function () {
                    const fanMode = this.deviceData.attributes.fanMode || "sleep";
                    const convertedMode = convertFanMode(fanMode);
                    this.log.debug(`${this.accessory.name} | Fan Oscillation Mode Retrieved: ${convertedMode}`);
                    return convertedMode;
                },
                setHandler: function () {
                    const mode = this.convertFanModeToDevice(value);
                    this.log.info(`${this.accessory.name} | Setting Fan Oscillation Mode to: ${mode}`);
                    accessory.sendCommand(null, this.accessory, this.deviceData, "setFanMode", { value1: mode });
                },
            });
        } else {
            this.log.warn(`${this.accessory.name} | CommunityTypes.FanOscilationMode is not defined.`);
        }

        this.getOrAddCharacteristic(this.airPurifierSvc, this.Characteristic.StatusTampered, {
            preReqChk: (acc) => acc.hasCapability("TamperAlert"),
            getHandler: function () {
                const isTampered = this.deviceData.attributes.tamper === "detected";
                accessory.log.debug(`${this.accessory.name} | Status Tampered Retrieved: ${isTampered}`);
                return isTampered;
            },
            removeIfMissingPreReq: true,
        });

        this.accessory.deviceGroups.push("air_purifier");
    }

    /**
     * Handles updates to device attributes and updates the corresponding characteristics of the Air Purifier service.
     *
     * @param {Object} change - The object containing the attribute change information.
     * @param {string} change.attribute - The name of the attribute that has changed.
     * @param {string} change.value - The new value of the attribute.
     *
     * @returns {void}
     */
    handleAttributeUpdate(change) {
        if (!this.airPurifierSvc) {
            this.log.warn(`${this.accessory.name} | Air Purifier service not found`);
            return;
        }

        switch (change.attribute) {
            case "switch":
                const isActive = change.value === "on";
                this.updateCharacteristicValue(this.airPurifierSvc, this.Characteristic.Active, isActive ? this.Characteristic.Active.ACTIVE : this.Characteristic.Active.INACTIVE);
                this.updateCharacteristicValue(this.airPurifierSvc, this.Characteristic.CurrentAirPurifierState, isActive ? this.Characteristic.CurrentAirPurifierState.PURIFYING_AIR : this.Characteristic.CurrentAirPurifierState.INACTIVE);
                // accessory.log.debug(`${accessory.name} | Updated Active: ${isActive} and CurrentAirPurifierState: ${isActive ? "PURIFYING_AIR" : "INACTIVE"}`);
                break;
            case "fanMode":
                if (CommunityTypes && CommunityTypes.FanOscilationMode) {
                    this.updateCharacteristicValue(this.airPurifierSvc, CommunityTypes.FanOscilationMode, this.convertFanMode(change.value));
                }
                break;
            case "tamper":
                if (this.accessory.hasCapability("TamperAlert")) {
                    this.updateCharacteristicValue(this.airPurifierSvc, this.Characteristic.StatusTampered, change.value === "detected");
                }
                break;
            default:
                accessory.log.debug(`${this.accessory.name} | Unhandled attribute update: ${change.attribute}`);
        }
    }

    /**
     * Converts a given fan mode string to the corresponding CommunityTypes.FanOscilationMode.
     *
     * @param {string} mode - The fan mode to convert. Expected values are "low", "medium", "high", or "sleep".
     * @returns {CommunityTypes.FanOscilationMode} - The corresponding FanOscilationMode for the given mode.
     * If the mode is unsupported, logs a warning and returns the default mode (SLEEP).
     */
    convertFanMode(mode) {
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
                this.log.warn(`${accessory.name} | Unsupported fan mode: ${mode}`);
                return CommunityTypes.FanOscilationMode.SLEEP; // Default mode
        }
    }

    /**
     * Converts a given fan mode to a device-specific mode string.
     *
     * @param {CommunityTypes.FanOscilationMode} mode - The fan mode to convert.
     * @returns {string} The corresponding device-specific mode string.
     */
    convertFanModeToDevice(mode) {
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
     * Converts the air purifier state from a string to the corresponding HomeKit characteristic.
     *
     * @param {string} state - The current state of the air purifier. Possible values are "purifying", "idle", and "inactive".
     * @returns {number} - The corresponding HomeKit characteristic for the air purifier state.
     */
    convertAirPurifierState(state) {
        this.log.debug(`${this.accessory.name} | Air Purifier State: ${state}`);
        switch (state) {
            case "purifying":
                return this.Characteristic.CurrentAirPurifierState.PURIFYING_AIR;
            case "idle":
                return this.Characteristic.CurrentAirPurifierState.IDLE;
            case "inactive":
            default:
                return this.Characteristic.CurrentAirPurifierState.INACTIVE;
        }
    }
}

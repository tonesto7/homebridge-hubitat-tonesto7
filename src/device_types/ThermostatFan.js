import HubitatAccessory from "../HubitatAccessory.js";

export default class ThermostatFan extends HubitatAccessory {
    constructor(platform, accessory) {
        super(platform, accessory);
        this.deviceData = accessory.context.deviceData;
    }

    static relevantAttributes = ["thermostatFanMode"];

    /**
     * Initializes the thermostat fan service and its characteristics.
     *
     * This method sets up the Fanv2 service and adds the following characteristics:
     * - Active: Retrieves and sets the active state of the thermostat fan.
     * - CurrentFanState: Retrieves the current state of the thermostat fan.
     * - TargetFanState: Retrieves and sets the target state of the thermostat fan.
     *
     * The method also adds the thermostat fan to the accessory's device groups.
     *
     * @async
     * @method initializeService
     * @returns {Promise<void>} A promise that resolves when the service is initialized.
     */
    async initializeService() {
        this.fanV2Svc = this.getOrAddService(this.Service.Fanv2);

        this.getOrAddCharacteristic(this.fanV2Svc, this.Characteristic.Active, {
            getHandler: () => {
                const mode = this.deviceData.attributes.thermostatFanMode;
                const activeState = this.convertFanModeToActive(mode);
                this.log.debug(`${this.accessory.displayName} | Thermostat Fan Active State Retrieved: ${activeState}`);
                return activeState;
            },
            setHandler: (value) => {
                const mode = value === this.Characteristic.Active.ACTIVE ? "on" : "auto";
                this.log.info(`${this.accessory.displayName} | Setting thermostat fan mode to ${mode}`);
                this.sendCommand(null, this.deviceData, mode === "on" ? "fanOn" : "fanAuto");
            },
        });

        this.getOrAddCharacteristic(this.fanV2Svc, this.Characteristic.CurrentFanState, {
            getHandler: () => {
                const mode = this.deviceData.attributes.thermostatFanMode;
                const currentState = this.convertFanModeToCurrentState(mode);
                this.log.debug(`${this.accessory.displayName} | Thermostat Fan Current State Retrieved: ${currentState}`);
                return currentState;
            },
        });

        this.getOrAddCharacteristic(this.fanV2Svc, this.Characteristic.TargetFanState, {
            getHandler: () => {
                const mode = this.deviceData.attributes.thermostatFanMode;
                const targetState = mode === "auto" ? this.Characteristic.TargetFanState.AUTO : this.Characteristic.TargetFanState.MANUAL;
                this.log.debug(`${this.accessory.displayName} | Thermostat Fan Target State Retrieved: ${targetState}`);
                return targetState;
            },
            setHandler: (value) => {
                const mode = this.convertTargetFanState(value);
                this.log.info(`${this.accessory.displayName} | Setting thermostat fan mode to ${mode}`);
                this.sendCommand(null, this.deviceData, mode === "on" ? "fanOn" : "fanAuto");
            },
        });

        this.accessory.deviceGroups.push("thermostat_fan");
    }

    /**
     * Handles updates to thermostat fan attributes.
     *
     * @param {Object} change - The change object containing attribute updates.
     * @param {string} change.attribute - The name of the attribute that has changed.
     * @param {string} change.value - The new value of the attribute.
     *
     * @returns {void}
     */
    handleAttributeUpdate(change) {
        if (!this.fanV2Svc) {
            this.log.warn(`${this.accessory.displayName} | Thermostat Fan service not found`);
            return;
        }

        if (change.attribute === "thermostatFanMode") {
            const activeState = this.convertFanModeToActive(change.value);
            const currentState = this.convertFanModeToCurrentState(change.value);
            const targetState = change.value === "auto" ? this.Characteristic.TargetFanState.AUTO : this.Characteristic.TargetFanState.MANUAL;
            this.updateCharacteristicValue(this.fanV2Svc, this.Characteristic.Active, activeState);
            this.updateCharacteristicValue(this.fanV2Svc, this.Characteristic.CurrentFanState, currentState);
            this.updateCharacteristicValue(this.fanV2Svc, this.Characteristic.TargetFanState, targetState);
        } else {
            this.log.debug(`${this.accessory.displayName} | Unhandled attribute update: ${change.attribute}`);
        }
    }

    /**
     * Converts the fan mode to the corresponding active state.
     *
     * @param {string} mode - The fan mode, expected to be either "auto" or another mode.
     * @returns {number} - Returns `this.Characteristic.Active.ACTIVE` if the mode is not "auto",
     *                     otherwise returns `this.Characteristic.Active.INACTIVE`.
     */
    convertFanModeToActive(mode) {
        return mode !== "auto" ? this.Characteristic.Active.ACTIVE : this.Characteristic.Active.INACTIVE;
    }

    /**
     * Converts the fan mode to the current fan state.
     *
     * @param {string} mode - The mode of the fan, expected to be either "on" or another value.
     * @returns {number} - The current fan state, either BLOWING_AIR or IDLE.
     */
    convertFanModeToCurrentState(mode) {
        return mode === "on" ? this.Characteristic.CurrentFanState.BLOWING_AIR : this.Characteristic.CurrentFanState.IDLE;
    }

    /**
     * Converts the target fan state value to a corresponding string representation.
     *
     * @param {number} value - The target fan state value to convert.
     * @returns {string} - Returns "auto" if the value is equal to TargetFanState.AUTO, otherwise returns "on".
     */
    convertTargetFanState(value) {
        return value === this.Characteristic.TargetFanState.AUTO ? "auto" : "on";
    }
}

import HubitatAccessory from "../HubitatAccessory.js";

export default class Valve extends HubitatAccessory {
    constructor(platform, accessory) {
        super(platform, accessory);
        this.deviceData = accessory.context.deviceData;
    }

    static relevantAttributes = ["valve"];

    /**
     * Initializes the valve service for the accessory.
     *
     * This method sets up the Valve service and its characteristics:
     * - Active: Retrieves and sets the active state of the valve.
     * - InUse: Retrieves the in-use state of the valve.
     * - ValveType: Sets the valve type to a generic valve.
     *
     * It also adds the valve to the accessory's device groups.
     *
     * @async
     * @function initializeService
     * @returns {Promise<void>} A promise that resolves when the service is initialized.
     */
    async initializeService() {
        this.valveSvc = this.getOrAddService(this.Service.Valve);

        this.getOrAddCharacteristic(this.valveSvc, this.Characteristic.Active, {
            getHandler: () => {
                const isActive = this.convertValveState(this.deviceData.attributes.valve);
                this.log.debug(`${this.accessory.displayName} | Valve Active State Retrieved: ${isActive}`);
                return isActive;
            },
            setHandler: (value) => {
                const command = value === this.Characteristic.Active.ACTIVE ? "open" : "close";
                this.log.info(`${this.accessory.displayName} | Setting valve state via command: ${command}`);
                this.sendCommand(null, this.deviceData, command);
            },
        });

        this.getOrAddCharacteristic(this.valveSvc, this.Characteristic.InUse, {
            getHandler: () => {
                const inUse = this.convertInUseState(this.deviceData.attributes.valve);
                this.log.debug(`${this.accessory.displayName} | Valve InUse State Retrieved: ${inUse}`);
                return inUse;
            },
        });

        this.getOrAddCharacteristic(this.valveSvc, this.Characteristic.ValveType, {
            value: this.Characteristic.ValveType.GENERIC_VALVE,
        });

        this.accessory.deviceGroups.push("valve");
    }

    /**
     * Handles updates to device attributes and updates the corresponding HomeKit characteristics.
     *
     * @param {Object} change - The change object containing attribute updates.
     * @param {string} change.attribute - The name of the attribute that has changed.
     * @param {any} change.value - The new value of the attribute.
     */
    handleAttributeUpdate(change) {
        if (!this.valveSvc) {
            this.log.warn(`${this.accessory.displayName} | Valve service not found`);
            return;
        }

        if (change.attribute === "valve") {
            const isActive = this.convertValveState(change.value);
            const inUse = this.convertInUseState(change.value);
            this.updateCharacteristicValue(this.valveSvc, this.Characteristic.Active, isActive);
            this.updateCharacteristicValue(this.valveSvc, this.Characteristic.InUse, inUse);
        } else {
            this.log.debug(`${this.accessory.displayName} | Unhandled attribute update: ${change.attribute}`);
        }
    }

    /**
     * Converts the valve state to the corresponding HomeKit characteristic value.
     *
     * @param {string} state - The state of the valve, expected to be "open" or "closed".
     * @returns {number} - Returns `this.Characteristic.Active.ACTIVE` if the state is "open",
     *                     otherwise returns `this.Characteristic.Active.INACTIVE`.
     */
    convertValveState(state) {
        return state === "open" ? this.Characteristic.Active.ACTIVE : this.Characteristic.Active.INACTIVE;
    }

    /**
     * Converts the valve state to the corresponding InUse characteristic.
     *
     * @param {string} state - The current state of the valve, expected to be "open" or other.
     * @returns {number} - Returns the InUse characteristic value: IN_USE if the state is "open", otherwise NOT_IN_USE.
     */
    convertInUseState(state) {
        return state === "open" ? this.Characteristic.InUse.IN_USE : this.Characteristic.InUse.NOT_IN_USE;
    }
}

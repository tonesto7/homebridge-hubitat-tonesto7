import HubitatAccessory from "../HubitatAccessory.js";

export default class Valve extends HubitatAccessory {
    constructor(platform, accessory) {
        super(platform, accessory);
        this.deviceData = accessory.context.deviceData;
        this.relevantAttributes = ["valve"];
    }

    static isSupported(accessory) {
        return accessory.hasCapability("Valve");
    }

    initializeService() {
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
                this.sendCommand(null, this.accessory, this.deviceData, command);
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

        this.accessory.context.deviceGroups.push("valve");
    }

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

    convertValveState(state) {
        return state === "open" ? this.Characteristic.Active.ACTIVE : this.Characteristic.Active.INACTIVE;
    }

    convertInUseState(state) {
        return state === "open" ? this.Characteristic.InUse.IN_USE : this.Characteristic.InUse.NOT_IN_USE;
    }
}

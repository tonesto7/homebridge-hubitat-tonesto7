import HubitatAccessory from "../HubitatAccessory.js";

export default class ThermostatFan extends HubitatAccessory {
    constructor(platform, accessory) {
        super(platform, accessory);
        this.deviceData = accessory.context.deviceData;
        this.relevantAttributes = ["thermostatFanMode"];
    }

    static isSupported(accessory) {
        return accessory.hasCapability("Thermostat") && accessory.hasAttribute("thermostatFanMode") && accessory.hasCommand("fanAuto") && accessory.hasCommand("fanOn");
    }

    initializeService() {
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
                this.sendCommand(null, this.accessory, this.deviceData, mode === "on" ? "fanOn" : "fanAuto");
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
                this.sendCommand(null, this.accessory, this.deviceData, mode === "on" ? "fanOn" : "fanAuto");
            },
        });

        this.accessory.context.deviceGroups.push("thermostat_fan");
    }

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

    convertFanModeToActive(mode) {
        return mode !== "auto" ? this.Characteristic.Active.ACTIVE : this.Characteristic.Active.INACTIVE;
    }

    convertFanModeToCurrentState(mode) {
        return mode === "on" ? this.Characteristic.CurrentFanState.BLOWING_AIR : this.Characteristic.CurrentFanState.IDLE;
    }

    convertTargetFanState(value) {
        return value === this.Characteristic.TargetFanState.AUTO ? "auto" : "on";
    }
}

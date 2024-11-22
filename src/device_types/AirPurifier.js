// device_types/AirPurifier.js

import HubitatBaseAccessory from "./BaseAccessory.js";

export default class AirPurifier extends HubitatBaseAccessory {
    constructor(platform, accessory) {
        super(platform, accessory);
        this.config = platform.config;
        this.airPurifierService = null;
    }

    static relevantAttributes = ["switch", "fanMode", "tamper"];

    async configureServices() {
        try {
            this.airPurifierService = this.getOrAddService(this.CommunityTypes.NewAirPurifierService, this.cleanServiceDisplayName(this.deviceData.name, "Air Purifier"));

            // Active State (On/Off)
            this.getOrAddCharacteristic(this.airPurifierService, this.Characteristic.Active, {
                getHandler: () => (this.deviceData.attributes.switch === "on" ? this.Characteristic.Active.ACTIVE : this.Characteristic.Active.INACTIVE),
                setHandler: async (value) => {
                    const cmd = value === this.Characteristic.Active.ACTIVE ? "on" : "off";
                    await this.sendCommand(cmd);
                },
            });

            // Current Air Purifier State
            this.getOrAddCharacteristic(this.airPurifierService, this.Characteristic.CurrentAirPurifierState, {
                getHandler: () => {
                    const state = this.deviceData.attributes.switch === "on" ? "purifying" : "inactive";
                    return this.convertAirPurifierState(state);
                },
            });

            // Fan oscillation mode
            this.getOrAddCharacteristic(this.airPurifierService, this.CommunityTypes.FanOscilationMode, {
                getHandler: () => this.convertFanMode(this.deviceData.attributes.fanMode),
                setHandler: async (value) => {
                    const cmd = this.convertFanModeToDevice(value);
                    await this.sendCommand("setFanMode", cmd);
                },
            });

            // Tampered
            if (this.hasCapability("TamperAlert")) {
                this.getOrAddCharacteristic(this.airPurifierService, this.Characteristic.StatusTampered, {
                    getHandler: () => (this.deviceData.attributes.tamper === "detected" ? this.Characteristic.StatusTampered.TAMPERED : this.Characteristic.StatusTampered.NOT_TAMPERED),
                });
            }

            return true;
        } catch (error) {
            this.logError(`AirPurifier | ${this.deviceData.name} | Error configuring services:`, error);
            throw error;
        }
    }

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

    async handleAttributeUpdate(change) {
        const { attribute, value } = change;

        switch (attribute) {
            case "switch":
                const activeState = value === "on" ? this.Characteristic.Active.ACTIVE : this.Characteristic.Active.INACTIVE;
                this.airPurifierService.getCharacteristic(this.Characteristic.Active).updateValue(activeState);
                this.airPurifierService.getCharacteristic(this.Characteristic.CurrentAirPurifierState).updateValue(activeState ? this.Characteristic.CurrentAirPurifierState.PURIFYING_AIR : this.Characteristic.CurrentAirPurifierState.INACTIVE);
                break;

            case "fanMode":
                this.airPurifierService.getCharacteristic(this.CommunityTypes.FanOscilationMode).updateValue(this.convertFanMode(value));
                break;

            case "tamper":
                if (!this.hasCapability("TamperAlert")) return;

                this.airPurifierService.getCharacteristic(this.Characteristic.StatusTampered).updateValue(value === "detected" ? this.Characteristic.StatusTampered.TAMPERED : this.Characteristic.StatusTampered.NOT_TAMPERED);
                break;

            default:
                this.logDebug(`AirPurifier | ${this.deviceData.name} | Unhandled attribute update: ${attribute} = ${value}`);
        }
    }

    // Override cleanup
    async cleanup() {
        this.airPurifierService = null;
        super.cleanup();
    }
}

// device_types/AirPurifier.js

import CommunityTypes from "../libs/CommunityTypes.js";
import HubitatAccessory from "../HubitatAccessory.js";

export default class Button extends HubitatAccessory {
    constructor(platform, accessory) {
        super(platform, accessory);
        this.deviceData = accessory.context.deviceData;
        this.relevantAttributes = ["switch", "fanMode", "tamper"];
    }

    initializeService() {
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

        this.accessory.context.deviceGroups.push("air_purifier");
    }

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
}

// device_types/AirPurifier.js

import HubitatPlatformAccessory from "../HubitatPlatformAccessory.js";

export default class AirPurifier extends HubitatPlatformAccessory {
    constructor(platform, accessory) {
        super(platform, accessory);
        this.airPurifierService = null;
    }

    async configureServices() {
        try {
            this.airPurifierService = this.getOrAddService(this.Service.AirPurifier);
            this.markServiceForRetention(this.airPurifierService);

            // Active State (On/Off)
            this.getOrAddCharacteristic(this.airPurifierService, this.Characteristic.Active, {
                getHandler: () => this.getActiveState(),
                setHandler: async (value) => this.setActiveState(value),
            });

            // Current Air Purifier State
            this.getOrAddCharacteristic(this.airPurifierService, this.Characteristic.CurrentAirPurifierState, {
                getHandler: () => this.getCurrentState(),
            });

            // Target Air Purifier State
            this.getOrAddCharacteristic(this.airPurifierService, this.Characteristic.TargetAirPurifierState, {
                getHandler: () => this.getTargetState(),
                setHandler: async (value) => this.setTargetState(value),
            });

            // Rotation Speed if supported
            if (this.hasAttribute("speed") || this.hasAttribute("level")) {
                this.getOrAddCharacteristic(this.airPurifierService, this.Characteristic.RotationSpeed, {
                    getHandler: () => this.getRotationSpeed(),
                    setHandler: async (value) => this.setRotationSpeed(value),
                    props: {
                        minStep: 1,
                        minValue: 0,
                        maxValue: 100,
                    },
                });
            }

            // Optional Air Quality monitoring if supported
            if (this.hasCapability("AirQuality")) {
                this.getOrAddCharacteristic(this.airPurifierService, this.Characteristic.AirQuality, {
                    getHandler: () => this.getAirQuality(),
                });
            }

            // Optional Filter characteristics if supported
            if (this.hasAttribute("filterStatus")) {
                this.configureFilterCharacteristics();
            }

            return true;
        } catch (error) {
            this.logError("Error configuring air purifier services:", error);
            throw error;
        }
    }

    configureFilterCharacteristics() {
        // Filter Change Indication
        this.getOrAddCharacteristic(this.airPurifierService, this.Characteristic.FilterChangeIndication, {
            getHandler: () => this.getFilterChangeIndication(),
        });

        // Filter Life Level
        this.getOrAddCharacteristic(this.airPurifierService, this.Characteristic.FilterLifeLevel, {
            getHandler: () => this.getFilterLifeLevel(),
        });
    }

    // State Handlers
    getActiveState() {
        return this.deviceData.attributes.switch === "on" ? this.Characteristic.Active.ACTIVE : this.Characteristic.Active.INACTIVE;
    }

    async setActiveState(value) {
        await this.sendCommand(value === this.Characteristic.Active.ACTIVE ? "on" : "off");
    }

    getCurrentState() {
        if (this.deviceData.attributes.switch !== "on") {
            return this.Characteristic.CurrentAirPurifierState.INACTIVE;
        }
        return this.deviceData.attributes.fanSpeed > 0 ? this.Characteristic.CurrentAirPurifierState.PURIFYING_AIR : this.Characteristic.CurrentAirPurifierState.IDLE;
    }

    getTargetState() {
        return this.deviceData.attributes.autoMode === "on" ? this.Characteristic.TargetAirPurifierState.AUTO : this.Characteristic.TargetAirPurifierState.MANUAL;
    }

    async setTargetState(value) {
        await this.sendCommand("setAutoMode", {
            value1: value === this.Characteristic.TargetAirPurifierState.AUTO ? "on" : "off",
        });
    }

    // Speed Control
    getRotationSpeed() {
        if (this.deviceData.attributes.switch !== "on") return 0;
        return this.hasAttribute("speed") ? parseInt(this.deviceData.attributes.speed) : parseInt(this.deviceData.attributes.level);
    }

    async setRotationSpeed(value) {
        const command = this.hasAttribute("speed") ? "setSpeed" : "setLevel";
        await this.sendCommand(command, { value1: parseInt(value) });
    }

    // Air Quality
    getAirQuality() {
        const aqi = parseInt(this.deviceData.attributes.airQuality);

        if (aqi <= 50) return this.Characteristic.AirQuality.EXCELLENT;
        if (aqi <= 100) return this.Characteristic.AirQuality.GOOD;
        if (aqi <= 150) return this.Characteristic.AirQuality.FAIR;
        if (aqi <= 200) return this.Characteristic.AirQuality.INFERIOR;
        return this.Characteristic.AirQuality.POOR;
    }

    // Filter Status
    getFilterChangeIndication() {
        return this.deviceData.attributes.filterStatus === "replace" ? this.Characteristic.FilterChangeIndication.CHANGE_FILTER : this.Characteristic.FilterChangeIndication.FILTER_OK;
    }

    getFilterLifeLevel() {
        return parseInt(this.deviceData.attributes.filterLife) || 100;
    }

    async handleAttributeUpdate(attribute, value) {
        this.updateDeviceAttribute(attribute, value);
        switch (attribute) {
            case "switch":
                const activeState = value === "on" ? this.Characteristic.Active.ACTIVE : this.Characteristic.Active.INACTIVE;

                this.airPurifierService.getCharacteristic(this.Characteristic.Active).updateValue(activeState);

                this.airPurifierService.getCharacteristic(this.Characteristic.CurrentAirPurifierState).updateValue(this.getCurrentState());

                if (value === "off") {
                    // Update rotation speed to 0 when turned off
                    this.airPurifierService.getCharacteristic(this.Characteristic.RotationSpeed).updateValue(0);
                }
                break;

            case "speed":
            case "level":
                if (!this.hasAttribute(attribute)) return;

                this.airPurifierService.getCharacteristic(this.Characteristic.RotationSpeed).updateValue(parseInt(value));

                this.airPurifierService.getCharacteristic(this.Characteristic.CurrentAirPurifierState).updateValue(this.getCurrentState());
                break;

            case "autoMode":
                this.airPurifierService.getCharacteristic(this.Characteristic.TargetAirPurifierState).updateValue(value === "on" ? this.Characteristic.TargetAirPurifierState.AUTO : this.Characteristic.TargetAirPurifierState.MANUAL);
                break;

            case "airQuality":
                if (!this.hasCapability("AirQuality")) return;

                this.airPurifierService.getCharacteristic(this.Characteristic.AirQuality).updateValue(this.getAirQuality());
                break;

            case "filterStatus":
            case "filterLife":
                if (!this.hasAttribute("filterStatus")) return;

                if (attribute === "filterStatus") {
                    this.airPurifierService.getCharacteristic(this.Characteristic.FilterChangeIndication).updateValue(this.getFilterChangeIndication());
                }

                if (attribute === "filterLife") {
                    this.airPurifierService.getCharacteristic(this.Characteristic.FilterLifeLevel).updateValue(this.getFilterLifeLevel());
                }
                break;

            default:
                this.logDebug(`Unhandled attribute update: ${attribute} = ${value}`);
        }
    }

    // Override cleanup
    async cleanup() {
        this.airPurifierService = null;
        await super.cleanup();
    }
}

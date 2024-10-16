import HubitatAccessory from "../HubitatAccessory.js";

export default class Fan extends HubitatAccessory {
    constructor(platform, accessory) {
        super(platform, accessory);
        this.deviceData = accessory.context.deviceData;
        this.relevantAttributes = ["switch", "speed", "level"];
    }

    static isSupported(accessory) {
        return accessory.hasCapability("Fan") || accessory.hasCapability("FanControl") || (accessory.context.deviceData.name.toLowerCase().includes("fan") && accessory.platform.configItems.consider_fan_by_name !== false) || accessory.hasCommand("setSpeed") || accessory.hasAttribute("speed");
    }

    async initializeService() {
        this.fanSvc = this.getOrAddService(this.Service.Fanv2);

        this.getOrAddCharacteristic(this.fanSvc, this.Characteristic.Active, {
            preReqChk: () => this.hasAttribute("switch"),
            getHandler: () => {
                const isActive = this.deviceData.attributes.switch === "on" ? this.Characteristic.Active.ACTIVE : this.Characteristic.Active.INACTIVE;
                this.log.debug(`${this.accessory.displayName} | Fan Active State: ${isActive === this.Characteristic.Active.ACTIVE ? "Active" : "Inactive"}`);
                return isActive;
            },
            setHandler: (value) => {
                const state = value ? "on" : "off";
                this.log.info(`${this.accessory.displayName} | Setting fan state to ${state}`);
                this.sendCommand(null, this.accessory, this.deviceData, state);
            },
            removeIfMissingPreReq: true,
        });

        this.getOrAddCharacteristic(this.fanSvc, this.Characteristic.CurrentFanState, {
            preReqChk: () => this.hasAttribute("switch"),
            getHandler: () => {
                const currentState = this.deviceData.attributes.switch === "on" ? this.Characteristic.CurrentFanState.BLOWING_AIR : this.Characteristic.CurrentFanState.IDLE;
                this.log.debug(`${this.accessory.displayName} | Current Fan State: ${currentState === this.Characteristic.CurrentFanState.BLOWING_AIR ? "Blowing Air" : "Idle"}`);
                return currentState;
            },
            removeIfMissingPreReq: true,
        });

        // Rotation Speed
        let spdSteps = 1;
        if (this.hasDeviceFlag("fan_3_spd")) spdSteps = 33;
        if (this.hasDeviceFlag("fan_4_spd")) spdSteps = 25;
        if (this.hasDeviceFlag("fan_5_spd")) spdSteps = 20;

        const spdAttr = this.hasAttribute("speed") && this.hasCommand("setSpeed") ? "speed" : this.hasAttribute("level") ? "level" : undefined;

        this.getOrAddCharacteristic(this.fanSvc, this.Characteristic.RotationSpeed, {
            preReqChk: () => spdAttr !== undefined,
            props: { minStep: spdSteps, maxValue: 100, minValue: 0 },
            getHandler: () => {
                const speedLevel = this.deviceData.attributes[spdAttr];
                const rotationSpeed = this.fanSpeedToLevel(speedLevel);
                this.log.debug(`${this.accessory.displayName} | Current Rotation Speed: ${rotationSpeed}`);
                return rotationSpeed;
            },
            setHandler: (value) => {
                const clampedValue = this.clamp(value, 0, 100);
                const speed = this.fanSpeedConversion(clampedValue);
                this.log.info(`${this.accessory.displayName} | Setting fan speed to ${speed}`);
                this.sendCommand(null, this.accessory, this.deviceData, `set${spdAttr.charAt(0).toUpperCase() + spdAttr.slice(1)}`, { value1: speed });
            },
            removeIfMissingPreReq: true,
        });

        this.accessory.deviceGroups.push("fan");
    }

    handleAttributeUpdate(change) {
        if (!this.fanSvc) {
            this.log.warn(`${this.accessory.displayName} | Fan service not found`);
            return;
        }

        switch (change.attribute) {
            case "switch":
                const isActive = change.value === "on";
                this.updateCharacteristicValue(this.fanSvc, this.Characteristic.Active, isActive ? this.Characteristic.Active.ACTIVE : this.Characteristic.Active.INACTIVE);
                this.updateCharacteristicValue(this.fanSvc, this.Characteristic.CurrentFanState, isActive ? this.Characteristic.CurrentFanState.BLOWING_AIR : this.Characteristic.CurrentFanState.IDLE);
                break;
            case "speed":
            case "level":
                const rotationSpeed = this.fanSpeedToLevel(change.value);
                this.updateCharacteristicValue(this.fanSvc, this.Characteristic.RotationSpeed, rotationSpeed);
                break;
            default:
                this.log.debug(`${this.accessory.displayName} | Unhandled attribute update: ${change.attribute}`);
        }
    }

    fanSpeedConversion(speedVal) {
        if (speedVal <= 0) return "off";
        if (speedVal <= 20) return "low";
        if (speedVal <= 40) return "medium-low";
        if (speedVal <= 60) return "medium";
        if (speedVal <= 80) return "medium-high";
        return "high";
    }

    fanSpeedToLevel(speedVal) {
        switch (speedVal) {
            case "off":
                return 0;
            case "low":
                return 33;
            case "medium-low":
                return 40;
            case "medium":
                return 66;
            case "medium-high":
                return 80;
            case "high":
                return 100;
            default:
                return 0;
        }
    }
}

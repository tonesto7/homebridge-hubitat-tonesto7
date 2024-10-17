import HubitatAccessory from "../HubitatAccessory.js";

export default class LeakSensor extends HubitatAccessory {
    constructor(platform, accessory) {
        super(platform, accessory);
        this.deviceData = accessory.context.deviceData;
    }

    static relevantAttributes = ["water", "status", "tamper"];

    async initializeService() {
        this.leakSensorSvc = this.getOrAddService(this.Service.LeakSensor);

        this.getOrAddCharacteristic(this.leakSensorSvc, this.Characteristic.LeakDetected, {
            getHandler: () => {
                const leak = this.convertWaterStatus(this.deviceData.attributes.water);
                this.log.debug(`${this.accessory.displayName} | Leak Detected Retrieved: ${leak}`);
                return leak;
            },
        });

        this.getOrAddCharacteristic(this.leakSensorSvc, this.Characteristic.StatusActive, {
            getHandler: () => {
                const isActive = this.deviceData.status === "ACTIVE";
                this.log.debug(`${this.accessory.displayName} | Water Sensor Status Active Retrieved: ${isActive}`);
                return isActive;
            },
        });

        this.getOrAddCharacteristic(this.leakSensorSvc, this.Characteristic.StatusTampered, {
            preReqChk: () => this.hasCapability("TamperAlert"),
            getHandler: () => {
                const isTampered = this.deviceData.attributes.tamper === "detected";
                this.log.debug(`${this.accessory.displayName} | Water Sensor Status Tampered Retrieved: ${isTampered}`);
                return isTampered;
            },
            removeIfMissingPreReq: true,
        });

        this.accessory.deviceGroups.push("leak_sensor");
    }

    handleAttributeUpdate(change) {
        if (!this.leakSensorSvc) {
            this.log.warn(`${this.accessory.displayName} | Leak Sensor service not found`);
            return;
        }

        switch (change.attribute) {
            case "water":
                const leakDetected = this.convertWaterStatus(change.value);
                this.updateCharacteristicValue(this.leakSensorSvc, this.Characteristic.LeakDetected, leakDetected);
                this.log.debug(`${this.accessory.displayName} | Updated Leak Detected: ${leakDetected}`);
                break;
            case "status":
                const isActive = change.value === "ACTIVE";
                this.updateCharacteristicValue(this.leakSensorSvc, this.Characteristic.StatusActive, isActive);
                this.log.debug(`${this.accessory.displayName} | Updated Status Active: ${isActive}`);
                break;
            case "tamper":
                if (this.hasCapability("TamperAlert")) {
                    const isTampered = change.value === "detected";
                    this.updateCharacteristicValue(this.leakSensorSvc, this.Characteristic.StatusTampered, isTampered);
                    this.log.debug(`${this.accessory.displayName} | Updated Status Tampered: ${isTampered}`);
                }
                break;
            default:
                this.log.debug(`${this.accessory.displayName} | Unhandled attribute update: ${change.attribute}`);
        }
    }

    convertWaterStatus(status) {
        return status === "dry" ? this.Characteristic.LeakDetected.LEAK_NOT_DETECTED : this.Characteristic.LeakDetected.LEAK_DETECTED;
    }
}

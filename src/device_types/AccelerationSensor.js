// device_types/acceleration_sensor.js

import HubitatAccessory from "../HubitatAccessory.js";

export default class AccelerationSensor extends HubitatAccessory {
    constructor(platform, accessory) {
        super(platform, accessory);
        this.deviceData = accessory.context.deviceData;
        this.relevantAttributes = ["acceleration", "tamper", "status"];
    }

    static isSupported(accessory) {
        return accessory.hasCapability("AccelerationSensor");
    }

    initializeService() {
        this.motionSvc = this.getOrAddService(this.Service.MotionSensor);

        // Motion Detected Characteristic
        this.getOrAddCharacteristic(this.motionSvc, this.Characteristic.MotionDetected, {
            getHandler: () => {
                const motionDetected = this.deviceData.attributes.acceleration === "active";
                this.log.debug(`${this.accessory.displayName} | Motion Detected Retrieved: ${motionDetected}`);
                return motionDetected;
            },
        });

        // Status Active Characteristic
        this.getOrAddCharacteristic(this.motionSvc, this.Characteristic.StatusActive, {
            getHandler: () => {
                const isActive = this.deviceData.status === "ACTIVE";
                this.log.debug(`${this.accessory.displayName} | Status Active Retrieved: ${isActive}`);
                return isActive;
            },
        });

        // Status Tampered Characteristic (if supported)
        this.getOrAddCharacteristic(this.motionSvc, this.Characteristic.StatusTampered, {
            preReqChk: () => this.hasCapability("TamperAlert"),
            getHandler: () => {
                const isTampered = this.deviceData.attributes.tamper === "detected";
                this.log.debug(`${this.accessory.displayName} | Status Tampered Retrieved: ${isTampered}`);
                return isTampered;
            },
            removeIfMissingPreReq: true,
        });

        this.accessory.context.deviceGroups.push("acceleration_sensor");
    }

    handleAttributeUpdate(change) {
        if (!this.motionSvc) {
            this.log.warn(`${this.accessory.displayName} | Motion Sensor service not found`);
            return;
        }

        switch (change.attribute) {
            case "acceleration":
                this.updateCharacteristicValue(this.motionSvc, this.Characteristic.MotionDetected, change.value === "active");
                break;
            case "tamper":
                if (this.hasCapability("TamperAlert")) {
                    this.updateCharacteristicValue(this.motionSvc, this.Characteristic.StatusTampered, change.value === "detected");
                }
                break;
            case "status":
                this.updateCharacteristicValue(this.motionSvc, this.Characteristic.StatusActive, change.value === "ACTIVE");
                break;
            default:
                this.log.debug(`${this.accessory.displayName} | Unhandled attribute update: ${change.attribute}`);
        }
    }
}

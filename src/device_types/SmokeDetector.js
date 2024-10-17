import HubitatAccessory from "../HubitatAccessory.js";

export default class SmokeDetector extends HubitatAccessory {
    constructor(platform, accessory) {
        super(platform, accessory);
        this.deviceData = accessory.context.deviceData;
    }

    static relevantAttributes = ["smoke", "status", "tamper"];

    async initializeService() {
        this.smokeSensorSvc = this.getOrAddService(this.Service.SmokeSensor);

        this.getOrAddCharacteristic(this.smokeSensorSvc, this.Characteristic.SmokeDetected, {
            getHandler: () => {
                const smoke = this.convertSmokeStatus(this.deviceData.attributes.smoke);
                this.log.debug(`${this.accessory.displayName} | Smoke Detected Retrieved: ${smoke}`);
                return smoke;
            },
        });

        this.getOrAddCharacteristic(this.smokeSensorSvc, this.Characteristic.StatusActive, {
            getHandler: () => {
                const isActive = this.deviceData.status === "ACTIVE";
                this.log.debug(`${this.accessory.displayName} | Smoke Detector Status Active Retrieved: ${isActive}`);
                return isActive;
            },
        });

        this.getOrAddCharacteristic(this.smokeSensorSvc, this.Characteristic.StatusTampered, {
            preReqChk: () => this.hasCapability("TamperAlert"),
            getHandler: () => {
                const isTampered = this.deviceData.attributes.tamper === "detected";
                this.log.debug(`${this.accessory.displayName} | Smoke Detector Status Tampered Retrieved: ${isTampered}`);
                return isTampered;
            },
            removeIfMissingPreReq: true,
        });

        this.accessory.deviceGroups.push("smoke_detector");
    }

    handleAttributeUpdate(change) {
        if (!this.smokeSensorSvc) {
            this.log.warn(`${this.accessory.displayName} | Smoke Sensor service not found`);
            return;
        }

        switch (change.attribute) {
            case "smoke": {
                const smokeDetected = this.convertSmokeStatus(change.value);
                this.updateCharacteristicValue(this.smokeSensorSvc, this.Characteristic.SmokeDetected, smokeDetected);
                break;
            }
            case "status": {
                const isActive = change.value === "ACTIVE";
                this.updateCharacteristicValue(this.smokeSensorSvc, this.Characteristic.StatusActive, isActive);
                break;
            }
            case "tamper": {
                if (this.hasCapability("TamperAlert")) {
                    const isTampered = change.value === "detected";
                    this.updateCharacteristicValue(this.smokeSensorSvc, this.Characteristic.StatusTampered, isTampered);
                }
                break;
            }
            default:
                this.log.debug(`${this.accessory.displayName} | Unhandled attribute update: ${change.attribute}`);
        }
    }

    convertSmokeStatus(smokeStatus) {
        return smokeStatus === "clear" ? this.Characteristic.SmokeDetected.SMOKE_NOT_DETECTED : this.Characteristic.SmokeDetected.SMOKE_DETECTED;
    }
}

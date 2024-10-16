import HubitatAccessory from "../HubitatAccessory.js";

export default class PresenceSensor extends HubitatAccessory {
    constructor(platform, accessory) {
        super(platform, accessory);
        this.deviceData = accessory.context.deviceData;
        this.relevantAttributes = ["presence", "status", "tamper"];
    }

    static isSupported(accessory) {
        return accessory.hasCapability("PresenceSensor");
    }

    initializeService() {
        this.occupancySvc = this.getOrAddService(this.Service.OccupancySensor);

        this.getOrAddCharacteristic(this.occupancySvc, this.Characteristic.OccupancyDetected, {
            getHandler: () => {
                const occupancy = this.convertPresence(this.deviceData.attributes.presence);
                this.log.debug(`${this.accessory.displayName} | Occupancy Detected Retrieved: ${occupancy}`);
                return occupancy;
            },
        });

        this.getOrAddCharacteristic(this.occupancySvc, this.Characteristic.StatusActive, {
            getHandler: () => {
                const isActive = this.deviceData.status === "ACTIVE";
                this.log.debug(`${this.accessory.displayName} | Presence Sensor Status Active Retrieved: ${isActive}`);
                return isActive;
            },
        });

        this.getOrAddCharacteristic(this.occupancySvc, this.Characteristic.StatusTampered, {
            preReqChk: () => this.hasCapability("TamperAlert"),
            getHandler: () => {
                const isTampered = this.deviceData.attributes.tamper === "detected";
                this.log.debug(`${this.accessory.displayName} | Presence Sensor Status Tampered Retrieved: ${isTampered}`);
                return isTampered;
            },
            removeIfMissingPreReq: true,
        });

        this.accessory.context.deviceGroups.push("presence_sensor");
    }

    handleAttributeUpdate(change) {
        if (!this.occupancySvc) {
            this.log.warn(`${this.accessory.displayName} | Occupancy Sensor service not found`);
            return;
        }

        switch (change.attribute) {
            case "presence":
                const occupancy = this.convertPresence(change.value);
                this.updateCharacteristicValue(this.occupancySvc, this.Characteristic.OccupancyDetected, occupancy);
                break;
            case "status":
                const isActive = change.value === "ACTIVE";
                this.updateCharacteristicValue(this.occupancySvc, this.Characteristic.StatusActive, isActive);
                break;
            case "tamper":
                if (this.hasCapability("TamperAlert")) {
                    const isTampered = change.value === "detected";
                    this.updateCharacteristicValue(this.occupancySvc, this.Characteristic.StatusTampered, isTampered);
                }
                break;
            default:
                this.log.debug(`${this.accessory.displayName} | Unhandled attribute update: ${change.attribute}`);
        }
    }

    convertPresence(presence) {
        return presence === "present" ? this.Characteristic.OccupancyDetected.OCCUPANCY_DETECTED : this.Characteristic.OccupancyDetected.OCCUPANCY_NOT_DETECTED;
    }
}

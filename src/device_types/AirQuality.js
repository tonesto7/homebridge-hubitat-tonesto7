import HubitatAccessory from "../HubitatAccessory.js";

export default class AirQualitySensor extends HubitatAccessory {
    constructor(platform, accessory) {
        super(platform, accessory);
        this.deviceData = accessory.context.deviceData;
    }

    /**
     * @constant {string[]} relevantAttributes - An array of relevant attribute names for the AirQuality device type.
     * @property {string} airQualityIndex - The air quality index attribute.
     * @property {string} battery - The battery level attribute.
     * @property {string} pm25 - The PM2.5 particle concentration attribute.
     * @property {string} tamper - The tamper status attribute.
     * @property {string} status - The general status attribute.
     */
    static relevantAttributes = ["airQualityIndex", "battery", "pm25", "tamper", "status"];

    /**
     * Initializes the air quality service for the accessory.
     *
     * This method sets up various characteristics for the air quality sensor, including:
     * - Status Fault
     * - Status Active
     * - Air Quality
     * - Status Low Battery
     * - PM2.5 Density (if available)
     * - Status Tampered (if supported)
     *
     * It also adds the air quality service to the accessory's device groups.
     *
     * @async
     * @method initializeService
     * @returns {Promise<void>} A promise that resolves when the service is initialized.
     */
    async initializeService() {
        this.airQualitySvc = this.getOrAddService(this.Service.AirQualitySensor);

        // Status Fault
        this.getOrAddCharacteristic(this.airQualitySvc, this.Characteristic.StatusFault, {
            getHandler: () => this.Characteristic.StatusFault.NO_FAULT,
        });

        // Status Active
        this.getOrAddCharacteristic(this.airQualitySvc, this.Characteristic.StatusActive, {
            getHandler: () => this.deviceData.status === "ACTIVE",
        });

        // Air Quality
        this.getOrAddCharacteristic(this.airQualitySvc, this.Characteristic.AirQuality, {
            getHandler: () => {
                const aqi = this.deviceData.attributes.airQualityIndex;
                const airQuality = this.aqiToPm25(aqi);
                this.log.debug(`${this.accessory.displayName} | Air Quality (AQI): ${aqi} => HomeKit AirQuality: ${airQuality}`);
                return airQuality;
            },
        });

        // Status Low Battery
        this.getOrAddCharacteristic(this.airQualitySvc, this.Characteristic.StatusLowBattery, {
            getHandler: () => {
                const battery = this.clamp(this.deviceData.attributes.battery, 0, 100);
                this.log.debug(`${this.accessory.displayName} | Battery Level: ${battery}`);
                return battery < 20 ? this.Characteristic.StatusLowBattery.BATTERY_LEVEL_LOW : this.Characteristic.StatusLowBattery.BATTERY_LEVEL_NORMAL;
            },
            preReqChk: () => this.hasAttribute("Battery"),
        });

        // PM2.5 Density (if available)
        this.getOrAddCharacteristic(this.airQualitySvc, this.Characteristic.PM2_5Density, {
            getHandler: () => {
                const pm25 = this.clamp(this.deviceData.attributes.pm25, 0, 1000);
                this.log.debug(`${this.accessory.displayName} | PM2.5 Density: ${pm25}`);
                return pm25;
            },
            preReqChk: () => this.hasAttribute("pm25"),
        });

        // Status Tampered (if supported)
        this.getOrAddCharacteristic(this.airQualitySvc, this.Characteristic.StatusTampered, {
            preReqChk: () => this.hasCapability("TamperAlert"),
            getHandler: () => {
                const isTampered = this.deviceData.attributes.tamper === "detected";
                this.log.debug(`${this.accessory.displayName} | Status Tampered Retrieved: ${isTampered}`);
                return isTampered;
            },
            removeIfMissingPreReq: true,
        });

        this.accessory.deviceGroups.push("air_quality");
    }

    /**
     * Handles updates to device attributes and updates the corresponding HomeKit characteristics.
     *
     * @param {Object} change - The change object containing attribute updates.
     * @param {string} change.attribute - The name of the attribute that has changed.
     * @param {any} change.value - The new value of the attribute.
     *
     * @returns {void}
     *
     * @example
     * handleAttributeUpdate({ attribute: "airQualityIndex", value: 42 });
     *
     * @description
     * This method updates the HomeKit characteristics based on the attribute changes received.
     * It handles various attributes such as airQualityIndex, battery, pm25, tamper, and status.
     * If the attribute is not recognized, it logs a debug message.
     */
    handleAttributeUpdate(change) {
        if (!this.airQualitySvc) {
            this.log.warn(`${this.accessory.displayName} | AirQualitySensor service not found`);
            return;
        }

        switch (change.attribute) {
            case "airQualityIndex":
                const airQuality = this.aqiToPm25(change.value);
                this.updateCharacteristicValue(this.airQualitySvc, this.Characteristic.AirQuality, airQuality);
                break;
            case "battery":
                if (this.hasAttribute("Battery")) {
                    const battery = this.clamp(change.value, 0, 100);
                    const lowBattery = battery < 20 ? this.Characteristic.StatusLowBattery.BATTERY_LEVEL_LOW : this.Characteristic.StatusLowBattery.BATTERY_LEVEL_NORMAL;
                    this.updateCharacteristicValue(this.airQualitySvc, this.Characteristic.StatusLowBattery, lowBattery);
                }
                break;
            case "pm25":
                if (this.hasAttribute("pm25")) {
                    const pm25 = this.clamp(change.value, 0, 1000);
                    this.updateCharacteristicValue(this.airQualitySvc, this.Characteristic.PM2_5Density, pm25);
                }
                break;
            case "tamper":
                if (this.hasCapability("TamperAlert")) {
                    const isTampered = change.value === "detected";
                    this.updateCharacteristicValue(this.airQualitySvc, this.Characteristic.StatusTampered, isTampered);
                }
                break;
            case "status":
                const isActive = change.value === "ACTIVE";
                this.updateCharacteristicValue(this.airQualitySvc, this.Characteristic.StatusActive, isActive);
                break;
            default:
                this.log.debug(`${this.accessory.displayName} | Unhandled attribute update: ${change.attribute}`);
        }
    }

    /**
     * Converts an Air Quality Index (AQI) value to a corresponding PM2.5 air quality characteristic.
     *
     * @param {number} aqi - The Air Quality Index value to be converted. Should be between 0 and 500.
     * @returns {number} - The corresponding air quality characteristic based on the AQI value.
     *                     Returns `this.Characteristic.AirQuality.UNKNOWN` if the AQI is undefined, greater than 500, or less than 0.
     *                     Returns `this.Characteristic.AirQuality.EXCELLENT` if the AQI is between 0 and 50.
     *                     Returns `this.Characteristic.AirQuality.GOOD` if the AQI is between 51 and 100.
     *                     Returns `this.Characteristic.AirQuality.FAIR` if the AQI is between 101 and 150.
     *                     Returns `this.Characteristic.AirQuality.INFERIOR` if the AQI is between 151 and 200.
     *                     Returns `this.Characteristic.AirQuality.POOR` if the AQI is greater than 200.
     */
    aqiToPm25(aqi) {
        if (aqi === undefined || aqi > 500 || aqi < 0) return this.Characteristic.AirQuality.UNKNOWN;
        if (aqi <= 50) return this.Characteristic.AirQuality.EXCELLENT;
        if (aqi <= 100) return this.Characteristic.AirQuality.GOOD;
        if (aqi <= 150) return this.Characteristic.AirQuality.FAIR;
        if (aqi <= 200) return this.Characteristic.AirQuality.INFERIOR;
        return this.Characteristic.AirQuality.POOR;
    }
}

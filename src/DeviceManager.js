// DeviceManager.js

// Load the HubitatAccessory module
import HubitatAccessory from "./HubitatAccessory.js";

// Load the device types modules
import AccelerationSensor from "./device_types/AccelerationSensor.js";
import AirPurifier from "./device_types/AirPurifier.js";
import AirQualitySensor from "./device_types/AirQuality.js";
import AlarmSystem from "./device_types/AlarmSystem.js";
import Battery from "./device_types/Battery.js";
import Button from "./device_types/Button.js";
import CarbonDioxideSensor from "./device_types/CarbonDioxide.js";
import CarbonMonoxideSensor from "./device_types/CarbonMonoxide.js";
import ContactSensor from "./device_types/ContactSensor.js";
import Fan from "./device_types/Fan.js";
import FilterMaintenance from "./device_types/FilterMaintenance.js";
import GarageDoor from "./device_types/GarageDoor.js";
import HumiditySensor from "./device_types/HumiditySensor.js";
import IlluminanceSensor from "./device_types/IlluminanceSensor.js";
import Light from "./device_types/Light.js";
import Lock from "./device_types/Lock.js";
import MotionSensor from "./device_types/MotionSensor.js";
import Outlet from "./device_types/Outlet.js";
import PresenceSensor from "./device_types/PresenceSensor.js";
import SmokeSensor from "./device_types/SmokeDetector.js";
import Speaker from "./device_types/Speaker.js";
import Switch from "./device_types/SwitchDevice.js";
import TemperatureSensor from "./device_types/TemperatureSensor.js";
import Thermostat from "./device_types/Thermostat.js";
import ThermostatFan from "./device_types/ThermostatFan.js";
import Valve from "./device_types/Valve.js";
import VirtualMode from "./device_types/VirtualMode.js";
import VirtualPiston from "./device_types/VirtualPiston.js";
import LeakSensor from "./device_types/LeakSensor.js";
import WindowCovering from "./device_types/WindowCovering.js";
import EnergyMeter from "./device_types/EnergyMeter.js";
import PowerMeter from "./device_types/PowerMeter.js";

// Load the CommunityTypes module
import CommunityTypes from "./libs/CommunityTypes.js";

/**
 * DeviceManager class is responsible for managing and initializing various types of devices
 * within the platform. It handles device type identification, initialization, and updates.
 *
 * @class DeviceManager
 * @param {Object} platform - The platform object containing configuration, logging, and other utilities.
 *
 * @property {Object} platform - The platform object.
 * @property {Object} config - The configuration object from the platform.
 * @property {Function} log - The logging function from the platform.
 * @property {Service} Service - The service object from the platform.
 * @property {Characteristic} Characteristic - The characteristic object from the platform.
 * @property {Categories} Categories - The categories object from the platform.
 * @property {Object} CommunityTypes - The community types object initialized with Service and Characteristic.
 * @property {Map} cachedAccessories - A map to store cached accessories.
 * @property {Array} deviceTypeTests - An array of device type test objects.
 *
 * @method initializeDeviceTypeTests - Initializes the device type tests array.
 * @method getDeviceTypes - Identifies and returns the types of a given accessory.
 * @method initializeHubitatAccessory - Initializes a Hubitat accessory with its relevant device types.
 * @method processDeviceAttributeUpdate - Processes updates to device attributes.
 * @method getAccessoryFromCache - Retrieves an accessory from the cache.
 * @method getAllAccessoriesFromCache - Retrieves all accessories from the cache.
 * @method clearAccessoryCache - Clears the accessory cache.
 * @method addAccessoryToCache - Adds an accessory to the cache.
 * @method removeAccessoryFromCache - Removes an accessory from the cache.
 * @method getAccessoryId - Retrieves the ID of an accessory.
 * @method removeUnusedServices - Removes unused services from an accessory.
 * @method removeUnusedCharacteristics - Removes unused characteristics from a service of an accessory.
 */
export default class DeviceManager {
    constructor(platform) {
        this.platform = platform;
        this.config = platform.config;
        this.log = platform.log;
        this.Service = platform.Service;
        this.Characteristic = platform.Characteristic;
        this.Categories = platform.Categories;
        this.CommunityTypes = CommunityTypes(this.Service, this.Characteristic);
        this.cachedAccessories = new Map();

        this.initializeDeviceTypeTests();
    }

    /**
     * Initializes the device type tests for various accessories.
     *
     * This method sets up an array of device type tests, each containing:
     * - `name`: The name of the device type.
     * - `test`: A function that takes an accessory and returns a boolean indicating if the accessory matches the device type.
     * - `class`: The class associated with the device type.
     * - `disable` (optional): A boolean indicating if the device type is disabled.
     * - `onlyOnNoGrps` (optional): A boolean indicating if the device type should only be considered when no groups are present.
     *
     * The device type tests are sorted such that entries with `onlyOnNoGrps: true` are moved to the end of the array.
     */
    initializeDeviceTypeTests() {
        this.deviceTypeTests = [
            {
                name: "window_covering",
                test: (accessory) => accessory.hasCapability("WindowShade"),
                class: WindowCovering,
            },
            {
                name: "light",
                test: (accessory) =>
                    accessory.hasCapability("Switch") &&
                    (accessory.hasCapability("LightBulb") || accessory.hasCapability("Bulb") || (this.config.consider_light_by_name && accessory.context.deviceData.name.toLowerCase().includes("light")) || ["saturation", "hue", "colorTemperature"].some((attr) => accessory.hasAttribute(attr)) || accessory.hasCapability("ColorControl")),
                class: Light,
            },
            {
                name: "air_purifier",
                test: (accessory) => accessory.hasCapability("custom.airPurifierOperationMode"),
                class: AirPurifier,
                disable: true,
            },
            {
                name: "garage_door",
                test: (accessory) => accessory.hasCapability("GarageDoorControl"),
                class: GarageDoor,
            },
            {
                name: "lock",
                test: (accessory) => accessory.hasCapability("Lock"),
                class: Lock,
            },
            {
                name: "valve",
                test: (accessory) => accessory.hasCapability("Valve"),
                class: Valve,
            },
            {
                name: "speaker",
                test: (accessory) => accessory.hasCapability("Speaker"),
                class: Speaker,
            },
            {
                name: "filter_maintenance",
                test: (accessory) => accessory.hasCapability("FilterStatus") && accessory.hasAttribute("filterStatus"),
                class: FilterMaintenance,
            },
            {
                name: "fan",
                test: (accessory) => ["Fan", "FanControl"].some((cap) => accessory.hasCapability(cap)) || (this.config.consider_fan_by_name && accessory.context.deviceData.name.toLowerCase().includes("fan")) || accessory.hasCommand("setSpeed") || accessory.hasAttribute("speed"),
                class: Fan,
            },
            {
                name: "virtual_mode",
                test: (accessory) => accessory.hasCapability("Mode"),
                class: VirtualMode,
            },
            {
                name: "virtual_piston",
                test: (accessory) => accessory.hasCapability("Piston"),
                class: VirtualPiston,
            },
            {
                name: "button",
                test: (accessory) => ["Button", "DoubleTapableButton", "HoldableButton", "PushableButton"].some((cap) => accessory.hasCapability(cap)),
                class: Button,
            },
            {
                name: "outlet",
                test: (accessory) => accessory.hasCapability("Outlet") && accessory.hasCapability("Switch") && !["LightBulb", "Bulb", "Button", "Fan", "FanControl"].some((cap) => accessory.hasCapability(cap)),
                class: Outlet,
                // onlyOnNoGrps: true,
            },
            {
                name: "switch_device",
                test: (accessory) => accessory.hasCapability("Switch") && !["LightBulb", "Outlet", "Bulb", "Button", "Fan", "FanControl"].some((cap) => accessory.hasCapability(cap)) && !(this.platform.configItems.consider_light_by_name && accessory.context.deviceData.name.toLowerCase().includes("light")),
                class: Switch,
            },
            {
                name: "smoke_detector",
                test: (accessory) => accessory.hasCapability("SmokeDetector") && accessory.hasAttribute("smoke"),
                class: SmokeSensor,
            },
            {
                name: "carbon_monoxide",
                test: (accessory) => accessory.hasCapability("CarbonMonoxideDetector") && accessory.hasAttribute("carbonMonoxide"),
                class: CarbonMonoxideSensor,
            },
            {
                name: "carbon_dioxide",
                test: (accessory) => accessory.hasCapability("CarbonDioxideMeasurement") && accessory.hasAttribute("carbonDioxide"),
                class: CarbonDioxideSensor,
            },
            {
                name: "motion_sensor",
                test: (accessory) => accessory.hasCapability("MotionSensor"),
                class: MotionSensor,
            },
            {
                name: "acceleration_sensor",
                test: (accessory) => accessory.hasCapability("AccelerationSensor"),
                class: AccelerationSensor,
            },
            {
                name: "leak_sensor",
                test: (accessory) => accessory.hasCapability("WaterSensor"),
                class: LeakSensor,
            },
            {
                name: "presence_sensor",
                test: (accessory) => accessory.hasCapability("PresenceSensor"),
                class: PresenceSensor,
            },
            {
                name: "humidity_sensor",
                test: (accessory) => accessory.hasCapability("RelativeHumidityMeasurement") && accessory.hasAttribute("humidity") && !["Thermostat", "ThermostatOperatingState"].some((cap) => accessory.hasCapability(cap)) && !accessory.hasAttribute("thermostatOperatingState"),
                class: HumiditySensor,
            },
            {
                name: "temperature_sensor",
                test: (accessory) => accessory.hasCapability("TemperatureMeasurement") && !["Thermostat", "ThermostatOperatingState"].some((cap) => accessory.hasCapability(cap)) && !accessory.hasAttribute("thermostatOperatingState"),
                class: TemperatureSensor,
            },
            {
                name: "illuminance_sensor",
                test: (accessory) => accessory.hasCapability("IlluminanceMeasurement"),
                class: IlluminanceSensor,
            },
            {
                name: "contact_sensor",
                test: (accessory) => accessory.hasCapability("ContactSensor") && !accessory.hasCapability("GarageDoorControl"),
                class: ContactSensor,
            },
            {
                name: "air_quality",
                test: (accessory) => accessory.hasCapability("airQuality") || accessory.hasCapability("AirQuality"),
                class: AirQualitySensor,
            },
            {
                name: "battery",
                test: (accessory) => accessory.hasCapability("Battery"),
                class: Battery,
            },
            {
                name: "energy_meter",
                test: (accessory) => accessory.hasCapability("EnergyMeter"),
                class: EnergyMeter,
                disable: true,
            },
            {
                name: "power_meter",
                test: (accessory) => accessory.hasCapability("PowerMeter"),
                class: PowerMeter,
                disable: true,
            },
            {
                name: "thermostat",
                test: (accessory) => accessory.hasCapability("Thermostat") || accessory.hasCapability("ThermostatOperatingState") || accessory.hasAttribute("thermostatOperatingState"),
                class: Thermostat,
            },
            {
                name: "thermostat_fan",
                test: (accessory) => accessory.hasCapability("Thermostat") && accessory.hasAttribute("thermostatFanMode") && accessory.hasCommand("fanAuto") && accessory.hasCommand("fanOn"),
                class: ThermostatFan,
            },
            {
                name: "alarm_system",
                test: (accessory) => accessory.hasAttribute("alarmSystemStatus"),
                class: AlarmSystem,
            },
        ];

        // Reorder deviceTypeTests so that entries with 'onlyOnNoGrps: true' are at the end
        this.deviceTypeTests.sort((a, b) => {
            if (a.onlyOnNoGrps && !b.onlyOnNoGrps) return 1;
            if (!a.onlyOnNoGrps && b.onlyOnNoGrps) return -1;
            return 0;
        });
    }

    /**
     * Asynchronously retrieves the types of a given accessory by testing it against a series of device type tests.
     *
     * @param {PlatformAccessory} accessory - The accessory object to be tested.
     * @param {string} accessory.name - The name of the accessory.
     * @returns {Promise<Array<Object>>} A promise that resolves to an array of matched device types.
     * @returns {string} return[].name - The name of the matched device type.
     * @returns {string} return[].class - The class of the matched device type.
     */
    async getDeviceTypes(accessory) {
        const matchedTypes = [];

        for (const deviceTest of this.deviceTypeTests) {
            if (!deviceTest.disable && deviceTest.test(accessory)) {
                if (deviceTest.excludeDevTypes && deviceTest.excludeDevTypes.some((devType) => matchedTypes.some((m) => m.name === devType))) {
                    continue;
                }
                matchedTypes.push({
                    name: deviceTest.name,
                    class: deviceTest.class,
                });
            }
        }

        this.log.debug(`${accessory.name} | Device types found: ${matchedTypes.map((t) => t.name)}`);
        return matchedTypes;
    }

    /**
     * Initializes a Hubitat accessory.
     *
     * @param {PlatformAccessory} accessory - The accessory to initialize.
     * @param {boolean} [fromCache=false] - Indicates if the accessory is being initialized from cache.
     * @param {string|null} [src=null] - The source of the initialization request.
     * @returns {Promise<Object>} The initialized accessory.
     * @throws Will log an error and return the accessory if initialization fails.
     */
    async initializeHubitatAccessory(accessory, fromCache = false, src = null) {
        try {
            if (!accessory.context || !accessory.context.deviceData) {
                this.log.error(`initializeHubitatAccessory: Invalid accessory data for ${accessory.name} | ${src ? `Source: ${src}` : ""}`);
                return accessory;
            }
            accessory.deviceid = accessory.context.deviceData.deviceid;
            accessory.name = accessory.context.deviceData.name;
            // this.platform.logDebug(`initializeHubitatAccessory: ${accessory.context.deviceData.name}, fromCache: ${fromCache} | ${src ? `Source: ${src}` : ""}`);

            // Initialize the base HubitatAccessory
            new HubitatAccessory(this.platform, accessory);

            if (!fromCache) {
                // Remove excluded capabilities if not from cache
                this.platform.excludedCapabilities.forEach((cap) => {
                    if (cap) {
                        this.platform.logDebug(`Removing capability: ${cap} from Device: ${accessory.name}`);
                        delete accessory.context.deviceData.capabilities[cap];
                    }
                });
            } else {
                this.platform.logDebug(`Initializing Cached Device ${accessory.name} | ${accessory.context.deviceData.deviceid} | ${src ? `Source: ${src}` : ""}`);
            }

            // Initialize a map to store device type instances and their relevant attributes
            accessory.deviceTypeInstances = new Map();

            // Identify device types
            const deviceTypes = await this.getDeviceTypes(accessory);
            if (deviceTypes.length > 0) {
                deviceTypes.forEach(async (deviceType) => {
                    const deviceInstance = new deviceType.class(this.platform, accessory);
                    await deviceInstance.initializeService();

                    // Store the device instance and its relevant attributes
                    accessory.deviceTypeInstances.set(deviceType.name, {
                        instance: deviceInstance,
                        relevantAttributes: deviceType.class.relevantAttributes || [],
                    });
                });
            } else {
                this.log.warn(`No specific device type found for device | ${accessory.name} | deviceId: (${accessory.context.deviceData.deviceid}) | ${src ? `Source: ${src}` : ""}`);
                console.log(JSON.stringify(accessory.context.deviceData, null, 4));
            }

            return accessory;
        } catch (err) {
            this.log.error(`initializeHubitatAccessory (fromCache: ${fromCache}) | Name: ${accessory.name} | ${src ? `Source: ${src}` : ""} | Error: ${err}`);
            console.error(err);
            return accessory;
        }
    }

    /**
     * Processes an update to a device attribute.
     *
     * @async
     * @param {Object} change - The change object containing the update details.
     * @param {string} change.deviceid - The ID of the device being updated.
     * @param {string} change.attribute - The attribute of the device that is being updated.
     * @param {any} change.value - The new value of the attribute.
     * @returns {Promise<boolean>} - Returns true if the update was processed successfully, otherwise false.
     */
    async processDeviceAttributeUpdate(change) {
        const accessory = this.getAccessoryFromCache({ deviceid: change.deviceid });
        if (!accessory) {
            this.log.error(`Accessory not found for device ID: ${change.deviceid}`);
            return false;
        }

        accessory.context.deviceData.attributes[change.attribute] = change.value;
        accessory.context.lastUpdate = new Date().toLocaleString();

        if (accessory.deviceTypeInstances && accessory.deviceTypeInstances.size > 0) {
            for (const [deviceTypeName, { instance, relevantAttributes }] of accessory.deviceTypeInstances) {
                if (relevantAttributes.includes(change.attribute)) {
                    this.log.debug(`Updating ${deviceTypeName} for attribute: ${change.attribute}`);
                    instance.handleAttributeUpdate(change);
                }
            }
        } else {
            this.log.warn(`No device type instances found for accessory: ${accessory.name}`);
        }

        return true;
    }

    /**
     * Retrieves an accessory from the cache based on the provided device.
     *
     * @param {PlatformAccessory} device - The device object used to generate the accessory ID.
     * @returns {PlatformAccessory|undefined} - The cached accessory object if found, otherwise undefined.
     */
    getAccessoryFromCache(device) {
        const key = this.getAccessoryId(device);
        return this.cachedAccessories.get(key);
    }

    /**
     * Retrieves all accessories from the cache.
     *
     * @returns {PlatformAccessory[]} An array of cached accessories.
     */
    getAllAccessoriesFromCache() {
        return this.cachedAccessories;
    }

    /**
     * Clears the accessory cache and forces a device reload.
     * This method logs an alert message indicating the cache is being cleared
     * and then resets the cachedAccessories object to an empty state.
     */
    clearAccessoryCache() {
        this.log.alert("CLEARING ACCESSORY CACHE AND FORCING DEVICE RELOAD");
        this.cachedAccessories = {};
    }

    /**
     * Adds an accessory to the cache.
     *
     * @param {PlatformAccessory} accessory - The accessory object to be added to the cache.
     * @returns {boolean} - Returns true if the accessory was successfully added to the cache.
     */
    addAccessoryToCache(accessory) {
        const key = this.getAccessoryId(accessory);
        this.cachedAccessories.set(key, accessory);
        return true;
    }

    /**
     * Removes an accessory from the cache.
     *
     * @param {PlatformAccessory} accessory - The accessory to be removed from the cache.
     * @returns {PlatformAccessory|undefined} The removed accessory if it existed in the cache, otherwise undefined.
     */
    removeAccessoryFromCache(accessory) {
        const key = this.getAccessoryId(accessory);
        const removed = this.cachedAccessories.get(key);
        this.cachedAccessories.delete(key);
        return removed;
    }

    /**
     * Retrieves the accessory ID from the given accessory object.
     *
     * @param {PlatformAccessory} accessory - The accessory object.
     * @returns {string} The accessory ID.
     */
    getAccessoryId(accessory) {
        return accessory.deviceid || accessory.context.deviceData.deviceid;
    }

    /**
     * Removes unused services from the given accessory.
     *
     * This method iterates over the services of the accessory and removes those
     * that are not present in the `servicesToKeep` set. If a service is kept, it
     * also checks and removes unused characteristics from that service.
     *
     * @param {PlatformAccessory} accessory - The accessory object containing services.
     * @returns {Object} The updated accessory with unused services removed.
     */
    removeUnusedServices(accessory) {
        const servicesToKeep = new Set(accessory.servicesToKeep);
        accessory.services.forEach((service) => {
            const serviceKey = `${service.UUID}:${service.subtype || ""}`;
            if (!servicesToKeep.has(serviceKey)) {
                accessory.removeService(service);
                this.log.info(`Removing Unused Service: ${service.displayName ? service.displayName : service.UUID} from ${accessory.name}`);
            } else {
                this.removeUnusedCharacteristics(accessory, service);
            }
        });
        return accessory;
    }

    /**
     * Removes unused characteristics from a given service in an accessory.
     *
     * @param {PlatformAccessory} accessory - The accessory object containing the service.
     * @param {Service} service - The service object from which unused characteristics will be removed.
     * @returns {void}
     */
    removeUnusedCharacteristics(accessory, service) {
        if (service.UUID === this.Service.AccessoryInformation.UUID) {
            return;
        }

        const characteristicsToKeep = accessory.characteristicsToKeep[service.UUID] || [];
        service.characteristics.forEach((characteristic) => {
            if (!characteristicsToKeep.includes(characteristic.UUID)) {
                service.removeCharacteristic(characteristic);
                this.log.info(`Removing Unused Characteristic: ${characteristic.displayName} from ${service.displayName} from ${accessory.name}`);
            }
        });
    }
}

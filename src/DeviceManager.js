// DeviceManager.js

// Load the HubitatAccessory module
import HubitatAccessory from "./HubitatAccessory.js";

// Load the device types modules
import AccelerationSensor from "./device_types/AccelerationSensor.js";
import AirPurifier from "./device_types/AirPurifier.js";
import AirQualitySensor from "./device_types/AirQuality.js";
import AlarmSystem from "./device_types/AlarmSystem.js";
import Battery from "./device_types/Batterie.js";
import Button from "./device_types/Buttons.js";
import CarbonDioxideSensor from "./device_types/CarbonDioxide.js";
import CarbonMonoxideSensor from "./device_types/CarbonMonoxide.js";
import ContactSensor from "./device_types/ContactSensor.js";
import Fan from "./device_types/Fans.js";
import FilterMaintenance from "./device_types/FilterMaintenance.js";
import GarageDoor from "./device_types/GarageDoor.js";
import HumiditySensor from "./device_types/HumiditySensor.js";
import IlluminanceSensor from "./device_types/IlluminanceSensor.js";
import Light from "./device_types/Lights.js";
import Lock from "./device_types/Locks.js";
import MotionSensor from "./device_types/MotionSensor.js";
import Outlet from "./device_types/Outlets.js";
import PresenceSensor from "./device_types/PresenceSensor.js";
import SmokeSensor from "./device_types/SmokeDetector.js";
import Speaker from "./device_types/Speakers.js";
import Switch from "./device_types/SwitchDevice.js";
import TemperatureSensor from "./device_types/TemperatureSensor.js";
import Thermostat from "./device_types/Thermostats.js";
import ThermostatFan from "./device_types/ThermostatFan.js";
import Valve from "./device_types/Valves.js";
import VirtualMode from "./device_types/VirtualMode.js";
import VirtualPiston from "./device_types/VirtualPiston.js";
import LeakSensor from "./device_types/LeakSensor.js";
import WindowCovering from "./device_types/WindowCovering.js";
import EnergyMeter from "./device_types/EnergyMeter.js";
import PowerMeter from "./device_types/PowerMeter.js";

// Load the CommunityTypes module
import CommunityTypes from "./libs/CommunityTypes.js";

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
                    accessory.hasCapability("SwitchLevel") &&
                    (accessory.hasCapability("LightBulb") || accessory.hasCapability("Bulb") || (this.config.consider_light_by_name && accessory.context.deviceData.name.toLowerCase().includes("light")) || ["saturation", "hue", "colorTemperature"].some((attr) => accessory.hasAttribute(attr)) || accessory.hasCapability("ColorControl")),
                class: Light,
                excludeDevTypes: ["outlet", "switch_device"],
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
                test: (accessory) => accessory.hasCapability("Outlet") && accessory.hasCapability("Switch"),
                class: Outlet,
                onlyOnNoGrps: true,
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

        this.log.info(`${accessory.name || "Unknown Device"} | Device types found: ${matchedTypes.map((t) => t.name).join(", ")}`);
        return matchedTypes;
    }

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

            // Identify device types
            const deviceTypes = await this.getDeviceTypes(accessory);
            this.log.info(
                "matched device types",
                deviceTypes.map((t) => t.name),
            );

            if (deviceTypes.length > 0) {
                deviceTypes.forEach(async (deviceType) => {
                    const deviceInstance = new deviceType.class(this.platform, accessory);
                    await deviceInstance.initializeService();
                });
            } else {
                this.log.warn(`No specific device type found for device | ${accessory.name} | deviceId: (${accessory.context.deviceData.deviceid})  | ${src ? `Source: ${src}` : ""}`);
            }

            return accessory;
        } catch (err) {
            this.log.error(`initializeHubitatAccessory (fromCache: ${fromCache}) | Name: ${accessory.name} | ${src ? `Source: ${src}` : ""} | Error: ${err}`);
            console.error(err);
            return accessory;
        }
    }

    async processDeviceAttributeUpdate(change) {
        const accessory = this.getAccessoryFromCache({ deviceid: change.deviceid });
        if (!accessory) {
            this.log.error(`Accessory not found for device ID: ${change.deviceid}`);
            return false;
        }

        accessory.context.deviceData.attributes[change.attribute] = change.value;
        accessory.context.lastUpdate = new Date().toLocaleString();

        const deviceTypes = await this.getDeviceTypes(accessory);
        if (deviceTypes.length > 0) {
            deviceTypes.forEach((deviceType) => {
                if (deviceType.class.prototype.relevantAttributes.includes(change.attribute)) {
                    const deviceInstance = new deviceType.class(this.platform, accessory);
                    deviceInstance.handleAttributeUpdate(change);
                }
            });
        } else {
            this.log.warn(`No device types found for accessory: ${accessory.name}`);
        }

        return true;
    }

    getAccessoryFromCache(device) {
        const key = this.getAccessoryId(device);
        return this.cachedAccessories.get(key);
    }

    getAllAccessoriesFromCache() {
        return this.cachedAccessories;
    }

    clearAccessoryCache() {
        this.log.alert("CLEARING ACCESSORY CACHE AND FORCING DEVICE RELOAD");
        this.cachedAccessories = {};
    }

    addAccessoryToCache(accessory) {
        const key = this.getAccessoryId(accessory);
        this.cachedAccessories.set(key, accessory);
        return true;
    }

    removeAccessoryFromCache(accessory) {
        const key = this.getAccessoryId(accessory);
        const removed = this.cachedAccessories.get(key);
        this.cachedAccessories.delete(key);
        return removed;
    }

    getAccessoryId(accessory) {
        return accessory.deviceid || accessory.context.deviceData.deviceid;
    }

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

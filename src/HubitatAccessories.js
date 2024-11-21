// HubitatAccessories.js

import { pluginName, platformName } from "./Constants.js";

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
import Valve from "./device_types/Valve.js";
import VirtualMode from "./device_types/VirtualMode.js";
import VirtualPiston from "./device_types/VirtualPiston.js";
import LeakSensor from "./device_types/LeakSensor.js";
import WindowCovering from "./device_types/WindowCovering.js";
import EnergyMeter from "./device_types/EnergyMeter.js";
import PowerMeter from "./device_types/PowerMeter.js";

export default class HubitatAccessories {
    constructor(platform) {
        this.platform = platform;
        this.log = platform.log;
        this.logDebug = platform.logDebug;
        this.logInfo = platform.logInfo;
        this.logWarn = platform.logWarn;
        this.logError = platform.logError;
        this.logNotice = platform.logNotice;
        this.logGreen = platform.logGreen;
        this.api = platform.api;
        this.config = platform.config;
        this.configManager = platform.configManager;

        this.cachedAccessories = new Map();
        this.buttonMap = new Map();
        this._deviceInstances = new Map();
        this.deviceTypeTests = this.initializeDeviceTests();
    }

    initializeDeviceTests() {
        return [
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
                test: (accessory) => accessory.hasCapability("Switch") && !["LightBulb", "Outlet", "Bulb", "Button", "Fan", "FanControl"].some((cap) => accessory.hasCapability(cap)) && !(this.platform.config.consider_light_by_name && accessory.context.deviceData.name.toLowerCase().includes("light")),
                class: Switch,
                excludeCapabilities: ["WindowShade", "DoorControl", "GarageDoorControl"], // Don't create switch for these
                excludeAttributes: ["position", "level", "windowShade"], // Don't create switch if these attributes exist
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
                name: "alarm_system",
                test: (accessory) => accessory.hasAttribute("alarmSystemStatus"),
                class: AlarmSystem,
            },
        ].sort((a, b) => {
            if (a.onlyOnNoGrps && !b.onlyOnNoGrps) return 1;
            if (!a.onlyOnNoGrps && b.onlyOnNoGrps) return -1;
            return 0;
        });
    }

    async determineDeviceTypes(accessory) {
        const matchedTypes = [];

        const deviceWrapper = {
            hasCapability: (capability) => accessory.context.deviceData.capabilities && Object.keys(accessory.context.deviceData.capabilities).includes(capability),
            hasAttribute: (attribute) => accessory.context.deviceData.attributes && Object.keys(accessory.context.deviceData.attributes).includes(attribute),
            hasCommand: (command) => accessory.context.deviceData.commands && Object.keys(accessory.context.deviceData.commands).includes(command),
            context: accessory.context,
        };

        for (const deviceTest of this.deviceTypeTests) {
            if (deviceTest.disable) continue;

            // Check exclusions before running the test
            const hasExcludedCapability = deviceTest.excludeCapabilities?.some((cap) => deviceWrapper.hasCapability(cap));
            const hasExcludedAttribute = deviceTest.excludeAttributes?.some((attr) => deviceWrapper.hasAttribute(attr));

            if (hasExcludedCapability || hasExcludedAttribute) {
                this.logDebug(`${accessory.displayName} excluded from ${deviceTest.name} due to ` + `${hasExcludedCapability ? "capabilities" : "attributes"}`);
                continue;
            }

            if (deviceTest.test(deviceWrapper)) {
                if (deviceTest.excludeDevTypes && deviceTest.excludeDevTypes.some((type) => matchedTypes.some((match) => match.name === type))) {
                    this.logInfo(`${accessory.displayName} excluded due to existing type`);
                    continue;
                }
                matchedTypes.push({
                    name: deviceTest.name,
                    class: deviceTest.class,
                });
            }
        }

        if (matchedTypes.length === 0) {
            this.logWarn(`No device types matched for ${accessory.displayName}`);
        }

        return matchedTypes;
    }

    async refreshDevices(deviceList) {
        this.logInfo("Starting device refresh...");
        const startTime = Date.now();

        try {
            // Handle stale accessory cleanup and device updates in parallel
            await Promise.all([this.cleanupStaleAccessories(deviceList), this.processDeviceUpdates(deviceList)]);

            const duration = (Date.now() - startTime) / 1000;
            this.logInfo(`Device refresh completed in ${duration} seconds`);
            this.logDeviceStatistics();
        } catch (error) {
            this.logError("Error during device refresh:", error);
            throw error;
        }
    }

    async processDeviceUpdates(deviceList) {
        const updates = [];
        const additions = [];

        for (const device of deviceList) {
            if (this.cachedAccessories.has(device.deviceid)) {
                updates.push(this.updateAccessory(device));
            } else {
                additions.push(this.addAccessory(device));
            }
        }

        this.logWarn(`Devices to Update: ${updates.length}`);
        this.logWarn(`Devices to Add: ${additions.length}`);

        await Promise.all([...updates, ...additions]);
    }

    async cleanupStaleAccessories(currentDevices) {
        const currentDeviceIds = new Set(currentDevices.map((d) => d.deviceid));
        const staleAccessories = [];

        for (const [id, accessory] of this.cachedAccessories) {
            if (!currentDeviceIds.has(id)) {
                staleAccessories.push(accessory);
                this.logWarn(`Removing stale accessory: ${accessory.displayName}`);
                await this.removeAccessory(accessory);
            }
        }

        if (staleAccessories.length) {
            this.logInfo(`Removed ${staleAccessories.length} stale accessories`);
        }
    }

    async addAccessory(device) {
        try {
            this.logInfo(`Adding new accessory: ${device.name} (${device.deviceid})`);

            const uuid = this.api.hap.uuid.generate(`hubitat_${device.deviceid}`);
            const accessory = new this.api.platformAccessory(device.name, uuid);

            // Initialize context structure
            accessory.context = {
                deviceData: {
                    ...device,
                    excludedCapabilities: this.config.excluded_capabilities[device.deviceid] || [],
                },
                state: {
                    activeServices: [],
                    activeCharacteristics: {},
                    deviceTypes: [], // Track device types in context
                },
            };

            // Initialize device instances
            const deviceTypes = await this.determineDeviceTypes(accessory);
            const deviceInstances = [];

            for (const devType of deviceTypes) {
                const instance = new devType.class(this.platform, accessory);
                await instance.initializeAccessory();
                deviceInstances.push(instance);
                // Store device type in context
                accessory.context.state.deviceTypes.push(devType.name);
            }

            // Store instances in runtime map
            this._deviceInstances.set(accessory.UUID, deviceInstances);

            // Register with homebridge
            this.api.registerPlatformAccessories(pluginName, platformName, [accessory]);
            this.cachedAccessories.set(device.deviceid, accessory);

            return accessory;
        } catch (error) {
            this.logError(`Error adding accessory ${device.name}:`, error);
            throw error;
        }
    }

    configureAccessory(accessory) {
        this.logDebug(`Configuring cached accessory: ${accessory.displayName}`);

        const deviceId = accessory.context.deviceData?.deviceid;
        if (deviceId) {
            this.cachedAccessories.set(deviceId, accessory);
        } else {
            this.logWarn(`Accessory ${accessory.displayName} is missing deviceData.deviceid`);
        }
    }

    async updateAccessory(device) {
        try {
            const accessory = this.cachedAccessories.get(device.deviceid);
            if (!accessory) return;

            this.logDebug(`Updating accessory: ${device.name} (${device.deviceid})`);

            // Update device data while preserving state
            const existingState = accessory.context.state || {};
            accessory.context = {
                deviceData: {
                    ...device,
                    excludedCapabilities: this.config.excluded_capabilities[device.deviceid] || [],
                },
                state: existingState,
            };

            // Get previous instances
            const previousInstances = this._deviceInstances.get(accessory.UUID) || [];

            // Determine device types
            const deviceTypes = await this.determineDeviceTypes(accessory);
            const deviceInstances = [];

            // Update device types in context
            accessory.context.state.deviceTypes = deviceTypes.map((type) => type.name);

            // Initialize new instances
            for (const devType of deviceTypes) {
                const instance = new devType.class(this.platform, accessory);
                await instance.initializeAccessory();
                deviceInstances.push(instance);
            }

            // Clean up old instances
            for (const instance of previousInstances) {
                await instance.cleanup();
            }

            // Store new instances
            this._deviceInstances.set(accessory.UUID, deviceInstances);

            // Clean up unused services
            const firstInstance = deviceInstances[0];
            if (firstInstance) {
                firstInstance.cleanupUnusedServices(accessory);
            }

            // Update the accessory
            this.api.updatePlatformAccessories([accessory]);

            return accessory;
        } catch (error) {
            this.logError(`Error updating accessory ${device.name}:`, error);
            throw error;
        }
    }

    async removeAccessory(accessory) {
        try {
            this.logInfo(`Removing accessory: ${accessory.displayName}`);

            // Clean up instances
            const deviceInstances = this._deviceInstances.get(accessory.UUID);
            if (deviceInstances && deviceInstances.length) {
                for (const instance of deviceInstances) {
                    await instance.cleanup();
                }
            }

            // Remove from instance map
            this._deviceInstances.delete(accessory.UUID);

            // Remove from accessories map
            this.cachedAccessories.delete(accessory.context.deviceData.deviceid);

            // Unregister from homebridge
            this.api.unregisterPlatformAccessories(pluginName, platformName, [accessory]);
        } catch (error) {
            this.logError(`Error removing accessory ${accessory.displayName}:`, error);
            throw error;
        }
    }

    getServiceId(service) {
        return service.subtype ? `${service.UUID} ${service.subtype}` : service.UUID;
    }

    async processDeviceAttributeUpdate(update) {
        try {
            const accessory = this.cachedAccessories.get(update.deviceid);
            if (!accessory) {
                this.logWarn(`No accessory found for device ${update.deviceid}`);
                return false;
            }

            const deviceInstances = this._deviceInstances.get(accessory.UUID);
            if (!deviceInstances || !deviceInstances.length) {
                this.logWarn(`No device instances found for ${accessory.displayName}`);
                return false;
            }

            let handled = false;

            for (const instance of deviceInstances) {
                if (instance.constructor.relevantAttributes?.includes(update.attribute)) {
                    const updateResult = instance.updateDeviceAttribute(update.attribute, update.value, update.change_name);
                    if (updateResult.success) {
                        await instance.handleAttributeUpdate({
                            ...update,
                            previousValue: updateResult.previousValue,
                        });
                        handled = true;
                    }
                }
            }

            return handled;
        } catch (error) {
            this.logError(`Error in processDeviceAttributeUpdate:`, error);
            return false;
        }
    }

    // Button handling
    registerButtonService(accessory, service, buttonNumber) {
        const key = `${accessory.UUID} Button ${buttonNumber}`;
        this.buttonMap.set(key, service);
    }

    getButtonService(accessory, buttonNumber) {
        const key = `${accessory.UUID} ${buttonNumber}`;
        return this.buttonMap.get(key);
    }

    logServiceChanges(deviceName, previous, current) {
        const removedServices = [...previous.services].filter((uuid) => !current.services.has(uuid));
        const addedServices = [...current.services].filter((uuid) => !previous.services.has(uuid));

        if (removedServices.length || addedServices.length) {
            this.logDebug(`Service changes for ${deviceName}:`, {
                removed: removedServices.length,
                added: addedServices.length,
            });
        }

        // Log characteristic changes for each service
        current.services.forEach((serviceUUID) => {
            const prevChars = previous.characteristics.get(serviceUUID) || new Set();
            const currChars = current.characteristics.get(serviceUUID) || new Set();

            const removedChars = [...prevChars].filter((uuid) => !currChars.has(uuid));
            const addedChars = [...currChars].filter((uuid) => !prevChars.has(uuid));

            if (removedChars.length || addedChars.length) {
                this.logDebug(`Characteristic changes for ${deviceName} service ${serviceUUID}:`, {
                    removed: removedChars.length,
                    added: addedChars.length,
                });
            }
        });
    }

    logDeviceStatistics() {
        const deviceCount = this.cachedAccessories.size;
        const deviceTypes = new Map();

        for (const accessory of this.cachedAccessories.values()) {
            const deviceInstances = this.deviceInstances.get(accessory.UUID);
            for (const instance of deviceInstances) {
                const type = instance.constructor.name;
                deviceTypes.set(type, (deviceTypes.get(type) || 0) + 1);
            }
        }

        // Get the longest device type name for padding
        // const maxTypeLength = Math.max(...[...deviceTypes.keys()].map((type) => type.length));

        // this.logInfo("Device Statistics");
        // this.logInfo("=================");
        // this.logInfo(`Total Devices: ${deviceCount}`);
        // this.logInfo("Device Types:");
        // this.logInfo("-----------------");

        // // Sort device types alphabetically
        // const sortedTypes = [...deviceTypes.entries()].sort((a, b) => a[0].localeCompare(b[0]));

        // for (const [type, count] of sortedTypes) {
        //     const paddedType = type.padEnd(maxTypeLength);
        //     this.logInfo(`${paddedType} : ${count}`);
        // }
        // this.logInfo("=================");
    }

    getAccessory(deviceId) {
        return this.cachedAccessories.get(deviceId);
    }

    getAllAccessories() {
        return Array.from(this.cachedAccessories.values());
    }
}

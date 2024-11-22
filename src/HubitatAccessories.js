// HubitatAccessories.js

import { pluginName, platformName } from "./StaticConfig.js";

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
        this.logManager = platform.logManager;
        this.stateManager = platform.stateManager;
        this.configManager = platform.configManager;
        this.api = platform.api;
        this.config = platform.config;

        // Runtime-only properties
        this._cachedAccessories = new Map();
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
                this.logManager.logDebug(`${accessory.displayName} excluded from ${deviceTest.name} due to ` + `${hasExcludedCapability ? "capabilities" : "attributes"}`);
                continue;
            }

            if (deviceTest.test(deviceWrapper)) {
                if (deviceTest.excludeDevTypes && deviceTest.excludeDevTypes.some((type) => matchedTypes.some((match) => match.name === type))) {
                    this.logManager.logInfo(`${accessory.displayName} excluded due to existing type`);
                    continue;
                }
                matchedTypes.push({
                    name: deviceTest.name,
                    class: deviceTest.class,
                });
            }
        }

        if (matchedTypes.length === 0) {
            this.logManager.logWarn(`No device types matched for ${accessory.displayName}`);
        }

        // Store matched types in accessory state
        this.stateManager.updateAccessoryState(accessory, {
            deviceTypes: matchedTypes.map((type) => type.name),
        });

        return matchedTypes;
    }

    async refreshDevices(deviceList) {
        this.logManager.logInfo("Starting device refresh...");
        const startTime = Date.now();

        try {
            await Promise.all([this.cleanupStaleAccessories(deviceList), this.processDeviceUpdates(deviceList)]);

            const duration = (Date.now() - startTime) / 1000;
            this.logManager.logInfo(`Device refresh completed in ${duration} seconds`);
            this.logDeviceStatistics();
        } catch (error) {
            this.logManager.logError("Error during device refresh:", error);
            throw error;
        }
    }

    async processDeviceUpdates(deviceList) {
        const updates = [];
        const additions = [];

        for (const device of deviceList) {
            if (this._cachedAccessories.has(device.deviceid)) {
                updates.push(this.updateAccessory(device));
            } else {
                additions.push(this.addAccessory(device));
            }
        }

        this.logManager.logWarn(`Devices to Update: ${updates.length}`);
        this.logManager.logWarn(`Devices to Add: ${additions.length}`);

        await Promise.all([...updates, ...additions]);
    }

    async cleanupStaleAccessories(currentDevices) {
        const currentDeviceIds = new Set(currentDevices.map((d) => d.deviceid));
        const staleAccessories = [];

        for (const [id, accessory] of this._cachedAccessories) {
            if (!currentDeviceIds.has(id)) {
                staleAccessories.push(accessory);
                this.logManager.logWarn(`Removing stale accessory: ${accessory.displayName}`);
                await this.removeAccessory(accessory);
            }
        }

        if (staleAccessories.length) {
            this.logManager.logInfo(`Removed ${staleAccessories.length} stale accessories`);
        }
    }

    async addAccessory(device) {
        try {
            this.logManager.logInfo(`Adding new accessory: ${device.name} (${device.deviceid})`);

            const uuid = this.api.hap.uuid.generate(`hubitat_${device.deviceid}`);
            const accessory = new this.api.platformAccessory(device.name, uuid);

            // Initialize accessory context and state
            accessory.context.deviceData = {
                ...device,
                excludedCapabilities: this.config.excluded_capabilities[device.deviceid] || [],
            };

            // Initialize state using StateManager
            this.stateManager.initializeAccessoryContext(accessory);

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
            this._cachedAccessories.set(device.deviceid, accessory);

            return accessory;
        } catch (error) {
            this.logManager.logError(`Error adding accessory ${device.name}:`, error);
            throw error;
        }
    }

    configureAccessory(accessory) {
        this.logManager.logDebug(`Configuring cached accessory: ${accessory.displayName}`);

        const deviceId = accessory.context.deviceData?.deviceid;
        if (deviceId) {
            this._cachedAccessories.set(deviceId, accessory);
        } else {
            this.logManager.logWarn(`Accessory ${accessory.displayName} is missing deviceData.deviceid`);
        }
    }

    async updateAccessory(device) {
        try {
            const accessory = this._cachedAccessories.get(device.deviceid);
            if (!accessory) return;

            this.logManager.logDebug(`Updating accessory: ${device.name} (${device.deviceid})`);

            // Update device data
            accessory.context.deviceData = {
                ...device,
                excludedCapabilities: this.config.excluded_capabilities[device.deviceid] || [],
            };

            // Get existing instances
            let deviceInstances = this._deviceInstances.get(accessory.UUID) || [];

            // Only reinitialize if no instances exist
            if (deviceInstances.length === 0) {
                // Determine device types
                const deviceTypes = await this.determineDeviceTypes(accessory);
                deviceInstances = [];

                // Initialize new instances
                for (const devType of deviceTypes) {
                    const instance = new devType.class(this.platform, accessory);
                    await instance.initializeAccessory();
                    deviceInstances.push(instance);
                }

                // Store new instances
                this._deviceInstances.set(accessory.UUID, deviceInstances);
            }

            // Update state timestamp
            this.stateManager.updateAccessoryState(accessory, {
                lastUpdate: Date.now(),
            });

            // Update the accessory
            this.api.updatePlatformAccessories([accessory]);

            return accessory;
        } catch (error) {
            this.logManager.logError(`Error updating accessory ${device.name}:`, error);
            throw error;
        }
    }

    async removeAccessory(accessory) {
        try {
            this.logManager.logInfo(`Removing accessory: ${accessory.displayName}`);

            // Now it makes sense to clean up instances
            const deviceInstances = this._deviceInstances.get(accessory.UUID);
            if (deviceInstances && deviceInstances.length) {
                for (const instance of deviceInstances) {
                    await instance.cleanup();
                }
            }

            // Remove from instance map
            this._deviceInstances.delete(accessory.UUID);

            // Remove from accessories map
            this._cachedAccessories.delete(accessory.context.deviceData.deviceid);

            // Unregister from homebridge
            this.api.unregisterPlatformAccessories(pluginName, platformName, [accessory]);
        } catch (error) {
            this.logManager.logError(`Error removing accessory ${accessory.displayName}:`, error);
            throw error;
        }
    }

    getServiceId(service) {
        return service.subtype ? `${service.UUID} ${service.subtype}` : service.UUID;
    }

    async processDeviceAttributeUpdate(update) {
        try {
            const accessory = this._cachedAccessories.get(update.deviceid);
            if (!accessory) {
                this.logManager.logWarn(`No accessory found for device ${update.deviceid}`);
                return false;
            }

            const deviceInstances = this._deviceInstances.get(accessory.UUID);
            if (!deviceInstances || !deviceInstances.length) {
                this.logManager.logWarn(`No device instances found for ${accessory.displayName}`);
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
            this.logManager.logError(`Error in processDeviceAttributeUpdate:`, error);
            return false;
        }
    }

    logServiceChanges(deviceName, previous, current) {
        const removedServices = [...previous.services].filter((uuid) => !current.services.has(uuid));
        const addedServices = [...current.services].filter((uuid) => !previous.services.has(uuid));

        if (removedServices.length || addedServices.length) {
            this.logManager.logDebug(`Service changes for ${deviceName}:`, {
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
                this.logManager.logDebug(`Characteristic changes for ${deviceName} service ${serviceUUID}:`, {
                    removed: removedChars.length,
                    added: addedChars.length,
                });
            }
        });
    }

    logDeviceStatistics() {
        const deviceCount = this._cachedAccessories.size;
        const deviceTypes = new Map();

        for (const accessory of this._cachedAccessories.values()) {
            const deviceInstances = this._deviceInstances.get(accessory.UUID);
            for (const instance of deviceInstances) {
                const type = instance.constructor.name;
                deviceTypes.set(type, (deviceTypes.get(type) || 0) + 1);
            }
        }

        this.logManager.logTable("Device Statistics", {
            "Total Devices": deviceCount,
            "Device Types": Object.fromEntries(deviceTypes),
        });
    }

    getAccessory(deviceId) {
        return this._cachedAccessories.get(deviceId);
    }

    getAllAccessories() {
        return Array.from(this._cachedAccessories.values());
    }
}

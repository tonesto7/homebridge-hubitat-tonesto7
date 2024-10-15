// DeviceManager.js

import HubitatAccessory from "./HubitatAccessory.js";

import AccelerationSensor from "./device_types/acceleration_sensor.js";
import AirPurifier from "./device_types/air_purifier.js";
import AirQualitySensor from "./device_types/air_quality_sensor.js";
import AlarmSystem from "./device_types/alarm_system.js";
import Battery from "./device_types/battery.js";
import Button from "./device_types/button.js";
import CarbonDioxideSensor from "./device_types/carbon_dioxide_sensor.js";
import CarbonMonoxideSensor from "./device_types/carbon_monoxide_sensor.js";
import ContactSensor from "./device_types/contact_sensor.js";
import Fan from "./device_types/fan.js";
import FilterMaintenance from "./device_types/filter_maintenance.js";
import GarageDoor from "./device_types/garage_door.js";
import HumiditySensor from "./device_types/humidity_sensor.js";
import IlluminanceSensor from "./device_types/illuminance_sensor.js";
import Light from "./device_types/light.js";
import Lock from "./device_types/lock.js";
import MotionSensor from "./device_types/motion_sensor.js";
import Outlet from "./device_types/outlet.js";
import PresenceSensor from "./device_types/presence_sensor.js";
import SmokeSensor from "./device_types/smoke_sensor.js";
import Speaker from "./device_types/speaker.js";
import Switch from "./device_types/switch.js";
import TemperatureSensor from "./device_types/temperature_sensor.js";
import Thermostat from "./device_types/thermostat.js";
import ThermostatFan from "./device_types/thermostat_fan.js";
import Valve from "./device_types/valve.js";
import VirtualMode from "./device_types/virtual_mode.js";
import VirtualPiston from "./device_types/virtual_piston.js";
import LeakSensor from "./device_types/leak_sensor.js";
import WindowCovering from "./device_types/window_covering.js";

export default class DeviceManager {
    constructor(platform) {
        this.platform = platform;
        this.log = platform.log;
        this.Service = platform.Service;
        this.Characteristic = platform.Characteristic;
        this.cachedAccessories = {};

        this.deviceTypes = [
            AccelerationSensor,
            AirPurifier,
            AirQualitySensor,
            AlarmSystem,
            Battery,
            Button,
            CarbonDioxideSensor,
            CarbonMonoxideSensor,
            ContactSensor,
            Fan,
            FilterMaintenance,
            GarageDoor,
            HumiditySensor,
            IlluminanceSensor,
            Light,
            Lock,
            MotionSensor,
            Outlet,
            PresenceSensor,
            SmokeSensor,
            Speaker,
            Switch,
            TemperatureSensor,
            Thermostat,
            ThermostatFan,
            Valve,
            VirtualMode,
            VirtualPiston,
            LeakSensor,
            WindowCovering,
        ];

        this.initializeDeviceTypeTests();
    }

    initializeDeviceTypeTests() {
        this.deviceTypeTests = this.deviceTypes.map((DeviceType) => {
            return {
                name: DeviceType.name,
                test: DeviceType.isSupported,
                class: DeviceType,
            };
        });
    }

    getDeviceTypes(accessory) {
        const matchedTypes = [];

        for (const deviceTest of this.deviceTypeTests) {
            if (deviceTest.test(accessory)) {
                matchedTypes.push({
                    name: deviceTest.name,
                    class: deviceTest.class,
                });
            }
        }

        this.log.info(`${accessory.name} | Device types found: ${matchedTypes.map((t) => t.name).join(", ")}`);
        return matchedTypes;
    }

    initializeHubitatAccessory(accessory, fromCache = false) {
        try {
            // Initialize the base HubitatAccessory and reassign
            accessory = new HubitatAccessory(this.platform, accessory, accessory.context.deviceData);

            if (!fromCache) {
                const { deviceData } = accessory.context;
                deviceData.excludedCapabilities.forEach((cap) => {
                    if (cap) {
                        this.log.debug(`Removing capability: ${cap} from Device: ${accessory.displayName}`);
                        delete accessory.context.deviceData.capabilities[cap];
                    }
                });
            } else {
                this.log.debug(`Initializing Cached Device ${accessory.displayName} | ${accessory.context.deviceData.deviceid}`);
            }

            const deviceTypes = this.getDeviceTypes(accessory);

            if (deviceTypes.length > 0) {
                deviceTypes.forEach((deviceType) => {
                    const deviceInstance = new deviceType.class(this.platform, accessory);
                    deviceInstance.initializeService();
                });
            } else {
                this.log.warn(`No specific device type found for device | ${accessory.displayName} | deviceId: (${accessory.context.deviceData.deviceid})`);
            }

            return accessory;
        } catch (err) {
            this.log.error(`initializeHubitatAccessory (fromCache: ${fromCache}) | Name: ${accessory.displayName} | Error: ${err}`);
            console.error(err);
            return accessory;
        }
    }

    processDeviceAttributeUpdate(change) {
        const accessory = this.getAccessoryFromCache({ deviceid: change.deviceid });
        if (!accessory) {
            this.log.error(`Accessory not found for device ID: ${change.deviceid}`);
            return false;
        }

        accessory.context.deviceData.attributes[change.attribute] = change.value;
        accessory.context.lastUpdate = new Date().toLocaleString();

        const deviceTypes = this.getDeviceTypes(accessory);
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
        return this.cachedAccessories[key];
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
        this.cachedAccessories[key] = accessory;
        return true;
    }

    removeAccessoryFromCache(accessory) {
        const key = this.getAccessoryId(accessory);
        const removed = this.cachedAccessories[key];
        delete this.cachedAccessories[key];
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
                this.log.info(`Removing Unused Service: ${service.displayName ? service.displayName : service.UUID} from ${accessory.displayName}`);
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

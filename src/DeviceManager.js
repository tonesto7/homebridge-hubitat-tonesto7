// DeviceManager.js

import HubitatAccessory from "./HubitatAccessory.js";

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

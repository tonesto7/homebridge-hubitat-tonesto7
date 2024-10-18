// Constants.js

import { createRequire } from "module";
/**
 * Creates a `require` function that can be used to import modules using the CommonJS module system.
 * This is useful when working with ES modules and needing to import CommonJS modules.
 *
 * @constant {Function} require - The `require` function created using `createRequire` from the `import.meta.url`.
 */
const require = createRequire(import.meta.url);
/**
 * @constant
 * @type {Object}
 * @description Imports the contents of the package.json file.
 */
const packageJson = require("../package.json");

/**
 * The name of the Homebridge plugin.
 * @type {string}
 */
export const pluginName = "homebridge-hubitat-tonesto7";

/**
 * A description of the platform.
 * @type {string}
 */
export const packageName = packageJson.name;

/**
 * A list of known capabilities for devices.
 *
 * This array includes various capabilities that devices can have, such as sensors, actuators, and control mechanisms.
 * Some capabilities are commented out and not currently in use.
 *
 * @constant {string[]} knownCapabilities
 * @default
 * @example
 * // Accessing the known capabilities
 * console.log(knownCapabilities);
 *
 * // Example of checking if a capability exists
 * if (knownCapabilities.includes("MotionSensor")) {
 *     console.log("MotionSensor capability is supported.");
 * }
 */
export const knownCapabilities = [
    "AccelerationSensor",
    "Actuator",
    "AirQuality",
    "Alarm System Status",
    "Alarm",
    "AlarmSystemStatus",
    // "AudioMute",
    // "AudioVolume",
    "Battery",
    "Bulb",
    "Button",
    "CarbonDioxideMeasurement",
    "CarbonMonoxideDetector",
    "ColorControl",
    "ColorTemperature",
    "ContactSensor",
    "Door",
    "DoorControl",
    "DoubleTapableButton",
    "EnergyMeter",
    "Fan",
    "FanControl",
    "FilterStatus",
    "GarageDoorControl",
    "HoldableButton",
    "IlluminanceMeasurement",
    "Light",
    "LightBulb",
    "Lock",
    // "Lock2",
    "LockCodes",
    "Mode",
    "MotionSensor",
    "Piston",
    "PowerMeter",
    "PowerSource",
    "PresenceSensor",
    "PushableButton",
    "Outlet",
    "RelativeHumidityMeasurement",
    "Routine",
    "Sensor",
    "SmokeDetector",
    "Speaker",
    "Switch",
    "SwitchLevel",
    "TamperAlert",
    "TemperatureMeasurement",
    "Thermostat",
    "ThermostatCoolingSetpoint",
    "ThermostatFanMode",
    "ThermostatHeatingSetpoint",
    "ThermostatMode",
    "ThermostatOperatingState",
    "ThermostatSetpoint",
    "Valve",
    "WaterSensor",
    "Window",
    "WindowShade",
];

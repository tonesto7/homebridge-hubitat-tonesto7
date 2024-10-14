// Constants.js

import { createRequire } from "module";
const require = createRequire(import.meta.url);
const packageJson = require("../package.json");

export const pluginName = "homebridge-hubitat-tonesto7";
export const platformDesc = "Hubitat";
export const platformName = "Hubitat-v2";
export const pluginVersion = packageJson.version;
export const packageName = packageJson.name;

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

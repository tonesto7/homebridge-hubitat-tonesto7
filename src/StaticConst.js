// StaticConfig.js

import { createRequire } from "module";
const require = createRequire(import.meta.url);
const packageJson = require("../package.json");
export const pluginName = "homebridge-hubitat-tonesto7";
export const platformDesc = "Hubitat";
export const platformName = "Hubitat-v2";
export const packageName = packageJson.name;
export const pluginVersion = packageJson.version;

export const knownCapabilities = [
    "AccelerationSensor",
    "Actuator",
    "AirQuality",
    "Alarm System Status",
    "Alarm",
    "AlarmSystemStatus",
    "AudioMute",
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

// Debounce delays
export const DEBOUNCE_DELAYS = {
    SET_LEVEL: 600,
    SET_VOLUME: 600,
    SET_SPEED: 600,
    SET_SATURATION: 600,
    SET_HUE: 600,
    SET_COLOR_TEMPERATURE: 600,
    SET_HEATING_SETPOINT: 600,
    SET_COOLING_SETPOINT: 600,
    SET_THERMOSTAT_SETPOINT: 600,
    SET_THERMOSTAT_MODE: 600,
    DEFAULT: 300,
};

// Device thresholds
export const DEVICE_THRESHOLDS = {
    BATTERY_LOW: 20,
    TEMP_SENSOR_MIN_C: -270, // Absolute zero
    TEMP_SENSOR_MAX_C: 400, // Well above any reasonable temperature
    HUMIDITY_MIN: 0,
    HUMIDITY_MAX: 100,
    ILLUMINANCE_MIN: 0,
    ILLUMINANCE_MAX: 100000,
    PM25_MIN: 0,
    PM25_MAX: 1000,
    CO2_NORMAL_THRESHOLD: 2000,
    THERMOSTAT_MIN_CURRENT_C: 0, // 32°F
    THERMOSTAT_MAX_CURRENT_C: 100, // 212°F
    THERMOSTAT_MIN_TARGET_C: 10, // 50°F
    THERMOSTAT_MAX_TARGET_C: 38, // 100°F
    THERMOSTAT_MIN_COOLING_C: 10, // 50°F
    THERMOSTAT_MAX_COOLING_C: 35, // 95°F
    THERMOSTAT_MIN_HEATING_C: 0, // 32°F
    THERMOSTAT_MAX_HEATING_C: 25, // 77°F
};

// Batch processing
export const BATCH_CONFIG = {
    COMMAND_BATCH_SIZE: 10,
    COMMAND_BATCH_DELAY: 25,
    COMMAND_MAX_BATCH_DELAY: 100,
    ATTRIBUTE_BATCH_DELAY: 100,
};

// Retry configuration
export const RETRY_CONFIG = {
    MAX_RETRIES: 3,
    BASE_DELAY: 1000,
    MAX_DELAY: 10000,
    FAILURE_THRESHOLD: 5,
    RESET_TIMEOUT: 60000,
};

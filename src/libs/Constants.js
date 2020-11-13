module.exports = {
    pluginName: "homebridge-hubitat-tonesto7",
    platformDesc: "Hubitat",
    platformName: "Hubitat-v2",
    pluginVersion: require("../../package.json").version,
    packageFile: require("../../package.json"),
    knownCapabilities: [
        // "Acceleration Sensor",
        "AccelerationSensor",
        "Actuator",
        "Alarm System Status",
        "Alarm",
        "AlarmSystemStatus",
        "Audio Mute",
        "Audio Volume",
        "Battery",
        "Bulb",
        "Button",
        // "Carbon Dioxide Measurement",
        // "Carbon Monoxide Detector",
        "CarbonDioxideMeasurement",
        "CarbonMonoxideDetector",
        // "Color Control",
        // "Color Temperature",
        "ColorControl",
        "ColorTemperature",
        "Configuration",
        // "Contact Sensor",
        "ContactSensor",
        // "Door Control",
        "Door",
        "DoorControl",
        // "Energy Meter",
        "EnergyMeter",
        // "Fan Control",
        // "Fan Light",
        // "Fan Speed",
        "Fan",
        "FanControl",
        "FanLight",
        "FanSpeed",
        // "Garage Door Control",
        "GarageDoorControl",
        // "Illuminance Measurement",
        "IlluminanceMeasurement",
        // "Light Bulb",
        "Light",
        "LightBulb",
        // "Lock Codes",
        "Lock",
        "LockCodes",
        "Mode",
        // "Motion Sensor",
        "MotionSensor",
        "Polling",
        // "Power Meter",
        "PowerMeter",
        "PowerSource",
        // "Presence Sensor",
        "PresenceSensor",
        "Refresh",
        // "Relative Humidity Measurement",
        "RelativeHumidityMeasurement",
        "Routine",
        "Sensor",
        // "Smoke Detector",
        "SmokeDetector",
        "Speaker",
        // "Switch Level",
        "Switch",
        "SwitchLevel",
        // "Tamper Alert",
        "TamperAlert",
        // "Temperature Measurement",
        "TemperatureMeasurement",
        // "Thermostat Cooling Setpoint",
        // "Thermostat Fan Mode",
        // "Thermostat Heating Setpoint",
        // "Thermostat Mode",
        // "Thermostat Operating State",
        // "Thermostat Setpoint",
        "Thermostat",
        "ThermostatCoolingSetpoint",
        "ThermostatFanMode",
        "ThermostatHeatingSetpoint",
        "ThermostatMode",
        "ThermostatOperatingState",
        "ThermostatSetpoint",
        "Valve",
        // "Water Sensor",
        "WaterSensor",
        // "Window Shade",
        "Window",
        "WindowShade",
    ],
};
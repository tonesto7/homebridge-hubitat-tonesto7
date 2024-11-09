// HE_ServiceTypes.js

let configure_fan_by_name = false;
let configure_light_by_name = true;

export default class ServiceTypes {
    constructor(accessories) {
        this.platform = accessories.platform;
        this.accessories = accessories;
        this.client = accessories.client;
        this.utils = accessories.utils;
        this.CommunityTypes = accessories.CommunityTypes;
        this.Service = accessories.Service;
        this.config = this.platform.configManager.getConfig();

        // Subscribe to configuration updates
        this.platform.configManager.onConfigUpdate((newConfig) => {
            // console.log("Client Config Update:", newConfig);
            this.config = newConfig;
        });
        configure_fan_by_name = this.config.consider_fan_by_name !== false;
        configure_light_by_name = this.config.consider_light_by_name === true;
        this.homebridge = accessories.homebridge;
        this.serviceMap = {
            acceleration_sensor: this.Service.MotionSensor,
            air_purifier: this.CommunityTypes.NewAirPurifierService,
            air_quality: this.Service.AirQualitySensor,
            alarm_system: this.Service.SecuritySystem,
            battery: this.Service.Battery,
            button: this.Service.StatelessProgrammableSwitch,
            carbon_dioxide: this.Service.CarbonDioxideSensor,
            carbon_monoxide: this.Service.CarbonMonoxideSensor,
            contact_sensor: this.Service.ContactSensor,
            // energy_meter: this.Service.Switch,
            fan: this.Service.Fanv2,
            garage_door: this.Service.GarageDoorOpener,
            humidity_sensor: this.Service.HumiditySensor,
            illuminance_sensor: this.Service.LightSensor,
            light: this.Service.Lightbulb,
            lock: this.Service.LockMechanism,
            motion_sensor: this.Service.MotionSensor,
            // power_meter: this.Service.Switch,
            presence_sensor: this.Service.OccupancySensor,
            outlet: this.Service.Outlet,
            smoke_detector: this.Service.SmokeSensor,
            speaker: this.Service.Speaker,
            switch_device: this.Service.Switch,
            temperature_sensor: this.Service.TemperatureSensor,
            thermostat: this.Service.Thermostat,
            thermostat_fan: this.Service.Fanv2,
            valve: this.Service.Valve,
            virtual_mode: this.Service.Switch,
            virtual_piston: this.Service.Switch,
            virtual_routine: this.Service.Switch,
            water_sensor: this.Service.LeakSensor,
            window_shade: this.Service.WindowCovering,
        };
    }

    getServiceTypes(accessory) {
        let servicesFound = [];
        let servicesBlocked = [];
        for (let i = 0; i < serviceTests.length; i++) {
            const svcTest = serviceTests[i];
            if (svcTest.ImplementsService(accessory)) {
                // console.log(svcTest.Name);
                const blockSvc = svcTest.onlyOnNoGrps === true && servicesFound.length > 0;
                if (blockSvc) {
                    servicesBlocked.push(svcTest.Name);
                    this.platform.logDebug(`(${accessory.name}) | Service BLOCKED | name: ${svcTest.Name} | Cnt: ${servicesFound.length} | svcs: ${JSON.stringify(servicesFound)}`);
                }
                if (!blockSvc && this.serviceMap[svcTest.Name]) {
                    servicesFound.push({
                        name: svcTest.Name,
                        type: this.serviceMap[svcTest.Name],
                    });
                }
            }
        }
        if (servicesBlocked.length) {
            this.platform.logDebug(`(${accessory.name}) | Services BLOCKED | ${servicesBlocked}`);
        }
        return servicesFound;
    }

    lookupServiceType(name) {
        if (this.serviceMap[name]) {
            return this.serviceMap[name];
        }
        return null;
    }
}

class ServiceTest {
    constructor(name, testfn, onlyOnNoGrps = false) {
        this.ImplementsService = testfn;
        this.Name = name;
        this.onlyOnNoGrps = onlyOnNoGrps !== false;
    }
}

//TODO: Build out the access into capabilitiy map { hasSwitch: true, hasWater: false, hasPower: false }
//TODO: Use those to help filter out the ServiceTest items below instead of a long line of accessory.hasCapability and hasAttribute.
//TODO: or break each comparision item into a promise.all type logic.

// NOTE: These Tests are executed in order which is important
const serviceTests = [
    new ServiceTest("window_shade", (accessory) => accessory.hasCapability("WindowShade") && !(accessory.hasCapability("Speaker") || accessory.hasCapability("Fan") || accessory.hasCapability("Fan Control")), true),
    new ServiceTest(
        "light",
        (accessory) =>
            accessory.hasCapability("Switch Level") &&
            (accessory.hasCapability("LightBulb") || accessory.hasCapability("Bulb") || accessory.context.deviceData.name.toLowerCase().includes("light") || accessory.hasAttribute("saturation") || accessory.hasAttribute("hue") || accessory.hasAttribute("colorTemperature") || accessory.hasCapability("Color Control")),
        true,
    ),
    // new ServiceTest("air_purifier", (accessory) => accessory.hasCapability("custom.airPurifierOperationMode")),
    new ServiceTest("garage_door", (accessory) => accessory.hasCapability("GarageDoorControl")),
    new ServiceTest("lock", (accessory) => accessory.hasCapability("Lock")),
    new ServiceTest("valve", (accessory) => accessory.hasCapability("Valve")),
    new ServiceTest("speaker", (accessory) => accessory.hasCapability("Speaker")),
    new ServiceTest("fan", (accessory) => accessory.hasCapability("Fan") || accessory.hasCapability("FanControl") || (configure_fan_by_name && accessory.context.deviceData.name.toLowerCase().includes("fan")) || accessory.hasCommand("setSpeed") || accessory.hasAttribute("speed")),
    new ServiceTest("virtual_mode", (accessory) => accessory.hasCapability("Mode")),
    new ServiceTest("virtual_piston", (accessory) => accessory.hasCapability("Piston")),
    new ServiceTest("virtual_routine", (accessory) => accessory.hasCapability("Routine")),
    new ServiceTest("button", (accessory) => accessory.hasCapability("Button") || accessory.hasCapability("DoubleTapableButton") || accessory.hasCapability("HoldableButton") || accessory.hasCapability("PushableButton") || accessory.hasCapability("ReleasableButton")),
    new ServiceTest("light", (accessory) => accessory.hasCapability("Switch") && (accessory.hasCapability("LightBulb") || accessory.hasCapability("Bulb") || (configure_light_by_name && accessory.context.deviceData.name.toLowerCase().includes("light"))), true),
    new ServiceTest("outlet", (accessory) => accessory.hasCapability("Outlet") && accessory.hasCapability("Switch"), true),
    new ServiceTest("switch_device", (accessory) => accessory.hasCapability("Switch") && !(accessory.hasCapability("LightBulb") || accessory.hasCapability("Outlet") || accessory.hasCapability("Bulb") || (configure_light_by_name && accessory.context.deviceData.name.toLowerCase().includes("light")) || accessory.hasCapability("Button")), true),
    new ServiceTest("smoke_detector", (accessory) => accessory.hasCapability("SmokeDetector") && accessory.hasAttribute("smoke")),
    new ServiceTest("carbon_monoxide", (accessory) => accessory.hasCapability("CarbonMonoxideDetector") && accessory.hasAttribute("carbonMonoxide")),
    new ServiceTest("carbon_dioxide", (accessory) => accessory.hasCapability("CarbonDioxideMeasurement") && accessory.hasAttribute("carbonDioxideMeasurement")),
    new ServiceTest("motion_sensor", (accessory) => accessory.hasCapability("Motion Sensor")),
    new ServiceTest("acceleration_sensor", (accessory) => accessory.hasCapability("Acceleration Sensor")),
    new ServiceTest("water_sensor", (accessory) => accessory.hasCapability("Water Sensor")),
    new ServiceTest("presence_sensor", (accessory) => accessory.hasCapability("PresenceSensor")),
    new ServiceTest("humidity_sensor", (accessory) => accessory.hasCapability("RelativeHumidityMeasurement") && accessory.hasAttribute("humidity") && !(accessory.hasCapability("Thermostat") || accessory.hasCapability("ThermostatOperatingState") || accessory.hasAttribute("thermostatOperatingState"))),
    new ServiceTest("temperature_sensor", (accessory) => accessory.hasCapability("TemperatureMeasurement") && !(accessory.hasCapability("Thermostat") || accessory.hasCapability("ThermostatOperatingState") || accessory.hasAttribute("thermostatOperatingState"))),
    new ServiceTest("illuminance_sensor", (accessory) => accessory.hasCapability("IlluminanceMeasurement")),
    new ServiceTest("contact_sensor", (accessory) => accessory.hasCapability("ContactSensor") && !accessory.hasCapability("GarageDoorControl")),
    new ServiceTest("air_quality", (accessory) => accessory.hasCapability("airQuality")),
    new ServiceTest("battery", (accessory) => accessory.hasCapability("Battery")),
    new ServiceTest("air_quality", (accessory) => accessory.hasCapability("AirQuality")),
    // new ServiceTest("energy_meter", accessory => (accessory.hasCapability('Energy Meter') && !accessory.hasCapability('Switch')), true),
    // new ServiceTest("power_meter", accessory => (accessory.hasCapability('Power Meter') && !accessory.hasCapability('Switch')), true),
    new ServiceTest("thermostat", (accessory) => accessory.hasCapability("Thermostat") || accessory.hasCapability("ThermostatOperatingState") || accessory.hasAttribute("thermostatOperatingState")),
    new ServiceTest("thermostat_fan", (accessory) => accessory.hasCapability("Thermostat") && accessory.hasAttribute("thermostatFanMode") && accessory.hasCommand("fanAuto") && accessory.hasCommand("fanOn")),
    new ServiceTest("alarm_system", (accessory) => accessory.hasAttribute("alarmSystemStatus")),
];

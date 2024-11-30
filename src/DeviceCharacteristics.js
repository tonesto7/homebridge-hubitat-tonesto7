// DeviceCharacteristics.js

import { AccelerationSensor } from "./devices/AccelerationSensor.js";
import { AirPurifier } from "./devices/AirPurifier.js";
import { AirQuality } from "./devices/AirQuality.js";
import { AlarmSystem } from "./devices/AlarmSystem.js";
import { Battery } from "./devices/Battery.js";
import { Button } from "./devices/Button.js";
import { CarbonDioxide } from "./devices/CarbonDioxide.js";
import { CarbonMonoxide } from "./devices/CarbonMonoxide.js";
import { ContactSensor } from "./devices/ContactSensor.js";
import { EnergyMeter } from "./devices/EnergyMeter.js";
import { Fan } from "./devices/Fan.js";
import { FilterMaintenance } from "./devices/FilterMaintenance.js";
import { GarageDoor } from "./devices/GarageDoor.js";
import { Humidifier } from "./devices/Humidifier.js";
import { HumiditySensor } from "./devices/HumiditySensor.js";
import { IlluminanceSensor } from "./devices/IlluminanceSensor.js";
import { LeakSensor } from "./devices/LeakSensor.js";
import { Light } from "./devices/Light.js";
import { Lock } from "./devices/Lock.js";
import { MotionSensor } from "./devices/MotionSensor.js";
import { Outlet } from "./devices/Outlet.js";
import { PowerMeter } from "./devices/PowerMeter.js";
import { PresenceSensor } from "./devices/PresenceSensor.js";
import { SmokeDetector } from "./devices/SmokeDetector.js";
import { Speaker } from "./devices/Speaker.js";
import { Switch } from "./devices/Switch.js";
import { TemperatureSensor } from "./devices/TemperatureSensor.js";
import { Thermostat } from "./devices/Thermostat.js";
import { Valve } from "./devices/Valve.js";
import { VirtualMode } from "./devices/VirtualMode.js";
import { VirtualPiston } from "./devices/VirtualPiston.js";
import { WindowCovering } from "./devices/WindowCovering.js";

export default class DeviceCharacteristics {
    constructor(platform, accessories) {
        this.config = platform.configManager.getConfig();
        this.Service = platform.Service;
        this.Characteristic = platform.Characteristic;
        this.CommunityTypes = platform.CommunityTypes;
        this.accessories = accessories;
        this.logManager = platform.logManager;
        this.client = accessories.client;
        this.transforms = accessories.transforms;
        this.tempUnit = platform.configManager.getTempUnit();

        platform.configManager.onConfigUpdate(this.handleConfigUpdate.bind(this));

        // Initialize device handlers
        this.deviceHandlers = {
            accelerationSensor: new AccelerationSensor(platform),
            airPurifier: new AirPurifier(platform),
            airQuality: new AirQuality(platform),
            alarmSystem: new AlarmSystem(platform),
            button: new Button(platform),
            carbonDioxide: new CarbonDioxide(platform),
            carbonMonoxide: new CarbonMonoxide(platform),
            battery: new Battery(platform),
            contactSensor: new ContactSensor(platform),
            energyMeter: new EnergyMeter(platform),
            fan: new Fan(platform),
            filterMaintenance: new FilterMaintenance(platform),
            garageDoor: new GarageDoor(platform),
            humidifier: new Humidifier(platform),
            humiditySensor: new HumiditySensor(platform),
            illuminanceSensor: new IlluminanceSensor(platform),
            leakSensor: new LeakSensor(platform),
            light: new Light(platform),
            lock: new Lock(platform),
            motionSensor: new MotionSensor(platform),
            outlet: new Outlet(platform),
            powerMeter: new PowerMeter(platform),
            presenceSensor: new PresenceSensor(platform),
            smokeDetector: new SmokeDetector(platform),
            speaker: new Speaker(platform),
            switch: new Switch(platform),
            temperatureSensor: new TemperatureSensor(platform),
            thermostat: new Thermostat(platform),
            valve: new Valve(platform),
            virtualMode: new VirtualMode(platform),
            virtualPiston: new VirtualPiston(platform),
            windowCovering: new WindowCovering(platform),
        };
    }

    handleConfigUpdate(newConfig) {
        this.config = newConfig;
    }

    // Acceleration Sensor
    accelerationSensor(_accessory) {
        return this.deviceHandlers.accelerationSensor.configure(_accessory);
    }

    // Air Purifier
    airPurifier(_accessory) {
        return this.deviceHandlers.airPurifier.configure(_accessory);
    }

    // Air Quality Sensor
    airQuality(_accessory) {
        return this.deviceHandlers.airQuality.configure(_accessory);
    }

    // Alarm System
    alarmSystem(_accessory) {
        return this.deviceHandlers.alarmSystem.configure(_accessory);
    }

    // Battery Service
    battery(_accessory) {
        return this.deviceHandlers.battery.configure(_accessory);
    }

    // Button
    button(_accessory) {
        // return this.deviceHandlers.button.configure(_accessory);
        // const _service = this.Service.StatelessProgrammableSwitch;
        // const buttonCount = Math.min(Math.max(_accessory.context.deviceData.attributes.numberOfButtons || 1, 1), 10);
        // const validValues = this.transforms.getSupportedButtonValues(_accessory);
        // for (let btnNum = 1; btnNum <= buttonCount; btnNum++) {
        //     const oldServiceName = `${_accessory.context.deviceData.deviceid}_${btnNum}`;
        //     const newServiceName = `${_accessory.context.deviceData.deviceid} Button ${btnNum}`;
        //     // Find existing service
        //     let btnService = _accessory.services.find((s) => s.UUID === _service.UUID && (s.displayName === oldServiceName || s.subtype === btnNum.toString()));
        //     // Update old format service
        //     if (btnService && btnService.displayName === oldServiceName) {
        //         const nameChar = btnService.getCharacteristic(this.Characteristic.Name);
        //         if (nameChar) {
        //             nameChar.updateValue(newServiceName);
        //         }
        //     }
        //     // Create new service if needed
        //     if (!btnService) {
        //         btnService = _accessory.getOrAddService(_service, newServiceName, btnNum.toString());
        //     }
        //     // Configure characteristics
        //     let c = btnService.getCharacteristic(this.Characteristic.ProgrammableSwitchEvent);
        //     c.setProps({
        //         validValues: validValues,
        //     });
        //     c.eventOnlyCharacteristic = true;
        //     if (!c._events.get) {
        //         c.on("get", (callback) => {
        //             callback(null, null);
        //         });
        //         this.accessories.storeCharacteristicItem("button", _accessory.context.deviceData.deviceid, c);
        //     }
        //     btnService.getCharacteristic(this.Characteristic.ServiceLabelIndex).updateValue(btnNum);
        // }
        // _accessory.context.deviceGroups.push("button");
        // return _accessory;
    }

    // buttonEvent(btnNum, btnVal, devId, btnMap) {
    //     let bSvc = btnMap[`${devId}_${btnNum}`];
    //     if (bSvc) {
    //         let btnOut;
    //         switch (btnVal) {
    //             case "pushed":
    //                 btnOut = this.Characteristic.ProgrammableSwitchEvent.SINGLE_PRESS;
    //                 break;
    //             case "held":
    //                 btnOut = this.Characteristic.ProgrammableSwitchEvent.LONG_PRESS;
    //                 break;
    //             case "doubleTapped":
    //                 btnOut = this.Characteristic.ProgrammableSwitchEvent.DOUBLE_PRESS;
    //                 break;
    //         }
    //         bSvc.getCharacteristic(this.Characteristic.ProgrammableSwitchEvent).setValue(btnOut);
    //     }
    // }

    // Carbon Dioxide Sensor
    carbonDioxide(_accessory) {
        return this.deviceHandlers.carbonDioxide.configure(_accessory);
    }

    // Carbon Monoxide Sensor
    carbonMonoxide(_accessory) {
        return this.deviceHandlers.carbonMonoxide.configure(_accessory);
    }

    // Contact Sensor
    contactSensor(_accessory) {
        console.log(`Configuring Contact Sensor for ${_accessory.displayName} 1`);
        return this.deviceHandlers.contactSensor.configure(_accessory);
    }

    // Energy Meter
    energyMeter(_accessory) {
        return this.deviceHandlers.energyMeter.configure(_accessory);
    }

    // Fan
    fan(_accessory) {
        return this.deviceHandlers.fan.configure(_accessory);
    }

    // Filter Maintenance
    filterMaintenance(_accessory) {
        return this.deviceHandlers.filterMaintenance.configure(_accessory);
    }

    // Garage Door
    garageDoor(_accessory) {
        return this.deviceHandlers.garageDoor.configure(_accessory);
    }

    humidifier(_accessory) {
        return this.deviceHandlers.humidifier.configure(_accessory);
    }

    // Humidity Sensor
    humiditySensor(_accessory) {
        return this.deviceHandlers.humiditySensor.configure(_accessory);
    }

    // Illuminance Sensor
    illuminanceSensor(_accessory) {
        return this.deviceHandlers.illuminanceSensor.configure(_accessory);
    }

    // Leak Sensor
    leakSensor(_accessory) {
        return this.deviceHandlers.leakSensor.configure(_accessory);
    }

    // Light Bulb
    light(_accessory) {
        return this.deviceHandlers.light.configure(_accessory);
    }

    // Lock Mechanism
    lock(_accessory) {
        return this.deviceHandlers.lock.configure(_accessory);
    }

    // Motion Sensor
    motionSensor(_accessory) {
        return this.deviceHandlers.motionSensor.configure(_accessory);
    }

    // Outlet
    outlet(_accessory) {
        return this.deviceHandlers.outlet.configure(_accessory);
    }

    // Power Meter
    powerMeter(_accessory) {
        return this.deviceHandlers.powerMeter.configure(_accessory);
    }

    // Presence Sensor
    presenceSensor(_accessory) {
        return this.deviceHandlers.presenceSensor.configure(_accessory);
    }

    // Presence Sensor
    presenceSensor(_accessory) {
        return this.deviceHandlers.presenceSensor.configure(_accessory);
    }

    // Smoke Detector
    smokeDetector(_accessory) {
        return this.deviceHandlers.smokeDetector.configure(_accessory);
    }

    // Speaker
    speaker(_accessory) {
        return this.deviceHandlers.speaker.configure(_accessory);
    }

    // Switch
    switchDevice(_accessory) {
        return this.deviceHandlers.switch.configure(_accessory);
    }

    // Temperature Sensor
    temperatureSensor(_accessory) {
        return this.deviceHandlers.temperatureSensor.configure(_accessory);
    }

    // Thermostat
    thermostat(_accessory) {
        return this.deviceHandlers.thermostat.configure(_accessory);
    }

    // Valve
    valve(_accessory) {
        return this.deviceHandlers.valve.configure(_accessory);
    }

    // Virtual Mode
    virtualMode(_accessory) {
        return this.deviceHandlers.virtualMode.configure(_accessory);
    }

    // Virtual Piston
    virtualPiston(_accessory) {
        return this.deviceHandlers.virtualPiston.configure(_accessory);
    }

    // Window Covering
    windowCovering(_accessory) {
        return this.deviceHandlers.windowCovering.configure(_accessory);
    }
}

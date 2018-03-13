var inherits = require('util').inherits;

var Accessory, Service, Characteristic, uuid, EnergyCharacteristics;

/*
 *   Hubitat Accessory
 */

module.exports = function(oAccessory, oService, oCharacteristic, ouuid) {
    if (oAccessory) {
        Accessory = oAccessory;
        Service = oService;
        Characteristic = oCharacteristic;
        EnergyCharacteristics = require('../lib/customCharacteristics').EnergyCharacteristics(Characteristic);

        uuid = ouuid;

        inherits(HubitatAccessory, Accessory);
        HubitatAccessory.prototype.loadData = loadData;
        HubitatAccessory.prototype.getServices = getServices;
    }
    return HubitatAccessory;
};
module.exports.HubitatAccessory = HubitatAccessory;

function toTitleCase(str) {
    return str.replace(/\w\S*/g, txt => txt.charAt(0).toUpperCase() + txt.substr(1).toLowerCase());
}

function HubitatAccessory(platform, device) {
    // console.log("HubitatAccessory: ", platform, device);
    this.deviceid = device.deviceid;
    this.name = device.name;
    this.platform = platform;
    this.state = {};
    this.device = device;

    var idKey = 'hbdev:hubitat:' + this.deviceid;
    var id = uuid.generate(idKey);

    Accessory.call(this, this.name, id);
    var that = this;
    var accessoryInformationService = that
        .getService(Service.AccessoryInformation)
        .setCharacteristic(Characteristic.FirmwareRevision, that.device.firmwareVersion)
        .setCharacteristic(Characteristic.Manufacturer, that.device.manufacturerName)
        .setCharacteristic(Characteristic.Model, `${toTitleCase(that.device.modelName)}`)
        .setCharacteristic(Characteristic.Name, that.name)
        .setCharacteristic(Characteristic.SerialNumber, that.device.serialNumber);

    // Get the Capabilities List
    for (var index in device.capabilities) {
        if (platform.knownCapabilities.indexOf(index) === -1 && platform.unknownCapabilities.indexOf(index) === -1) {
            platform.unknownCapabilities.push(index);
        }
    }

    that.getaddService = function(Service) {
        var myService = that.getService(Service);
        if (!myService) {
            myService = that.addService(Service);
        }
        return myService;
    };

    that.deviceGroup = 'unknown'; // that way we can easily tell if we set a device group
    var thisCharacteristic;
    // platform.log(JSON.stringify(device.capabilities));
    if (device.capabilities['Switch Level'] !== undefined) {
        if (device.commands.levelOpenClose) {
            // This is a Window Shade
            that.deviceGroup = 'shades';

            thisCharacteristic = that.getaddService(Service.WindowCovering).getCharacteristic(Characteristic.TargetPosition);
            thisCharacteristic.on('get', function(callback) {
                callback(null, parseInt(that.device.attributes.level));
            });
            thisCharacteristic.on('set', function(value, callback) {
                that.platform.api.runCommand(callback, that.deviceid, 'setLevel', { value1: value });
            });
            that.platform.addAttributeUsage('level', that.deviceid, thisCharacteristic);

            thisCharacteristic = that.getaddService(Service.WindowCovering).getCharacteristic(Characteristic.CurrentPosition);
            thisCharacteristic.on('get', function(callback) {
                callback(null, parseInt(that.device.attributes.level));
            });
            that.platform.addAttributeUsage('level', that.deviceid, thisCharacteristic);
        } else if (device.commands.lowSpeed) {
            // This is a Ceiling Fan
            that.deviceGroup = 'fans';

            thisCharacteristic = that.getaddService(Service.Fan).getCharacteristic(Characteristic.On);
            thisCharacteristic.on('get', function(callback) {
                callback(null, that.device.attributes.switch === 'on');
            });
            thisCharacteristic.on('set', function(value, callback) {
                if (value) that.platform.api.runCommand(callback, that.deviceid, 'on');
                else that.platform.api.runCommand(callback, that.deviceid, 'off');
            });
            that.platform.addAttributeUsage('switch', that.deviceid, thisCharacteristic);

            thisCharacteristic = that.getaddService(Service.Fan).getCharacteristic(Characteristic.RotationSpeed);
            thisCharacteristic.on('get', function(callback) {
                callback(null, parseInt(that.device.attributes.level));
            });
            thisCharacteristic.on('set', function(value, callback) {
                if (value > 0) that.platform.api.runCommand(callback, that.deviceid, 'setLevel', { value1: value });
            });
            that.platform.addAttributeUsage('level', that.deviceid, thisCharacteristic);
        } else if (device.commands.setLevel) {
            that.deviceGroup = 'lights';
            thisCharacteristic = that.getaddService(Service.Lightbulb).getCharacteristic(Characteristic.On);
            thisCharacteristic.on('get', function(callback) {
                callback(null, that.device.attributes.switch === 'on');
            });
            thisCharacteristic.on('set', function(value, callback) {
                if (value) that.platform.api.runCommand(callback, that.deviceid, 'on');
                else that.platform.api.runCommand(callback, that.deviceid, 'off');
            });
            that.platform.addAttributeUsage('switch', that.deviceid, thisCharacteristic);

            thisCharacteristic = that.getaddService(Service.Lightbulb).getCharacteristic(Characteristic.Brightness);
            thisCharacteristic.on('get', function(callback) {
                callback(null, parseInt(that.device.attributes.level));
            });
            thisCharacteristic.on('set', function(value, callback) {
                that.platform.api.runCommand(callback, that.deviceid, 'setLevel', { value1: value });
            });
            that.platform.addAttributeUsage('level', that.deviceid, thisCharacteristic);

            if (device.capabilities['Color Control'] !== undefined) {
                thisCharacteristic = that.getaddService(Service.Lightbulb).getCharacteristic(Characteristic.Hue);
                thisCharacteristic.on('get', function(callback) {
                    callback(null, Math.round(that.device.attributes.hue * 3.6));
                });
                thisCharacteristic.on('set', function(value, callback) {
                    that.platform.api.runCommand(callback, that.deviceid, 'setHue', { value1: Math.round(value / 3.6) });
                });
                that.platform.addAttributeUsage('hue', that.deviceid, thisCharacteristic);

                thisCharacteristic = that.getaddService(Service.Lightbulb).getCharacteristic(Characteristic.Saturation);
                thisCharacteristic.on('get', function(callback) {
                    callback(null, parseInt(that.device.attributes.saturation));
                });
                thisCharacteristic.on('set', function(value, callback) {
                    that.platform.api.runCommand(callback, that.deviceid, 'setSaturation', { value1: value });
                });
                that.platform.addAttributeUsage('saturation', that.deviceid, thisCharacteristic);
            }
        }
    }

    if (device.capabilities['Garage Door Control'] !== undefined) {
        that.deviceGroup = 'garage_doors';

        thisCharacteristic = that.getaddService(Service.GarageDoorOpener).getCharacteristic(Characteristic.TargetDoorState);
        thisCharacteristic.on('get', function(callback) {
            if (that.device.attributes.door === 'closed' || that.device.attributes.door === 'closing') callback(null, Characteristic.TargetDoorState.CLOSED);
            else if (that.device.attributes.door === 'open' || that.device.attributes.door === 'opening') callback(null, Characteristic.TargetDoorState.OPEN);
        });
        thisCharacteristic.on('set', function(value, callback) {
            if (value === Characteristic.TargetDoorState.OPEN) {
                that.platform.api.runCommand(callback, that.deviceid, 'open');
                that.device.attributes.door = 'opening';
            } else if (value === Characteristic.TargetDoorState.CLOSED) {
                that.platform.api.runCommand(callback, that.deviceid, 'close');
                that.device.attributes.door = 'closing';
            }
        });
        that.platform.addAttributeUsage('door', that.deviceid, thisCharacteristic);

        thisCharacteristic = that.getaddService(Service.GarageDoorOpener).getCharacteristic(Characteristic.CurrentDoorState);
        thisCharacteristic.on('get', function(callback) {
            switch (that.device.attributes.door) {
                case 'open':
                    callback(null, Characteristic.TargetDoorState.OPEN);
                    break;
                case 'opening':
                    callback(null, Characteristic.TargetDoorState.OPENING);
                    break;
                case 'closed':
                    callback(null, Characteristic.TargetDoorState.CLOSED);
                    break;
                case 'closing':
                    callback(null, Characteristic.TargetDoorState.CLOSING);
                    break;
                default:
                    callback(null, Characteristic.TargetDoorState.STOPPED);
                    break;
            }
        });
        that.platform.addAttributeUsage('door', that.deviceid, thisCharacteristic);

        that.getaddService(Service.GarageDoorOpener).setCharacteristic(Characteristic.ObstructionDetected, false);
    }

    if (device.capabilities['Lock'] !== undefined) {
        that.deviceGroup = 'locks';

        thisCharacteristic = that.getaddService(Service.LockMechanism).getCharacteristic(Characteristic.LockCurrentState);
        thisCharacteristic.on('get', function(callback) {
            switch (that.device.attributes.lock) {
                case 'locked':
                    callback(null, Characteristic.LockCurrentState.SECURED);
                    break;
                case 'unlocked':
                    callback(null, Characteristic.LockCurrentState.UNSECURED);
                    break;
                default:
                    callback(null, Characteristic.LockCurrentState.UNKNOWN);
                    break;
            }
        });
        that.platform.addAttributeUsage('lock', that.deviceid, thisCharacteristic);

        thisCharacteristic = that.getaddService(Service.LockMechanism).getCharacteristic(Characteristic.LockTargetState);
        thisCharacteristic.on('get', function(callback) {
            switch (that.device.attributes.lock) {
                case 'locked':
                    callback(null, Characteristic.LockCurrentState.SECURED);
                    break;
                case 'unlocked':
                    callback(null, Characteristic.LockCurrentState.UNSECURED);
                    break;
                default:
                    callback(null, Characteristic.LockCurrentState.UNKNOWN);
                    break;
            }
        });
        thisCharacteristic.on('set', function(value, callback) {
            if (value === false) {
                value = Characteristic.LockTargetState.UNSECURED;
            } else if (value === true) {
                value = Characteristic.LockTargetState.SECURED;
            }
            switch (value) {
                case Characteristic.LockTargetState.SECURED:
                    that.platform.api.runCommand(callback, that.deviceid, 'lock');
                    that.device.attributes.lock = 'locked';
                    break;
                case Characteristic.LockTargetState.UNSECURED:
                    that.platform.api.runCommand(callback, that.deviceid, 'unlock');
                    that.device.attributes.lock = 'unlocked';
                    break;
            }
        });
        that.platform.addAttributeUsage('lock', that.deviceid, thisCharacteristic);
    }

    //    if (devices.capabilities["Valve"] !== undefined) {
    //        that.deviceGroup = "valve";
    // Thinking of implementing this as a Door service.
    //    }

    if (device.capabilities['Button'] !== undefined) {
        that.deviceGroup = 'button';
    }
    if (device.capabilities['Switch'] !== undefined && that.deviceGroup === 'unknown') {
        that.deviceGroup = 'switch';
        thisCharacteristic = that.getaddService(Service.Switch).getCharacteristic(Characteristic.On);
        thisCharacteristic.on('get', function(callback) {
            callback(null, that.device.attributes.switch === 'on');
        });
        thisCharacteristic.on('set', function(value, callback) {
            if (value) that.platform.api.runCommand(callback, that.deviceid, 'on');
            else that.platform.api.runCommand(callback, that.deviceid, 'off');
        });
        that.platform.addAttributeUsage('switch', that.deviceid, thisCharacteristic);

        if (device.capabilities['Switch Level'] !== undefined) {
            thisCharacteristic = that.getaddService(Service.Lightbulb).getCharacteristic(Characteristic.Brightness);
            thisCharacteristic.on('get', function(callback) {
                callback(null, parseInt(that.device.attributes.level));
            });
            thisCharacteristic.on('set', function(value, callback) {
                that.platform.api.runCommand(callback, that.deviceid, 'setLevel', { value1: value });
            });
            that.platform.addAttributeUsage('level', that.deviceid, thisCharacteristic);
        }
    }

    if (device.capabilities['Smoke Detector'] !== undefined && that.device.attributes.smoke) {
        that.deviceGroup = 'detectors';

        thisCharacteristic = that.getaddService(Service.SmokeSensor).getCharacteristic(Characteristic.SmokeDetected);
        thisCharacteristic.on('get', function(callback) {
            if (that.device.attributes.smoke === 'clear') callback(null, Characteristic.SmokeDetected.SMOKE_NOT_DETECTED);
            else callback(null, Characteristic.SmokeDetected.SMOKE_DETECTED);
        });
        that.platform.addAttributeUsage('smoke', that.deviceid, thisCharacteristic);
    }

    if (device.capabilities['Carbon Monoxide Detector'] !== undefined && that.device.attributes.carbonMonoxide) {
        that.deviceGroup = 'detectors';

        thisCharacteristic = that.getaddService(Service.CarbonMonoxideSensor).getCharacteristic(Characteristic.CarbonMonoxideDetected);
        thisCharacteristic.on('get', function(callback) {
            if (that.device.attributes.carbonMonoxide === 'clear') callback(null, Characteristic.CarbonMonoxideDetected.CO_LEVELS_NORMAL);
            else callback(null, Characteristic.CarbonMonoxideDetected.CO_LEVELS_ABNORMAL);
        });
        that.platform.addAttributeUsage('carbonMonoxide', that.deviceid, thisCharacteristic);
    }

    if (device.capabilities['Motion Sensor'] !== undefined) {
        if (that.deviceGroup === 'unknown') {
            that.deviceGroup = 'sensor';
        }

        thisCharacteristic = that.getaddService(Service.MotionSensor).getCharacteristic(Characteristic.MotionDetected);
        thisCharacteristic.on('get', function(callback) {
            callback(null, that.device.attributes.motion === 'active');
        });
        that.platform.addAttributeUsage('motion', that.deviceid, thisCharacteristic);
    }

    if (device.capabilities['Water Sensor'] !== undefined) {
        if (that.deviceGroup === 'unknown') {
            that.deviceGroup = 'sensor';
        }

        thisCharacteristic = that.getaddService(Service.LeakSensor).getCharacteristic(Characteristic.LeakDetected);
        thisCharacteristic.on('get', function(callback) {
            var reply = Characteristic.LeakDetected.LEAK_DETECTED;
            if (that.device.attributes.water === 'dry') reply = Characteristic.LeakDetected.LEAK_NOT_DETECTED;
            callback(null, reply);
        });
        that.platform.addAttributeUsage('water', that.deviceid, thisCharacteristic);
    }

    if (device.capabilities['Presence Sensor'] !== undefined) {
        if (that.deviceGroup === 'unknown') that.deviceGroup = 'sensor';

        thisCharacteristic = that.getaddService(Service.OccupancySensor).getCharacteristic(Characteristic.OccupancyDetected);
        thisCharacteristic.on('get', function(callback) {
            callback(null, that.device.attributes.presence === 'present');
        });
        that.platform.addAttributeUsage('presence', that.deviceid, thisCharacteristic);
    }

    if (device.capabilities['Relative Humidity Measurement'] !== undefined) {
        if (that.deviceGroup === 'unknown') that.deviceGroup = 'sensor';
        thisCharacteristic = that.getaddService(Service.HumiditySensor).getCharacteristic(Characteristic.CurrentRelativeHumidity);
        thisCharacteristic.on('get', function(callback) {
            callback(null, Math.round(that.device.attributes.humidity));
        });
        that.platform.addAttributeUsage('humidity', that.deviceid, thisCharacteristic);
    }

    if (device.capabilities['Temperature Measurement'] !== undefined) {
        if (that.deviceGroup === 'unknown') that.deviceGroup = 'sensor';
        thisCharacteristic = that.getaddService(Service.TemperatureSensor).getCharacteristic(Characteristic.CurrentTemperature);
        thisCharacteristic.on('get', function(callback) {
            if (that.platform.temperature_unit === 'C') callback(null, Math.round(that.device.attributes.temperature * 10) / 10);
            else callback(null, Math.round((that.device.attributes.temperature - 32) / 1.8 * 10) / 10);
        });
        that.platform.addAttributeUsage('temperature', that.deviceid, thisCharacteristic);
    }
    if (device.capabilities['Illuminance Measurement'] !== undefined) {
        // console.log(device);
        if (that.deviceGroup === 'unknown') that.deviceGroup = 'sensor';
        thisCharacteristic = that.getaddService(Service.LightSensor).getCharacteristic(Characteristic.CurrentAmbientLightLevel);
        thisCharacteristic.on('get', function(callback) {
            callback(null, Math.ceil(that.device.attributes.illuminance));
        });
        that.platform.addAttributeUsage('illuminance', that.deviceid, thisCharacteristic);
    }
    if (device.capabilities['Contact Sensor'] !== undefined && device.capabilities['Garage Door Control'] === undefined) {
        if (that.deviceGroup === 'unknown') that.deviceGroup = 'sensor';
        thisCharacteristic = that.getaddService(Service.ContactSensor).getCharacteristic(Characteristic.ContactSensorState);
        thisCharacteristic.on('get', function(callback) {
            if (that.device.attributes.contact === 'closed') callback(null, Characteristic.ContactSensorState.CONTACT_DETECTED);
            else callback(null, Characteristic.ContactSensorState.CONTACT_NOT_DETECTED);
        });
        that.platform.addAttributeUsage('contact', that.deviceid, thisCharacteristic);
    }

    if (device.capabilities['Battery'] !== undefined) {
        thisCharacteristic = that.getaddService(Service.BatteryService).getCharacteristic(Characteristic.BatteryLevel);
        thisCharacteristic.on('get', function(callback) {
            callback(null, Math.round(that.device.attributes.battery));
        });
        that.platform.addAttributeUsage('battery', that.deviceid, thisCharacteristic);

        thisCharacteristic = that.getaddService(Service.BatteryService).getCharacteristic(Characteristic.StatusLowBattery);
        thisCharacteristic.on('get', function(callback) {
            if (that.device.attributes.battery < 0.2) callback(null, Characteristic.StatusLowBattery.BATTERY_LEVEL_LOW);
            else callback(null, Characteristic.StatusLowBattery.BATTERY_LEVEL_NORMAL);
        });

        that.getaddService(Service.BatteryService).setCharacteristic(Characteristic.ChargingState, Characteristic.ChargingState.NOT_CHARGING);
        that.platform.addAttributeUsage('battery', that.deviceid, thisCharacteristic);
    }

    if (device.capabilities['Energy Meter'] !== undefined) {
        that.deviceGroup = 'EnergyMeter';
        thisCharacteristic = that.getaddService(Service.Outlet).addCharacteristic(EnergyCharacteristics.TotalConsumption1);
        thisCharacteristic.on('get', function(callback) {
            callback(null, Math.round(that.device.attributes.energy));
        });
        that.platform.addAttributeUsage('energy', that.deviceid, thisCharacteristic);
    }

    if (device.capabilities['Power Meter'] !== undefined) {
        thisCharacteristic = that.getaddService(Service.Outlet).addCharacteristic(EnergyCharacteristics.CurrentConsumption1);
        thisCharacteristic.on('get', function(callback) {
            callback(null, Math.round(that.device.attributes.power));
        });
        that.platform.addAttributeUsage('power', that.deviceid, thisCharacteristic);
    }

    if (device.capabilities['Acceleration Sensor'] !== undefined) {
        if (that.deviceGroup === 'unknown') that.deviceGroup = 'sensor';
    }

    if (device.capabilities['Three Axis'] !== undefined) {
        if (that.deviceGroup === 'unknown') that.deviceGroup = 'sensor';
    }

    if (device.capabilities['Thermostat'] !== undefined) {
        that.deviceGroup = 'thermostats';

        thisCharacteristic = that.getaddService(Service.Thermostat).getCharacteristic(Characteristic.CurrentHeatingCoolingState);
        thisCharacteristic.on('get', function(callback) {
            switch (that.device.attributes.thermostatOperatingState) {
                case 'pending cool':
                case 'cooling':
                    callback(null, Characteristic.CurrentHeatingCoolingState.COOL);
                    break;
                case 'pending heat':
                case 'heating':
                    callback(null, Characteristic.CurrentHeatingCoolingState.HEAT);
                    break;
                default:
                    // The above list should be inclusive, but we need to return something if they change stuff.
                    // TODO: Double check if Hubitat can send "auto" as operatingstate. I don't think it can.
                    callback(null, Characteristic.CurrentHeatingCoolingState.OFF);
                    break;
            }
        });
        that.platform.addAttributeUsage('thermostatOperatingState', that.deviceid, thisCharacteristic);

        // Handle the Target State
        thisCharacteristic = that.getaddService(Service.Thermostat).getCharacteristic(Characteristic.TargetHeatingCoolingState);
        thisCharacteristic.on('get', function(callback) {
            switch (that.device.attributes.thermostatMode) {
                case 'cool':
                    callback(null, Characteristic.TargetHeatingCoolingState.COOL);
                    break;
                case 'emergency heat':
                case 'heat':
                    callback(null, Characteristic.TargetHeatingCoolingState.HEAT);
                    break;
                case 'auto':
                    callback(null, Characteristic.TargetHeatingCoolingState.AUTO);
                    break;
                default:
                    // The above list should be inclusive, but we need to return something if they change stuff.
                    callback(null, Characteristic.TargetHeatingCoolingState.OFF);
                    break;
            }
        });
        thisCharacteristic.on('set', function(value, callback) {
            switch (value) {
                case Characteristic.TargetHeatingCoolingState.COOL:
                    that.platform.api.runCommand(callback, that.deviceid, 'cool');
                    that.device.attributes.thermostatMode = 'cool';
                    break;
                case Characteristic.TargetHeatingCoolingState.HEAT:
                    that.platform.api.runCommand(callback, that.deviceid, 'heat');
                    that.device.attributes.thermostatMode = 'heat';
                    break;
                case Characteristic.TargetHeatingCoolingState.AUTO:
                    that.platform.api.runCommand(callback, that.deviceid, 'auto');
                    that.device.attributes.thermostatMode = 'auto';
                    break;
                case Characteristic.TargetHeatingCoolingState.OFF:
                    that.platform.api.runCommand(callback, that.deviceid, 'off');
                    that.device.attributes.thermostatMode = 'off';
                    break;
            }
        });
        that.platform.addAttributeUsage('thermostatMode', that.deviceid, thisCharacteristic);

        if (device.capabilities['Relative Humidity Measurement'] !== undefined) {
            thisCharacteristic = that.getaddService(Service.Thermostat).getCharacteristic(Characteristic.CurrentRelativeHumidity);
            thisCharacteristic.on('get', function(callback) {
                callback(null, parseInt(that.device.attributes.humidity));
            });
            that.platform.addAttributeUsage('humidity', that.deviceid, thisCharacteristic);
        }

        thisCharacteristic = that.getaddService(Service.Thermostat).getCharacteristic(Characteristic.CurrentTemperature);
        thisCharacteristic.on('get', function(callback) {
            if (that.platform.temperature_unit === 'C') callback(null, Math.round(that.device.attributes.temperature * 10) / 10);
            else callback(null, Math.round((that.device.attributes.temperature - 32) / 1.8 * 10) / 10);
        });
        that.platform.addAttributeUsage('temperature', that.deviceid, thisCharacteristic);

        thisCharacteristic = that.getaddService(Service.Thermostat).getCharacteristic(Characteristic.TargetTemperature);
        thisCharacteristic.on('get', function(callback) {
            var temp;
            switch (that.device.attributes.thermostatMode) {
                case 'cool':
                    temp = that.device.attributes.coolingSetpoint;
                    break;
                case 'emergency heat':
                case 'heat':
                    temp = that.device.attributes.heatingSetpoint;
                    break;
                default:
                    // This should only refer to auto
                    // Choose closest target as single target
                    var high = that.device.attributes.coolingSetpoint;
                    var low = that.device.attributes.heatingSetpoint;
                    var cur = that.device.attributes.temperature;
                    temp = Math.abs(high - cur) < Math.abs(cur - low) ? high : low;
                    break;
            }
            if (!temp) callback('Unknown');
            else if (that.platform.temperature_unit === 'C') callback(null, Math.round(temp * 10) / 10);
            else callback(null, Math.round((temp - 32) / 1.8 * 10) / 10);
        });
        thisCharacteristic.on('set', function(value, callback) {
            // Convert the Celsius value to the appropriate unit for Hubitat
            var temp = value;
            if (that.platform.temperature_unit === 'C') temp = value;
            else temp = value * 1.8 + 32;

            // Set the appropriate temperature unit based on the mode
            switch (that.device.attributes.thermostatMode) {
                case 'cool':
                    that.platform.api.runCommand(callback, that.deviceid, 'setCoolingSetpoint', {
                        value1: temp
                    });
                    that.device.attributes.coolingSetpoint = temp;
                    break;
                case 'emergency heat':
                case 'heat':
                    that.platform.api.runCommand(callback, that.deviceid, 'setHeatingSetpoint', {
                        value1: temp
                    });
                    that.device.attributes.heatingSetpoint = temp;
                    break;
                default:
                    // This should only refer to auto
                    // Choose closest target as single target
                    var high = that.device.attributes.coolingSetpoint;
                    var low = that.device.attributes.heatingSetpoint;
                    var cur = that.device.attributes.temperature;
                    var isHighTemp = Math.abs(high - cur) < Math.abs(cur - low);
                    if (isHighTemp) {
                        that.platform.api.runCommand(callback, that.deviceid, 'setCoolingSetpoint', { value1: temp });
                    } else {
                        that.platform.api.runCommand(null, that.deviceid, 'setHeatingSetpoint', { value1: temp });
                    }
                    break;
            }
        });
        that.platform.addAttributeUsage('thermostatMode', that.deviceid, thisCharacteristic);
        that.platform.addAttributeUsage('coolingSetpoint', that.deviceid, thisCharacteristic);
        that.platform.addAttributeUsage('heatingSetpoint', that.deviceid, thisCharacteristic);
        that.platform.addAttributeUsage('temperature', that.deviceid, thisCharacteristic);

        thisCharacteristic = that.getaddService(Service.Thermostat).getCharacteristic(Characteristic.TemperatureDisplayUnits);
        thisCharacteristic.on('get', function(callback) {
            if (platform.temperature_unit === 'C') callback(null, Characteristic.TemperatureDisplayUnits.CELSIUS);
            else callback(null, Characteristic.TemperatureDisplayUnits.FAHRENHEIT);
        });
        // that.platform.addAttributeUsage("temperature_unit", "platform", thisCharacteristic);

        thisCharacteristic = that.getaddService(Service.Thermostat).getCharacteristic(Characteristic.HeatingThresholdTemperature);
        thisCharacteristic.on('get', function(callback) {
            if (that.platform.temperature_unit === 'C') callback(null, Math.round(that.device.attributes.heatingSetpoint * 10) / 10);
            else callback(null, Math.round((that.device.attributes.heatingSetpoint - 32) / 1.8 * 10) / 10);
        });
        thisCharacteristic.on('set', function(value, callback) {
            // Convert the Celsius value to the appropriate unit for Hubitat
            var temp = value;
            if (that.platform.temperature_unit === 'C') temp = value;
            else temp = value * 1.8 + 32;
            that.platform.api.runCommand(callback, that.deviceid, 'setHeatingSetpoint', {
                value1: temp
            });
            that.device.attributes.heatingSetpoint = temp;
        });
        that.platform.addAttributeUsage('heatingSetpoint', that.deviceid, thisCharacteristic);

        thisCharacteristic = that.getaddService(Service.Thermostat).getCharacteristic(Characteristic.CoolingThresholdTemperature);
        thisCharacteristic.on('get', function(callback) {
            if (that.platform.temperature_unit === 'C') callback(null, Math.round(that.device.attributes.coolingSetpoint * 10) / 10);
            else callback(null, Math.round((that.device.attributes.coolingSetpoint - 32) / 1.8 * 10) / 10);
        });
        thisCharacteristic.on('set', function(value, callback) {
            // Convert the Celsius value to the appropriate unit for Hubitat
            var temp = value;
            if (that.platform.temperature_unit === 'C') temp = value;
            else temp = value * 1.8 + 32;
            that.platform.api.runCommand(callback, that.deviceid, 'setCoolingSetpoint', {
                value1: temp
            });
            that.device.attributes.coolingSetpoint = temp;
        });
        that.platform.addAttributeUsage('coolingSetpoint', that.deviceid, thisCharacteristic);
    }

    if (device.attributes['alarmSystemStatus'] !== undefined) {
        that.deviceGroup = 'alarm';
        thisCharacteristic = that.getaddService(Service.SecuritySystem).getCharacteristic(Characteristic.SecuritySystemCurrentState);
        thisCharacteristic.on('get', function(callback) {
            that.platform.log(that.deviceid + ' check 1: ' + that.device.attributes.alarmSystemStatus);

            callback(null, convertAlarmState(that.device.attributes.alarmSystemStatus.toLowerCase(), true));
        });
        that.platform.addAttributeUsage('alarmSystemStatus', that.deviceid, thisCharacteristic);

        thisCharacteristic = that.getaddService(Service.SecuritySystem).getCharacteristic(Characteristic.SecuritySystemTargetState);
        thisCharacteristic.on('get', function(callback) {
            that.platform.log(that.deviceid + ' check 2: ' + that.device.attributes.alarmSystemStatus);
            callback(null, convertAlarmState(that.device.attributes.alarmSystemStatus.toLowerCase(), true));
        });
        thisCharacteristic.on('set', function(value, callback) {
            that.platform.log(that.deviceid + ' set value : ' + value);
            let val = convertAlarmState(value);
            that.platform.api.runCommand(callback, 'alarmSystemStatus', val);

            that.device.attributes.alarmSystemStatus = val;
        });
        that.platform.addAttributeUsage('alarmSystemStatus', that.deviceid, thisCharacteristic);
    }

    this.loadData(device, that);
}

function convertAlarmState(value, valInt = false) {
    switch (value) {
        case 'stay':
        case 0:
            return valInt ? Characteristic.SecuritySystemCurrentState.STAY_ARM : 'stay';
        case 'away':
        case 1:
            return valInt ? Characteristic.SecuritySystemCurrentState.AWAY_ARM : 'away';
        case 'night':
        case 2:
            return valInt ? Characteristic.SecuritySystemCurrentState.NIGHT_ARM : 'night';
        case 'off':
        case 3:
            return valInt ? Characteristic.SecuritySystemCurrentState.DISARMED : 'off';
        case 'alarm_active':
        case 4:
            return valInt ? Characteristic.SecuritySystemCurrentState.ALARM_TRIGGERED : 'alarm_active';
    }
}

function loadData(data, myObject) {
    var that = this;
    if (myObject !== undefined) that = myObject;
    if (data !== undefined) {
        this.device = data;
        for (var i = 0; i < that.services.length; i++) {
            for (var j = 0; j < that.services[i].characteristics.length; j++) {
                that.services[i].characteristics[j].getValue();
            }
        }
    } else {
        this.log.debug('Fetching Device Data');
        this.platform.api.getDevice(this.deviceid, function(data) {
            if (data === undefined) return;
            this.device = data;
            for (var i = 0; i < that.services.length; i++) {
                for (var j = 0; j < that.services[i].characteristics.length; j++) {
                    that.services[i].characteristics[j].getValue();
                }
            }
        });
    }
}

function getServices() {
    return this.services;
}
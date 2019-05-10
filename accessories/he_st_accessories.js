var inherits = require('util').inherits;
var Accessory, Service, Characteristic, uuid, CommunityTypes, platformName;

/*
 *   HE_ST Accessory
 */
module.exports = function(oAccessory, oService, oCharacteristic, ouuid, platName) {
    platformName = platName;
    if (oAccessory) {
        Accessory = oAccessory;
        Service = oService;
        Characteristic = oCharacteristic;
        CommunityTypes = require('../lib/communityTypes')(Service, Characteristic);
        uuid = ouuid;

        inherits(HE_ST_Accessory, Accessory);
        HE_ST_Accessory.prototype.loadData = loadData;
        HE_ST_Accessory.prototype.getServices = getServices;
    }
    return HE_ST_Accessory;
};
module.exports.HE_ST_Accessory = HE_ST_Accessory;

function toTitleCase(str) {
    return str.replace(/\w\S*/g, txt => txt.charAt(0).toUpperCase() + txt.substr(1).toLowerCase());
}

function HE_ST_Accessory(platform, device) {
    // console.log("HE_ST_Accessory: ", platform, device);
    this.deviceid = device.deviceid;
    this.name = device.name;
    this.platform = platform;
    this.state = {};
    this.device = device;
    var idKey = 'hbdev:' + platformName.toLowerCase() + ':' + this.deviceid;
    var id = uuid.generate(idKey);
    Accessory.call(this, this.name, id);
    var that = this;

    //Removing excluded capabilities from config
    for (var i = 0; i < device.excludedCapabilities.length; i++) {
        let excludedCapability = device.excludedCapabilities[i];
        if (device.capabilities[excludedCapability] !== undefined) {
            platform.log.debug("Removing capability: " + excludedCapability + " for device: " + device.name);
            delete device.capabilities[excludedCapability];
        }
    }
    that.getService(Service.AccessoryInformation)
        .setCharacteristic(Characteristic.Identify, (device.capabilities['Switch'] !== undefined))
        .setCharacteristic(Characteristic.FirmwareRevision, device.firmwareVersion)
        .setCharacteristic(Characteristic.Manufacturer, device.manufacturerName)
        .setCharacteristic(Characteristic.Model, `${toTitleCase(device.modelName)}`)
        .setCharacteristic(Characteristic.Name, that.name)
        .setCharacteristic(Characteristic.SerialNumber, device.serialNumber);
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
    // platform.log(JSON.stringify(device));
    let isMode = (device.capabilities['Mode'] !== undefined);
    let isRoutine = (device.capabilities['Routine'] !== undefined);
    let isFan = (device.capabilities['Fan'] !== undefined || device.capabilities['Fan Light'] !== undefined || device.capabilities['FanLight'] !== undefined || device.commands.lowSpeed !== undefined);
    let isWindowShade = (device.capabilities['WindowShade'] !== undefined || device.capabilities['Window Shade'] !== undefined);
    let isLight = (device.capabilities['LightBulb'] !== undefined || device.capabilities['Light Bulb'] !== undefined || device.capabilities['Bulb'] !== undefined || device.capabilities['Fan Light'] !== undefined || device.capabilities['FanLight'] !== undefined || device.name.includes('light'));
    let isSpeaker = (device.capabilities['AudioVolume'] !== undefined);
    if (device && device.capabilities) {
        if ((device.capabilities['Switch Level'] !== undefined || device.capabilities['SwitchLevel'] !== undefined) && !isSpeaker && !isFan && !isMode && !isRoutine && !isWindowShade) {
            if (device.commands.levelOpenClose || device.commands.presetPosition) {
                // This is a Window Shade
                that.deviceGroup = 'window_shades';
                thisCharacteristic = that.getaddService(Service.WindowCovering).getCharacteristic(Characteristic.TargetPosition)
                    .on('get', function(callback) {
                        callback(null, parseInt(that.device.attributes.level));
                    })
                    .on('set', function(value, callback) {
                        platform.api.runCommand(callback, device.deviceid, 'setLevel', {
                            value1: value
                        });
                    });
                platform.addAttributeUsage('level', device.deviceid, thisCharacteristic);
                thisCharacteristic = that.getaddService(Service.WindowCovering).getCharacteristic(Characteristic.CurrentPosition)
                    .on('get', function(callback) {
                        callback(null, parseInt(that.device.attributes.level));
                    });
                platform.addAttributeUsage('level', device.deviceid, thisCharacteristic);

                thisCharacteristic = that.getaddService(Service.WindowCovering).setCharacteristic(Characteristic.PositionState, Characteristic.PositionState.STOPPED);
            } else if (isLight === true || device.commands.hasOwnProperty('setLevel')) {
                that.deviceGroup = 'lights';
                thisCharacteristic = that.getaddService(Service.Lightbulb).getCharacteristic(Characteristic.On)
                    .on('get', function(callback) {
                        callback(null, that.device.attributes.switch === 'on');
                    })
                    .on('set', function(value, callback) {
                        if (value) {
                            platform.api.runCommand(callback, device.deviceid, 'on');
                        } else {
                            platform.api.runCommand(callback, device.deviceid, 'off');
                        }
                    });
                platform.addAttributeUsage('switch', device.deviceid, thisCharacteristic);
                thisCharacteristic = that.getaddService(Service.Lightbulb).getCharacteristic(Characteristic.Brightness)
                    .on('get', function(callback) {
                        callback(null, parseInt(that.device.attributes.level));
                    })
                    .on('set', function(value, callback) {
                        platform.api.runCommand(callback, device.deviceid, 'setLevel', {
                            value1: value
                        });
                    });
                platform.addAttributeUsage('level', device.deviceid, thisCharacteristic);
                if (device.capabilities['Color Control'] || device.capabilities['ColorControl']) {
                    thisCharacteristic = that.getaddService(Service.Lightbulb).getCharacteristic(Characteristic.Hue)
                        .on('get', function(callback) {
                            callback(null, Math.round(that.device.attributes.hue * 3.6));
                        })
                        .on('set', function(value, callback) {
                            platform.api.runCommand(callback, device.deviceid, 'setHue', {
                                value1: Math.round(value / 3.6)
                            });
                        });
                    platform.addAttributeUsage('hue', device.deviceid, thisCharacteristic);
                    thisCharacteristic = that.getaddService(Service.Lightbulb).getCharacteristic(Characteristic.Saturation)
                        .on('get', function(callback) {
                            callback(null, parseInt(that.device.attributes.saturation));
                        })
                        .on('set', function(value, callback) {
                            platform.api.runCommand(callback, device.deviceid, 'setSaturation', {
                                value1: value
                            });
                        });
                    platform.addAttributeUsage('saturation', device.deviceid, thisCharacteristic);
                }
            }
        }
        if (platformName === 'Hubitat' && isWindowShade) {
            that.deviceGroup = 'window_shades';
            thisCharacteristic = that.getaddService(Service.WindowCovering).getCharacteristic(Characteristic.TargetPosition)
                .on('get', function(callback) {
                    let curPos = parseInt(that.device.attributes.position);
                    if (curPos > 98) {
                        curPos = 100;
                    } else if (curPos < 2) {
                        curPos = 0;
                    }
                    callback(null, curPos);
                })
                .on('set', function(value, callback) {
                    platform.log('setPosition(HE): ' + value);
                    platform.api.runCommand(callback, device.deviceid, 'setPosition', {
                        value1: value
                    });
                });
            platform.addAttributeUsage('position', device.deviceid, thisCharacteristic);
            thisCharacteristic = that.getaddService(Service.WindowCovering).getCharacteristic(Characteristic.CurrentPosition)
                .on('get', function(callback) {
                    let curPos = parseInt(that.device.attributes.position);
                    if (curPos > 98) {
                        curPos = 100;
                    } else if (curPos < 2) {
                        curPos = 0;
                    }
                    callback(null, curPos);
                });
            platform.addAttributeUsage('position', device.deviceid, thisCharacteristic);

            thisCharacteristic = that.getaddService(Service.WindowCovering).setCharacteristic(Characteristic.PositionState, Characteristic.PositionState.STOPPED);
        }
        if (device.capabilities['Garage Door Control'] !== undefined || device.capabilities['GarageDoorControl'] !== undefined) {
            that.deviceGroup = 'garage_doors';
            thisCharacteristic = that.getaddService(Service.GarageDoorOpener).getCharacteristic(Characteristic.TargetDoorState)
                .on('get', function(callback) {
                    if (that.device.attributes.door === 'closed' || that.device.attributes.door === 'closing') {
                        callback(null, Characteristic.TargetDoorState.CLOSED);
                    } else if (that.device.attributes.door === 'open' || that.device.attributes.door === 'opening') {
                        callback(null, Characteristic.TargetDoorState.OPEN);
                    }
                })
                .on('set', function(value, callback) {
                    if (value === Characteristic.TargetDoorState.OPEN || value === 0) {
                        platform.api.runCommand(callback, device.deviceid, 'open');
                        that.device.attributes.door = 'opening';
                    } else if (value === Characteristic.TargetDoorState.CLOSED || value === 1) {
                        platform.api.runCommand(callback, device.deviceid, 'close');
                        that.device.attributes.door = 'closing';
                    }
                });
            platform.addAttributeUsage('door', device.deviceid, thisCharacteristic);

            thisCharacteristic = that.getaddService(Service.GarageDoorOpener).getCharacteristic(Characteristic.CurrentDoorState)
                .on('get', function(callback) {
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
            platform.addAttributeUsage('door', device.deviceid, thisCharacteristic);
            that.getaddService(Service.GarageDoorOpener).setCharacteristic(Characteristic.ObstructionDetected, false);
        }
        if (device.capabilities['Lock'] !== undefined) {
            that.deviceGroup = 'locks';
            thisCharacteristic = that.getaddService(Service.LockMechanism).getCharacteristic(Characteristic.LockCurrentState)
                .on('get', function(callback) {
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
            platform.addAttributeUsage('lock', device.deviceid, thisCharacteristic);

            thisCharacteristic = that.getaddService(Service.LockMechanism).getCharacteristic(Characteristic.LockTargetState)
                .on('get', function(callback) {
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
                })
                .on('set', function(value, callback) {
                    if (value === 1 || value === true) {
                        platform.api.runCommand(callback, device.deviceid, 'lock');
                        that.device.attributes.lock = 'locked';
                    } else {
                        platform.api.runCommand(callback, device.deviceid, 'unlock');
                        that.device.attributes.lock = 'unlocked';
                    }
                });
            platform.addAttributeUsage('lock', device.deviceid, thisCharacteristic);
        }
        if (device.capabilities["Valve"] !== undefined) {
            this.platform.log("valve: " + that.device.attributes.valve);
            that.deviceGroup = "valve";
            let valveType = (device.capabilities['Irrigation'] !== undefined ? 0 : 0);

            //Gets the inUse Characteristic
            thisCharacteristic = that.getaddService(Service.Valve).getCharacteristic(Characteristic.InUse)
                .on('get', function(callback) {
                    callback(null, that.device.attributes.valve === 'open' ? Characteristic.InUse.IN_USE : Characteristic.InUse.NOT_IN_USE);
                });
            platform.addAttributeUsage('inUse', device.deviceid, thisCharacteristic);

            //Defines the valve type (irrigation or generic)
            thisCharacteristic = that.getaddService(Service.Valve).getCharacteristic(Characteristic.ValveType)
                .on('get', function(callback) {
                    callback(null, valveType);
                });
            platform.addAttributeUsage('valveType', device.deviceid, thisCharacteristic);

            //Defines Valve State (opened/closed)
            thisCharacteristic = that.getaddService(Service.Valve).getCharacteristic(Characteristic.Active)
                .on('get', function(callback) {
                    callback(null, that.device.attributes.valve === 'open' ? Characteristic.InUse.IN_USE : Characteristic.InUse.NOT_IN_USE);
                })
                .on('set', function(value, callback) {
                    // if (that.device.attributes.inStandby !== 'true') {
                    if (value) {
                        platform.api.runCommand(callback, device.deviceid, 'on');
                    } else {
                        platform.api.runCommand(callback, device.deviceid, 'off');
                    }
                    // }
                });
            platform.addAttributeUsage('valve', device.deviceid, thisCharacteristic);
        }

        //Defines Speaker Device
        if (isSpeaker === true) {
            platform.log('ADDING SPEAKER ' + device.name);
            that.deviceGroup = 'speakers';
            thisCharacteristic = that.getaddService(Service.Speaker).getCharacteristic(Characteristic.Volume)
                .on('get', function(callback) {
                    callback(null, parseInt(that.device.attributes.level || 0));
                })
                .on('set', function(value, callback) {
                    if (value > 0) {
                        platform.api.runCommand(callback, device.deviceid, 'setLevel', {
                            value1: value
                        });
                    }
                });
            platform.addAttributeUsage('volume', device.deviceid, thisCharacteristic);

            thisCharacteristic = that.getaddService(Service.Speaker).getCharacteristic(Characteristic.Mute)
                .on('get', function(callback) {
                    callback(null, that.device.attributes.mute === 'muted');
                })
                .on('set', function(value, callback) {
                    if (value) {
                        platform.api.runCommand(callback, device.deviceid, 'mute');
                    } else {
                        platform.api.runCommand(callback, device.deviceid, 'unmute');
                    }
                });
            platform.addAttributeUsage('mute', device.deviceid, thisCharacteristic);
        }
        //Handles Standalone Fan with no levels
        if (isFan === true && (device.capabilities['Fan Light'] !== undefined || device.capabilities['FanLight'] !== undefined || that.deviceGroup === 'unknown')) {
            that.deviceGroup = 'fans';
            thisCharacteristic = that.getaddService(Service.Fanv2).getCharacteristic(Characteristic.Active)
                .on('get', function(callback) {
                    callback(null, that.device.attributes.switch === 'on');
                })
                .on('set', function(value, callback) {
                    if (value) {
                        platform.api.runCommand(callback, device.deviceid, 'on');
                    } else {
                        platform.api.runCommand(callback, device.deviceid, 'off');
                    }
                });
            platform.addAttributeUsage('switch', device.deviceid, thisCharacteristic);

            if (that.device.attributes.level !== undefined || that.device.attributes.fanSpeed !== undefined) {
                let fanLvl = that.device.attributes.fanSpeed ? fanSpeedConversion(that.device.attributes.fanSpeed, (device.command['medHighSpeed'] !== undefined)) : parseInt(that.device.attributes.level);
                platform.log("Fan with (" + that.device.attributes.fanSpeed ? "fanSpeed" : "level" + ') | value: ' + fanLvl);
                thisCharacteristic = that.getaddService(Service.Fanv2).getCharacteristic(Characteristic.RotationSpeed)
                    .on('get', function(callback) {
                        callback(null, fanLvl);
                    })
                    .on('set', function(value, callback) {
                        if (value > 0) {
                            let cmdStr = (that.device.attributes.fanSpeed) ? 'fanspeed' : 'setLevel';
                            let cmdVal = (that.device.attributes.fanSpeed) ? fanSpeedConversion(value, (device.command['medHighSpeed'] !== undefined)) : parseInt(value);
                            platform.log("Fan Command (Str: " + cmdStr + ') | value: (' + cmdVal + ')');
                            platform.api.runCommand(callback, device.deviceid, cmdStr, {
                                value1: cmdVal
                            });
                        }
                    });
                platform.addAttributeUsage('level', device.deviceid, thisCharacteristic);
            }
        }
        if (isMode === true) {
            that.deviceGroup = 'mode';
            platform.log('Mode: (' + that.name + ')');
            thisCharacteristic = that.getaddService(Service.Switch).getCharacteristic(Characteristic.On)
                .on('get', function(callback) {
                    callback(null, that.device.attributes.switch === 'on');
                })
                .on('set', function(value, callback) {
                    if (value && that.device.attributes.switch === 'off') {
                        platform.api.runCommand(callback, device.deviceid, 'mode', {
                            value1: that.name.toString()
                        });
                    }
                });
            platform.addAttributeUsage('switch', device.deviceid, thisCharacteristic);
        }
        if (isRoutine === true) {
            that.deviceGroup = 'routine';
            platform.log('Routine: (' + that.name + ')');
            thisCharacteristic = that.getaddService(Service.Switch).getCharacteristic(Characteristic.On)
                .on('get', function(callback) {
                    callback(null, that.device.attributes.switch === 'on');
                })
                .on('set', function(value, callback) {
                    if (value) {
                        platform.api.runCommand(callback, device.deviceid, 'routine', {
                            value1: that.name.toString()
                        });
                        setTimeout(
                            function() {
                                console.log("routineOff...");
                                that.getaddService(Service.Switch).setCharacteristic(Characteristic.On, false);
                            }, 2000);
                    }
                });
            platform.addAttributeUsage('switch', device.deviceid, thisCharacteristic);
        }
        if (device.capabilities['Button'] !== undefined) {
            that.deviceGroup = 'button';
            platform.log('Button: (' + that.name + ')');
            thisCharacteristic = that.getaddService(Service.Switch).getCharacteristic(Characteristic.On)
                .on('get', function(callback) {
                    callback(null, that.device.attributes.switch === 'on');
                })
                .on('set', function(value, callback) {
                    if (value && that.device.attributes.switch === 'off') {
                        platform.api.runCommand(callback, device.deviceid, 'button');
                    }
                });
            platform.addAttributeUsage('switch', device.deviceid, thisCharacteristic);
        }

        // This should catch the remaining switch devices that are specially defined
        if (device.capabilities['Switch'] !== undefined && (device.capabilities['Fan Light'] !== undefined || device.capabilities['FanLight'] !== undefined || that.deviceGroup === 'unknown')) {
            //Handles Standalone Fan with no levels
            if (isLight === true) {
                that.deviceGroup = 'light';
                if (device.capabilities['Fan Light'] || device.capabilities['FanLight']) {
                    platform.log('FanLight: ' + device.name);
                }
                thisCharacteristic = that.getaddService(Service.Lightbulb).getCharacteristic(Characteristic.On)
                    .on('get', function(callback) {
                        callback(null, that.device.attributes.switch === 'on');
                    })
                    .on('set', function(value, callback) {
                        if (value) {
                            platform.api.runCommand(callback, device.deviceid, 'on');
                        } else {
                            platform.api.runCommand(callback, device.deviceid, 'off');
                        }
                    });
                platform.addAttributeUsage('switch', device.deviceid, thisCharacteristic);
            } else {
                that.deviceGroup = 'switch';
                thisCharacteristic = that.getaddService(Service.Switch).getCharacteristic(Characteristic.On)
                    .on('get', function(callback) {
                        callback(null, that.device.attributes.switch === 'on');
                    })
                    .on('set', function(value, callback) {
                        if (value) {
                            platform.api.runCommand(callback, device.deviceid, 'on');
                        } else {
                            platform.api.runCommand(callback, device.deviceid, 'off');
                        }
                    });
                platform.addAttributeUsage('switch', device.deviceid, thisCharacteristic);

                if (device.capabilities['Energy Meter'] || device.capabilities['EnergyMeter']) {
                    thisCharacteristic = that.getaddService(Service.Switch).addCharacteristic(CommunityTypes.TotalConsumption1)
                        .on('get', function(callback) {
                            callback(null, Math.round(that.device.attributes.power));
                        });
                    platform.addAttributeUsage('energy', device.deviceid, thisCharacteristic);
                }
                if (device.capabilities['Power Meter'] || device.capabilities['PowerMeter']) {
                    thisCharacteristic = that.getaddService(Service.Switch).addCharacteristic(CommunityTypes.CurrentConsumption1)
                        .on('get', function(callback) {
                            callback(null, Math.round(that.device.attributes.power));
                        });
                    platform.addAttributeUsage('power', device.deviceid, thisCharacteristic);
                }
            }
        }
        // Smoke Detectors
        if ((device.capabilities['Smoke Detector'] !== undefined || device.capabilities['SmokeDetector'] !== undefined) && that.device.attributes.smoke) {
            that.deviceGroup = 'detectors';
            thisCharacteristic = that.getaddService(Service.SmokeSensor).getCharacteristic(Characteristic.SmokeDetected)
                .on('get', function(callback) {
                    if (that.device.attributes.smoke === 'clear') {
                        callback(null, Characteristic.SmokeDetected.SMOKE_NOT_DETECTED);
                    } else {
                        callback(null, Characteristic.SmokeDetected.SMOKE_DETECTED);
                    }
                });
            platform.addAttributeUsage('smoke', device.deviceid, thisCharacteristic);
            if (device.capabilities['Tamper Alert'] || device.capabilities['TamperAlert']) {
                thisCharacteristic = that.getaddService(Service.SmokeSensor).getCharacteristic(Characteristic.StatusTampered)
                    .on('get', function(callback) {
                        callback(null, (that.device.attributes.tamperAlert === 'detected') ? Characteristic.StatusTampered.TAMPERED : Characteristic.StatusTampered.NOT_TAMPERED);
                    });
                platform.addAttributeUsage('tamper', device.deviceid, thisCharacteristic);
            }
        }
        if ((device.capabilities['Carbon Monoxide Detector'] !== undefined || device.capabilities['CarbonMonoxideDetector'] !== undefined) && that.device.attributes.carbonMonoxide) {
            that.deviceGroup = 'detectors';
            thisCharacteristic = that.getaddService(Service.CarbonMonoxideSensor).getCharacteristic(Characteristic.CarbonMonoxideDetected)
                .on('get', function(callback) {
                    if (that.device.attributes.carbonMonoxide === 'clear') {
                        callback(null, Characteristic.CarbonMonoxideDetected.CO_LEVELS_NORMAL);
                    } else {
                        callback(null, Characteristic.CarbonMonoxideDetected.CO_LEVELS_ABNORMAL);
                    }
                });
            platform.addAttributeUsage('carbonMonoxide', device.deviceid, thisCharacteristic);
            if (device.capabilities['Tamper Alert'] !== undefined || device.capabilities['TamperAlert'] !== undefined) {
                thisCharacteristic = that.getaddService(Service.CarbonMonoxideSensor).getCharacteristic(Characteristic.StatusTampered)
                    .on('get', function(callback) {
                        callback(null, (that.device.attributes.tamperAlert === 'detected') ? Characteristic.StatusTampered.TAMPERED : Characteristic.StatusTampered.NOT_TAMPERED);
                    });
                platform.addAttributeUsage('tamper', device.deviceid, thisCharacteristic);
            }
        }
        if ((device.capabilities['Carbon Dioxide Measurement'] !== undefined || device.capabilities['CarbonDioxideMeasurement'] !== undefined) && that.device.attributes.carbonDioxideMeasurement) {
            that.deviceGroup = 'carbonDioxide';
            thisCharacteristic = that.getaddService(Service.CarbonDioxideSensor).getCharacteristic(Characteristic.CarbonDioxideDetected)
                .on('get', function(callback) {
                    if (that.device.attributes.carbonDioxideMeasurement < 2000) {
                        callback(null, Characteristic.CarbonDioxideDetected.CO2_LEVELS_NORMAL);
                    } else {
                        callback(null, Characteristic.CarbonDioxideDetected.CO2_LEVELS_ABNORMAL);
                    }
                });
            platform.addAttributeUsage('carbonDioxide', device.deviceid, thisCharacteristic);
            thisCharacteristic = that.getaddService(Service.CarbonDioxideSensor).getCharacteristic(Characteristic.CarbonDioxideLevel)
                .on('get', function(callback) {
                    if (that.device.attributes.carbonDioxideMeasurement >= 0) {
                        callback(null, that.device.attributes.carbonDioxideMeasurement);
                    }
                });
            platform.addAttributeUsage('carbonDioxideLevel', device.deviceid, thisCharacteristic);
            if (device.capabilities['Tamper Alert'] !== undefined || device.capabilities['TamperAlert'] !== undefined) {
                thisCharacteristic = that.getaddService(Service.CarbonDioxideSensor).getCharacteristic(Characteristic.StatusTampered)
                    .on('get', function(callback) {
                        callback(null, (that.device.attributes.tamperAlert === 'detected') ? Characteristic.StatusTampered.TAMPERED : Characteristic.StatusTampered.NOT_TAMPERED);
                    });
                platform.addAttributeUsage('tamper', device.deviceid, thisCharacteristic);
            }
        }
        if (device.capabilities['Motion Sensor'] !== undefined || device.capabilities['MotionSensor'] !== undefined) {
            if (that.deviceGroup === 'unknown') {
                that.deviceGroup = 'sensor';
            }
            thisCharacteristic = that.getaddService(Service.MotionSensor).getCharacteristic(Characteristic.MotionDetected)
                .on('get', function(callback) {
                    callback(null, that.device.attributes.motion === 'active');
                });
            platform.addAttributeUsage('motion', device.deviceid, thisCharacteristic);
            if (device.capabilities['Tamper Alert'] !== undefined || device.capabilities['TamperAlert'] !== undefined) {
                thisCharacteristic = that.getaddService(Service.MotionSensor).getCharacteristic(Characteristic.StatusTampered)
                    .on('get', function(callback) {
                        callback(null, (that.device.attributes.tamperAlert === 'detected') ? Characteristic.StatusTampered.TAMPERED : Characteristic.StatusTampered.NOT_TAMPERED);
                    });
                platform.addAttributeUsage('tamper', device.deviceid, thisCharacteristic);
            }
        }
        if (device.capabilities['Water Sensor'] !== undefined || device.capabilities['WaterSensor'] !== undefined) {
            if (that.deviceGroup === 'unknown') {
                that.deviceGroup = 'sensor';
            }
            thisCharacteristic = that.getaddService(Service.LeakSensor).getCharacteristic(Characteristic.LeakDetected)
                .on('get', function(callback) {
                    var reply = Characteristic.LeakDetected.LEAK_DETECTED;
                    if (that.device.attributes.water === 'dry') {
                        reply = Characteristic.LeakDetected.LEAK_NOT_DETECTED;
                    }
                    callback(null, reply);
                });
            platform.addAttributeUsage('water', device.deviceid, thisCharacteristic);
            if (device.capabilities['Tamper Alert'] !== undefined || device.capabilities['TamperAlert'] !== undefined) {
                thisCharacteristic = that.getaddService(Service.LeakSensor).getCharacteristic(Characteristic.StatusTampered)
                    .on('get', function(callback) {
                        callback(null, (that.device.attributes.tamperAlert === 'detected') ? Characteristic.StatusTampered.TAMPERED : Characteristic.StatusTampered.NOT_TAMPERED);
                    });
                platform.addAttributeUsage('tamper', device.deviceid, thisCharacteristic);
            }
        }
        if (device.capabilities['Presence Sensor'] !== undefined || device.capabilities['PresenceSensor'] !== undefined) {
            if (that.deviceGroup === 'unknown') {
                that.deviceGroup = 'sensor';
            }
            thisCharacteristic = that.getaddService(Service.OccupancySensor).getCharacteristic(Characteristic.OccupancyDetected)
                .on('get', function(callback) {
                    callback(null, that.device.attributes.presence === 'present');
                });
            platform.addAttributeUsage('presence', device.deviceid, thisCharacteristic);
            if (device.capabilities['Tamper Alert'] !== undefined || device.capabilities['TamperAlert'] !== undefined) {
                thisCharacteristic = that.getaddService(Service.OccupancySensor).getCharacteristic(Characteristic.StatusTampered)
                    .on('get', function(callback) {
                        callback(null, (that.device.attributes.tamperAlert === 'detected') ? Characteristic.StatusTampered.TAMPERED : Characteristic.StatusTampered.NOT_TAMPERED);
                    });
                platform.addAttributeUsage('tamper', device.deviceid, thisCharacteristic);
            }
        }
        if (device.capabilities['Relative Humidity Measurement'] !== undefined || device.capabilities['RelativeHumidityMeasurement'] !== undefined) {
            if (that.deviceGroup === 'unknown') {
                that.deviceGroup = 'sensor';
            }
            thisCharacteristic = that.getaddService(Service.HumiditySensor).getCharacteristic(Characteristic.CurrentRelativeHumidity)
                .on('get', function(callback) {
                    callback(null, Math.round(that.device.attributes.humidity));
                });
            platform.addAttributeUsage('humidity', device.deviceid, thisCharacteristic);
            if (device.capabilities['Tamper Alert'] !== undefined || device.capabilities['TamperAlert'] !== undefined) {
                thisCharacteristic = that.getaddService(Service.HumiditySensor).getCharacteristic(Characteristic.StatusTampered)
                    .on('get', function(callback) {
                        callback(null, (that.device.attributes.tamperAlert === 'detected') ? Characteristic.StatusTampered.TAMPERED : Characteristic.StatusTampered.NOT_TAMPERED);
                    });
                platform.addAttributeUsage('tamper', device.deviceid, thisCharacteristic);
            }
        }
        if (device.capabilities['Temperature Measurement'] !== undefined || device.capabilities['TemperatureMeasurement'] !== undefined) {
            if (that.deviceGroup === 'unknown') {
                that.deviceGroup = 'sensor';
            }
            thisCharacteristic = that.getaddService(Service.TemperatureSensor).getCharacteristic(Characteristic.CurrentTemperature)
                .on('get', function(callback) {
                    if (platform.temperature_unit === 'C') {
                        callback(null, Math.round(that.device.attributes.temperature * 10) / 10);
                    } else {
                        callback(null, Math.round((that.device.attributes.temperature - 32) / 1.8 * 10) / 10);
                    }
                });
            platform.addAttributeUsage('temperature', device.deviceid, thisCharacteristic);
            if (device.capabilities['Tamper Alert'] !== undefined || device.capabilities['TamperAlert'] !== undefined) {
                thisCharacteristic = that.getaddService(Service.TemperatureSensor).getCharacteristic(Characteristic.StatusTampered)
                    .on('get', function(callback) {
                        callback(null, (that.device.attributes.tamperAlert === 'detected') ? Characteristic.StatusTampered.TAMPERED : Characteristic.StatusTampered.NOT_TAMPERED);
                    });
                platform.addAttributeUsage('tamper', device.deviceid, thisCharacteristic);
            }
        }
        if (device.capabilities['Illuminance Measurement'] !== undefined || device.capabilities['IlluminanceMeasurement'] !== undefined) {
            // console.log(device);
            if (that.deviceGroup === 'unknown') {
                that.deviceGroup = 'sensor';
            }
            thisCharacteristic = that.getaddService(Service.LightSensor).getCharacteristic(Characteristic.CurrentAmbientLightLevel)
                .on('get', function(callback) {
                    callback(null, Math.ceil(that.device.attributes.illuminance));
                });
            platform.addAttributeUsage('illuminance', device.deviceid, thisCharacteristic);
        }
        if ((device.capabilities['Contact Sensor'] !== undefined && device.capabilities['Garage Door Control'] === undefined) || (device.capabilities['ContactSensor'] !== undefined && device.capabilities['GarageDoorControl'] === undefined)) {
            if (that.deviceGroup === 'unknown') {
                that.deviceGroup = 'sensor';
            }
            thisCharacteristic = that.getaddService(Service.ContactSensor).getCharacteristic(Characteristic.ContactSensorState)
                .on('get', function(callback) {
                    if (that.device.attributes.contact === 'closed') {
                        callback(null, Characteristic.ContactSensorState.CONTACT_DETECTED);
                    } else {
                        callback(null, Characteristic.ContactSensorState.CONTACT_NOT_DETECTED);
                    }
                });
            platform.addAttributeUsage('contact', device.deviceid, thisCharacteristic);
            if (device.capabilities['Tamper Alert'] !== undefined || device.capabilities['TamperAlert'] !== undefined) {
                thisCharacteristic = that.getaddService(Service.ContactSensor).getCharacteristic(Characteristic.StatusTampered)
                    .on('get', function(callback) {
                        callback(null, (that.device.attributes.tamperAlert === 'detected') ? Characteristic.StatusTampered.TAMPERED : Characteristic.StatusTampered.NOT_TAMPERED);
                    });
                platform.addAttributeUsage('tamper', device.deviceid, thisCharacteristic);
            }
        }
        if (device.capabilities['Battery'] !== undefined) {
            thisCharacteristic = that.getaddService(Service.BatteryService).getCharacteristic(Characteristic.BatteryLevel)
                .on('get', function(callback) {
                    callback(null, Math.round(that.device.attributes.battery));
                });
            platform.addAttributeUsage('battery', device.deviceid, thisCharacteristic);
            thisCharacteristic = that.getaddService(Service.BatteryService).getCharacteristic(Characteristic.StatusLowBattery)
                .on('get', function(callback) {
                    let battStatus = (that.device.attributes.battery < 20) ? Characteristic.StatusLowBattery.BATTERY_LEVEL_LOW : Characteristic.StatusLowBattery.BATTERY_LEVEL_NORMAL;
                    callback(null, battStatus);
                });
            that.getaddService(Service.BatteryService).setCharacteristic(Characteristic.ChargingState, Characteristic.ChargingState.NOT_CHARGING);
            platform.addAttributeUsage('battery', device.deviceid, thisCharacteristic);
        }
        // if (device.capabilities['Energy Meter'] !== undefined && that.deviceGroup === 'unknown') {
        //     that.deviceGroup = 'EnergyMeter';
        //     thisCharacteristic = that.getaddService(Service.Outlet).addCharacteristic(CommunityTypes.TotalConsumption1)
        //     .on('get', function(callback) {
        //         callback(null, Math.round(that.device.attributes.energy));
        //     });
        //     platform.addAttributeUsage('energy', device.deviceid, thisCharacteristic);
        // }
        // if (device.capabilities['Power Meter'] !== undefined && that.deviceGroup === 'unknown') {
        //     thisCharacteristic = that.getaddService(Service.Outlet).addCharacteristic(CommunityTypes.CurrentConsumption1)
        //     .on('get', function(callback) {
        //         callback(null, Math.round(that.device.attributes.power));
        //     });
        //     platform.addAttributeUsage('power', device.deviceid, thisCharacteristic);
        // }
        if (device.capabilities['Acceleration Sensor'] !== undefined || device.capabilities['AccelerationSensor'] !== undefined) {
            if (that.deviceGroup === 'unknown') {
                that.deviceGroup = 'sensor';
            }
        }
        if (device.capabilities['Three Axis'] !== undefined || device.capabilities['ThreeAxis'] !== undefined) {
            if (that.deviceGroup === 'unknown') {
                that.deviceGroup = 'sensor';
            }
        }
        if (device.capabilities['Thermostat'] !== undefined) {
            that.deviceGroup = 'thermostats';
            thisCharacteristic = that.getaddService(Service.Thermostat).getCharacteristic(Characteristic.CurrentHeatingCoolingState)
                .on('get', function(callback) {
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
                            // TODO: Double check if Smartthings can send "auto" as operatingstate. I don't think it can.
                            callback(null, Characteristic.CurrentHeatingCoolingState.OFF);
                            break;
                    }
                });
            platform.addAttributeUsage('thermostatOperatingState', device.deviceid, thisCharacteristic);
            // Handle the Target State
            thisCharacteristic = that.getaddService(Service.Thermostat).getCharacteristic(Characteristic.TargetHeatingCoolingState)
                .on('get', function(callback) {
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
                })
                .on('set', function(value, callback) {
                    switch (value) {
                        case Characteristic.TargetHeatingCoolingState.COOL:
                            platform.api.runCommand(callback, device.deviceid, 'cool');
                            that.device.attributes.thermostatMode = 'cool';
                            break;
                        case Characteristic.TargetHeatingCoolingState.HEAT:
                            platform.api.runCommand(callback, device.deviceid, 'heat');
                            that.device.attributes.thermostatMode = 'heat';
                            break;
                        case Characteristic.TargetHeatingCoolingState.AUTO:
                            platform.api.runCommand(callback, device.deviceid, 'auto');
                            that.device.attributes.thermostatMode = 'auto';
                            break;
                        case Characteristic.TargetHeatingCoolingState.OFF:
                            platform.api.runCommand(callback, device.deviceid, 'off');
                            that.device.attributes.thermostatMode = 'off';
                            break;
                    }
                });
            platform.addAttributeUsage('thermostatMode', device.deviceid, thisCharacteristic);
            if (device.capabilities['Relative Humidity Measurement'] !== undefined) {
                thisCharacteristic = that.getaddService(Service.Thermostat).getCharacteristic(Characteristic.CurrentRelativeHumidity)
                    .on('get', function(callback) {
                        callback(null, parseInt(that.device.attributes.humidity));
                    });
                platform.addAttributeUsage('humidity', device.deviceid, thisCharacteristic);
            }
            thisCharacteristic = that.getaddService(Service.Thermostat).getCharacteristic(Characteristic.CurrentTemperature)
                .on('get', function(callback) {
                    if (platform.temperature_unit === 'C') {
                        callback(null, Math.round(that.device.attributes.temperature * 10) / 10);
                    } else {
                        callback(null, Math.round((that.device.attributes.temperature - 32) / 1.8 * 10) / 10);
                    }
                });
            platform.addAttributeUsage('temperature', device.deviceid, thisCharacteristic);
            thisCharacteristic = that.getaddService(Service.Thermostat).getCharacteristic(Characteristic.TargetTemperature)
                .on('get', function(callback) {
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
                    if (!temp) {
                        callback('Unknown');
                    } else if (platform.temperature_unit === 'C') {
                        callback(null, Math.round(temp * 10) / 10);
                    } else {
                        callback(null, Math.round((temp - 32) / 1.8 * 10) / 10);
                    }
                })
                .on('set', function(value, callback) {
                    // Convert the Celsius value to the appropriate unit for Smartthings
                    var temp = value;
                    if (platform.temperature_unit === 'C') {
                        temp = value;
                    } else {
                        temp = value * 1.8 + 32;
                    }
                    // Set the appropriate temperature unit based on the mode
                    switch (that.device.attributes.thermostatMode) {
                        case 'cool':
                            platform.api.runCommand(callback, device.deviceid, 'setCoolingSetpoint', {
                                value1: temp
                            });
                            that.device.attributes.coolingSetpoint = temp;
                            break;
                        case 'emergency heat':
                        case 'heat':
                            platform.api.runCommand(callback, device.deviceid, 'setHeatingSetpoint', {
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
                                platform.api.runCommand(callback, device.deviceid, 'setCoolingSetpoint', {
                                    value1: temp
                                });
                            } else {
                                platform.api.runCommand(null, device.deviceid, 'setHeatingSetpoint', {
                                    value1: temp
                                });
                            }
                            break;
                    }
                });
            platform.addAttributeUsage('thermostatMode', device.deviceid, thisCharacteristic);
            platform.addAttributeUsage('coolingSetpoint', device.deviceid, thisCharacteristic);
            platform.addAttributeUsage('heatingSetpoint', device.deviceid, thisCharacteristic);
            platform.addAttributeUsage('temperature', device.deviceid, thisCharacteristic);
            thisCharacteristic = that.getaddService(Service.Thermostat).getCharacteristic(Characteristic.TemperatureDisplayUnits)
                .on('get', function(callback) {
                    if (platform.temperature_unit === 'C') {
                        callback(null, Characteristic.TemperatureDisplayUnits.CELSIUS);
                    } else {
                        callback(null, Characteristic.TemperatureDisplayUnits.FAHRENHEIT);
                    }
                });
            // platform.addAttributeUsage("temperature_unit", "platform", thisCharacteristic);
            thisCharacteristic = that.getaddService(Service.Thermostat).getCharacteristic(Characteristic.HeatingThresholdTemperature)
                .on('get', function(callback) {
                    if (platform.temperature_unit === 'C') {
                        callback(null, Math.round(that.device.attributes.heatingSetpoint * 10) / 10);
                    } else {
                        callback(null, Math.round((that.device.attributes.heatingSetpoint - 32) / 1.8 * 10) / 10);
                    }
                })
                .on('set', function(value, callback) {
                    // Convert the Celsius value to the appropriate unit for Smartthings
                    var temp = value;
                    if (platform.temperature_unit === 'C') {
                        temp = value;
                    } else {
                        temp = value * 1.8 + 32;
                    }
                    platform.api.runCommand(callback, device.deviceid, 'setHeatingSetpoint', {
                        value1: temp
                    });
                    that.device.attributes.heatingSetpoint = temp;
                });
            platform.addAttributeUsage('heatingSetpoint', device.deviceid, thisCharacteristic);
            thisCharacteristic = that.getaddService(Service.Thermostat).getCharacteristic(Characteristic.CoolingThresholdTemperature)
                .on('get', function(callback) {
                    if (platform.temperature_unit === 'C') {
                        callback(null, Math.round(that.device.attributes.coolingSetpoint * 10) / 10);
                    } else {
                        callback(null, Math.round((that.device.attributes.coolingSetpoint - 32) / 1.8 * 10) / 10);
                    }
                })
                .on('set', function(value, callback) {
                    // Convert the Celsius value to the appropriate unit for Smartthings
                    var temp = value;
                    if (platform.temperature_unit === 'C') {
                        temp = value;
                    } else {
                        temp = value * 1.8 + 32;
                    }
                    platform.api.runCommand(callback, device.deviceid, 'setCoolingSetpoint', {
                        value1: temp
                    });
                    that.device.attributes.coolingSetpoint = temp;
                });
            platform.addAttributeUsage('coolingSetpoint', device.deviceid, thisCharacteristic);
        }
        // Alarm System Control/Status
        if (that.device.attributes['alarmSystemStatus'] !== undefined) {
            that.deviceGroup = 'alarm';
            thisCharacteristic = that.getaddService(Service.SecuritySystem).getCharacteristic(Characteristic.SecuritySystemCurrentState)
                .on('get', function(callback) {
                    // platform.log('alarm1: ' + that.device.attributes.alarmSystemStatus + ' | ' + convertAlarmState(that.device.attributes.alarmSystemStatus, true));
                    callback(null, convertAlarmState(that.device.attributes.alarmSystemStatus, true));
                });
            platform.addAttributeUsage('alarmSystemStatus', device.deviceid, thisCharacteristic);

            thisCharacteristic = that.getaddService(Service.SecuritySystem).getCharacteristic(Characteristic.SecuritySystemTargetState)
                .on('get', function(callback) {
                    // platform.log('alarm2: ' + that.device.attributes.alarmSystemStatus + ' | ' + convertAlarmState(that.device.attributes.alarmSystemStatus, true));
                    callback(null, convertAlarmState(that.device.attributes.alarmSystemStatus.toLowerCase(), true));
                })
                .on('set', function(value, callback) {
                    // platform.log('setAlarm: ' + value + ' | ' + convertAlarmState2(value));
                    platform.api.runCommand(callback, device.deviceid, convertAlarmState(value));
                    that.device.attributes.alarmSystemStatus = convertAlarmState(value);
                });
            platform.addAttributeUsage('alarmSystemStatus', device.deviceid, thisCharacteristic);
        }
    }
    this.loadData(device, that);
}

function fanSpeedConversion(speedVal, has4Spd = false) {
    if (speedVal <= 0) {
        return "off";
    }
    if (has4Spd) {
        if (speedVal > 0 && speedVal <= 25) {
            return "low";
        } else if (speedVal > 25 && speedVal <= 50) {
            return "med";
        } else if (speedVal > 50 && speedVal <= 75) {
            return "medhigh";
        } else if (speedVal > 75 && speedVal <= 100) {
            return "high";
        }
    } else {
        if (speedVal > 0 && speedVal <= 33) {
            return "low";
        } else if (speedVal > 33 && speedVal <= 66) {
            return "medium";
        } else if (speedVal > 66 && speedVal <= 99) {
            return "high";
        }
    }
}

function convertAlarmState(value, valInt = false) {
    switch (value) {
        case 'stay':
        case 'armHome':
        case 'armedHome':
        case 'armhome':
        case 'armedhome':
        case 0:
            return valInt ? Characteristic.SecuritySystemCurrentState.STAY_ARM : 'stay';
        case 'away':
        case 'armaway':
        case 'armAway':
        case 'armedaway':
        case 'armedAway':
        case 1:
            return valInt ? Characteristic.SecuritySystemCurrentState.AWAY_ARM : 'away';
        case 'night':
        case 'armnight':
        case 'armNight':
        case 'armednight':
        case 'armedNight':
        case 2:
            return valInt ? Characteristic.SecuritySystemCurrentState.NIGHT_ARM : 'night';
        case 'off':
        case 'disarm':
        case 'disarmed':
        case 3:
            return valInt ? Characteristic.SecuritySystemCurrentState.DISARMED : 'off';
        case 'alarm_active':
        case 4:
            return valInt ? Characteristic.SecuritySystemCurrentState.ALARM_TRIGGERED : 'alarm_active';
    }
}

function loadData(data, myObject) {
    var that = this;
    if (myObject !== undefined) {
        that = myObject;
    }
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
            if (data === undefined) {
                return;
            }
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

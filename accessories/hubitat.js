var inherits = require('util').inherits;

var Accessory, Service, Characteristic, uuid, CommunityTypes;

/*
 *   Hubitat Accessory
 */

module.exports = function(oAccessory, oService, oCharacteristic, ouuid) {
    if (oAccessory) {
        Accessory = oAccessory;
        Service = oService;
        Characteristic = oCharacteristic;
        CommunityTypes = require('../lib/communityTypes')(Service, Characteristic);
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
    that.getService(Service.AccessoryInformation)
        .setCharacteristic(Characteristic.Identify, (that.device.capabilities['Switch'] !== undefined))
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

    let isFan = (device.capabilities['Fan'] !== undefined || device.commands.lowSpeed !== undefined);
    let isLight = (device.capabilities['LightBulb'] !== undefined || device.capabilities['Bulb'] !== undefined || device.name.includes('light'));
    let isSpeaker = (device.capabilities['Speaker'] !== undefined);

    if (device && device.capabilities) {
        if (device.capabilities['SwitchLevel'] !== undefined && !isSpeaker && !isFan) {
            if (device.commands.levelOpenClose || device.capabilities['WindowShade'] !== undefined) {
                // This is a Window Shade
                that.deviceGroup = 'shades';
                if (device.commands.levelOpenClose) {
                    thisCharacteristic = that.getaddService(Service.WindowCovering).getCharacteristic(Characteristic.TargetPosition);
                    thisCharacteristic.on('get', function(callback) {
                        callback(null, parseInt(that.device.attributes.level));
                    });
                    thisCharacteristic.on('set', function(value, callback) {
                        that.platform.api.runCommand(callback, that.deviceid, 'setLevel', {
                            value1: value
                        });
                    });
                    that.platform.addAttributeUsage('level', that.deviceid, thisCharacteristic);

                    thisCharacteristic = that.getaddService(Service.WindowCovering).getCharacteristic(Characteristic.CurrentPosition);
                    thisCharacteristic.on('get', function(callback) {
                        callback(null, parseInt(that.device.attributes.level));
                    });
                    that.platform.addAttributeUsage('level', that.deviceid, thisCharacteristic);
                } else {
                    thisCharacteristic = that.getaddService(Service.WindowCovering).getCharacteristic(Characteristic.TargetPosition);
                    thisCharacteristic.on('get', function(callback) {
                        callback(null, parseInt(that.device.attributes.position));
                    });
                    thisCharacteristic.on('set', function(value, callback) {
                        that.platform.api.runCommand(callback, that.deviceid, 'setPosition', {
                            value1: value
                        });
                    });
                    that.platform.addAttributeUsage('position', that.deviceid, thisCharacteristic);

                    thisCharacteristic = that.getaddService(Service.WindowCovering).getCharacteristic(Characteristic.CurrentPosition);
                    thisCharacteristic.on('get', function(callback) {
                        callback(null, parseInt(that.device.attributes.position));
                    });
                    that.platform.addAttributeUsage('position', that.deviceid, thisCharacteristic);

                    if (device.attributes.windowShade !== null) {
                        thisCharacteristic = that.getaddService(Service.WindowCovering).getCharacteristic(Characteristic.PositionState);
                        var posState = device.attributes.windowShade;
                        switch (posState) {

                            case "closing":
                                posState = 1;
                                break;
                            case "opening":
                                posState = 0;
                                break;
                            default:
                                posState = 2;
                                break;
                        }
                        thisCharacteristic.on('get', function(callback) {
                            callback(null, posState);
                        });
                        that.platform.addAttributeUsage('positionState', that.deviceid, thisCharacteristic);
                    }

                }
            } else if (isLight === true || device.commands.setLevel) {
                that.deviceGroup = 'lights';

                thisCharacteristic = that.getaddService(Service.Lightbulb).getCharacteristic(Characteristic.On);
                thisCharacteristic.on('get', function(callback) {
                    callback(null, that.device.attributes.switch === 'on');
                });
                thisCharacteristic.on('set', function(value, callback) {
                    if (value) {
                        that.platform.api.runCommand(callback, that.deviceid, 'on');
                    } else {
                        that.platform.api.runCommand(callback, that.deviceid, 'off');
                    }
                });
                that.platform.addAttributeUsage('switch', that.deviceid, thisCharacteristic);

                thisCharacteristic = that.getaddService(Service.Lightbulb).getCharacteristic(Characteristic.Brightness);
                thisCharacteristic.on('get', function(callback) {
                    callback(null, parseInt(that.device.attributes.level));
                });
                thisCharacteristic.on('set', function(value, callback) {
                    that.platform.api.runCommand(callback, that.deviceid, 'setLevel', {
                        value1: value
                    });
                });
                that.platform.addAttributeUsage('level', that.deviceid, thisCharacteristic);

                if (device.capabilities['ColorControl'] !== undefined) {
                    thisCharacteristic = that.getaddService(Service.Lightbulb).getCharacteristic(Characteristic.Hue);
                    thisCharacteristic.on('get', function(callback) {
                        callback(null, Math.round(that.device.attributes.hue * 3.6));
                    });
                    thisCharacteristic.on('set', function(value, callback) {
                        that.platform.api.runCommand(callback, that.deviceid, 'setHue', {
                            value1: Math.round(value / 3.6)
                        });
                    });
                    that.platform.addAttributeUsage('hue', that.deviceid, thisCharacteristic);

                    thisCharacteristic = that.getaddService(Service.Lightbulb).getCharacteristic(Characteristic.Saturation);
                    thisCharacteristic.on('get', function(callback) {
                        callback(null, parseInt(that.device.attributes.saturation));
                    });
                    thisCharacteristic.on('set', function(value, callback) {
                        that.platform.api.runCommand(callback, that.deviceid, 'setSaturation', {
                            value1: value
                        });
                    });
                    that.platform.addAttributeUsage('saturation', that.deviceid, thisCharacteristic);
                }
            }
        }

        if (device.capabilities['GarageDoorControl'] !== undefined) {
            that.deviceGroup = 'garage_doors';

            thisCharacteristic = that.getaddService(Service.GarageDoorOpener).getCharacteristic(Characteristic.TargetDoorState);
            thisCharacteristic.on('get', function(callback) {
                if (that.device.attributes.door === 'closed' || that.device.attributes.door === 'closing') {
                    callback(null, Characteristic.TargetDoorState.CLOSED);
                } else if (that.device.attributes.door === 'open' || that.device.attributes.door === 'opening') {
                    callback(null, Characteristic.TargetDoorState.OPEN);
                }
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

        if (device.capabilities['Valve'] !== undefined) { //Currently only works with SmartThings Rachio Devices
            that.deviceGroup = 'valve';
            let valveType = (device.capabilities['Irrigation'] !== undefined ? 1 : 0);

            if (device.capabilities['Irrigation'] !== undefined) {
                // that.platform.addAttributeUsage('remainingDuration', that.deviceid, thisCharacteristic);
                // if (device.attributes.scheduleType !== undefined) {
                //     thisCharacteristic = that.getaddService(Service.IrrigationSystem).getCharacteristic(Characteristic.ProgramMode);
                //     thisCharacteristic.on('get', function(callback) {
                //         let val = 0;
                //         if (device.attributes.scheduleType === 'program') {
                //             val = 1;
                //         } else if (device.attributes.scheduleType === 'off') {
                //             val = 0;
                //         } else if (device.attributes.scheduleType === 'manual') {
                //             val = 2;
                //         }
                //         callback(null, val);
                //     });
                //     that.platform.addAttributeUsage('remainingDuration', that.deviceid, thisCharacteristic);
                // }
            }
            //Defines the valve type (irrigation or generic)
            thisCharacteristic = that.getaddService(Service.Valve).getCharacteristic(Characteristic.ValveType);
            thisCharacteristic.on('get', function(callback) {
                callback(null, valveType);
            });
            that.platform.addAttributeUsage('valveType', that.deviceid, thisCharacteristic);

            //Defines Valve State (opened/closed)
            thisCharacteristic = that.getaddService(Service.Valve).getCharacteristic(Characteristic.Active);
            thisCharacteristic.on('get', function(callback) {
                callback(null, that.device.attributes.valve === 'open' ? 1 : 0);
            });
            thisCharacteristic.on('set', function(value, callback) {
                if (device.attributes.inStandby !== 'true') {
                    if (value) {
                        that.platform.api.runCommand(callback, that.deviceid, 'open');
                    } else {
                        that.platform.api.runCommand(callback, that.deviceid, 'close');
                    }
                }
            });
            that.platform.addAttributeUsage('active', that.deviceid, thisCharacteristic);

            //Gets the inUse Characteristic
            thisCharacteristic = that.getaddService(Service.Valve).getCharacteristic(Characteristic.InUse);
            thisCharacteristic.on('get', function(callback) {
                callback(null, that.device.attributes.valve === 'open' ? 1 : 0);
            });
            that.platform.addAttributeUsage('inUse', that.deviceid, thisCharacteristic);

            //Gets the inUse Characteristic
            thisCharacteristic = that.getaddService(Service.Valve).getCharacteristic(Characteristic.IsConfigured);
            thisCharacteristic.on('get', function(callback) {
                callback(null, 1);
            });
            that.platform.addAttributeUsage('IsConfigured', that.deviceid, thisCharacteristic);

            //Manages the zoneDuration Characteristic
            if (device.attributes.zoneDuration !== undefined) {
                thisCharacteristic = that.getaddService(Service.Valve).getCharacteristic(Characteristic.RemainingDuration);
                thisCharacteristic.on('get', function(callback) {
                    let zoneDur = device.attributes.zoneDuration || 0;
                    if (zoneDur > 3600) {
                        zoneDur = 3600;
                    }
                    // that.platform.log(that.deviceid + ' remainingDuration: ' + zoneDur);
                    callback(null, parseInt(zoneDur));
                });
                that.platform.addAttributeUsage('remainingDuration', that.deviceid, thisCharacteristic);

                //Manages the zoneDuration Characteristic
                thisCharacteristic = that.getaddService(Service.Valve).getCharacteristic(Characteristic.SetDuration);
                thisCharacteristic.on('get', function(callback) {
                    let zoneDur = device.attributes.zoneDuration || 0;
                    if (zoneDur > 3600) {
                        zoneDur = 3600;
                    }
                    // that.platform.log(that.deviceid + ' remainingDuration: ' + zoneDur);
                    callback(null, parseInt(zoneDur));
                });
                thisCharacteristic.on('set', function(value, callback) {
                    let zoneDur = value || 0;
                    if (zoneDur > 3600) {
                        zoneDur = 3600;
                    }
                    // that.platform.log(that.deviceid + ' set remainingDuration value : ' + zoneDur);
                    that.platform.api.runCommand(callback, 'setZoneWaterTime', parseInt(zoneDur));
                });
                that.platform.addAttributeUsage('setDuration', that.deviceid, thisCharacteristic);
            }
        }

        //Defines Speaker Device
        if (isSpeaker === true) {
            that.deviceGroup = 'speakers';

            thisCharacteristic = that.getaddService(Service.Speaker).getCharacteristic(Characteristic.Volume);
            thisCharacteristic.on('get', function(callback) {
                callback(null, parseInt(that.device.attributes.level || 0));
            });
            thisCharacteristic.on('set', function(value, callback) {
                if (value > 0) {
                    that.platform.api.runCommand(callback, that.deviceid, 'setLevel', {
                        value1: value
                    });
                }
            });
            that.platform.addAttributeUsage('volume', that.deviceid, thisCharacteristic);

            thisCharacteristic = that.getaddService(Service.Speaker).getCharacteristic(Characteristic.Mute);
            thisCharacteristic.on('get', function(callback) {
                callback(null, that.device.attributes.mute === 'muted');
            });
            thisCharacteristic.on('set', function(value, callback) {
                if (value) {
                    that.platform.api.runCommand(callback, that.deviceid, 'mute');
                } else {
                    that.platform.api.runCommand(callback, that.deviceid, 'unmute');
                }
            });
            that.platform.addAttributeUsage('mute', that.deviceid, thisCharacteristic);
        }

        //Handles Standalone Fan with no levels
        if (isFan === true && (that.device.capabilities['FanLight'] !== undefined || that.deviceGroup === 'unknown')) {
            that.deviceGroup = 'fans';
            thisCharacteristic = that.getaddService(Service.Fanv2).getCharacteristic(Characteristic.Active);
            thisCharacteristic.on('get', function(callback) {
                callback(null, that.device.attributes.switch === 'on');
            });
            thisCharacteristic.on('set', function(value, callback) {
                if (value) {
                    that.platform.api.runCommand(callback, that.deviceid, 'on');
                } else {
                    that.platform.api.runCommand(callback, that.deviceid, 'off');
                }
            });
            that.platform.addAttributeUsage('switch', that.deviceid, thisCharacteristic);

            if (that.device.attributes.level !== undefined || that.device.attributes.fanSpeed !== undefined) {
                let fanLvl = that.device.attributes.fanSpeed ? fanSpeedConversion(that.device.attributes.fanSpeed, (that.device.command['medHighSpeed'] !== undefined)) : parseInt(that.device.attributes.level);
                that.platform.log("Fan with (" + that.device.attributes.fanSpeed ? "fanSpeed" : "level" + ') | value: ' + fanLvl);
                thisCharacteristic = that.getaddService(Service.Fanv2).getCharacteristic(Characteristic.RotationSpeed);
                thisCharacteristic.on('get', function(callback) {
                    callback(null, fanLvl);
                });
                thisCharacteristic.on('set', function(value, callback) {
                    if (value > 0) {
                        let cmdStr = (that.device.attributes.fanSpeed) ? 'fanspeed' : 'setLevel';
                        let cmdVal = (that.device.attributes.fanSpeed) ? fanSpeedConversion(value, (that.device.command['medHighSpeed'] !== undefined)) : parseInt(value);
                        that.platform.log("Fan Command (Str: " + cmdStr + ') | value: (' + cmdVal + ')');
                        that.platform.api.runCommand(callback, that.deviceid, cmdStr, {
                            value1: cmdVal
                        });
                    }
                });
                that.platform.addAttributeUsage('level', that.deviceid, thisCharacteristic);
            }
        }

        if (device.capabilities['Mode'] !== undefined) {
            that.deviceGroup = 'mode';
            that.platform.log('Mode: (' + that.name + ')');
            thisCharacteristic = that.getaddService(Service.Switch).getCharacteristic(Characteristic.On);
            thisCharacteristic.on('get', function(callback) {
                callback(null, that.device.attributes.switch === 'on');
            });
            thisCharacteristic.on('set', function(value, callback) {
                if (value && that.device.attributes.switch === 'off') {
                    that.platform.api.runCommand(callback, that.deviceid, 'mode', {
                        value1: that.name.toString()
                    });
                }
            });
            that.platform.addAttributeUsage('switch', that.deviceid, thisCharacteristic);
        }

        if (device.capabilities['Button'] !== undefined) {
            that.deviceGroup = 'button';
            that.platform.log('Button: (' + that.name + ')');
            thisCharacteristic = that.getaddService(Service.Switch).getCharacteristic(Characteristic.On);
            thisCharacteristic.on('get', function(callback) {
                callback(null, that.device.attributes.switch === 'on');
            });
            thisCharacteristic.on('set', function(value, callback) {
                if (value && that.device.attributes.switch === 'off') {
                    that.platform.api.runCommand(callback, that.deviceid, 'button');
                }
            });
            that.platform.addAttributeUsage('switch', that.deviceid, thisCharacteristic);
        }

        if (device.capabilities['Switch'] !== undefined && (that.device.capabilities['FanLight'] !== undefined || that.deviceGroup === 'unknown')) {
            //Handles Standalone Fan with no levels
            if (isLight === true) {
                that.deviceGroup = 'light';
                if (that.device.capabilities['FanLight'] !== undefined) {
                    that.platform.log('FanLight: ' + that.device.name);
                }
                thisCharacteristic = that.getaddService(Service.Lightbulb).getCharacteristic(Characteristic.On);
                thisCharacteristic.on('get', function(callback) {
                    callback(null, that.device.attributes.switch === 'on');
                });
                thisCharacteristic.on('set', function(value, callback) {
                    if (value) {
                        that.platform.api.runCommand(callback, that.deviceid, 'on');
                    } else {
                        that.platform.api.runCommand(callback, that.deviceid, 'off');
                    }
                });
                that.platform.addAttributeUsage('switch', that.deviceid, thisCharacteristic);
            } else {
                that.deviceGroup = 'switch';

                thisCharacteristic = that.getaddService(Service.Switch).getCharacteristic(Characteristic.On);
                thisCharacteristic.on('get', function(callback) {
                    callback(null, that.device.attributes.switch === 'on');
                });
                thisCharacteristic.on('set', function(value, callback) {
                    if (value) {
                        that.platform.api.runCommand(callback, that.deviceid, 'on');
                    } else {
                        that.platform.api.runCommand(callback, that.deviceid, 'off');
                    }
                });
                that.platform.addAttributeUsage('switch', that.deviceid, thisCharacteristic);

                if (that.device.capabilities['EnergyMeter'] !== undefined) {
                    thisCharacteristic = that.getaddService(Service.Switch).addCharacteristic(CommunityTypes.CurrentConsumption1);
                    thisCharacteristic.on('get', function(callback) {
                        callback(null, Math.round(that.device.attributes.power));
                    });
                    that.platform.addAttributeUsage('power', that.deviceid, thisCharacteristic);
                }
                if (device.capabilities['PowerMeter'] !== undefined) {
                    thisCharacteristic = that.getaddService(Service.Switch).addCharacteristic(CommunityTypes.CurrentConsumption1);
                    thisCharacteristic.on('get', function(callback) {
                        callback(null, Math.round(that.device.attributes.power));
                    });
                    that.platform.addAttributeUsage('power', that.deviceid, thisCharacteristic);
                }
            }
        }

        // Smoke Detectors
        if (device.capabilities['SmokeDetector'] !== undefined && that.device.attributes.smoke) {
            that.deviceGroup = 'detectors';

            thisCharacteristic = that.getaddService(Service.SmokeSensor).getCharacteristic(Characteristic.SmokeDetected);
            thisCharacteristic.on('get', function(callback) {
                if (that.device.attributes.smoke === 'clear') {
                    callback(null, Characteristic.SmokeDetected.SMOKE_NOT_DETECTED);
                } else {
                    callback(null, Characteristic.SmokeDetected.SMOKE_DETECTED);
                }
            });
            that.platform.addAttributeUsage('smoke', that.deviceid, thisCharacteristic);

            if (device.capabilities['TamperAlert'] !== undefined) {
                thisCharacteristic = that.getaddService(Service.SmokeSensor).getCharacteristic(Characteristic.StatusTampered);
                thisCharacteristic.on('get', function(callback) {
                    callback(null, (device.attributes.tamperAlert === 'detected') ? Characteristic.StatusTampered.TAMPERED : Characteristic.StatusTampered.NOT_TAMPERED);
                });
                that.platform.addAttributeUsage('tamper', that.deviceid, thisCharacteristic);
            }
        }

        if (device.capabilities['CarbonMonoxideDetector'] !== undefined && that.device.attributes.carbonMonoxide) {
            that.deviceGroup = 'detectors';

            thisCharacteristic = that.getaddService(Service.CarbonMonoxideSensor).getCharacteristic(Characteristic.CarbonMonoxideDetected);
            thisCharacteristic.on('get', function(callback) {
                if (that.device.attributes.carbonMonoxide === 'clear') {
                    callback(null, Characteristic.CarbonMonoxideDetected.CO_LEVELS_NORMAL);
                } else {
                    callback(null, Characteristic.CarbonMonoxideDetected.CO_LEVELS_ABNORMAL);
                }
            });
            that.platform.addAttributeUsage('carbonMonoxide', that.deviceid, thisCharacteristic);

            if (device.capabilities['TamperAlert'] !== undefined) {
                thisCharacteristic = that.getaddService(Service.CarbonMonoxideSensor).getCharacteristic(Characteristic.StatusTampered);
                thisCharacteristic.on('get', function(callback) {
                    callback(null, (device.attributes.tamperAlert === 'detected') ? Characteristic.StatusTampered.TAMPERED : Characteristic.StatusTampered.NOT_TAMPERED);
                });
                that.platform.addAttributeUsage('tamper', that.deviceid, thisCharacteristic);
            }
        }

        if (device.capabilities['CarbonDioxideMeasurement'] !== undefined && that.device.attributes.carbonDioxideMeasurement) {
            that.deviceGroup = 'carbonDioxide';

            thisCharacteristic = that.getaddService(Service.CarbonDioxideSensor).getCharacteristic(Characteristic.CarbonDioxideDetected);
            thisCharacteristic.on('get', function(callback) {
                if (that.device.attributes.carbonDioxideMeasurement > 0) {
                    callback(null, Characteristic.CarbonDioxideDetected.CO2_LEVELS_ABNORMAL);
                } else {
                    callback(null, Characteristic.CarbonDioxideDetected.CO2_LEVELS_NORMAL);
                }
            });
            that.platform.addAttributeUsage('carbonDioxide', that.deviceid, thisCharacteristic);

            thisCharacteristic = that.getaddService(Service.CarbonDioxideSensor).getCharacteristic(Characteristic.CarbonDioxideLevel);
            thisCharacteristic.on('get', function(callback) {
                if (that.device.attributes.carbonDioxideMeasurement >= 0) {
                    callback(null, that.device.attributes.carbonDioxideMeasurement);
                }
            });
            that.platform.addAttributeUsage('carbonDioxideLevel', that.deviceid, thisCharacteristic);

            if (device.capabilities['TamperAlert'] !== undefined) {
                thisCharacteristic = that.getaddService(Service.CarbonDioxideSensor).getCharacteristic(Characteristic.StatusTampered);
                thisCharacteristic.on('get', function(callback) {
                    callback(null, (device.attributes.tamperAlert === 'detected') ? Characteristic.StatusTampered.TAMPERED : Characteristic.StatusTampered.NOT_TAMPERED);
                });
                that.platform.addAttributeUsage('tamper', that.deviceid, thisCharacteristic);
            }
        }

        if (device.capabilities['MotionSensor'] !== undefined) {
            if (that.deviceGroup === 'unknown') {
                that.deviceGroup = 'sensor';
            }

            thisCharacteristic = that.getaddService(Service.MotionSensor).getCharacteristic(Characteristic.MotionDetected);
            thisCharacteristic.on('get', function(callback) {
                callback(null, that.device.attributes.motion === 'active');
            });
            that.platform.addAttributeUsage('motion', that.deviceid, thisCharacteristic);

            if (device.capabilities['TamperAlert'] !== undefined) {
                thisCharacteristic = that.getaddService(Service.MotionSensor).getCharacteristic(Characteristic.StatusTampered);
                thisCharacteristic.on('get', function(callback) {
                    callback(null, (device.attributes.tamperAlert === 'detected') ? Characteristic.StatusTampered.TAMPERED : Characteristic.StatusTampered.NOT_TAMPERED);
                });
                that.platform.addAttributeUsage('tamper', that.deviceid, thisCharacteristic);
            }
        }

        if (device.capabilities['WaterSensor'] !== undefined) {
            if (that.deviceGroup === 'unknown') {
                that.deviceGroup = 'sensor';
            }

            thisCharacteristic = that.getaddService(Service.LeakSensor).getCharacteristic(Characteristic.LeakDetected);
            thisCharacteristic.on('get', function(callback) {
                var reply = Characteristic.LeakDetected.LEAK_DETECTED;
                if (that.device.attributes.water === 'dry') {
                    reply = Characteristic.LeakDetected.LEAK_NOT_DETECTED;
                }
                callback(null, reply);
            });
            that.platform.addAttributeUsage('water', that.deviceid, thisCharacteristic);
            if (device.capabilities['TamperAlert'] !== undefined) {
                thisCharacteristic = that.getaddService(Service.LeakSensor).getCharacteristic(Characteristic.StatusTampered);
                thisCharacteristic.on('get', function(callback) {
                    callback(null, (device.attributes.tamperAlert === 'detected') ? Characteristic.StatusTampered.TAMPERED : Characteristic.StatusTampered.NOT_TAMPERED);
                });
                that.platform.addAttributeUsage('tamper', that.deviceid, thisCharacteristic);
            }
        }

        if (device.capabilities['PresenceSensor'] !== undefined) {
            if (that.deviceGroup === 'unknown') {
                that.deviceGroup = 'sensor';
            }

            thisCharacteristic = that.getaddService(Service.OccupancySensor).getCharacteristic(Characteristic.OccupancyDetected);
            thisCharacteristic.on('get', function(callback) {
                callback(null, that.device.attributes.presence === 'present');
            });
            that.platform.addAttributeUsage('presence', that.deviceid, thisCharacteristic);
            if (device.capabilities['TamperAlert'] !== undefined) {
                thisCharacteristic = that.getaddService(Service.OccupancySensor).getCharacteristic(Characteristic.StatusTampered);
                thisCharacteristic.on('get', function(callback) {
                    callback(null, (device.attributes.tamperAlert === 'detected') ? Characteristic.StatusTampered.TAMPERED : Characteristic.StatusTampered.NOT_TAMPERED);
                });
                that.platform.addAttributeUsage('tamper', that.deviceid, thisCharacteristic);
            }
        }

        if (device.capabilities['RelativeHumidityMeasurement'] !== undefined) {
            if (that.deviceGroup === 'unknown') {
                that.deviceGroup = 'sensor';
            }
            thisCharacteristic = that.getaddService(Service.HumiditySensor).getCharacteristic(Characteristic.CurrentRelativeHumidity);
            thisCharacteristic.on('get', function(callback) {
                callback(null, Math.round(that.device.attributes.humidity));
            });
            that.platform.addAttributeUsage('humidity', that.deviceid, thisCharacteristic);
            if (device.capabilities['TamperAlert'] !== undefined) {
                thisCharacteristic = that.getaddService(Service.HumiditySensor).getCharacteristic(Characteristic.StatusTampered);
                thisCharacteristic.on('get', function(callback) {
                    callback(null, (device.attributes.tamperAlert === 'detected') ? Characteristic.StatusTampered.TAMPERED : Characteristic.StatusTampered.NOT_TAMPERED);
                });
                that.platform.addAttributeUsage('tamper', that.deviceid, thisCharacteristic);
            }
        }

        if (device.capabilities['TemperatureMeasurement'] !== undefined) {
            if (that.deviceGroup === 'unknown') {
                that.deviceGroup = 'sensor';
            }
            thisCharacteristic = that.getaddService(Service.TemperatureSensor).getCharacteristic(Characteristic.CurrentTemperature);
            thisCharacteristic.on('get', function(callback) {
                if (that.platform.temperature_unit === 'C') {
                    callback(null, Math.round(that.device.attributes.temperature * 10) / 10);
                } else {
                    callback(null, Math.round((that.device.attributes.temperature - 32) / 1.8 * 10) / 10);
                }
            });
            that.platform.addAttributeUsage('temperature', that.deviceid, thisCharacteristic);

            if (device.capabilities['TamperAlert'] !== undefined) {
                thisCharacteristic = that.getaddService(Service.TemperatureSensor).getCharacteristic(Characteristic.StatusTampered);
                thisCharacteristic.on('get', function(callback) {
                    callback(null, (device.attributes.tamperAlert === 'detected') ? Characteristic.StatusTampered.TAMPERED : Characteristic.StatusTampered.NOT_TAMPERED);
                });
                that.platform.addAttributeUsage('tamper', that.deviceid, thisCharacteristic);
            }
        }

        if (device.capabilities['IlluminanceMeasurement'] !== undefined) {
            // console.log(device);
            if (that.deviceGroup === 'unknown') {
                that.deviceGroup = 'sensor';
            }
            thisCharacteristic = that.getaddService(Service.LightSensor).getCharacteristic(Characteristic.CurrentAmbientLightLevel);
            thisCharacteristic.on('get', function(callback) {
                callback(null, Math.ceil(that.device.attributes.illuminance));
            });
            that.platform.addAttributeUsage('illuminance', that.deviceid, thisCharacteristic);
        }

        if (device.capabilities['ContactSensor'] !== undefined && device.capabilities['GarageDoorControl'] === undefined) {
            if (that.deviceGroup === 'unknown') {
                that.deviceGroup = 'sensor';
            }
            thisCharacteristic = that.getaddService(Service.ContactSensor).getCharacteristic(Characteristic.ContactSensorState);
            thisCharacteristic.on('get', function(callback) {
                if (that.device.attributes.contact === 'closed') {
                    callback(null, Characteristic.ContactSensorState.CONTACT_DETECTED);
                } else {
                    callback(null, Characteristic.ContactSensorState.CONTACT_NOT_DETECTED);
                }
            });
            that.platform.addAttributeUsage('contact', that.deviceid, thisCharacteristic);

            if (device.capabilities['TamperAlert'] !== undefined) {
                thisCharacteristic = that.getaddService(Service.ContactSensor).getCharacteristic(Characteristic.StatusTampered);
                thisCharacteristic.on('get', function(callback) {
                    callback(null, (device.attributes.tamperAlert === 'detected') ? Characteristic.StatusTampered.TAMPERED : Characteristic.StatusTampered.NOT_TAMPERED);
                });
                that.platform.addAttributeUsage('tamper', that.deviceid, thisCharacteristic);
            }
        }

        if (device.capabilities['Battery'] !== undefined) {
            thisCharacteristic = that.getaddService(Service.BatteryService).getCharacteristic(Characteristic.BatteryLevel);
            thisCharacteristic.on('get', function(callback) {
                callback(null, Math.round(that.device.attributes.battery));
            });
            that.platform.addAttributeUsage('battery', that.deviceid, thisCharacteristic);

            thisCharacteristic = that.getaddService(Service.BatteryService).getCharacteristic(Characteristic.StatusLowBattery);
            thisCharacteristic.on('get', function(callback) {
                let battStatus = (that.device.attributes.battery < 20) ? Characteristic.StatusLowBattery.BATTERY_LEVEL_LOW : Characteristic.StatusLowBattery.BATTERY_LEVEL_NORMAL;
                callback(null, battStatus);
            });

            that.getaddService(Service.BatteryService).setCharacteristic(Characteristic.ChargingState, Characteristic.ChargingState.NOT_CHARGING);
            that.platform.addAttributeUsage('battery', that.deviceid, thisCharacteristic);
        }

        // if (device.capabilities['EnergyMeter'] !== undefined) {
        //     that.deviceGroup = 'EnergyMeter';
        //     thisCharacteristic = that.getaddService(Service.Outlet).addCharacteristic(CommunityTypes.TotalConsumption1);
        //     thisCharacteristic.on('get', function(callback) {
        //         callback(null, Math.round(that.device.attributes.energy));
        //     });
        //     that.platform.addAttributeUsage('energy', that.deviceid, thisCharacteristic);
        // }

        // if (device.capabilities['PowerMeter'] !== undefined) {
        //     thisCharacteristic = that.getaddService(Service.Outlet).addCharacteristic(CommunityTypes.CurrentConsumption1);
        //     thisCharacteristic.on('get', function(callback) {
        //         callback(null, Math.round(that.device.attributes.power));
        //     });
        //     that.platform.addAttributeUsage('power', that.deviceid, thisCharacteristic);
        // }

        if (device.capabilities['AccelerationSensor'] !== undefined) {
            if (that.deviceGroup === 'unknown') {
                that.deviceGroup = 'sensor';
            }
        }

        if (device.capabilities['ThreeAxis'] !== undefined) {
            if (that.deviceGroup === 'unknown') {
                that.deviceGroup = 'sensor';
            }
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
                        // TODO: Double check if Smartthings can send "auto" as operatingstate. I don't think it can.
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

            if (device.capabilities['RelativeHumidityMeasurement'] !== undefined) {
                thisCharacteristic = that.getaddService(Service.Thermostat).getCharacteristic(Characteristic.CurrentRelativeHumidity);
                thisCharacteristic.on('get', function(callback) {
                    callback(null, parseInt(that.device.attributes.humidity));
                });
                that.platform.addAttributeUsage('humidity', that.deviceid, thisCharacteristic);
            }

            thisCharacteristic = that.getaddService(Service.Thermostat).getCharacteristic(Characteristic.CurrentTemperature);
            thisCharacteristic.on('get', function(callback) {
                if (that.platform.temperature_unit === 'C') {
                    callback(null, Math.round(that.device.attributes.temperature * 10) / 10);
                } else {
                    callback(null, Math.round((that.device.attributes.temperature - 32) / 1.8 * 10) / 10);
                }
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
                if (!temp) {
                    callback('Unknown');
                } else if (that.platform.temperature_unit === 'C') {
                    callback(null, Math.round(temp * 10) / 10);
                } else {
                    callback(null, Math.round((temp - 32) / 1.8 * 10) / 10);
                }
            });
            thisCharacteristic.on('set', function(value, callback) {
                // Convert the Celsius value to the appropriate unit for Smartthings
                var temp = value;
                if (that.platform.temperature_unit === 'C') {
                    temp = value;
                } else {
                    temp = value * 1.8 + 32;
                }

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
                            that.platform.api.runCommand(callback, that.deviceid, 'setCoolingSetpoint', {
                                value1: temp
                            });
                        } else {
                            that.platform.api.runCommand(null, that.deviceid, 'setHeatingSetpoint', {
                                value1: temp
                            });
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
                if (platform.temperature_unit === 'C') {
                    callback(null, Characteristic.TemperatureDisplayUnits.CELSIUS);
                } else {
                    callback(null, Characteristic.TemperatureDisplayUnits.FAHRENHEIT);
                }
            });
            // that.platform.addAttributeUsage("temperature_unit", "platform", thisCharacteristic);

            thisCharacteristic = that.getaddService(Service.Thermostat).getCharacteristic(Characteristic.HeatingThresholdTemperature);
            thisCharacteristic.on('get', function(callback) {
                if (that.platform.temperature_unit === 'C') {
                    callback(null, Math.round(that.device.attributes.heatingSetpoint * 10) / 10);
                } else {
                    callback(null, Math.round((that.device.attributes.heatingSetpoint - 32) / 1.8 * 10) / 10);
                }
            });
            thisCharacteristic.on('set', function(value, callback) {
                // Convert the Celsius value to the appropriate unit for Smartthings
                var temp = value;
                if (that.platform.temperature_unit === 'C') {
                    temp = value;
                } else {
                    temp = value * 1.8 + 32;
                }
                that.platform.api.runCommand(callback, that.deviceid, 'setHeatingSetpoint', {
                    value1: temp
                });
                that.device.attributes.heatingSetpoint = temp;
            });
            that.platform.addAttributeUsage('heatingSetpoint', that.deviceid, thisCharacteristic);

            thisCharacteristic = that.getaddService(Service.Thermostat).getCharacteristic(Characteristic.CoolingThresholdTemperature);
            thisCharacteristic.on('get', function(callback) {
                if (that.platform.temperature_unit === 'C') {
                    callback(null, Math.round(that.device.attributes.coolingSetpoint * 10) / 10);
                } else {
                    callback(null, Math.round((that.device.attributes.coolingSetpoint - 32) / 1.8 * 10) / 10);
                }
            });
            thisCharacteristic.on('set', function(value, callback) {
                // Convert the Celsius value to the appropriate unit for Smartthings
                var temp = value;
                if (that.platform.temperature_unit === 'C') {
                    temp = value;
                } else {
                    temp = value * 1.8 + 32;
                }
                that.platform.api.runCommand(callback, that.deviceid, 'setCoolingSetpoint', {
                    value1: temp
                });
                that.device.attributes.coolingSetpoint = temp;
            });
            that.platform.addAttributeUsage('coolingSetpoint', that.deviceid, thisCharacteristic);
        }

        if (device.attributes['hsmStatus'] !== undefined) {
            that.deviceGroup = 'alarm';
            thisCharacteristic = that.getaddService(Service.SecuritySystem).getCharacteristic(Characteristic.SecuritySystemCurrentState);
            thisCharacteristic.on('get', function(callback) {
                // that.platform.log(that.deviceid + ' check 1: ' + that.device.attributes.hsmStatus);
                callback(null, convertAlarmState(that.device.attributes.hsmStatus, true));
            });
            that.platform.addAttributeUsage('hsmStatus', that.deviceid, thisCharacteristic);

            thisCharacteristic = that.getaddService(Service.SecuritySystem).getCharacteristic(Characteristic.SecuritySystemTargetState);
            thisCharacteristic.on('get', function(callback) {
                // that.platform.log(that.deviceid + ' check 2: ' + that.device.attributes.hsmStatus);
                callback(null, convertAlarmState(that.device.attributes.hsmStatus, true));
            });
            thisCharacteristic.on('set', function(value, callback) {
                // that.platform.log(that.deviceid + ' set value : ' + value);
                let val = convertAlarmState(value);
                that.platform.api.runCommand(callback, 'hsmSetArm', val);
                that.device.attributes.hsmStatus = val;
            });
            that.platform.addAttributeUsage('hsmStatus', that.deviceid, thisCharacteristic);
        }
    }
    this.loadData(device, that);
}

function fanSpeedConversion(speedVal, has4Spd = false) {
    if (speedVal <= 0) {
        return 'off';
    }
    if (has4Spd) {
        if (speedVal > 0 && speedVal <= 25) {
            return 'low';
        } else if (speedVal > 25 && speedVal <= 50) {
            return 'med';
        } else if (speedVal > 50 && speedVal <= 75) {
            return 'medhigh';
        } else if (speedVal > 75 && speedVal <= 100) {
            return 'high';
        }
    } else {
        if (speedVal > 0 && speedVal <= 33) {
            return 'low';
        } else if (speedVal > 33 && speedVal <= 66) {
            return 'medium';
        } else if (speedVal > 66 && speedVal <= 99) {
            return 'high';
        }
    }
}

function convertAlarmState(value, valInt = false) {
    switch (value) {
        case 'armedHome':
        case 0:
            return valInt ? Characteristic.SecuritySystemCurrentState.STAY_ARM : 'armHome';
        case 'armedAway':
        case 1:
            return valInt ? Characteristic.SecuritySystemCurrentState.AWAY_ARM : 'armAway';
        case 'armedNight':
        case 2:
            return valInt ? Characteristic.SecuritySystemCurrentState.NIGHT_ARM : 'armHome';
        case 'disarmed':
        case 3:
            return valInt ? Characteristic.SecuritySystemCurrentState.DISARMED : 'disarm';
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
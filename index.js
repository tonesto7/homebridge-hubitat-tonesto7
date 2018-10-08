var he_st_api = require('./lib/he_st_api');
var http = require('http');
var os = require('os');
const pluginName = 'homebridge-hubitat';
const platformName = 'Hubitat';
var Service, Characteristic, Accessory, uuid;

var HE_ST_Accessory;

module.exports = function(homebridge) {
    Service = homebridge.hap.Service;
    Characteristic = homebridge.hap.Characteristic;
    Accessory = homebridge.hap.Accessory;
    uuid = homebridge.hap.uuid;
    HE_ST_Accessory = require('./accessories/he_st_accessories')(Accessory, Service, Characteristic, uuid);
    homebridge.registerPlatform(pluginName, platformName, HE_ST_Platform);
};

function HE_ST_Platform(log, config) {
    // Load Wink Authentication From Config File
    this.app_url = config['app_url'];
    this.app_id = config['app_id'];
    this.access_token = config['access_token'];
    this.hub_ip = config["hub_ip"];
    this.excludedCapabilities = config["excluded_capabilities"] || [];

    // This is how often it does a full refresh
    this.polling_seconds = config['polling_seconds'];
    // Get a full refresh every hour.
    if (!this.polling_seconds) {
        this.polling_seconds = 3600;
    }

    // This is how often it polls for subscription data.
    this.update_method = config['update_method'];
    if (!this.update_method) {
        this.update_method = 'direct';
    }

    this.update_seconds = config['update_seconds'];
    // 30 seconds is the new default
    if (!this.update_seconds) {
        this.update_seconds = 30;
    }
    if (this.update_method === 'api' && this.update_seconds < 30) {
        this.log('The setting for update_seconds is lower than the ' + platformName + ' recommended value. Please switch to direct or PubNub using a free subscription for real-time updates.');
    }
    this.direct_port = config['direct_port'];
    if (this.direct_port === undefined || this.direct_port === '') {
        this.direct_port = (platformName === 'Hubitat' ? 8000 : 8005);
    }

    this.direct_ip = config['direct_ip'];
    if (this.direct_ip === undefined || this.direct_ip === '') {
        this.direct_ip = getIPAddress();
    }
    this.config = config;
    this.api = he_st_api;
    this.log = log;
    this.deviceLookup = {};
    this.firstpoll = true;
    this.attributeLookup = {};
}

HE_ST_Platform.prototype = {
    reloadData: function(callback) {
        var that = this;
        that.log('config: ', JSON.stringify(this.config));
        var foundAccessories = [];
        that.log.debug('Refreshing All Device Data');
        he_st_api.getDevices(function(myList) {
            that.log.debug('Received All Device Data');
            // success
            if (myList && myList.deviceList && myList.deviceList instanceof Array) {
                var populateDevices = function(devices) {
                    for (var i = 0; i < devices.length; i++) {
                        var device = devices[i];
                        device.excludedCapabilities = that.excludedCapabilities[device.deviceid] || ["None"];
                        var accessory;
                        if (that.deviceLookup[device.deviceid]) {
                            accessory = that.deviceLookup[device.deviceid];
                            accessory.loadData(devices[i]);
                        } else {
                            accessory = new HE_ST_Accessory(that, device);
                            // that.log(accessory);
                            if (accessory !== undefined) {
                                if (accessory.services.length <= 1 || accessory.deviceGroup === 'unknown') {
                                    if (that.firstpoll) {
                                        that.log('Device Skipped - Group ' + accessory.deviceGroup + ', Name ' + accessory.name + ', ID ' + accessory.deviceid + ', JSON: ' + JSON.stringify(device));
                                    }
                                } else {
                                    // that.log("Device Added - Group " + accessory.deviceGroup + ", Name " + accessory.name + ", ID " + accessory.deviceid); //+", JSON: "+ JSON.stringify(device));
                                    that.deviceLookup[accessory.deviceid] = accessory;
                                    foundAccessories.push(accessory);
                                }
                            }
                        }
                    }
                };
                if (myList && myList.location) {
                    that.temperature_unit = myList.location.temperature_scale;
                }

                populateDevices(myList.deviceList);
            } else if (!myList || !myList.error) {
                that.log('Invalid Response from API call');
            } else if (myList.error) {
                that.log('Error received type ' + myList.type + ' - ' + myList.message);
            } else {
                that.log('Invalid Response from API call');
            }
            if (callback) callback(foundAccessories);
            that.firstpoll = false;
        });
    },
    accessories: function(callback) {
        this.log('Fetching ' + platformName + ' devices.');

        // IMPORTANT Links:
        // https://developer.apple.com/documentation/homekit/hmaccessory
        // https://developer.apple.com/documentation/homekit/hmcharacteristic/characteristic_types
        // https://developer.apple.com/documentation/homekit/hmcharacteristic/characteristic_values
        // https://github.com/KhaosT/HAP-NodeJS/blob/master/lib/gen/HomeKitTypes.js

        var that = this;
        var foundAccessories = [];
        this.deviceLookup = [];
        this.unknownCapabilities = [];
        this.knownCapabilities = [
            'Switch',
            'Light',
            'LightBulb',
            'Bulb',
            'Color Control',
            // 'ColorControl',
            'Door',
            'Window',
            'Battery',
            'Polling',
            'Lock',
            'Refresh',
            'Lock Codes',
            // 'LockCodes',
            'Sensor',
            'Actuator',
            'Configuration',
            'Switch Level',
            // 'SwitchLevel',
            'Temperature Measurement',
            // 'TemperatureMeasurement',
            'Motion Sensor',
            // 'MotionSensor',
            'Color Temperature',
            // 'ColorTemperature',
            'Illuminance Measurement',
            // 'IlluminanceMeasurement',
            'Contact Sensor',
            // 'ContactSensor',
            'Acceleration Sensor',
            // 'AccelerationSensor',
            'Door Control',
            // 'DoorControl',
            'Garage Door Control',
            // 'GarageDoorControl',
            'Relative Humidity Measurement',
            // 'RelativeHumidityMeasurement',
            'Presence Sensor',
            // 'PresenceSensor',
            'Carbon Dioxide Measurement',
            // 'CarbonDioxideMeasurement',
            'Carbon Monoxide Detector',
            // 'CarbonMonoxideDetector',
            // 'WaterSensor',
            'Water Sensor',
            'Window Shade',
            // 'WindowShade',
            'Valve',
            'Energy Meter',
            // 'EnergyMeter',
            'Power Meter',
            // 'PowerMeter',
            'Thermostat',
            'Thermostat Cooling Setpoint',
            // 'ThermostatCoolingSetpoint',
            'Thermostat Mode',
            // 'ThermostatMode',
            'Thermostat Fan Mode',
            // 'ThermostatFanMode',
            'Thermostat Operating State',
            // 'ThermostatOperatingState',
            'Thermostat Heating Setpoint',
            // 'ThermostatHeatingSetpoint',
            'Thermostat Setpoint',
            // 'ThermostatSetpoint',
            'Fan Speed',
            'Fan Control',
            'Fan Light',
            // 'FanSpeed',
            // 'FanControl',
            // 'FanLight',
            'Fan',
            'Speaker',
            'Tamper Alert',
            'Alarm',
            'Alarm System Status',
            'AlarmSystemStatus',
            'Mode',
            'Routine',
            'Button'
        ];
        if (platformName === 'Hubitat' || platformName === 'hubitat') {
            let newList = [];
            for (const item in this.knownCapabilities) {
                newList.push(this.knownCapabilities[item].replace(/ /g, ''));
            }
            this.knownCapabilities = newList;
        }
        this.temperature_unit = 'F';

        he_st_api.init(this.app_url, this.app_id, this.access_token, this.hub_ip);
        that.log('update_method: ' + that.update_method);
        this.reloadData(function(foundAccessories) {
            that.log('Unknown Capabilities: ' + JSON.stringify(that.unknownCapabilities));
            callback(foundAccessories);
            setInterval(that.reloadData.bind(that), that.polling_seconds * 1000);
            // Initialize Update Mechanism for realtime-ish updates.
            if (that.update_method === 'api') {
                setInterval(that.doIncrementalUpdate.bind(that), that.update_seconds * 1000);
            } else if (that.update_method === 'direct') {
                // The Hub sends updates to this module using http
                he_st_api_SetupHTTPServer(that);
                he_st_api.startDirect(null, that.direct_ip, that.direct_port);
            }
        });
    },
    addAttributeUsage: function(attribute, deviceid, mycharacteristic) {
        if (!this.attributeLookup[attribute]) {
            this.attributeLookup[attribute] = {};
        }
        if (!this.attributeLookup[attribute][deviceid]) {
            this.attributeLookup[attribute][deviceid] = [];
        }
        this.attributeLookup[attribute][deviceid].push(mycharacteristic);
    },

    doIncrementalUpdate: function() {
        var that = this;
        he_st_api.getUpdates(function(data) {
            that.processIncrementalUpdate(data, that);
        });
    },

    processIncrementalUpdate: function(data, that) {
        that.log('new data: ' + data);
        if (data && data.attributes && data.attributes instanceof Array) {
            for (var i = 0; i < data.attributes.length; i++) {
                that.processFieldUpdate(data.attributes[i], that);
            }
        }
    },

    processFieldUpdate: function(attributeSet, that) {
        // that.log("Processing Update");
        // that.log(attributeSet);
        if (!(that.attributeLookup[attributeSet.attribute] && that.attributeLookup[attributeSet.attribute][attributeSet.device])) {
            return;
        }
        var myUsage = that.attributeLookup[attributeSet.attribute][attributeSet.device];
        if (myUsage instanceof Array) {
            for (var j = 0; j < myUsage.length; j++) {
                var accessory = that.deviceLookup[attributeSet.device];
                if (accessory) {
                    accessory.device.attributes[attributeSet.attribute] = attributeSet.value;
                    myUsage[j].getValue();
                }
            }
        }
    }
};

function getIPAddress() {
    var interfaces = os.networkInterfaces();
    for (var devName in interfaces) {
        var iface = interfaces[devName];
        for (var i = 0; i < iface.length; i++) {
            var alias = iface[i];
            if (alias.family === 'IPv4' && alias.address !== '127.0.0.1' && !alias.internal) {
                return alias.address;
            }
        }
    }
    return '0.0.0.0';
}

function he_st_api_SetupHTTPServer(myHe_st_api) {
    // Get the IP address that we will send to the SmartApp. This can be overridden in the config file.
    let ip = myHe_st_api.direct_ip || getIPAddress();
    // Start the HTTP Server
    const server = http.createServer(function(request, response) {
        he_st_api_HandleHTTPResponse(request, response, myHe_st_api);
    });

    server.listen(myHe_st_api.direct_port, err => {
        if (err) {
            myHe_st_api.log('something bad happened', err);
            return '';
        }
        myHe_st_api.log(`Direct Connect Is Listening On ${ip}:${myHe_st_api.direct_port}`);
    });
    return 'good';
}

function he_st_api_HandleHTTPResponse(request, response, myHe_st_api) {
    if (request.url === '/initial') myHe_st_api.log(platformName + ' Hub Communication Established');
    if (request.url === '/update') {
        let body = [];
        request.on('data', (chunk) => {
            body.push(chunk);
        }).on('end', () => {
            body = Buffer.concat(body).toString();
            let data = JSON.parse(body);
            if (Object.keys(data).length > 3) {
                var newChange = {
                    device: data.change_device,
                    attribute: data.change_attribute,
                    value: data.change_value,
                    date: data.change_date
                };
                myHe_st_api.log('Change Event:', '(' + data.change_name + ') [' + (data.change_attribute ? data.change_attribute.toUpperCase() : 'unknown') + '] is ' + data.change_value);
                myHe_st_api.processFieldUpdate(newChange, myHe_st_api);
            }
        });
    }
    response.end('OK');
}
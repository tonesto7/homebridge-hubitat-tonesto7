var hubitat = require('./lib/hubitat_api');
var http = require('http');
var os = require('os');

var Service, Characteristic, Accessory, uuid, EnergyCharacteristics;

var HubitatAccessory;

module.exports = function(homebridge) {
    Service = homebridge.hap.Service;
    Characteristic = homebridge.hap.Characteristic;
    Accessory = homebridge.hap.Accessory;
    uuid = homebridge.hap.uuid;

    HubitatAccessory = require('./accessories/hubitat')(Accessory, Service, Characteristic, uuid);

    homebridge.registerPlatform('homebridge-hubitat', 'Hubitat', HubitatPlatform);
};

function HubitatPlatform(log, config) {
    // Load Wink Authentication From Config File
    this.app_url = config['app_url'];
    // this.app_id = config['app_id'];
    this.access_token = config['access_token'];

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
        this.log('The setting for update_seconds is lower than the Hubitat recommended value. Please switch to direct or PubNub using a free subscription for real-time updates.');
    }
    this.direct_port = config['direct_port'];
    if (this.direct_port === undefined || this.direct_port === '') {
        this.direct_port = 8005;
    }

    this.direct_ip = config['direct_ip'];
    if (this.direct_ip === undefined || this.direct_ip === '') {
        this.direct_ip = getIPAddress();
    }
    this.config = config;
    this.api = hubitat;
    this.log = log;
    this.deviceLookup = {};
    this.firstpoll = true;
    this.attributeLookup = {};
}

HubitatPlatform.prototype = {
    reloadData: function(callback) {
        var that = this;
        that.log('config: ', JSON.stringify(this.config));
        var foundAccessories = [];
        that.log.debug('Refreshing All Device Data');
        hubitat.getDevices(function(myList) {
            that.log.debug('Received All Device Data');
            // success
            if (myList && myList.deviceList && myList.deviceList instanceof Array) {
                var populateDevices = function(devices) {
                    for (var i = 0; i < devices.length; i++) {
                        var device = devices[i];

                        var accessory;
                        if (that.deviceLookup[device.deviceid]) {
                            accessory = that.deviceLookup[device.deviceid];
                            accessory.loadData(devices[i]);
                        } else {
                            accessory = new HubitatAccessory(that, device);
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
        this.log('Fetching Hubitat devices.');

        var that = this;
        var foundAccessories = [];
        this.deviceLookup = [];
        this.unknownCapabilities = [];
        this.knownCapabilities = [
            'Switch',
            'Light',
            'Color Control',
            'Battery',
            'Polling',
            'Lock',
            'Refresh',
            'Lock Codes',
            'Sensor',
            'Actuator',
            'Configuration',
            'Switch Level',
            'Temperature Measurement',
            'Motion Sensor',
            'Color Temperature',
            'Illuminance Measurement',
            'Contact Sensor',
            'Three Axis',
            'Acceleration Sensor',
            'Momentary',
            'Door Control',
            'Garage Door Control',
            'Relative Humidity Measurement',
            'Presence Sensor',
            'Thermostat',
            'Energy Meter',
            'Power Meter',
            'Thermostat Cooling Setpoint',
            'Thermostat Mode',
            'Thermostat Fan Mode',
            'Thermostat Operating State',
            'Thermostat Heating Setpoint',
            'Thermostat Setpoint',
            'Indicator',
            'Alarm',
            'Alarm System Status'
        ];
        this.temperature_unit = 'F';

        hubitat.init(this.app_url, this.access_token);
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
                hubitat_SetupHTTPServer(that);
                hubitat.startDirect(null, that.direct_ip, that.direct_port);
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
        hubitat.getUpdates(function(data) {
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

function hubitat_SetupHTTPServer(myHubitat) {
    // Get the IP address that we will send to the SmartApp. This can be overridden in the config file.
    let ip = myHubitat.direct_ip || getIPAddress();
    // Start the HTTP Server
    const server = http.createServer(function(request, response) {
        hubitat_HandleHTTPResponse(request, response, myHubitat);
    });

    server.listen(myHubitat.direct_port, err => {
        if (err) {
            myHubitat.log('something bad happened', err);
            return '';
        }
        myHubitat.log(`Direct Connect Is Listening On ${ip}:${myHubitat.direct_port}`);
    });
    return 'good';
}

function hubitat_HandleHTTPResponse(request, response, myHubitat) {
    if (request.url === '/initial') myHubitat.log('Hubitat Hub Communication Established');
    if (request.url === '/update') {
        var newChange = {
            device: request.headers['change_device'],
            attribute: request.headers['change_attribute'],
            value: request.headers['change_value'],
            date: request.headers['change_date']
        };
        myHubitat.log('Change Event:', '(' + request.headers['change_device'] + ') [' + request.headers['change_attribute'].toUpperCase() + '] is ' + request.headers['change_value']);
        myHubitat.processFieldUpdate(newChange, myHubitat);
    }
    response.end('OK');
}
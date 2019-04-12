const pluginName = 'homebridge-hubitat';
const platformName = 'Hubitat';
//var he_st_api = require('./lib/he_st_api');
var he_st_api = require('./lib/he_maker_api');
var http = require('http');
var os = require('os');
var Service,
    Characteristic,
    Accessory,
    uuid,
    HE_ST_Accessory;

module.exports = function(homebridge) {
    console.log("Homebridge Version: " + homebridge.version);
    Service = homebridge.hap.Service;
    Characteristic = homebridge.hap.Characteristic;
    Accessory = homebridge.hap.Accessory;
    uuid = homebridge.hap.uuid;
    HE_ST_Accessory = require('./accessories/he_st_accessories')(Accessory, Service, Characteristic, uuid, platformName);
    homebridge.registerPlatform(pluginName, platformName, HE_ST_Platform);
};

function HE_ST_Platform(log, config) {
    this.temperature_unit = 'F';

    this.app_url = config['app_url'];
    this.app_id = config['app_id'];
    this.access_token = config['access_token'];
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

    this.local_commands = false;
    this.local_hub_ip = undefined;

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
        this.direct_port = (platformName === 'SmartThings' ? 8000 : 8005);
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
        // that.log('config: ', JSON.stringify(this.config));
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
                    if (myList.location.hubIP) {
                        that.local_hub_ip = myList.location.hubIP;
                        he_st_api.updateGlobals(that.local_hub_ip, that.local_commands);
                    }
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

        var that = this;
        // var foundAccessories = [];
        this.deviceLookup = [];
        this.unknownCapabilities = [];
        this.knownCapabilities = [
            'Switch',
            'Light',
            'LightBulb',
            'Bulb',
            'Color Control',
            'Door',
            'Window',
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
            'Acceleration Sensor',
            'Door Control',
            'Garage Door Control',
            'Relative Humidity Measurement',
            'Presence Sensor',
            'Carbon Dioxide Measurement',
            'Carbon Monoxide Detector',
            'Water Sensor',
            'Window Shade',
            'Valve',
            'Energy Meter',
            'Power Meter',
            'Thermostat',
            'Thermostat Cooling Setpoint',
            'Thermostat Mode',
            'Thermostat Fan Mode',
            'Thermostat Operating State',
            'Thermostat Heating Setpoint',
            'Thermostat Setpoint',
            'Fan Speed',
            'Fan Control',
            'Fan Light',
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

        he_st_api.init(this.app_url, this.app_id, this.access_token, this.local_hub_ip, this.local_commands);
        this.reloadData(function(foundAccessories) {
            that.log('Unknown Capabilities: ' + JSON.stringify(that.unknownCapabilities));
            callback(foundAccessories);
            that.log('update_method: ' + that.update_method);
            setInterval(that.reloadData.bind(that), that.polling_seconds * 1000);
            // Initialize Update Mechanism for realtime-ish updates.
            if (that.update_method === 'api') {
                setInterval(that.doIncrementalUpdate.bind(that), that.update_seconds * 1000);
            } else if (that.update_method === 'direct') {
                // The Hub sends updates to this module using http
                he_st_api_SetupHTTPServer(that);
                he_st_api.startDirect(null, that.direct_ip, that.direct_port);
            } else if (that.update_method === 'socket') {
                he_eventsocket_SetupWebSocket(that);
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

function he_eventsocket_SetupWebSocket(myHe_st_api) {
    const WebSocket = require('ws');
    var that = this;
    function connect(myHe_st_api) {
        let ip = myHe_st_api.direct_ip || getIPAddress();
        var r = /\b\d{1,3}\.\d{1,3}\.\d{1,3}\.\d{1,3}\b/;
        var url = 'ws://' + myHe_st_api.app_url.match(r) + '/eventsocket';
        var ws = new WebSocket(url);
        myHe_st_api.log('connect to ' + url);
        ws.onopen = function() {
        };
    
        ws.onmessage = function(e) {
            var jsonData = JSON.parse(e.data);
            var newChange = [];
            if (jsonData['source'] === 'DEVICE')
            {
                newChange.push( { device: jsonData['deviceId'], attribute: jsonData['name'], value: jsonData['value'], date: new Date() , displayName: jsonData['displayName'] }  );
            } 
            else if (jsonData['source'] === 'LOCATION')
            {
                switch (jsonData['name'])
                {
                    case 'hsmStatus':
                        newChange.push( { device: 'alarmSystemStatus_' + jsonData['locationId'], attribute: 'alarmSystemStatus', value: jsonData['value'], date: new Date(), displayName: jsonData['displayName'] });
                        break;
                    case 'hsmAlert':
                        if (jsonData['value'] === 'intrusion')
                        {
                            newChange.push( { device: 'alarmSystemStatus_' + jsonData['locationId'], attribute: 'alarmSystemStatus', value: 'alarm_active', date: new Date(), displayName: jsonData['displayName'] });
                        }
                        break;
                    case 'alarmSystemStatus':
                        newChange.push( { device: 'alarmSystemStatus_' + jsonData['locationId'], attribute: 'alarmSystemStatus', value: jsonData['value'], date: new Date(), displayName: jsonData['displayName'] });
                        break;
                    case 'mode':
                        myHe_st_api.deviceLookup.forEach(function (accessory)
                        {
                            if (accessory.deviceGroup === "mode")
                            {
                                if (accessory.name === "Mode - " + jsonData['value'])
                                    newChange.push( { device: accessory.deviceid, attribute: 'switch', value: 'on', date: new Date(), displayName: accessory.name });
                                else
                                    newChange.push( { device: accessory.deviceid, attribute: 'switch', value: 'off', date: new Date(), displayName: accessory.name });
                            }
                        });
                        break;
                }
            }
            newChange.forEach(function(element)
            {
                myHe_st_api.log('Change Event (Socket):', '(' + element['displayName'] + ':' + element['device'] + ') [' + (element['attribute'] ? element['attribute'].toUpperCase() : 'unknown') + '] is ' + element['value']);
                myHe_st_api.processFieldUpdate(element, myHe_st_api);
            });
        };

        ws.onclose = function(e) {
          myHe_st_api.log('HE Eventsocket is closed. Reconnect will be attempted in 1 second. ', e.reason);
          setTimeout(function() {
            connect(myHe_st_api);
          }, 1000);
        };

        ws.onerror = function(err) {
          myHe_st_api.log('HE Eventsocket encountered error: ', err.message, 'Closing socket');
          ws.close();
        };

    }
    connect(myHe_st_api); 

}

function he_st_api_HandleHTTPResponse(request, response, myHe_st_api) {
    if (request.url === '/restart') {
        let delay = (10 * 1000);
        myHe_st_api.log('Received request from ' + platformName + ' to restart homebridge service in (' + (delay / 1000) + ' seconds) | NOTICE: If you using PM2 or Systemd the Homebridge Service should start back up');
        setTimeout(function() {
            process.exit(1);
        }, parseInt(delay));
    }
    if (request.url === '/updateprefs') {
        myHe_st_api.log(platformName + ' Hub Sent Preference Updates');
        let body = [];
        request.on('data', (chunk) => {
            body.push(chunk);
        }).on('end', () => {
            body = Buffer.concat(body).toString();
            let data = JSON.parse(body);
            let sendUpd = false;
            if (platformName === 'SmartThings') {
                if (data.local_commands && myHe_st_api.local_commands !== data.local_commands) {
                    sendUpd = true;
                    myHe_st_api.log(platformName + ' Updated Local Commands Preference | Before: ' + myHe_st_api.local_commands + ' | Now: ' + data.local_commands);
                    myHe_st_api.local_commands = data.local_commands;
                }
                if (data.local_hub_ip && myHe_st_api.local_hub_ip !== data.local_hub_ip) {
                    sendUpd = true;
                    myHe_st_api.log(platformName + ' Updated Hub IP Preference | Before: ' + myHe_st_api.local_hub_ip + ' | Now: ' + data.local_hub_ip);
                    myHe_st_api.local_hub_ip = data.local_hub_ip;
                }
            }
            if (sendUpd) {
                he_st_api.updateGlobals(myHe_st_api.local_hub_ip, myHe_st_api.local_commands);
            }
        });
    }
    if (request.url === '/initial') {
        myHe_st_api.log(platformName + ' Hub Communication Established');
    }
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

var http = require('http')
const reqPromise = require('request-promise');
const url = require('url');
var app_id, access_token, localHubIp, localHubPort;
var app_host, app_port, app_path, access_token, localHubIp;


function _http(data, callback) {
    //console.log("Calling " + platformName);
    var options = {
        hostname: app_host,
        port: app_port,
        path: app_path + data.path + "?access_token=" + access_token,
        method: data.method,
        headers: {}
    };
    if (data.data) {
        data.data = JSON.stringify(data.data);
        options.headers['Content-Length'] = Buffer.byteLength(data.data);
        options.headers['Content-Type'] = "application/json";
    }
    if (data.debug) {
        console.log('_http options: ', JSON.stringify(options));
    }
    var str = '';
    var req = http.request(options, function(response) {
        response.on('data', function(chunk) {
            str += chunk;
        });

        response.on('end', function() {
            if (data.debug) {
                console.log("response in http:", str);
            }
            try {
                str = JSON.parse(str);
            } catch (e) {
                if (data.debug) {
                    console.log(e.stack);
                    console.log("raw message", str);
                }
                str = undefined;
            }

            if (callback) {
                callback(str);
                callback = undefined;
            };
        });
    });

    if (data.data) {
        req.write(data.data);
    }

    req.end();

    req.on('error', function(e) {
        console.log("error at req: ", e.message);
        if (callback) {
            callback();
            callback = undefined;
        };
    });
}

function GET(data, callback) {
    data.method = "GET";
    _http(data, callback);
}

var he_maker_api = {
    init: function(inURL, inAppID, inAccess_Token, hubIp) {
        var appURL = url.parse(inURL);
        app_host = appURL.hostname;
        app_port = appURL.port || 80;
        app_path = appURL.path;
        access_token = inAccess_Token;
    },
    getAllDevices: function (callback) {
        GET({
            debug: false,
            path: '/devices'
            }, function (data) {
                if (callback) {
                    callback(data);
                    callback = undefined;
                }
            });
    },
    getAllDevicesDetail: function (callback) {
        GET({
            debug: false,
            path: '/devices/all'
            }, function (data) {
                if (callback) {
                    callback(data);
                    callback = undefined;
                }
            });
    },
    getDeviceInfo: function(deviceid, callback) {
        GET({
            debug: false,
            path: '/devices/' + deviceid
            }, function (data) {
                if (callback) {
                    callback(data);
                    callback = undefined;
                }
            });       
    },
    getDeviceEvents: function(deviceid, callback) {
        GET({
            debug: false,
            path: '/devices/' + deviceid + '/events'
            }, function (data) {
                if (callback) {
                    callback(data);
                    callback = undefined;
                }
            });
    },
    getDeviceCommands: function(deviceid, callback) {
        GET({
            debug: false,
            path: '/devices/' + deviceid + '/commands'
            }, function (data) {
                if (callback) {
                    callback(data);
                    callback = undefined;
                }
            });
    },
    getDeviceCapabilities: function(deviceid, callback) {
        GET({
            debug: false,
            path: '/devices/' + deviceid + '/capabilities'
            }, function (data) {
                if (callback) {
                    callback(data);
                    callback = undefined;
                }
            });
    },
    sendCommand: function(deviceid, command, callback, secondaryValue = '') {
    GET({
        debug: false,
        path: '/devices/' + deviceid + '/' + command + (secondaryValue ? '/' + secondaryValue : '')
        }, function (data) {
           if (callback) {
            callback(data);
            callback = undefined;
            }
        });
    },


}
module.exports = he_maker_api;




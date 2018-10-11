const platformName = 'Hubitat';
var http = platformName === 'SmartThings' ? require('https') : require('http');
var url = require('url');
var app_host, app_port, app_path, access_token;

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

function POST(data, callback) {
    data.method = "POST";
    _http(data, callback);
}

function PUT(data, callback) {
    data.method = "PUT";
    _http(data, callback);
}

function GET(data, callback) {
    data.method = "GET";
    _http(data, callback);
}

function DELETE(data, callback) {
    data.method = "DELETE";
    _http(data, callback);
}

var he_st_api = {
    init: function(inURL, inAppID, inAccess_Token) {
        var appURL = url.parse(inURL);
        if (platformName === 'SmartThings') {
            app_host = appURL.hostname || "graph.api.smartthings.com";
            app_port = appURL.port || 443;
            app_path = (appURL.path || "/api/smartapps/installations/") + inAppID + "/";
        } else {
            app_host = appURL.hostname;
            app_port = appURL.port || 80;
            app_path = appURL.path;
        }
        access_token = inAccess_Token;
    },
    getDevices: function(callback) {
        GET({
            debug: false,
            path: 'devices'
        }, function(data) {
            if (callback) {
                callback(data);
                callback = undefined;
            };
        });
    },
    getDevice: function(deviceid, callback) {
        GET({
            debug: false,
            path: deviceid + '/query'
        }, function(data) {
            if (data) {
                if (callback) {
                    callback(data);
                    callback = undefined;
                };
            } else {
                if (callback) {
                    callback();
                    callback = undefined;
                };
            }
        });
    },
    getUpdates: function(callback) {
        GET({
            debug: false,
            path: 'getUpdates'
        }, function(data) {
            if (callback) {
                callback(data);
                callback = undefined;
            };
        });
    },
    runCommand: function(callback, deviceid, command, values) {
        console.log("[" + platformName + " Plugin Action] Command: " + command + " | Value: " + (values !== undefined ? JSON.stringify(values) : "Nothing") + " | DeviceID: (" + deviceid + ")");
        POST({
            debug: false,
            path: deviceid + '/command/' + command,
            data: values
        }, function(data) {
            if (callback) {
                callback();
                callback = undefined;
            };
        });
    },
    startDirect: function(callback, myIP, myPort) {
        GET({
            debug: false,
            path: 'startDirect/' + myIP + '/' + myPort
        }, function(data) {
            if (callback) {
                callback();
                callback = undefined;
            };
        });
    },
    getSubscriptionService: function(callback) {
        GET({
            debug: false,
            path: 'getSubcriptionService'
        }, function(data) {
            if (callback) {
                callback(data);
                callback = undefined;
            };
        });
    }
};
module.exports = he_st_api;
/**
 *  Homebridge API
 *  Modelled off of Paul Lovelace's JSON API
 *
 *  Copyright 2018 Anthony Santilli
 *
 */
definition(
    name: "Homebridge API (HT)",
    namespace: "tonesto7",
    author: "Anthony Santilli",
    description: "Provides API interface between homebridge and SmartThings",
    category: "My Apps",
    iconUrl:   "https://raw.githubusercontent.com/pdlove/homebridge-smartthings/master/smartapps/JSON%401.png",
    iconX2Url: "https://raw.githubusercontent.com/pdlove/homebridge-smartthings/master/smartapps/JSON%402.png",
    iconX3Url: "https://raw.githubusercontent.com/pdlove/homebridge-smartthings/master/smartapps/JSON%403.png",
    oauth: true)


preferences {
    page(name: "copyConfig")
}

def appVersion() { return "1.0.0" }

def copyConfig() {
    if (!state?.accessToken) {
        createAccessToken()
    }
    dynamicPage(name: "copyConfig", title: "Configure Devices", install:true, uninstall:true) {
        section() {
            paragraph "v${appVersion()}"
        }
        section("Select devices to include in the /devices API call") {
            input "deviceList", "capability.refresh", title: "Most Devices", multiple: true, submitOnChange: true, required: false
            input "sensorList", "capability.sensor", title: "Sensor Devices", multiple: true, submitOnChange: true, required: false
            input "switchList", "capability.switch", title: "All Switches", multiple: true, submitOnChange: true, required: false
        }
        section("Security") {
            input "addShmDevice", "bool", title: "Enable SHM Device to be Natively Controlled via HomeKit?", required: false, defaultValue: true, submitOnChange: true
        }
        section() {
            def allDevices = []
            allDevices = allDevices + deviceList ?: []
            allDevices = allDevices + sensorList ?: []
            allDevices = allDevices + switchList ?: []
            paragraph "Devices Selected: ${deviceList ? deviceList?.size() : 0}\nSensors Selected: ${sensorList ? sensorList?.size() : 0}\nSwitches Selected: ${switchList ? switchList?.size() : 0}"
        	paragraph "Total Devices: ${allDevices?.unique().size()}"
        }
        section() {
            paragraph "View this SmartApp's configuration to use it in other places."
            href url:getAppEndpointUrl("config"), style:"embedded", required:false, title:"Config", description:"Tap, select, copy, then click \"Done\""
        }
 
        section() {
        	paragraph "View the JSON generated from the installed devices."
            href url:getAppEndpointUrl("devices"), style:"embedded", required:false, title:"Device Results", description:"View accessories JSON"
        }
        section() {
        	paragraph "Enter the name you would like shown in the smart app list"
        	label title:"SmartApp Label (optional)", required: false 
        }
        section() {
            input "showLogs", "bool", title: "Show Log Output?", required: false, defaultValue: true, submitOnChange: true
        }
    }
}

def renderDevices() {
    def deviceData = []
    def items = ["deviceList", "sensorList", "switchList"]
    items?.each { item ->   
        if(settings[item]?.size()) {     
            settings[item]?.each { dev->
                try {
                    deviceData?.push([
                        name: dev?.displayName,
                        basename: dev?.name,
                        deviceid: dev?.id, 
                        status: dev?.status,
                        manufacturerName: dev?.getManufacturerName() ?: "SmartThings",
                        modelName: dev?.getModelName() ?: dev?.getTypeName(),
                        serialNumber: dev?.getDeviceNetworkId(),
                        firmwareVersion: "1.0.0",
                        lastTime: dev?.getLastActivity(),
                        capabilities: deviceCapabilityList(dev), 
                        commands: deviceCommandList(dev), 
                        attributes: deviceAttributeList(dev)
                    ])
                } catch (e) {
                    log.error("Error Occurred Parsing Device ${dev?.displayName}, Error " + e)
                }
            }    
        }
        if(settings?.addShmDevice != false) { deviceData.push(getShmDevice()) }
    }
    return deviceData
}

def getShmDevice() {
    return [
        name: "Security Alarm",
        basename: "Security Alarm",
        deviceid: "alarmSystemStatus", 
        status: "ACTIVE",
        manufacturerName: "SmartThings",
        modelName: "Security System",
        serialNumber: "SHM",
        firmwareVersion: "1.0.0",
        lastTime: null,
        capabilities: ["Alarm System Status":1, "Alarm":1], 
        commands: [], 
        attributes: ["alarmSystemStatus": getShmStatus()]
    ]
}

def findDevice(paramid) {
	def device = deviceList.find { it.id == paramid }
  	if (device) return device
	device = sensorList.find { it.id == paramid }
	if (device) return device
  	device = switchList.find { it.id == paramid }

	return device
 }
//No more individual device group definitions after here.


def installed() {
	log.debug "Installed with settings: ${settings}"
	initialize()
}

def updated() {
	log.debug "Updated with settings: ${settings}"
	unsubscribe()
	initialize()
}

def initialize() {
	if(!state?.accessToken) {
         createAccessToken()
    }
	runIn(3, "registerDevices", [overwrite: true])
   	runIn(6, "registerSensors", [overwrite: true])
    runIn(8, "registerSwitches", [overwrite: true])
	state?.subscriptionRenewed = 0
    subscribe(location, null, HubResponseEvent, [filterEvents:false])
    subscribe(location, "alarmSystemStatus", changeHandler)
}

def authError() {
    [error: "Permission denied"]
}

def getShmStatus(retInt=false) {
    def cur = location.currentState("alarmSystemStatus")?.value
    def inc = getShmIncidents()
    if(inc != null && inc?.size()) { cur = 'alarm_active' }
    if(retInt) {
        switch (cur) {
            case 'stay':
                return 0
            case 'away':
                return 1
            case 'night':
                return 2
            case 'off':
                return 3
            case 'alarm_active':
                return 4
        }
    } else { return cur ?: "disarmed" }
}

def renderConfig() {
    def configJson = new groovy.json.JsonOutput().toJson([
        description: "JSON API",
        platforms: [
            [
                platform: "hubitat",
                name: "Hubitat",
                app_url: getLocalApiServerUrl(),
                app_id: app.id,
                access_token:  state?.accessToken
            ]
        ],
    ])

    def configString = new groovy.json.JsonOutput().prettyPrint(configJson)
    render contentType: "text/plain", data: configString
}

def renderLocation() {
    return [
    	latitude: location.latitude,
    	longitude: location.longitude,
    	mode: location.mode,
    	name: location.name,
    	temperature_scale: location.temperatureScale,
    	zip_code: location.zipCode,
        hubIP: location.hubs[0].localIP,
        smartapp_version: appVersion()
  	]
}

def CommandReply(statusOut, messageOut) {
	def replyData = [
        	status: statusOut,
            message: messageOut
        ]

    def replyJson = new groovy.json.JsonOutput().toJson(replyData)
    render contentType: "application/json", data: replyJson
}

def deviceCommand() {
	log.info("Command Request: $params")
	def device = findDevice(params.id)    
    def command = params.command
    if(settings?.addShmDevice != false && params?.id == "alarmSystemStatus") {
        setShmMode(command)
        CommandReply("Success", "Security Alarm, Command $command")
    } else {
        if (!device) {
            log.error("Device Not Found")
            CommandReply("Failure", "Device Not Found")
        } else if (!device.hasCommand(command)) {
            log.error("Device "+device.displayName+" does not have the command "+command)
            CommandReply("Failure", "Device "+device.displayName+" does not have the command "+command)
        } else {
            def value1 = request.JSON?.value1
            def value2 = request.JSON?.value2
            try {
                if (value2) {
                    device."$command"(value1,value2)
                } else if (value1) {
                    device."$command"(value1)
                } else {
                    device."$command"()
                }
                log.info("Command Successful for Device "+device.displayName+", Command "+command)
                CommandReply("Success", "Device "+device.displayName+", Command "+command)
            } catch (e) {
                log.error("Error Occurred For Device "+device.displayName+", Command "+command)
                CommandReply("Failure", "Error Occurred For Device "+device.displayName+", Command "+command)
            }
        }
    }
}

def setShmMode(mode) {
    sendLocationEvent(name: 'alarmSystemStatus', value: mode.toString())
}

def deviceAttribute() {
	def device = findDevice(params.id)    
    def attribute = params.attribute
  	if (!device) {
    	httpError(404, "Device not found")
  	} else {
      	def currentValue = device.currentValue(attribute)
      	[currentValue: currentValue]
  	}
}

def deviceQuery() {
	def device = findDevice(params.id)    
    if (!device) { 
    	device = null
        httpError(404, "Device not found")
    } 
    
    if (result) {
    	def jsonData =
        	[
         		name: device.displayName,
            	deviceid: device.id,
            	capabilities: deviceCapabilityList(device),
            	commands: deviceCommandList(device),
            	attributes: deviceAttributeList(device)
         	]
    	def resultJson = new groovy.json.JsonOutput().toJson(jsonData)
    	render contentType: "application/json", data: resultJson
    }
}

def deviceCapabilityList(device) {
    device?.capabilities?.collectEntries { capability->
    	[ (capability?.name):1 ]
  	}
}

def deviceCommandList(device) {
  	def i=0
  	device.supportedCommands.collectEntries { command->
    	[ (command?.name): (command?.arguments) ]
  	}
}

def deviceAttributeList(device) {
  	device.supportedAttributes.collectEntries { attribute->
        // if(!(ignoreTheseAttributes()?.contains(attribute?.name))) {
            try {
                [(attribute?.name): device?.currentValue(attribute?.name)]
            } catch(e) {
                [(attribute?.name): null]
            }
        // }
  	}
}

def getAppEndpointUrl(subPath)	{ return "${getApiServerUrl()}/${getHubUID()}/apps/${app?.id}${subPath ? "/${subPath}" : ""}?access_token=${state?.accessToken}" }
def getLocalEndpointUrl(subPath)	{ return "${getLocalApiServerUrl()}/apps/${app?.id}${subPath ? "/${subPath}" : ""}?access_token=${state?.accessToken}" }

def getAllData() {
	//Since we're about to send all of the data, we'll count this as a subscription renewal and clear out pending changes.
	state?.subscriptionRenewed = now()
    state?.devchanges = []
    
    def deviceData = [	
        location: renderLocation(),
        deviceList: renderDevices() 
    ]
    def deviceJson = new groovy.json.JsonOutput().toJson(deviceData)
    render contentType: "application/json", data: deviceJson
}

def startSubscription() {
//This simply registers the subscription.
    state?.subscriptionRenewed = now()
	def deviceJson = new groovy.json.JsonOutput().toJson([status: "Success"])
    render contentType: "application/json", data: deviceJson    
}

def endSubscription() {
//Because it takes too long to register for an api command, we don't actually unregister.
//We simply blank the devchanges and change the subscription renewal to two hours ago.
	state?.devchanges = []
    state?.subscriptionRenewed = 0
 	def deviceJson = new groovy.json.JsonOutput().toJson([status: "Success"])
    render contentType: "application/json", data: deviceJson     
}

def registerDevices() {
//This has to be done at startup because it takes too long for a normal command.
	log.debug "Registering All Devices"
    state?.devchanges = []
	registerChangeHandler(settings?.deviceList)
}

def registerSensors() {
//This has to be done at startup because it takes too long for a normal command.
	log.debug "Registering All Sensors"
    state?.devchanges = []
    registerChangeHandler(settings?.sensorList)
}

def registerSwitches() {
//This has to be done at startup because it takes too long for a normal command.
	log.debug "Registering All Switches"
    state?.devchanges = []
	registerChangeHandler(settings?.switchList)
}

def ignoreTheseAttributes() {
    return [
        'DeviceWatch-DeviceStatus', 'checkInterval', 'devTypeVer', 'dayPowerAvg', 'apiStatus', 'yearCost', 'yearUsage','monthUsage', 'monthEst', 'weekCost', 'todayUsage',
        'maxCodeLength', 'maxCodes', 'readingUpdated', 'maxEnergyReading', 'monthCost', 'maxPowerReading', 'minPowerReading', 'monthCost', 'weekUsage',
        'codeReport', 'scanCodes', 'verticalAccuracy', 'horizontalAccuracyMetric', 'altitudeMetric', 'latitude', 'distanceMetric', 'closestPlaceDistanceMetric',
        'closestPlaceDistance', 'leavingPlace', 'currentPlace'
    ]
}

def registerChangeHandler(devices) {
	devices?.each { device ->
		def theAtts = device?.supportedAttributes
		theAtts?.each {att ->
            if(!(ignoreTheseAttributes().contains(att?.name))) {
		        subscribe(device, att?.name, "changeHandler")
    		    log.debug "Registering ${device?.displayName}.${att?.name}"
            }
		}
	}
}

def changeHandler(evt) {
    def device = evt?.name == 'alarmSystemStatus' ? evt.name : evt.deviceId
	if (state?.directIP!="") {
    	//Send Using the Direct Mechanism
        // if(evt.name == 'alarmSystemStatus') {
            log.debug "Sending (${evt?.name.toUpperCase()}: ${evt?.value}${evt?.unit ?: ""}) [${evt?.source ?: ""}] Event to Homebridge at (${state?.directIP}:${state?.directPort})"
        // }
        def result = new hubitat.device.HubAction(
    		method: "GET",
    		path: "/update",
    		headers: [
        		HOST: "${state?.directIP}:${state?.directPort}",
                change_device: device,
                change_attribute: evt.name,
                change_value: evt.value,
                change_date: evt.date
    		]
		)
        sendHubCommand(result)
    }
    
	//Only add to the state's devchanges if the endpoint has renewed in the last 10 minutes.
    if (state?.subscriptionRenewed>(now()-(1000*60*10))) {
  		if (evt.isStateChange()) {
			state?.devchanges << [device: device, attribute: evt.name, value: evt.value, date: evt.date]
      }
    } else if (state?.subscriptionRenewed>0) { //Otherwise, clear it
    	log.debug "Endpoint Subscription Expired. No longer storing changes for devices."
        state?.devchanges=[]
        state?.subscriptionRenewed=0
    }
}

def getShmIncidents() {
    //Thanks Adrian
    def incidentThreshold = now() - 604800000
    return location.activeIncidents.collect{[date: it?.date?.time, title: it?.getTitle(), message: it?.getMessage(), args: it?.getMessageArgs(), sourceType: it?.getSourceType()]}.findAll{ it?.date >= incidentThreshold } ?: null
}

def getChangeEvents() {
    //Store the changes so we can swap it out very quickly and eliminate the possibility of losing any.
    //This is mainly to make this thread safe because I'm willing to bet that a change event can fire
    //while generating/sending the JSON.
    def oldchanges = state?.devchanges
    state?.devchanges=[]
    state?.subscriptionRenewed = now()
	if (oldchanges.size()==0) {
        def deviceJson = new groovy.json.JsonOutput().toJson([status: "None"])
	    render contentType: "application/json", data: deviceJson    
    } else {
    	def changeJson = new groovy.json.JsonOutput().toJson([status: "Success", attributes:oldchanges])
    	render contentType: "application/json", data: changeJson
	}
}

def enableDirectUpdates() {
	log.debug("Command Request: ($params)")
	state?.directIP = params.ip
    state?.directPort = params.port
	log.debug("Trying ${state?.directIP}:${state?.directPort}")
	def result = new hubitat.device.HubAction(
    		method: "GET",
    		path: "/initial",
    		headers: [
        		HOST: "${state?.directIP}:${state?.directPort}"
    		],
    		query: deviceData
		)
     sendHubCommand(result)
}

def HubResponseEvent(evt) {
	// log.debug(evt.description)
}

def locationHandler(evt) {
    def description = evt.description
    def hub = evt?.hubId

    log.debug "cp desc: " + description
    if (description?.count(",") > 4) {
        def bodyString = new String(description.split(',')[5].split(":")[1].decodeBase64())
        log.debug(bodyString)
    }
}

def getSubscriptionService() {
	def replyData = [
        pubnub_publishkey: pubnubPublishKey,
        pubnub_subscribekey: pubnubSubscribeKey,
        pubnub_channel: subChannel
    ]

    def replyJson = new groovy.json.JsonOutput().toJson(replyData)
    render contentType: "application/json", data: replyJson
}

mappings {
    // if (!params.access_token || (params.access_token && params.access_token != state?.accessToken)) {
    //     path("/devices")                        { action: [GET: "authError"] }
    //     path("/config")                          { action: [GET: "authError"] }
    //     path("/location")                       { action: [GET: "authError"] }
    //     path("/:id/command/:command")     		{ action: [POST: "authError"] }
    //     path("/:id/query")						{ action: [GET: "authError"] }
    //     path("/:id/attribute/:attribute") 		{ action: [GET: "authError"] }
    //     path("/subscribe")                      { action: [GET: "authError"] }
    //     path("/getUpdates")                     { action: [GET: "authError"] }
    //     path("/unsubscribe")                    { action: [GET: "authError"] }
    //     path("/startDirect/:ip/:port")          { action: [GET: "authError"] }
    //     path("/getSubcriptionService")          { action: [GET: "authError"] }

    // } else {
        path("/devices")                        { action: [GET: "getAllData"] }
        path("/config")                          { action: [GET: "renderConfig"]  }
        path("/location")                       { action: [GET: "renderLocation"] }
        path("/:id/command/:command")     		{ action: [POST: "deviceCommand"] }
        path("/:id/query")						{ action: [GET: "deviceQuery"] }
        path("/:id/attribute/:attribute") 		{ action: [GET: "deviceAttribute"] }
        path("/subscribe")                      { action: [GET: "startSubscription"] }
        path("/getUpdates")                     { action: [GET: "getChangeEvents"] }
        path("/unsubscribe")                    { action: [GET: "endSubscription"] }
        path("/startDirect/:ip/:port")          { action: [GET: "enableDirectUpdates"] }
        path("/getSubcriptionService")          { action: [GET: "getSubscriptionService"] }
    // }
}


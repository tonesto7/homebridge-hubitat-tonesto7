/**
 *  Homebridge Hubitat
 *  Modelled off of Paul Lovelace's JSON API
 *  Copyright 2018 Anthony Santilli
 */

definition(
    name: "Homebridge (Hubitat)",
    namespace: "tonesto7",
    author: "Anthony Santilli",
    description: "Provides API interface between Homebridge Service (HomeKit) and Hubitat",
    category: "My Apps",
    iconUrl:   "",
    iconX2Url: "",
    iconX3Url: "",
    oauth: true)


preferences {
    page(name: "mainPage")
}

def appVersion() { return "1.1.0" }

def appInfoSect()	{
	section() {
		def str = """
		<div class="appInfoSect" style="width: 250px; height: 70px; display: inline-table;">
			<ul style=" margin: 0 auto; padding: 0; list-style-type: none;">
			  <img style="float: left; padding: 10px;" src="https://raw.githubusercontent.com/tonesto7/homebridge-hubitat-tonesto7/master/smartapps/JSON%401.png" width="60px"/>
			  <li style="padding-top: 2px;"><b>${app?.name}</b></li>
			  <li><small style="color: darkgray !important;">Copyright© 2018 Anthony Santilli</small></li>
			  <li><small style="color: darkgray !important;">Version: ${appVersion()}</small></li>
			</ul>
		</div>
		<script>\$('.appInfoSect').parent().css("cssText", "font-family: Arial !important; white-space: inherit !important;")</script>
		"""
		paragraph "${str}"
	}
}

def mainPage() {
    if (!state?.accessToken) {
        createAccessToken()
    }
    dynamicPage(name: "mainPage", title: "", install: true, uninstall:true) {
        appInfoSect()
        section() {
            paragraph '<h4 style="color: red;">NOTICE: Any Device Changes will require a restart of the Homebridge Service</h4>'
        }
        section("""<h2><span style="color: black;">Select Devices to make available in Homekit (Total Devices: ${getDeviceCnt()})</span></h2>""") {
            input "sensorList", "capability.sensor", title: "Sensor Devices: (${sensorList ? sensorList?.size() : 0} Selected)", multiple: true, submitOnChange: true, required: false
            input "switchList", "capability.switch", title: "Switch Devices: (${switchList ? switchList?.size() : 0} Selected)", multiple: true, submitOnChange: true, required: false
            input "deviceList", "capability.refresh", title: "Other Devices: (${deviceList ? deviceList?.size() : 0} Selected)", multiple: true, submitOnChange: true, required: false
        }
        section("<h2>Define Categories:</h2>") {
            paragraph '<h4 style="color: blue;">These Categories will add the necessary capabilities to make sure they are recognized by HomeKit as the specific device type</h4>'
            input "lightList", "capability.switch", title: "Lights: (${lightList ? lightList?.size() : 0} Selected)", multiple: true, submitOnChange: true, required: false
            input "fanList", "capability.switch", title: "Fans: (${fanList ? fanList?.size() : 0} Selected)", multiple: true, submitOnChange: true, required: false
            input "speakerList", "capability.switch", title: "Speakers: (${speakerList ? speakerList?.size() : 0} Selected)", multiple: true, submitOnChange: true, required: false
        }
        section("<h2>Irrigation Devices:</h2>") {
            paragraph '<h4 style="color: orange;">Notice: Only Tested with Rachio Devices</h4>'
			input "irrigationList", "capability.valve", title: "Irrigation Devices (${irrigationList ? irrigationList?.size() : 0} Selected)", multiple: true, submitOnChange: true, required: false
		}
        section("<h2>Hubitat Safety Monitor Support</h2>") {
            input "addHsmDevice", "bool", title: "Allow Hubitat Safety Monitor Control in Homekit?", required: false, defaultValue: false, submitOnChange: true
        }
        section("Create Mode/Routine Devices in HomeKit?") {
            paragraph title: "What are these for?", "HomeKit will create a switch device for each mode.  The switch will be for active mode.", state: "complete"
            def modes = location?.modes?.sort{it?.name}?.collect { [(it?.id):it?.name] }
            input "modeList", "enum", title: "Create Devices for these Modes", required: false, multiple: true, options: modes, submitOnChange: true
        }
        section("<h2>View Data</h2>") {
            href url: getAppEndpointUrl("config"), style: "embedded", required: false, title: "View the Configuration Data for Homebridge", description: "Tap, select, copy, then click \"Done\""
        }
        section("<h2>Options</h2>") {
        	input "showLogs", "bool", title: "Show Events in Live Logs?", required: false, defaultValue: true, submitOnChange: true
        	label title: "App Label (optional)", description: "Rename this App", defaultValue: app?.name, required: false 
        }
    }
}

def imgTitle(imgSrc, imgPxSize, titleStr) {
    return """<img width="${imgPxSize}px" src="${imgSrc}"> ${titleStr}</img>"""
}

def getDeviceCnt() {
    def devices = []
    def items = ["deviceList", "sensorList", "switchList", "lightList", "fanList", "speakerList", "irrigationList"]
    items?.each { item ->   
        if(settings[item]?.size() > 0) {     
            devices = devices + settings[item]
        }
    }
    return devices?.unique()?.size() ?: 0
}

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
	runIn(2, "registerDevices", [overwrite: true])
   	runIn(4, "registerSensors", [overwrite: true])
    runIn(6, "registerSwitches", [overwrite: true])
    // subscribe(location, null, HubResponseEvent, [filterEvents:false])
    if(settings?.addHsmDevice) { 
        subscribe(location, "hsmStatus", changeHandler) 
        subscribe(location, "hsmRules", changeHandler) 
        subscribe(location, "hsmAlert", changeHandler) 
        subscribe(location, "hsmSetArm", changeHandler) 
    }
    if(settings?.modeList) { 
        subscribe(location, "mode", changeHandler)
        if(state.lastMode == null) { state?.lastMode = location.mode?.toString() }
    }
}

def renderDevices() {
    def deviceData = []
    def items = ["deviceList", "sensorList", "switchList", "lightList", "fanList", "speakerList", "irrigationList"]
    def virtItems = ["modeList"]
    items?.each { item ->   
        if(settings[item]?.size()) {
            settings[item]?.each { dev->
                try {
                    deviceData?.push([
                        name: dev?.displayName,
                        basename: dev?.name,
                        deviceid: dev?.id, 
                        status: dev?.status,
                        manufacturerName: dev?.getDataValue("manufacturer") ?: "Hubitat",
                        modelName: dev?.getDataValue("model") ?: dev?.getTypeName(),
                        serialNumber: dev?.getDeviceNetworkId(),
                        firmwareVersion: "1.0.0",
                        lastTime: null, //dev?.getLastActivity(),
                        capabilities: deviceCapabilityList(dev), 
                        commands: deviceCommandList(dev), 
                        attributes: deviceAttributeList(dev)
                    ])
                } catch (e) {
                    log.error("Error Occurred Parsing Device ${dev?.displayName}, Error " + e.message)
                }
            }    
        }
    }

    virtItems?.each { item ->   
        if(settings[item]?.size()) {
            settings[item]?.each { vDev->
                def isRoutine = (item == "routineList")
                def obj = isRoutine ? getRoutineById(vDev) : getModeById(vDev)
                if(!obj) { return }
                def name = isRoutine ? obj?.label : obj?.name
                def type = isRoutine ? "Routine" : "Mode"
                def attrVal = isRoutine ? "off" : modeSwitchState(obj?.name)
                try {
                    deviceData?.push([
                        name: name,
                        basename: name,
                        deviceid: vDev, 
                        status: "Online",
                        manufacturerName: "Hubitat",
                        modelName: "${type} Device",
                        serialNumber: "${type}",
                        firmwareVersion: "1.0.0",
                        lastTime: now(),
                        capabilities: ["${type}": 1], 
                        commands: [on:[]], 
                        attributes: ["switch": attrVal]
                    ])
                } catch (e) {
                    log.error("Error Occurred Parsing ${item} ${type} ${name}, Error " + e.message)
                }
            }    
        }
    }

    if(settings?.addHsmDevice != false) { 
        def shmStatus = getShmStatus()
        if(shmStatus) { deviceData.push(getShmDevice(shmStatus)) }
    }

    return deviceData
}

def getShmDevice(status) {
    return [
        name: "Hubitat Safety Monitor Alarm",
        basename: "HSM Alarm",
        deviceid: "hsmStatus", 
        status: "ACTIVE",
        manufacturerName: "Hubitat",
        modelName: "Safety Monitor",
        serialNumber: "HSM",
        firmwareVersion: "1.0.0",
        lastTime: null,
        capabilities: ["HSMStatus":1, "Alarm":1], 
        commands: [], 
        attributes: ["hsmStatus": status]
    ]
}

def findDevice(paramid) {
	def device = deviceList.find { it?.id == paramid }
  	if (device) return device
	device = sensorList.find { it?.id == paramid }
	if (device) return device
  	device = switchList.find { it?.id == paramid }
    if (device) return device
    device = lightList.find { it?.id == paramid }
    if (device) return device
    device = fanList.find { it?.id == paramid }
    if (device) return device
    device = speakerList.find { it?.id == paramid }
    if (device) return device
    device = irrigationList.find { it?.id == paramid }
	return device
}

def authError() {
    return [error: "Permission denied"]
}

def getShmStatus() {
    return state?.hsmStatus ?: "disarmed"
}

def setShmMode(mode) {
    sendLocationEvent(name: 'hsmSetArm', value: mode.toString())
}

def renderConfig() {
    def configJson = new groovy.json.JsonOutput().toJson([
        platforms: [
            [
                platform: "Hubitat",
                name: "Hubitat",
                app_url: "${fullLocalApiServerUrl('')}",
                access_token:  state?.accessToken
            ]
        ],
    ])

    def configString = new groovy.json.JsonOutput().prettyPrint(configJson)
    render contentType: "text/plain", data: configString
}

def renderLocation() {
    def hub = location.hubs[0]
    return [
    	latitude: location?.latitude,
    	longitude: location?.longitude,
    	mode: location?.mode,
    	name: location?.name,
    	temperature_scale: location?.temperatureScale,
    	zip_code: location?.zipCode,
        hubIP: hub.getDataValue("localIP"),
        app_version: appVersion()
  	]
}

def CommandReply(statusOut, messageOut) {
	def replyJson = new groovy.json.JsonOutput().toJson([status: statusOut, message: messageOut])
	render contentType: "application/json", data: replyJson
}

def deviceCommand() {
	log.info("Command Request: $params")
	def device = findDevice(params?.id)    
    def command = params?.command
    if(settings?.addHsmDevice != false && params?.id == "hsmSetArm") {
        setShmMode(command)
        CommandReply("Success", "Security Alarm, Command $command")
    } else if (settings?.modeList && command == "mode") {
        def value1 = request.JSON?.value1
        if(value1) { changeMode(value1) }
        CommandReply("Success", "Mode Device, Command $command")
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

def changeMode(mode) {
    if(mode) {
        log.info "Setting the Location Mode to (${mode})..."
        setLocationMode(mode)
        state.lastMode = mode
    }
}

def deviceAttribute() {
	def device = findDevice(params?.id)    
    def attribute = params.attribute
  	if (!device) {
    	httpError(404, "Device not found")
  	} else {
      	def currentValue = device.currentValue(attribute)
      	return [currentValue: currentValue]
  	}
}

def findVirtModeDevice(id) {
    if(getModeById(id)) {
        return getModeById(id)
    } 
    return null
}

def deviceQuery() {
	log.trace "deviceQuery(${params?.id}"
	def device = findDevice(params?.id)
    if (!device) { 
        def mode = findVirtModeDevice(params?.id)
        def obj = mode ? mode : null
        if(!obj) { 
            device = null
            httpError(404, "Device not found")
        } else {
            try {
                deviceData?.push([
                    name: obj?.name,
                    deviceid: params?.id, 
                    capabilities: ["Mode": 1], 
                    commands: [on:[]], 
                    attributes: ["switch": modeSwitchState(obj?.name)]
                ])
            } catch (e) {
                log.error("Error Occurred Parsing ${item} Mode ${obj?.name}, Error " + e.message)
            }
        }
    } 
    
    if (result) {
    	def jsonData = [
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
    def items = device?.capabilities?.collectEntries { capability-> [ (capability?.name):1 ] }
    if(settings?.irrigationList?.find { it?.id == device?.id }) { 
		items["Irrigation"] = 1
    }
    if(settings?.lightList.find { it?.id == device?.id }) {
        items["LightBulb"] = 1
    }
    if(settings?.fanList.find { it?.id == device?.id }) {
        items["Fan"] = 1
    }
    if(settings?.speakerList.find { it?.id == device?.id }) {
        items["Speaker"] = 1
    }
	return items
}

def deviceCommandList(device) {
  	return device.supportedCommands.collectEntries { command->
    	[ (command?.name): (command?.arguments) ]
  	}
}

def deviceAttributeList(device) {
  	return device.supportedAttributes.collectEntries { attribute->
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
def getLocalEndpointUrl(subPath) { return "${getLocalApiServerUrl()}/apps/${app?.id}${subPath ? "/${subPath}" : ""}?access_token=${state?.accessToken}" }

def getAllData() {
    def deviceJson = new groovy.json.JsonOutput().toJson([location: renderLocation(), deviceList: renderDevices()])
    render contentType: "application/json", data: deviceJson
}

def registerDevices() {
    //This has to be done at startup because it takes too long for a normal command.
    log.debug "Registering (${settings?.deviceList?.size() ?: 0}) Other Devices"
	registerChangeHandler(settings?.deviceList)
    log.debug "Registering (${settings?.irrigationList?.size() ?: 0}) Sprinklers"
    registerChangeHandler(settings?.irrigationList)
}

def registerSensors() {
    //This has to be done at startup because it takes too long for a normal command.
    log.debug "Registering (${settings?.sensorList?.size() ?: 0}) Sensors"
    registerChangeHandler(settings?.sensorList)
    log.debug "Registering (${settings?.speakerList?.size() ?: 0}) Speakers"
    registerChangeHandler(settings?.speakerList)
}

def registerSwitches() {
    //This has to be done at startup because it takes too long for a normal command.
    log.debug "Registering (${settings?.switchList?.size() ?: 0}) Switches"
	registerChangeHandler(settings?.switchList)
    log.debug "Registering (${settings?.lightList?.size() ?: 0}) Lights"
    registerChangeHandler(settings?.lightList)
    log.debug "Registering (${settings?.fanList?.size() ?: 0}) Fans"
    registerChangeHandler(settings?.fanList)
}

def ignoreTheseAttributes() {
    return [
        'DeviceWatch-DeviceStatus', 'checkInterval', 'devTypeVer', 'dayPowerAvg', 'apiStatus', 'yearCost', 'yearUsage','monthUsage', 'monthEst', 'weekCost', 'todayUsage',
		'maxCodeLength', 'maxCodes', 'readingUpdated', 'maxEnergyReading', 'monthCost', 'maxPowerReading', 'minPowerReading', 'monthCost', 'weekUsage', 'minEnergyReading',
		'codeReport', 'scanCodes', 'verticalAccuracy', 'horizontalAccuracyMetric', 'altitudeMetric', 'latitude', 'distanceMetric', 'closestPlaceDistanceMetric',
		'closestPlaceDistance', 'leavingPlace', 'currentPlace', 'codeChanged', 'codeLength', 'lockCodes', 'healthStatus', 'horizontalAccuracy', 'bearing', 'speedMetric',
		'speed', 'verticalAccuracyMetric', 'altitude', 'indicatorStatus', 'todayCost', 'longitude', 'distance', 'previousPlace','closestPlace', 'places', 'minCodeLength',
		'arrivingAtPlace', 'lastUpdatedDt'
    ]
}

def registerChangeHandler(devices) {
	devices?.each { device ->
		def theAtts = device?.supportedAttributes
		theAtts?.each { att ->
            if(!(ignoreTheseAttributes().contains(att?.name))) {
		        subscribe(device, att?.name, "changeHandler")
    		    log.debug "Registering ${device?.displayName}.${att?.name}"
            }
		}
	}
}

def changeHandler(evt) {
    def sendItems = []
    def sendNum = 1
    def src = evt?.source
    def deviceid = evt?.deviceId
    def deviceName = evt?.displayName
    def attr = evt?.name
    def value = evt?.value
    def dt = evt?.date
    def sendEvt = true

    switch(evt?.name) {
        case "hsmStatus":
            deviceid = evt?.name
            state?.hsmStatus = value
            sendItems?.push([evtSource: src, evtDeviceName: deviceName, evtDeviceId: deviceid, evtAttr: attr, evtValue: value, evtUnit: evt?.unit ?: "", evtDate: dt])
            break
        case "hsmAlert":
            if(evt?.value == "intrusion") {
                device = "alarm_active"
            } else { sendEvt = false }
            state?.hsmAlert = evt?.value
            break
        case "hsmRules":
            state?.hsmRules = evt?.value
            sendEvt = false
            break
        case "hsmSetArm":
            state?.hsmSetArm = evt?.value
            sendEvt = false
            break
        case "mode":
            settings?.modeList?.each { id->
                def md = getModeById(id)
                if(md && md?.id ) { sendItems?.push([evtSource: "MODE", evtDeviceName: md?.name, evtDeviceId: md?.id, evtAttr: "switch", evtValue: modeSwitchState(md?.name), evtUnit: "", evtDate: dt]) }
            }
            break
        default:
            sendItems?.push([evtSource: src, evtDeviceName: deviceName, evtDeviceId: deviceid, evtAttr: attr, evtValue: value, evtUnit: evt?.unit ?: "", evtDate: dt])
            break
    }

    if (sendEvt && state?.directIP != "" && sendItems?.size()) {
    	//Send Using the Direct Mechanism
        sendItems?.each { send->
            if(settings?.showLogs) { 
                log.debug "Sending${" ${send?.evtSource}" ?: ""} Event (${send?.evtDeviceName} | ${send?.evtAttr.toUpperCase()}: ${send?.evtValue}${send?.evtUnit}) to Homebridge at (${state?.directIP}:${state?.directPort})" 
            }
            def result = new hubitat.device.HubAction(
                method: "POST",
                path: "/update",
                headers: [
                    HOST: "${state?.directIP}:${state?.directPort}",
                    'Content-Type': 'application/json'
                ],
                body: [
                    change_device: send?.evtDeviceId,
                    change_attribute: send?.evtAttr,
                    change_value: send?.evtValue,
                    change_date: send?.evtDate
                ]
            )
            sendHubCommand(result)
        }
    }
}

def getModeById(mId) {
    return location?.getModes()?.find{it?.id == mId}
}

def getModeByName(name) {
    return location?.getModes()?.find{it?.name == name}
}

def enableDirectUpdates() {
	log.trace "Command Request: ($params)"
	state?.directIP = params?.ip
    state?.directPort = params?.port
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
	// log.trace "HubResponseEvent(${evt.description})"
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

mappings {
    path("/devices")                        { action: [GET: "getAllData"] }
    path("/config")                         { action: [GET: "renderConfig"]  }
    path("/location")                       { action: [GET: "renderLocation"] }
    path("/:id/command/:command")     		{ action: [POST: "deviceCommand"] }
    path("/:id/query")						{ action: [GET: "deviceQuery"] }
    path("/:id/attribute/:attribute") 		{ action: [GET: "deviceAttribute"] }
    path("/getUpdates")                     { action: [GET: "getChangeEvents"] }
    path("/startDirect/:ip/:port")          { action: [GET: "enableDirectUpdates"] }
}

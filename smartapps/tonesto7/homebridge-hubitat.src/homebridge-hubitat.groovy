/**
 *  Homebridge SmartThing/Hubitat Interface
 *  Loosely Modelled off of Paul Lovelace's JSON API
 *  Copyright 2018 Anthony Santilli
 */

String appVersion() { return "1.5.2" }
String appModified() { return "10-22-2018" }
String platform() { return "Hubitat" }
String appIconUrl() { return "https://raw.githubusercontent.com/tonesto7/homebridge-smartthings-tonesto7/master/images/hb_tonesto7@2x.png" }
String getAppImg(imgName) { return "https://raw.githubusercontent.com/tonesto7/smartthings-tonesto7-public/master/resources/icons/$imgName" }
Boolean isST() { return (platform() == "SmartThings") }
definition(
    name: "Homebridge (${platform()})",
    namespace: "tonesto7",
    author: "Anthony Santilli",
    description: "Provides the API interface between Homebridge (HomeKit) and ${platform()}",
    category: "My Apps",
    iconUrl:   "https://raw.githubusercontent.com/tonesto7/homebridge-smartthings-tonesto7/master/images/hb_tonesto7@1x.png",
    iconX2Url: "https://raw.githubusercontent.com/tonesto7/homebridge-smartthings-tonesto7/master/images/hb_tonesto7@2x.png",
    iconX3Url: "https://raw.githubusercontent.com/tonesto7/homebridge-smartthings-tonesto7/master/images/hb_tonesto7@3x.png",
    oauth: true)


preferences {
    page(name: "mainPage")
    page(name: "confirmPage")
}

def appInfoSect()	{
	section() {
        if(isST()) {
            paragraph "${app?.name}\nv${appVersion()}", image: appIconUrl()
            paragraph "Any Device Changes will require a restart of the Homebridge Service", required: true, state: null, image: getAppImg("error.png")
        } else {
            def str = """
            <div class="appInfoSect" style="width: 300px; height: 70px; display: inline-table;">
                <ul style=" margin: 0 auto; padding: 0; list-style-type: none;">
                <img style="float: left; padding: 10px;" src="https://raw.githubusercontent.com/tonesto7/homebridge-smartthings-tonesto7/master/images/hb_tonesto7@1x.png" width="70px"/>
                <li style="padding-top: 2px;"><b>${app?.name}</b></li>
                <li><small style="color: black !important;">Copyright\u00A9 2018 Anthony Santilli</small></li>
                <li><small style="color: black !important;">Version: ${appVersion()}</small></li>
                </ul>
            </div>
            <script>\$('.appInfoSect').parent().css("cssText", "font-family: Arial !important; white-space: inherit !important;")</script>
            """
            paragraph "${str}"
            paragraph '<small style="color: red !important;"><i><b>Notice:</b></small><small style="color: red !important;"> Any Device Changes will require a restart of the Homebridge Service</i></small>'
        }
    }
}

def mainPage() {
    if (!state?.accessToken) {
        createAccessToken()
    }
    Boolean isInst = (state?.isInstalled == true)
    if(isST()) {
        return dynamicPage(name: "mainPage", title: "Homebridge Device Configuration", nextPage: (isInst ? "confirmPage" : ""), install: !isInst, uninstall:true) {
            appInfoSect()
            section("Define Specific Categories:") {
                paragraph "Each category below will adjust the device attributes to make sure they are recognized as the desired device type under HomeKit", state: "complete"
                input "lightList", "capability.switch", title: "Lights: (${lightList ? lightList?.size() : 0} Selected)", multiple: true, submitOnChange: true, required: false, image: getAppImg("light_on.png")
                input "fanList", "capability.switch", title: "Fans: (${fanList ? fanList?.size() : 0} Selected)", multiple: true, submitOnChange: true, required: false, image: getAppImg("fan_on.png")
                input "speakerList", "capability.switch", title: "Speakers: (${speakerList ? speakerList?.size() : 0} Selected)", multiple: true, submitOnChange: true, required: false, image: getAppImg("media_player.png")
            }
            section("All Other Devices:") {
                input "sensorList", "capability.sensor", title: "Sensor Devices: (${sensorList ? sensorList?.size() : 0} Selected)", multiple: true, submitOnChange: true, required: false, image: getAppImg("sensors.png")
                input "switchList", "capability.switch", title: "Switch Devices: (${switchList ? switchList?.size() : 0} Selected)", multiple: true, submitOnChange: true, required: false, image: getAppImg("switch.png")
                input "deviceList", "capability.refresh", title: "Other Devices: (${deviceList ? deviceList?.size() : 0} Selected)", multiple: true, submitOnChange: true, required: false, image: getAppImg("devices2.png")
            }
            section("Restrict Temp Device Creation") {
                input "noTemp", "bool", title: "Remove Temp from Contacts and Water Sensors?", required: false, defaultValue: false, submitOnChange: true
                if(settings?.noTemp) {
                    input "sensorAllowTemp", "capability.sensor", title: "Allow Temp on these Sensors", multiple: true, submitOnChange: true, required: false, image: getAppImg("temperature.png")
                }
            }
            section("Create Devices for Modes in HomeKit?") {
                paragraph title: "What are these for?", "A virtual switch will be created for each mode in HomeKit.\nThe switch will be ON when that mode is active.", state: "complete", image: getAppImg("info.png")
                def modes = location?.modes?.sort{it?.name}?.collect { [(it?.id):it?.name] }
                input "modeList", "enum", title: "Create Devices for these Modes", required: false, multiple: true, options: modes, submitOnChange: true, image: getAppImg("mode.png")
            }
            section("Create Devices for Routines in HomeKit?") {
                paragraph title: "What are these?", "A virtual device will be created for each routine in HomeKit.\nThese are very useful for use in Home Kit scenes", state: "complete", image: getAppImg("info.png")
                def routines = location.helloHome?.getPhrases()?.sort { it?.label }?.collect { [(it?.id):it?.label] }
                input "routineList", "enum", title: "Create Devices for these Routines", required: false, multiple: true, options: routines, submitOnChange: true, image: getAppImg("routine.png")
            }
            section("Smart Home Monitor Support (SHM):") {
                input "addSecurityDevice", "bool", title: "Allow SHM Control in HomeKit?", required: false, defaultValue: true, submitOnChange: true, image: getAppImg("alarm_home.png")
            }
            section("Review Configuration:") {
                href url: getAppEndpointUrl("config"), style: "embedded", required: false, title: "View the Configuration Data for Homebridge", description: "Tap, select, copy, then click \"Done\""
                paragraph "Selected Device Count:\n${getDeviceCnt()}", image: getAppImg("info.png")
            }
            section("Options:") {
                input "showLogs", "bool", title: "Show Events in Live Logs?", required: false, defaultValue: true, submitOnChange: true, image: getAppImg("debug.png")
                input "allowLocalCmds", "bool", title: "Send HomeKit Commands Locally?", required: false, defaultValue: true, submitOnChange: true, image: getAppImg("command2.png")
                label title: "SmartApp Label (optional)", description: "Rename this App", defaultValue: app?.name, required: false, image: getAppImg("name_tag.png")
            }
        }
    } else {
        return dynamicPage(name: "mainPage", title: "", nextPage: (isInst ? "confirmPage" : ""), install: !isInst, uninstall:true) {
            appInfoSect()
            section(sectionTitleStr("Define Specific Categories:")) {
                paragraph '<h4 style="color: blue;">These Categories will add the necessary capabilities to make sure they are recognized by HomeKit as the specific device type</h4>'
                input "lightList", "capability.switch", title: inputTitleStr("Lights: (${lightList ? lightList?.size() : 0} Selected)"), description: "<i>Tap to select</i>", multiple: true, submitOnChange: true, required: false
                input "fanList", "capability.switch", title: inputTitleStr("Fans: (${fanList ? fanList?.size() : 0} Selected)"), description: "<i>Tap to select</i>", multiple: true, submitOnChange: true, required: false
                input "speakerList", "capability.switch", title: inputTitleStr("Speakers: (${speakerList ? speakerList?.size() : 0} Selected)"), description: "<i>Tap to select</i>", multiple: true, submitOnChange: true, required: false
                input "shadesList", "capability.windowShade", title: inputTitleStr("Window Shades: (${shadesList ? shadesList?.size() : 0} Selected)"), description: "<i>Tap to select</i>", multiple: true, submitOnChange: true, required: false
            }
            
            section(sectionTitleStr("All Other Devices:")) {
                input "sensorList", "capability.sensor", title: inputTitleStr("Sensor Devices: (${sensorList ? sensorList?.size() : 0} Selected)"), description: "<i>Tap to select</i>", multiple: true, submitOnChange: true, required: false
                input "switchList", "capability.switch", title: inputTitleStr("Switch Devices: (${switchList ? switchList?.size() : 0} Selected)"), description: "<i>Tap to select</i>", multiple: true, submitOnChange: true, required: false
                input "deviceList", "capability.refresh", title: inputTitleStr("Other Devices: (${deviceList ? deviceList?.size() : 0} Selected)"), description: "<i>Tap to select</i>", multiple: true, submitOnChange: true, required: false
            }
            section(sectionTitleStr("Restrict Temp Device Creation")) {
                input "noTemp", "bool", title: inputTitleStr("Remove Temp from Contacts and Water Sensors?"), required: false, defaultValue: false, submitOnChange: true
                if(settings?.noTemp) {
                    input "sensorAllowTemp", "capability.sensor", title: inputTitleStr("Allow Temp on these Sensors"), multiple: true, submitOnChange: true, required: false
                }
            }
            section("</br>${sectionTitleStr("Create Mode Devices in HomeKit?")}") {
                paragraph '<small style="color: blue !important;"><i><b>Description:</b></small><br/><small style="color: grey !important;">A virtual switch will be created for each mode in HomeKit.</br>The switch will be ON when that mode is active.</i></small>', state: "complete"
                def modes = location?.modes?.sort{it?.name}?.collect { [(it?.id):it?.name] }
                input "modeList", "enum", title: inputTitleStr("Create Devices for these Modes"), required: false, multiple: true, options: modes, submitOnChange: true
            }
            section("<br/>${sectionTitleStr("Hubitat Safety Monitor Support:")}") {
                input "addSecurityDevice", "bool", title: inputTitleStr("Allow Hubitat Safety Monitor Control in Homekit?"), required: false, defaultValue: false, submitOnChange: true
            }
            section("<br/>${sectionTitleStr("Plug-In Configuration Data:")}") {
                href url: getAppEndpointUrl("config"), style: "embedded", required: false, title: inputTitleStr("View the Configuration Data for Homebridge"), description: """</br><small style="color: #1A77C9 !important;"><i>Tap, select, copy, then click <b>Done</b></i></small>"""
                paragraph "<h3>Selected Device Count:\n${getDeviceCnt()}</h3>"
            }
            section("<br/>${sectionTitleStr("Options:")}") {
                input "showLogs", "bool", title: inputTitleStr("Show Events in Live Logs?"), required: false, defaultValue: true, submitOnChange: true
                label title: inputTitleStr("App Label (optional)"), description: "Rename App", defaultValue: app?.name, required: false 
            }
        }
    }
}

def confirmPage() {
    if(isST()) {
        return dynamicPage(name: "confirmPage", title: "Confirm Page", install: true, uninstall:true) {
            section("") {
                paragraph "Would you like to restart the Homebridge Service to apply any device changes you made?", required: true, state: null, image: getAppImg("info.png")
                input "restartService", "bool", title: "Restart Homebridge plugin when you press Save?", required: false, defaultValue: false, submitOnChange: true, image: getAppImg("reset2.png")
            }
        }
    } else {
        return dynamicPage(name: "confirmPage", title: "", install: true, uninstall:true) {
            section("") {
                paragraph '<small style="color: blue !important;"><i><b>Notice:</b></small><br/><small style="color: grey !important;">Would you like to restart the Homebridge Service to apply any device changes you made?</i></small>', state: "complete"
                input "restartService", "bool", title: inputTitleStr("Restart Homebridge plugin when you press Save?"), required: false, defaultValue: false, submitOnChange: true
            }
        }
    }
}

def sectionTitleStr(title) 	{ return "<h2>$title</h2>" }
def inputTitleStr(title) 	{ return "<u>$title</u>" }
def pageTitleStr(title) 	{ return "<h1>$title</h1>" }
def imgTitle(imgSrc, imgWidth, imgHeight, titleStr, color=null) {
    def imgStyle = ""
    imgStyle += imgWidth ? "width: ${imgWidth}px !important;" : ""
    imgStyle += imgHeight ? "${imgWidth ? " " : ""}height: ${imgHeight}px !important;" : ""
    if(color) { return """<div style="color: ${color}; font-weight: bold;"><img style="${imgStyle}" src="${imgSrc}"> ${titleStr}</img></div>""" }
    else { return """<img style="${imgStyle}" src="${imgSrc}"> ${titleStr}</img>""" }
}

def getDeviceCnt() {
    def devices = []
    def items = ["deviceList", "sensorList", "switchList", "lightList", "fanList", "speakerList", "modeList"]
    if(isST()) { items?.push("routineList") }
    if(!isST()) { items?.push("shadesList") }
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

private static Class HubActionClass() {
    try {
        return 'physicalgraph.device.HubAction' as Class
    } catch(all) {
        return 'hubitat.device.HubAction' as Class
    }
}

def asyncHttpResponse(response, data)
{
	if (response.status != 200)
		log.error "asyncHttpResponse: received invalid response ${response.status} for params ${data["requestParams"]}"
}


def sendHomebridgeCommand(params)
{
	if (isST() == true)
	{
		sendHubCommand(HubActionClass().newInstance(params))
	}
	else
	{
		if (params?.method)
		{
			switch (params.method)
			{
				case "GET":
					def getParams = [
						uri: "http://${state?.directIP}:${state?.directPort}" + params.path ,
						requestContentType: 'application/json'
					]
					asynchttpGet("asyncHttpResponse", getParams, [requestParams: params])
					break
				case "POST":
					def postParams = [
						uri: "http://${state?.directIP}:${state?.directPort}" + params.path ,
						requestContentType: 'application/json',
						contentType: 'application/json',
						body : params.body
					]
					asynchttpPost("asyncHttpResponse", postParams, [requestParams: params])
					break
				default:
					log.error "sendHomebridgeCommand: invalid http method ${params.method} called"
					break
			}
		}
	}
}

def initialize() {
    state?.isInstalled = true
    if(!state?.accessToken) {
        createAccessToken()
    }
    runIn(2, "registerDevices", [overwrite: true])
    runIn(4, "registerSensors", [overwrite: true])
    runIn(6, "registerSwitches", [overwrite: true])
    if(settings?.addSecurityDevice) {
        if(!isST()) {
            subscribe(location, "hsmStatus", changeHandler) 
            subscribe(location, "hsmRules", changeHandler) 
            subscribe(location, "hsmAlert", changeHandler) 
            subscribe(location, "hsmSetArm", changeHandler) 
        } else { subscribe(location, "alarmSystemStatus", changeHandler) }
    }
    if(settings?.modeList) {
        log.debug "Registering (${settings?.modeList?.size() ?: 0}) Virtual Mode Devices"
        subscribe(location, "mode", changeHandler)
        if(state.lastMode == null) { state?.lastMode = location.mode?.toString() }
    }
    if(isST()) {
        state?.subscriptionRenewed = 0
        subscribe(app, onAppTouch)
        if(settings?.allowLocalCmds != false) { subscribe(location, null, lanEventHandler, [filterEvents:false]) }
        if(settings?.routineList) {
            log.debug "Registering (${settings?.routineList?.size() ?: 0}) Virtual Routine Devices"
            subscribe(location, "routineExecuted", changeHandler)
        }
    }
    if(settings?.restartService == true) {
        log.warn "Sent Request to Homebridge Service to Stop... Service should restart automatically"
        attemptServiceRestart()
        settingUpdate("restartService", "false", "bool")
    }
    runIn((settings?.restartService ? 60 : 10), "updateServicePrefs")
}

def onAppTouch(event) {
    updated()
}

def renderDevices() {
    def deviceData = []
    def items = ["deviceList", "sensorList", "switchList", "lightList", "fanList", "speakerList", "modeList"]
    if(isST()) { items?.push("routineList") }
    if(!isST()) { items?.push("shadesList") }
    items?.each { item ->
        if(settings[item]?.size()) {
            settings[item]?.each { dev->
                try {
                    def dData = getDeviceData(item, dev)
                    if(dData && dData?.size()) { deviceData?.push(dData) }
                } catch (e) {
                    log.error("Error Occurred Parsing Device ${dev?.displayName}, Error " + e.message)
                }
            }
        }
    }
    if(settings?.addSecurityDevice == true) { deviceData?.push(getSecurityDevice()) }
    return deviceData
}

def getDeviceData(type, sItem) {
    // log.debug "getDeviceData($type, $sItem)"
    def curType = null
    def devId = sItem
    def obj = null
    def name = null
    def attrVal = null
    def isVirtual = false
    switch(type) {
        case "routineList":
            isVirtual = true
            curType = "Routine"
            obj = getRoutineById(sItem)
            if(obj) {
                name = "Routine - " + obj?.label
                attrVal = "off"
            }
            break
        case "modeList":
            isVirtual = true
            curType = "Mode"
            obj = getModeById(sItem)
            if(obj) {
                name = "Mode - " + obj?.name
                attrVal = modeSwitchState(obj?.name)
            }
            break
        default:
            curType = "device"
            obj = sItem
            break
    }
    if(curType && obj) {
        return [
            name: !isVirtual ? sItem?.displayName : name,
            basename:  !isVirtual ? sItem?.name : name,
            deviceid: !isVirtual ? sItem?.id : devId,
            status: !isVirtual ? sItem?.status : "Online",
            manufacturerName: (!isVirtual ? (isST() ? sItem?.getManufacturerName() : sItem?.getDataValue("manufacturer")) : platform()) ?: platform(),
            modelName: !isVirtual ? ((isST() ? sItem?.getModelName() : sItem?.getDataValue("model")) ?: sItem?.getTypeName()) : "${curType} Device",
            serialNumber: !isVirtual ? sItem?.getDeviceNetworkId() : "${curType}${devId}",
            firmwareVersion: "1.0.0",
            lastTime: !isVirtual ? (isST() ? sItem?.getLastActivity() : null) : now(),
            capabilities: !isVirtual ? deviceCapabilityList(sItem) : ["${curType}": 1],
            commands: !isVirtual ? deviceCommandList(sItem) : [on:[]],
            attributes: !isVirtual ? deviceAttributeList(sItem) : ["switch": attrVal]
        ]
    } else { return null }
}

String modeSwitchState(String mode) {
    return location?.mode?.toString() == mode ? "on" : "off"
}

def getSecurityDevice() {
    return [
        name: (!isST() ? "Hubitat Safety Monitor Alarm" : "Security Alarm"),
        basename: (!isST() ? "HSM Alarm" : "Security Alarm"),
        deviceid: "alarmSystemStatus_${location?.id}",
        status: "ACTIVE",
        manufacturerName: platform(),
        modelName: (!isST() ? "Safety Monitor" : "Security System"),
        serialNumber: (!isST() ? "HSM" : "SHM"),
        firmwareVersion: "1.0.0",
        lastTime: null,
        capabilities: ["Alarm System Status":1, "Alarm":1], 
        commands: [], 
        attributes: ["alarmSystemStatus": getSecurityStatus()]
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
    if(!isST()) {
        device = shadesList.find { it?.id == paramid }
    }
	return device
}

def authError() {
    return [error: "Permission denied"]
}

def getSecurityStatus(retInt=false) {
    if(isST()) {
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
    } else {
        return location?.hsmStatus ?: "disarmed"
    }
}

private setSecurityMode(mode) {
    if(!isST()) {
        switch(mode) {
            case "stay":
                mode = "armHome"
                break
            case "away":
                mode = "armAway"
                break
            case "night":
                mode = "armHome"
                break
            case "off":
                mode = "disarm"
                break
        }
    }
    log.info "Setting the ${isST() ? "Smart Home Monitor" : "Hubitat Safety Monitor"} Mode to (${mode})..."
    sendLocationEvent(name: (isST() ? 'alarmSystemStatus' : 'hsmSetArm'), value: mode.toString())
}

def renderConfig() {
    Map jsonMap = [
        platforms: [
            [
                platform: platform(),
                name: platform(),
                app_url: (isST() ? apiServerUrl("/api/smartapps/installations/") : fullLocalApiServerUrl('')),
                access_token: state?.accessToken
            ]
        ]
    ]
    if(isST()) { jsonMap?.platforms[0]["app_id"] = app.id }
    def configJson = new groovy.json.JsonOutput().toJson(jsonMap)
    def configString = new groovy.json.JsonOutput().prettyPrint(configJson)
    render contentType: "text/plain", data: configString
}

def renderLocation() {
    return [
        latitude: location?.latitude,
        longitude: location?.longitude,
        mode: location?.mode,
        name: location?.name,
        temperature_scale: location?.temperatureScale,
        zip_code: location?.zipCode,
        hubIP: (isST() ? location?.hubs[0]?.localIP : location.hubs[0]?.getDataValue("localIP")),
        app_version: appVersion()
    ]
}

def CommandReply(statusOut, messageOut) {
    def replyJson = new groovy.json.JsonOutput().toJson([status: statusOut, message: messageOut])
    render contentType: "application/json", data: replyJson
}

def lanEventHandler(evt) {
    // log.trace "lanStreamEvtHandler..."
    def msg = parseLanMessage(evt?.description)
    Map headerMap = msg?.headers
    // log.trace "lanEventHandler... | headers: ${headerMap}"
    try {
        Map msgData = [:]
        if (headerMap?.size()) {
            if (headerMap?.evtSource && headerMap?.evtSource == "Homebridge_${platform()}") {
                if (msg?.body != null) {
                    def slurper = new groovy.json.JsonSlurper()
                    msgData = slurper?.parseText(msg?.body as String)
                    log.debug "msgData: $msgData"
                    if(headerMap?.evtType) { 
                        switch(headerMap?.evtType) {
                            case "hkCommand":
                                // log.trace "hkCommand($msgData)"
                                def val1 = msgData?.value1 ?: null
                                def val2 = msgData?.value2 ?: null
                                processCmd(msgData?.deviceid, msgData?.command, val1, val2, true)
                                break
                            case "enableDirect":
                                // log.trace "enableDirect($msgData)"
                                state?.directIP = msgData?.ip
                                state?.directPort = msgData?.port
                                activateDirectUpdates(true)
                                break
                        }
                    }
                }
            }
        }
    } catch (ex) {
        log.error "lanEventHandler Exception:", ex
    }
}

def deviceCommand() {
    // log.info("Command Request: $params")
    def val1 = request?.JSON?.value1 ?: null
    def val2 = request?.JSON?.value2 ?: null
    processCmd(params?.id, params?.command, val1, val2)
}

private processCmd(devId, cmd, value1, value2, local=false) {
    log.info("Process Command${local ? "(LOCAL)" : ""} | DeviceId: $devId | Command: ($cmd)${value1 ? " | Param1: ($value1)" : ""}${value2 ? " | Param2: ($value2)" : ""}")
    def device = findDevice(devId)
    def command = cmd
    if(settings?.addSecurityDevice != false && devId == "alarmSystemStatus_${location?.id}") {
        setSecurityMode(command)
        CommandReply("Success", "Security Alarm, Command $command")
    }  else if (settings?.modeList && command == "mode") {
        log.debug "Virtual Mode Received: ${value1}"
        if(value1) { changeMode(value1 as String) }
        CommandReply("Success", "Mode Device, Command $command")
    } else if (settings?.routineList && command == "routine") {
        log.debug "Virtual Routine Received: ${value1}"
        if(value1) { runRoutine(value1) }
        CommandReply("Success", "Routine Device, Command $command")
    } else {
        if (!device) {
            log.error("Device Not Found")
            CommandReply("Failure", "Device Not Found")
        } else if (!device.hasCommand(command)) {
            log.error("Device ${device.displayName} does not have the command $command")
            CommandReply("Failure", "Device ${device.displayName} does not have the command $command")
        } else {
            try {
                if (value2 != null) {
                    device."$command"(value1,value2)
                    log.info("Command Successful for Device ${device.displayName} | Command ${command}($value1, $value2)")
                } else if (value1 != null) {
                    device."$command"(value1)
                    log.info("Command Successful for Device ${device.displayName} | Command ${command}($value1)")
                } else {
                    device."$command"()
                    log.info("Command Successful for Device ${device.displayName} | Command ${command}()")
                }
                CommandReply("Success", "Device ${device.displayName} | Command ${command}()")
            } catch (e) {
                log.error("Error Occurred for Device ${device.displayName} | Command ${command}()")
                CommandReply("Failure", "Error Occurred For Device ${device.displayName} | Command ${command}()")
            }
        }
    }
}

def changeMode(mode) {
    if(mode) {
        mode = mode.replace("Mode - ", "")
        log.info "Setting the Location Mode to (${mode})..."
        setLocationMode(mode)
        state.lastMode = mode
    }
}

def runRoutine(rt) {
    if(rt) {
        rt = rt.replace("Routine - ", "")
        log.info "Executing the (${rt}) Routine..."
        location?.helloHome?.execute(rt)
    }
}

def deviceAttribute() {
    def device = findDevice(params?.id)
    def attribute = params?.attribute
    if (!device) {
        httpError(404, "Device not found")
    } else {
        return [currentValue: device?.currentValue(attribute)]
    }
}

def findVirtModeDevice(id) {
    return getModeById(id) ?: null
}

def findVirtRoutineDevice(id) {
    return getRoutineById(id) ?: null
}

def deviceQuery() {
    log.trace "deviceQuery(${params?.id}"
    def device = findDevice(params?.id)
    if (!device) {
        def mode = findVirtModeDevice(params?.id)
        def routine = isST() ? findVirtModeDevice(params?.id) : null
        def obj = mode ? mode : routine ?: null
        if(!obj) {
            device = null
            httpError(404, "Device not found")
        } else {
            def name = routine ? obj?.label : obj?.name
            def type = routine ? "Routine" : "Mode"
            def attrVal = routine ? "off" : modeSwitchState(obj?.name)
            try {
                deviceData?.push([
                    name: name,
                    deviceid: params?.id,
                    capabilities: ["${type}": 1],
                    commands: [on:[]],
                    attributes: ["switch": attrVal]
                ])
            } catch (e) {
                log.error("Error Occurred Parsing ${item} ${type} ${name}, Error " + e.message)
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
    if(settings?.lightList.find { it?.id == device?.id }) {
        items["LightBulb"] = 1
    }
    if(settings?.fanList.find { it?.id == device?.id }) {
        items["Fan"] = 1
    }
    if(settings?.speakerList.find { it?.id == device?.id }) {
        items["Speaker"] = 1
    }
    if(!isST() && settings?.shadesList.find { it?.id == device?.id }) {
        items["WindowShade"] = 1
    }
    if(settings?.noTemp && items["Temperature Measurement"] && (items["Contact Sensor"] || items["Water Sensor"])) {
        Boolean remTemp = true
        if(settings?.sensorAllowTemp) {
            List aItems = settings?.sensorAllowTemp?.collect { it?.getId() as String } ?: []
            if(aItems?.contains(device?.id as String)) { remTemp = false }
        }
        if(remTemp) { items.remove("Temperature Measurement") }
    }
    return items
}

def deviceCommandList(device) {
    return device.supportedCommands.collectEntries { command-> [ (command?.name): (command?.arguments) ] }
}

def deviceAttributeList(device) {
    return device.supportedAttributes.collectEntries { attribute->
        try {
            [(attribute?.name): device?.currentValue(attribute?.name)]
        } catch(e) {
            [(attribute?.name): null]
        }
    }
}

String getAppEndpointUrl(subPath)   { return isST() ? "${apiServerUrl("/api/smartapps/installations/${app.id}${subPath ? "/${subPath}" : ""}?access_token=${state.accessToken}")}" : "${getApiServerUrl()}/${getHubUID()}/apps/${app?.id}${subPath ? "/${subPath}" : ""}?access_token=${state?.accessToken}" }
String getLocalEndpointUrl(subPath) { return "${getLocalApiServerUrl()}/apps/${app?.id}${subPath ? "/${subPath}" : ""}?access_token=${state?.accessToken}" }

def getAllData() {
    if(isST()) {
        state?.subscriptionRenewed = now()
        state?.devchanges = []
    }
    def deviceJson = new groovy.json.JsonOutput().toJson([location: renderLocation(), deviceList: renderDevices()])
    render contentType: "application/json", data: deviceJson
}

def registerDevices() {
    //This has to be done at startup because it takes too long for a normal command.
    log.debug "Registering (${settings?.fanList?.size() ?: 0}) Fans"
    registerChangeHandler(settings?.fanList)
    log.debug "Registering (${settings?.deviceList?.size() ?: 0}) Other Devices"
    registerChangeHandler(settings?.deviceList)
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
    if(!isST()) {
        log.debug "Registering (${settings?.shadesList?.size() ?: 0}) Window Shades"
        registerChangeHandler(settings?.shadesList)
    }
    log.debug "Registered (${getDeviceCnt()} Devices)"
}

def ignoreTheseAttributes() {
    return [
        'DeviceWatch-DeviceStatus', 'checkInterval', 'devTypeVer', 'dayPowerAvg', 'apiStatus', 'yearCost', 'yearUsage','monthUsage', 'monthEst', 'weekCost', 'todayUsage',
        'maxCodeLength', 'maxCodes', 'readingUpdated', 'maxEnergyReading', 'monthCost', 'maxPowerReading', 'minPowerReading', 'monthCost', 'weekUsage', 'minEnergyReading',
        'codeReport', 'scanCodes', 'verticalAccuracy', 'horizontalAccuracyMetric', 'altitudeMetric', 'latitude', 'distanceMetric', 'closestPlaceDistanceMetric',
        'closestPlaceDistance', 'leavingPlace', 'currentPlace', 'codeChanged', 'codeLength', 'lockCodes', 'healthStatus', 'horizontalAccuracy', 'bearing', 'speedMetric',
        'speed', 'verticalAccuracyMetric', 'altitude', 'indicatorStatus', 'todayCost', 'longitude', 'distance', 'previousPlace','closestPlace', 'places', 'minCodeLength',
        'arrivingAtPlace', 'lastUpdatedDt', 'scheduleType', 'zoneStartDate', 'zoneElapsed', 'zoneDuration', 'watering'
    ]
}

def registerChangeHandler(devices, showlog=false) {
    devices?.each { device ->
        List theAtts = device?.supportedAttributes?.collect { it?.name as String }?.unique()
        if(showlog) { log.debug "atts: ${theAtts}" }
        theAtts?.each {att ->
            if(!(ignoreTheseAttributes().contains(att))) {
                if(settings?.noTemp && att == "temperature" && (device?.hasAttribute("contact") || device?.hasAttribute("water"))) {
                    Boolean skipAtt = true
                    if(settings?.sensorAllowTemp) {
                        List aItems = settings?.sensorAllowTemp?.collect { it?.getId() as String } ?: []
                        if(aItems?.contains(device?.id as String)) { skipAtt = false }
                    }
                    if(skipAtt) { return }
                } 
                subscribe(device, att, "changeHandler")
                if(showlog) { log.debug "Registering ${device?.displayName}.${att}" }
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
            deviceid = "alarmSystemStatus_${location?.id}"
            attr = "alarmSystemStatus"
            sendItems?.push([evtSource: src, evtDeviceName: deviceName, evtDeviceId: deviceid, evtAttr: attr, evtValue: value, evtUnit: evt?.unit ?: "", evtDate: dt])
            break
        case "hsmAlert":
            if(evt?.value == "intrusion") {
                deviceid = "alarmSystemStatus_${location?.id}"
                attr = "alarmSystemStatus"
                value = "alarm_active"
                sendItems?.push([evtSource: src, evtDeviceName: deviceName, evtDeviceId: deviceid, evtAttr: attr, evtValue: value, evtUnit: evt?.unit ?: "", evtDate: dt])
            } else { sendEvt = false }
            break
        case "hsmRules":
        case "hsmSetArm":
            sendEvt = false
            break
        case "alarmSystemStatus":
            deviceid = "alarmSystemStatus_${location?.id}"
            sendItems?.push([evtSource: src, evtDeviceName: deviceName, evtDeviceId: deviceid, evtAttr: attr, evtValue: value, evtUnit: evt?.unit ?: "", evtDate: dt])
            break
        case "mode":
            settings?.modeList?.each { id->
                def md = getModeById(id)
                if(md && md?.id) { sendItems?.push([evtSource: "MODE", evtDeviceName: "Mode - ${md?.name}", evtDeviceId: md?.id, evtAttr: "switch", evtValue: modeSwitchState(md?.name), evtUnit: "", evtDate: dt]) }
            }
            break
        case "routineExecuted":
            settings?.routineList?.each { id->
                def rt = getRoutineById(id)
                if(rt && rt?.id) {
                    sendItems?.push([evtSource: "ROUTINE", evtDeviceName: "Routine - ${rt?.label}", evtDeviceId: rt?.id, evtAttr: "switch", evtValue: "off", evtUnit: "", evtDate: dt])
                }
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
                String unitStr = ""
                switch(send?.evtAttr as String) {
                    case "temperature":
                        unitStr = "\u00b0${send?.evtUnit}"
                        break
                    case "humidity":
                    case "level":
                    case "battery":
                        unitStr = "%"
                        break
                    case "power":
                        unitStr = "W"
                        break
                    case "illuminance":
                        unitStr = " Lux"
                        break
                    default:
                        unitStr = "${send?.evtUnit}"
                        break
                }
                log.debug "Sending${" ${send?.evtSource}" ?: ""} Event (${send?.evtDeviceName} | ${send?.evtAttr.toUpperCase()}: ${send?.evtValue}${unitStr}) to Homebridge at (${state?.directIP}:${state?.directPort})"
            }
            def params = [
                method: "POST",
                path: "/update",
                headers: [
                    HOST: "${state?.directIP}:${state?.directPort}",
                    'Content-Type': 'application/json'
                ],
                body: [
                    change_name: send?.evtDeviceName,
                    change_device: send?.evtDeviceId,
                    change_attribute: send?.evtAttr,
                    change_value: send?.evtValue,
                    change_date: send?.evtDate
                ]
            ]
			 
            // def result = new physicalgraph.device.HubAction(params)
            //def result = new hubitat.device.HubAction(params)
			//sendHubCommand(result)
			sendHomebridgeCommand(params)
        }
    }
}

def getModeById(String mId) {
    return location?.modes?.find{it?.id?.toString() == mId}
}

def getRoutineById(String rId) {
    return location?.helloHome?.getPhrases()?.find{it?.id == rId}
}

def getModeByName(String name) {
    return location?.modes?.find{it?.name?.toString() == name}
}

def getRoutineByName(String name) {
    return location?.helloHome?.getPhrases()?.find{it?.label == name}
}

def getShmIncidents() {
    //Thanks Adrian
    def incidentThreshold = now() - 604800000
    return location.activeIncidents.collect{[date: it?.date?.time, title: it?.getTitle(), message: it?.getMessage(), args: it?.getMessageArgs(), sourceType: it?.getSourceType()]}.findAll{ it?.date >= incidentThreshold } ?: null
}

void settingUpdate(name, value, type=null) {
	if(name && type) {
		app?.updateSetting("$name", [type: "$type", value: value])
	}
	else if (name && type == null){ app?.updateSetting(name.toString(), value) }
}

private activateDirectUpdates(isLocal=false) {
    log.trace "activateDirectUpdates: ${state?.directIP}:${state?.directPort}${isLocal ? " | (Local)" : ""}"
    // def result = new physicalgraph.device.HubAction(method: "GET", path: "/initial", headers: [HOST: "${state?.directIP}:${state?.directPort}"])
	def params = [
                method: "GET",
                path: "/initial",
                headers: [
                    HOST: "${state?.directIP}:${state?.directPort}"
                ]
            ]
    //def result = new hubitat.device.HubAction(method: "GET", path: "/initial", headers: [HOST: "${state?.directIP}:${state?.directPort}"])
    //sendHubCommand(result)
	sendHomebridgeCommand(params)
}

private attemptServiceRestart(isLocal=false) {
    log.trace "attemptServiceRestart: ${state?.directIP}:${state?.directPort}${isLocal ? " | (Local)" : ""}"
    // def result = new physicalgraph.device.HubAction(method: "GET", path: "/restart", headers: [HOST: "${state?.directIP}:${state?.directPort}"])
	def params = [
                method: "GET",
                path: "/restart",
                headers: [
                    HOST: "${state?.directIP}:${state?.directPort}"
                ]
            ]
    //def result = new hubitat.device.HubAction(method: "GET", path: "/restart", headers: [HOST: "${state?.directIP}:${state?.directPort}"])
    //sendHubCommand(result)
	sendHomebridgeCommand(params)
}

private updateServicePrefs(isLocal=false) {
    log.trace "updateServicePrefs: ${state?.directIP}:${state?.directPort}${isLocal ? " | (Local)" : ""}"
    def params = [
        method: "POST",
        path: "/updateprefs",
        headers: [
            HOST: "${state?.directIP}:${state?.directPort}",
            'Content-Type': 'application/json'
        ],
        body: [
            local_commands: isST() ? (settings?.allowLocalCmds != false) : false,
            local_hub_ip: isST() ? location?.hubs[0]?.localIP : location.hubs[0]?.getDataValue("localIP")
        ]
    ]
    // def result = new physicalgraph.device.HubAction(params)
    //def result = new hubitat.device.HubAction(params)
    //sendHubCommand(result)
	sendHomebridgeCommand(params)
	
}

def enableDirectUpdates() {
    // log.trace "enableDirectUpdates: ($params)"
    state?.directIP = params?.ip
    state?.directPort = params?.port
    activateDirectUpdates()
}

mappings {
    if (isST() && (!params?.access_token || (params?.access_token && params?.access_token != state?.accessToken))) {
        path("/devices")					{ action: [GET: "authError"] }
        path("/config")						{ action: [GET: "authError"] }
        path("/location")					{ action: [GET: "authError"] }
        path("/:id/command/:command")		{ action: [POST: "authError"] }
        path("/:id/query")					{ action: [GET: "authError"] }
        path("/:id/attribute/:attribute") 	{ action: [GET: "authError"] }
        path("/getUpdates")					{ action: [GET: "authError"] }
        path("/startDirect/:ip/:port")		{ action: [GET: "authError"] }
    } else {
        path("/devices")					{ action: [GET: "getAllData"] }
        path("/config")						{ action: [GET: "renderConfig"]  }
        path("/location")					{ action: [GET: "renderLocation"] }
        path("/:id/command/:command")		{ action: [POST: "deviceCommand"] }
        path("/:id/query")					{ action: [GET: "deviceQuery"] }
        path("/:id/attribute/:attribute")	{ action: [GET: "deviceAttribute"] }
        path("/getUpdates")					{ action: [GET: "getChangeEvents"] }
        path("/startDirect/:ip/:port")		{ action: [GET: "enableDirectUpdates"] }
    }
}

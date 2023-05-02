/**
 *  Homebridge Hubitat Interface
 *  App footer inspired from Hubitat Package Manager (Thanks @dman2306)
 *
 *  Copyright 2018-2023 Anthony Santilli
 *  Contributions by @nh.schottfam
 */

//file:noinspection GroovySillyAssignment
//file:noinspection GroovyUnusedAssignment
//file:noinspection unused
//file:noinspection GroovyPointlessBoolean
//file:noinspection GroovyFallthrough

import groovy.json.JsonOutput
import groovy.transform.Field
import groovy.transform.CompileStatic

import java.text.SimpleDateFormat
import java.util.concurrent.Semaphore

definition(
    name: 'Homebridge v2',
    namespace: 'tonesto7',
    author: 'Anthony Santilli',
    description: 'Provides the API interface between Homebridge (HomeKit) and ' + platformFLD,
    category: 'My Apps',
    iconUrl:   'https://raw.githubusercontent.com/tonesto7/homebridge-hubitat-tonesto7/master/images/hb_tonesto7.png',
    iconX2Url: 'https://raw.githubusercontent.com/tonesto7/homebridge-hubitat-tonesto7/master/images/hb_tonesto7.png',
    iconX3Url: 'https://raw.githubusercontent.com/tonesto7/homebridge-hubitat-tonesto7/master/images/hb_tonesto7.png',
    importUrl: 'https://raw.githubusercontent.com/tonesto7/homebridge-hubitat-tonesto7/master/apps/homebridge-v2.groovy',
    oauth: true)

preferences {
    page(name: 'startPage')
    page(name: 'mainPage')
    page(name: 'deviceSelectPage')
    page(name: 'changeLogPage')
    page(name: 'capFilterPage')
    page(name: 'developmentPage')
    page(name: 'pluginConfigPage')
    page(name: 'donationPage')
    page(name: 'historyPage')
    page(name: 'deviceDebugPage')
    page(name: 'settingsPage')
    page(name: 'confirmPage')
}

// STATICALLY DEFINED VARIABLES
@Field static final String appVersionFLD  = '2.7.1'
//@Field static final String appModifiedFLD = '05-01-2023'
@Field static final String branchFLD      = 'master'
@Field static final String platformFLD    = 'Hubitat'
@Field static final String pluginNameFLD  = 'Hubitat-v2'
@Field static final Boolean devModeFLD    = false
@Field static final Map minVersionsFLD    = [plugin: 260]
@Field static final String sNULL          = (String)null
@Field static final String sBLANK         = ''
@Field static final String sSPACE         = ' '
@Field static final String sBULLET        = '\u2022'
//@Field static final String sFRNFACE       = '\u2639'
//@Field static final String okSymFLD       = '\u2713'
//@Field static final String notOkSymFLD    = '\u2715'
//@Field static final String sPAUSESymFLD   = '\u275A\u275A'
@Field static final String sLINEBR        = '<br>'
@Field static final String sFALSE         = 'false'
@Field static final String sTRUE          = 'true'
@Field static final String sBOOL          = 'bool'
@Field static final String sENUM          = 'enum'
//@Field static final String sTIME          = 'time'
@Field static final String sSVR           = 'svraddr'
@Field static final String sCLN           = ':'
@Field static final String sNLCLN         = 'null:null'
@Field static final String sEVT           = 'evt'
@Field static final String sEVTLOGEN      = 'evtLogEn'
@Field static final String sDBGLOGEN      = 'dbgLogEn'
@Field static final String sDBG           = 'debug'
@Field static final String sUPD           = 'update'
@Field static final String sEVTUPD        = 'EventUpdate'
@Field static final String sAPPJSON       = 'application/json'
@Field static final String sSUCC          = 'Success'
@Field static final String sATK           = 'accessToken'
//@Field static final String sMEDIUM        = 'medium'
@Field static final String sSMALL         = 'small'
@Field static final String sCLR4D9        = '#2784D9'
@Field static final String sCLR9B1        = '#0299B1'
@Field static final String sCLRRED        = 'red'
//@Field static final String sCLRRED2       = '#cc2d3b'
@Field static final String sCLRGRY        = 'gray'
//@Field static final String sCLRGRN        = 'green'
//@Field static final String sCLRGRN2       = '#43d843'
@Field static final String sCLRORG        = 'orange'
@Field static final String sTTM           = 'Tap to modify...'
@Field static final String sTTC           = 'Tap to configure...'
//@Field static final String sTTP           = 'Tap to proceed...'
@Field static final String sTTV           = 'Tap to view...'
@Field static final String sTTS           = 'Tap to select...'
//@Field static final String sPOST = 'Post'
@Field static final String sASYNCCR = 'asyncHttpCmdResp'
@Field static final String sLASTWU  = 'lastwebCoREUpdDt'
@Field static final String sINFO  = 'info'
@Field static final String sCMD  = 'command'
@Field static final String sCAP_SW  = 'capability.switch'
@Field static final String sSW  = 'switch'

@Field static final Integer iZ  = 0
@Field static final Integer i1  = 1

// IN-MEMORY VARIABLES (Cleared only on HUB REBOOT)

@Field static final Map<String,List<String>> ignoreListFLD =  [
    commands: [
        'ping',  // healthCheck
        'indicatorNever', 'indictorWhenOff', 'indicatorWhenOn', // Indicator
        'startLevelChange', 'stopLevelChange',    // ChangeLevel
        'release', // releaseableButton
        'initialize', // Initialize
        'setEffect', 'setNextEffect', 'setPreviousEffect', // LightEffects
        'configure', 'refresh', 'poll', // Configuration, Refresh, Polling

        'reset', 'childOff', 'childOn', 'childRefresh', 'childSetLevel', 'componentOff',
        'componentOn', 'componentRefresh', 'componentSetColor', 'componentSetColorTemperature', 'componentSetLevel',
        'setAssociationGroup', 'setConfigParameter', 'setIndicator', 'stopNotification',
        'startNotification',
    ],
    attributes: [  // standard attributes that are being ignored
        'checkInterval',     // healthCheck
        'indicatorStatus',   // Indicator
        'ultravioletIndex',  // UltravioletIndex
        'colorMode',         // ColorMode
        'voltage', 'frequency', // VoltageMeasurement
        'power', // powerMeter
        'energy', // energyMeter
        'threeAxis', // threeAxis
        'numberOfButtons', // pushableButton
        'released', // releaseableButton
        'effectName', 'lightEffects', // LightEffects
        'lqi', 'rssi', // SignalStrength
        'RGB', 'colorName', // ColorControl
        'supportedFanSpeeds', // FanControl
        'lockCodes', 'maxCodes', 'codeChanged', 'codeLength', // LockCodes
    ],
    evt_attributes: [  // custom attributes to ignore
        'DeviceWatch-DeviceStatus', 'DeviceWatch-Status', 'DeviceWatch-Enroll', 'devTypeVer', 'dayPowerAvg', 'apiStatus', 'yearCost', 'yearUsage','monthUsage', 'monthEst', 'weekCost', 'todayUsage',
        'maxCodeLength', 'readingUpdated', 'maxEnergyReading', 'monthCost', 'maxPowerReading', 'minPowerReading', 'monthCost', 'weekUsage', 'minEnergyReading',
        'codeReport', 'scanCodes', 'verticalAccuracy', 'horizontalAccuracyMetric', 'altitudeMetric', 'latitude', 'distanceMetric', 'closestPlaceDistanceMetric',
        'closestPlaceDistance', 'leavingPlace', 'currentPlace', 'healthStatus', 'horizontalAccuracy', 'bearing', 'speedMetric',
        'verticalAccuracyMetric', 'altitude', 'todayCost', 'longitude', 'distance', 'previousPlace','closestPlace', 'places', 'minCodeLength',
        'arrivingAtPlace', 'lastUpdatedDt', 'scheduleType', 'zoneStartDate', 'zoneElapsed', 'zoneDuration', 'watering', 'eventTime', 'eventSummary', 'endOffset', 'startOffset',
        'closeTime', 'endMsgTime', 'endMsg', 'openTime', 'startMsgTime', 'startMsg', 'calName', 'deleteInfo', 'eventTitle', 'floor', 'sleeping',
        'LchildVer', 'FchildVer', 'LchildCurr', 'FchildCurr', 'lightStatus', 'lastFanMode', 'lightLevel', 'coolingSetpointRange', 'heatingSetpointRange', 'thermostatSetpointRange',
        'locationForURL', 'location', 'offsetNotify', 'lastActivity', 'firmware', 'groups', 'lastEvent', 'hysteresis', 'armingIn',
        'batteryType', 'deviceType', 'driverVersionInternal', 'outletSwitchable', 'outputVoltageNominal', 'deviceModel', 'driverVersion', 'status', 'deviceModel', 'deviceManufacturer',
        'deviceFirmware', 'outletDescription', 'driverName', 'batteryRuntimeSecs', 'outputFrequency', 'outputFrequencyNominal', 'driverVersionData', 'deviceNominalPower', 'load',
        'firmware0', 'firmware1', 'lastCodeName',
        'shadeLevel', 'supportedWindowShadeCommands',
        // nest thermostat items
        'canCool', 'canHeat', 'etaBegin', 'hasAuto', 'hasFan', 'hasLeaf', 'heatingSetpointMax', 'heatingSetpointMin', 'lockedTempMax', 'lockedTempMine', 'nestPresence', 'nestThermostatMode', 'nestOperatingState', 'nestType', 'pauseUpdates', 'previousthermostatMode', 'sunlightCorrectionActive', 'sunlightCorrectionEnabled', 'supportedNestThermostatModes', 'tempLockOn', 'temperatureUnit', 'thermostatSetpointMax', 'thermostatSetpointMin', 'timeToTarget', 'coolingSetpointMin', 'coolingSetpointMax',
        // nest protect items
        'alarmState', 'apiStatus', 'batteryState', 'isTesting', 'lastConnection', 'lastTested', 'nestSmoke', 'nestCarbonMonoxide', 'onlineStatus',
        'powerSourceNest', 'softwareVer', 'uiColor',
        // nest camera
        'audioInputEnabled', 'imageUrl', 'imageUrlHtml', 'isStreaming', 'lastEventEnd', 'lastEventStart', 'lastEventType', 'lastOnlineChange', 'motionPerson', 'publicShareEnabled', 'publicShareUrl', 'videoHistoryEnabled',
        // tankUtility
        'lastreading',
        // intesisHome
        'iFanSpeed', 'ihvvane', 'ivvane', 'online', 'currentConfigCode', 'currentTempOffset', 'currentemitterPower', 'currentsurroundIR', 'swingMode',
        'hubMeshDisabled'
    ],
    capabilities: [
        'HealthCheck', 'Indicator', 'WindowShadePreset', 'ChangeLevel', 'Outlet', 'UltravioletIndex', 'ColorMode', 'VoltageMeasurement', 'PowerMeter', 'EnergyMeter', 'ThreeAxis',
        'ReleasableButton', //'PushableButton', 'HoldableButton', 'DoubleTapableButton',
        'Initialize', 'LightEffects', 'SignalStrength', 'Configuration',
    ]
]

def startPage() {
    if (!getAccessToken()) { return dynamicPage(name: 'mainPage', install: false, uninstall: true) {
        section() { paragraph spanSmBldBr('OAuth Error', sCLRRED) + spanSmBld("OAuth is not Enabled for ${app?.getName()}!.<br><br>Please click remove and Enable Oauth under the Hubitat App Settings in the App Code page.") } }
    } else {
        if (!state.installData) { state.installData = [initVer: appVersionFLD, dt: getDtNow(), updatedDt: getDtNow(), shownDonation: false] }
        healthCheck(true)
        if (showChgLogOk()) { return changeLogPage() }
        if (showDonationOk()) { return donationPage() }
        return mainPage()
    }
}

@Field static List<String> ListVars

static void FILL_ListVars(){
    if(!ListVars){
        List<String> items
        items = deviceSettingKeys().collect { (String)it.key }
        items = items + virtSettingKeys().collect { (String)it.key }
        ListVars= items
    }
}

def mainPage() {
    FILL_ListVars()
    Boolean isInst = ((Boolean)state.isInstalled == true)
    if (bgtSetting('enableWebCoRE') && !webCoREFLD) { webCoRE_init() }
    // return dynamicPage(name: 'mainPage', nextPage: (isInst ? 'confirmPage' : sBLANK), install: !isInst, uninstall: true) {
    return dynamicPage(name: 'mainPage', nextPage: sBLANK, install: true, uninstall: true) {
        appInfoSect()
        section(sectHead('Device Configuration:')) {
            List tl
            Boolean conf; conf=false
            for (String m in ListVars){
                if(!conf){
                    tl = LgtSetting(m)
                    if(conf || tl.size()) { conf=true }
                }
            }
            String desc; desc= sNULL
            Integer devCnt = getDeviceCnt()
            if (conf) {
                //static Map<String,String> fanSettingKeys() {
                Integer fansize; fansize=iZ
                List<String> items
                items = fanSettingKeys().collect { (String)it.key }
                items.each { String item ->
                    List si= LgtSetting(item)
                    fansize += si.size()
                }

                Integer sz
                String s
                Map<String,String> akeys = deviceSettingKeys() + virtSettingKeys()
                items= []+ListVars - items //fanSettingKeys()
                desc  = sBLANK
                items.each { String item ->
                    tl= LgtSetting(item)
                    sz= tl.size()
                    s= sz > i1 ? akeys[item] : akeys[item].replace('Devices','Device')
                    desc += sz > iZ ? spanSmBld(s) + spanSmBr(" (${sz})") : sBLANK
                }
                desc += fansize > iZ ? spanSmBld("Fan Device${fansize > i1 ? 's' : sBLANK}") + spanSmBr(" (${fansize})") : sBLANK
                desc += bgtSetting('addSecurityDevice') ? spanSmBld('HSM') + spanSmBr(' (1)') : sBLANK
                desc += htmlLine(sCLR4D9, 150)
                desc += spanSmBld('Devices Selected:')  + spanSmBr(" (${devCnt})")
                desc += (devCnt > 149) ? lineBr() + spanSmBld('NOTICE: ', sCLRRED) + spanSmBr('Homebridge only allows 149 Devices per HomeKit Bridge!!!', sCLRRED) : sBLANK
                desc += inputFooter(sTTM)
            }
            href 'deviceSelectPage', title: inTS1('Device Selection', 'devices2'), required: false, description: (desc ? spanSm(desc, sCLR4D9) : inputFooter('Tap to select devices...', sCLRGRY, true))
        }

        inputDupeValidation()

        section(sectHead('Capability Filtering:')) {
            String filterDesc = getFilterDesc()
            href 'capFilterPage', title: inTS1('Filter out capabilities from your devices', 'filter'), description: filterDesc + (capFiltersSelected() ? inputFooter(sTTM, sCLR4D9) : inputFooter(sTTC, sCLRGRY, true)), required: false
        }

        section(sectHead('Location Options:')) {
            input 'addSecurityDevice', sBOOL, title: inTS1("Allow ${getAlarmSystemName()} Control in HomeKit?", 'alarm_home'), required: false, defaultValue: true, submitOnChange: true
        }

        section(sectHead('HomeBridge Plugin:')) {
            String pluginStatus = getPluginStatusDesc()
            href 'pluginConfigPage', style: 'embedded', required: false, title: inTS1('Generate Config for HomeBridge', sINFO), description: pluginStatus + inputFooter(sTTV, sCLRGRY, true)
        }

        section(sectHead('History Data and Device Debug:')) {
            href 'historyPage', title: inTS1('View Command and Event History', 'backup'), description: inputFooter(sTTV, sCLRGRY, true)
            href 'deviceDebugPage', title: inTS1('View Device Debug Data', sDBG), description: inputFooter(sTTV, sCLRGRY, true)
        }

        section(sectHead('App Preferences:')) {
            String sDesc = getSetDesc()
            href 'settingsPage', title: inTS1('App Settings', 'settings'), description: sDesc
            href 'changeLogPage', title: inTS1('View Changelog', 'change_log'), description: inputFooter(sTTV, sCLRGRY, true)
            label title: inTS1('Label this Instance (optional)', 'name_tag'), description: 'Rename this App', defaultValue: app?.name, required: false
        }

        if (devMode()) {
            section(sectHead('Dev Mode Options')) {
                input 'sendViaNgrok', sBOOL, title: inTS1('Communicate with Plugin via Ngrok Http?', sCMD), defaultValue: false, submitOnChange: true
                if (bgtSetting('sendViaNgrok')) { input 'ngrokHttpUrl', 'text', title: inTS1('Enter the ngrok code from the url'), required: true, submitOnChange: true }
            }
            section(sectHead('Other Settings:')) {
                input 'restartService', sBOOL, title: inTS1('Restart Homebridge plugin when you press Save?', 'reset'), required: false, defaultValue: false, submitOnChange: true
            }
        }
        if(isInst) {
            section(sectHead('Save Your Settings')) {
                paragraph spanSmBldBr('NOTICE:', sCLRGRY) + spanSm('Once you press <b>Done</b> the Homebridge plugin will refresh your device changes after 15-20 seconds.')
            }
            appFooter()
        }
        clearTestDeviceItems()
    }
}

def pluginConfigPage() {
    return dynamicPage(name: 'pluginConfigPage', title: sBLANK, install: false, uninstall: false) {
        section(sectHead('Plugin Communication Options:')) {
            input 'consider_fan_by_name',   sBOOL, title: inTS1('Use the word Fan in device name to determine if device is a Fan?', sCMD), required: false, defaultValue: true, submitOnChange: true
            input 'consider_light_by_name', sBOOL, title: inTS1('Use the word Light in device name to determine if device is a Light?', sCMD), required: false, defaultValue: false, submitOnChange: true
            input 'use_cloud_endpoint',     sBOOL, title: inTS1('Communicate with Plugin Using Cloud Endpoint?', sCMD), required: false, defaultValue: false, submitOnChange: true
            input 'validate_token',         sBOOL, title: inTS1('Validate AppID & Token for All Communications?', sCMD), required: false, defaultValue: false, submitOnChange: true
            input 'round_levels',           sBOOL, title: inTS1('Round Levels <5% to 0% and >95% to 100%?', sCMD), required: false, defaultValue: true, submitOnChange: true
            input 'temp_unit',              sENUM, title: inTS1('Temperature Unit?', 'temp_unit'), required: true, defaultValue: location?.temperatureScale, options: ['F':'Fahrenheit', 'C':'Celcius'], submitOnChange: true
            // input 'polling_seconds',        number, title: inTS1('Plugin Polls Hubitat for Updates (in Seconds)?', sCMD), required: false, defaultValue: 3600, submitOnChange: true
        }

        section(sectHead('HomeKit Adaptive Lighting')) {
            String url = 'https://www.howtogeek.com/712520/how-to-use-adaptive-lighting-with-apple-homekit-lights/#:~:text=The%20Adaptive%20Lighting%20feature%20was,home%20lights%20throughout%20the%20day.'
            href url: url, style: 'external', title: inTS1('What is Adaptive Lighting?', sINFO), description: inputFooter('Tap to open in browser', sCLRGRY, true)
            input 'adaptive_lighting',  sBOOL, title: inTS1('Allow Supported Bulbs to Use HomeKit Adaptive Lighting?', sCMD), required: false, defaultValue: true, submitOnChange: true
            if (bgtSetting('adaptive_lighting')) {
                input 'adaptive_lighting_offset', 'number', title: inTS1('Adaptive Lighting - Offset ColorTemp Conversions by +/- Mireds?', sCMD), range: '-100..100', required: false, defaultValue: iZ, submitOnChange: true
            }
        }

        // section(sectHead("Plugin Device Options:")) {
        //     input "round_up_99", sBOOL, title: inTS1("Round Up Devices with 9?", sCMD)), required: false, defaultValue: false, submitOnChange: true
        //     input "temp_unit",          sENUM, title: inTS1("Temperature Unit?", "temp_unit")), required: true, defaultValue: location?.temperatureScale, options: ["F":"Fahrenheit", "C":"Celcius"], submitOnChange: true
        //     input "validate_token",     sBOOL, title: inTS1("Validate AppID & Token for All Communications?", sCMD)), required: false, defaultValue: false, submitOnChange: true
        // }

        section(sectHead('Generated HomeBridge Plugin Platform Config')) {
            paragraph divSm("<textarea rows=23 class='mdl-textfield' readonly='true'>${renderConfig()}</textarea>")
        }

        section(sectHead('Test Communication with Plugin')) {
            String url = "http://${getServerAddress()}/pluginTest"
            href url: url, style: 'external', title: inTS1('Test Plugin Communication?', sINFO), description: inputFooter('Tap to open in browser', sCLRGRY, true)
        }
    }
}

String getPluginStatusDesc() {
    String out; out = sBLANK
    Map pluginDetails = state.pluginDetails ?: [:]
    if(pluginDetails && pluginDetails.keySet().size() > iZ) {
        out += spanSmBld('Use cloud endpoint:', sCLRGRY) + spanSmBr(" ${bgtSetting('use_cloud_endpoint')}", sCLRGRY)
        out += pluginDetails.directIP && pluginDetails.directPort ? spanSmBld('Plugin Server:', sCLRGRY) + spanSmBr(" ${pluginDetails.directIP}:${pluginDetails.directPort}", sCLRGRY) : sBLANK
        out += spanSmBld('Adaptive Lighting:', sCLRGRY) + spanSmBr(" ${bdfltgtSetting('adaptive_lighting')}", sCLRGRY)
        out += spanSmBld('Round Levels:', sCLRGRY) + spanSmBr(" ${bdfltgtSetting('round_levels')}", sCLRGRY)
        out += pluginDetails.version ? spanSmBld('Plugin Version:', sCLRGRY) + spanSmBr(" v${pluginDetails.version}", sCLRGRY) : sBLANK
        out += spanBr(" ")
    }
    return out
}

static def deviceValidationErrors() {
    /*
        NOTE: Define what we require to determine the thermostat is a thermostat so we can support devices like Flair which are custom heat-only thermostats.
    */
    Map reqs = [
        tstat: [ c:['Thermostat Operating State'], a: [r: ['thermostatOperatingState'], o: ['heatingSetpoint', 'coolingSetpoint']] ],
        tstat_heat: [
            c: ['Thermostat Operating State'],
            a: [
                r: ['thermostatOperatingState', 'heatingSetpoint'],
                o: []
            ]
        ]
    ]

    // if(tstatHeatList || tstatList || tstatFanList) {}
    return reqs
}

def deviceSelectPage() {
    return dynamicPage(name: 'deviceSelectPage', title: sBLANK, install: false, uninstall: false) {
        section(sectHead('Define Specific Categories:')) {
            paragraph spanSmBldBr('Description:', sCLR4D9) + spanSm('Each category below will adjust the device attributes to make sure they are recognized as the desired device type under HomeKit', sCLR4D9)
            paragraph spanSmBldBr('NOTE: ') + spanSmBldBr('Please do not select a device more than once in the inputs below')

            input 'lightList', sCAP_SW, title: inTS1("Lights: (${lightList ? lightList.size() : iZ} Selected)", 'light_on'), description: inputFooter(sTTS, sCLRGRY, true), multiple: true, submitOnChange: true, required: false
            input 'outletList', sCAP_SW, title: inTS1("Outlets: (${outletList ? outletList.size() : iZ} Selected)", 'outlet'), description: inputFooter(sTTS, sCLRGRY, true), multiple: true, submitOnChange: true, required: false
            input 'lightNoAlList', sCAP_SW, title: inTS1("Lights (No Adaptive Lighting): (${lightNoAlList ? lightNoAlList.size() : iZ} Selected)", 'light_on'), description: inputFooter(sTTS, sCLRGRY, true), multiple: true, submitOnChange: true, required: false
            input 'garageList', 'capability.garageDoorControl', title: inTS1("Garage Doors: (${garageList ? garageList.size() : iZ} Selected)", 'garage_door'), description: inputFooter(sTTS, sCLRGRY, true), multiple: true, submitOnChange: true, required: false
            input 'speakerList', sCAP_SW, title: inTS1("Speakers: (${speakerList ? speakerList.size() : iZ} Selected)", 'media_player'), description: inputFooter(sTTS, sCLRGRY, true), multiple: true, submitOnChange: true, required: false
            input 'shadesList', 'capability.windowShade', title: inTS1("Window Shades: (${shadesList ? shadesList.size() : iZ} Selected)", 'window_shade'), description: inputFooter(sTTS, sCLRGRY, true), multiple: true, submitOnChange: true, required: false
            input 'securityKeypadsList', 'capability.securityKeypad', title: inTS1("Security Keypads: (${securityKeypadsList ? securityKeypadsList.size() : iZ} Selected)", 'devices2'), description: inputFooter(sTTS, sCLRGRY, true), multiple: true, submitOnChange: true, required: false
        }
        section(sectHead("Buttons:")) {
            input "pushableButtonList", "capability.pushableButton", title: inTS1("Pushable Buttons: (${pushableButtonList ? pushableButtonList.size() : iZ} Selected)", "button"), description: inputFooter(sTTS, sCLRGRY, true), multiple: true, submitOnChange: true, required: false
            input "holdableButtonList", "capability.holdableButton", title: inTS1("Holdable Buttons: (${holdableButtonList ? holdableButtonList.size() : iZ} Selected)", "button"), description: inputFooter(sTTS, sCLRGRY, true), multiple: true, submitOnChange: true, required: false
            input "doubleTapableButtonList", "capability.doubleTapableButton", title: inTS1("Double Tapable Buttons: (${doubleTapableButtonList ? doubleTapableButtonList.size() : iZ} Selected)", "button"), description: inputFooter(sTTS, sCLRGRY, true), multiple: true, submitOnChange: true, required: false
        }

        section(sectHead('Fans:')) {
            input 'fanList', sCAP_SW, title: inTS1("Fans: (${fanList ? fanList.size() : iZ} Selected)", 'fan_on'), description: inputFooter(sTTS, sCLRGRY, true), multiple: true, submitOnChange: true, required: false
            input 'fan3SpdList', sCAP_SW, title: inTS1("Fans (3 Speeds): (${fan3SpdList ? fan3SpdList.size() : iZ} Selected)", 'fan_on'), description: inputFooter(sTTS, sCLRGRY, true), multiple: true, submitOnChange: true, required: false
            input 'fan4SpdList', sCAP_SW, title: inTS1("Fans (4 Speeds): (${fan4SpdList ? fan4SpdList.size() : iZ} Selected)", 'fan_on'), description: inputFooter(sTTS, sCLRGRY, true), multiple: true, submitOnChange: true, required: false
            input 'fan5SpdList', sCAP_SW, title: inTS1("Fans (5 Speeds): (${fan5SpdList ? fan5SpdList.size() : iZ} Selected)", 'fan_on'), description: inputFooter(sTTS, sCLRGRY, true), multiple: true, submitOnChange: true, required: false
        }

        section(sectHead('Thermostats:')) {
            input 'tstatList', 'capability.thermostat', title: inTS1("Thermostats: (${tstatList ? tstatList.size() : iZ} Selected)", 'thermostat'), description: inputFooter(sTTS, sCLRGRY, true), multiple: true, submitOnChange: true, required: false
            input 'tstatFanList', 'capability.thermostat', title: inTS1("Thermostats + Fan: (${tstatFanList ? tstatFanList.size() : iZ} Selected)", 'thermostat'), description: inputFooter(sTTS, sCLRGRY, true), multiple: true, submitOnChange: true, required: false
            input 'tstatHeatList', 'capability.thermostat', title: inTS1("Heat Only Thermostats: (${tstatHeatList ? tstatHeatList.size() : iZ} Selected)", 'thermostat'), description: inputFooter(sTTS, sCLRGRY, true), multiple: true, submitOnChange: true, required: false
        }

        section(sectHead('All Other Devices:')) {
            input 'sensorList', 'capability.sensor', title: inTS1("Sensors: (${sensorList ? sensorList.size() : iZ} Selected)", 'sensors'), description: inputFooter(sTTS, sCLRGRY, true), multiple: true, submitOnChange: true, required: false
            input 'switchList', sCAP_SW, title: inTS1("Switches: (${switchList ? switchList.size() : iZ} Selected)", sSW), description: inputFooter(sTTS, sCLRGRY, true), multiple: true, submitOnChange: true, required: false
            input 'deviceList', 'capability.*', title: inTS1("Others: (${deviceList ? deviceList.size() : iZ} Selected)", 'devices2'), description: inputFooter(sTTS, sCLRGRY, true), multiple: true, submitOnChange: true, required: false
        }

        section(sectHead('Create Devices for Modes in HomeKit?')) {
            paragraph spanSmBldBr('What are these for?', sCLRGRY) + spanSm("Creates a virtual device for selected modes in HomeKit.<br> ${sBULLET} The switch will be ON when that mode is active.", sCLRGRY)
            List modes = ((List)location?.getModes())?.sort { it?.name }?.collect { [(it?.id):it?.name] }
            input 'modeList', sENUM, title: inTS1('Create Devices for these Modes', 'mode'), required: false, description: inputFooter(sTTS, sCLRGRY, true), multiple: true, options: modes, submitOnChange: true
        }

        section(sectHead('Create Devices for WebCoRE Pistons in HomeKit?')) {
            input 'enableWebCoRE', sBOOL, title: inTS1('Enable webCoRE Integration', webCore_icon()), required: false, defaultValue: false, submitOnChange: true
            if (bgtSetting('enableWebCoRE')) {
                if (!webCoREFLD) { webCoRE_init() }
                paragraph spanSmBldBr('What are these for?', sCLRGRY) + spanSm("Creates a virtual device for selected pistons in HomeKit.<br> ${sBULLET} These are useful for use in Home Kit scenes", sCLRGRY)
                List<Map> pistons = webCoRE_list()
                input 'pistonList', sENUM, title: inTS1('Create Devices for these Pistons', webCore_icon()), required: false, description: inputFooter(sTTS, sCLRGRY, true), multiple: true, options: pistons, submitOnChange: true
            } else { webCoREFLD = [:]; unsubscribe(webCoRE_handle());  remTsVal(sLASTWU) }
        }
        inputDupeValidation()
    }
}

def settingsPage() {
    return dynamicPage(name: 'settingsPage', title: sBLANK, install: false, uninstall: false) {
        section(sectHead('Logging:')) {
            input 'showCmdLogs', sBOOL, title: inTS1('Show Command Events?', sDBG), required: false, defaultValue: true, submitOnChange: true
            input 'showEventLogs', sBOOL, title: inTS1('Show Device/Location Events? (Turns Off After 2 hours)', sDBG), required: false, defaultValue: true, submitOnChange: true
            input 'showDebugLogs', sBOOL, title: inTS1('Show Detailed Logging? (Turns Off After 2 hours)', sDBG), required: false, defaultValue: false, submitOnChange: true
        }
        section(sectHead('Security:')) {
            paragraph spanSmBldBr('Description:', sCLRGRY) + spanSm('This will allow you to clear you existing app accessToken and force a new one to be created.<br>You will need to update the homebridge config with the new token in order to continue using hubitat with HomeKit', sCLRGRY)
            input 'resetAppToken', sBOOL, title: inTS1('Revoke and Recreate App Access Token?', 'reset'), defaultValue: false, submitOnChange: true
            if (bgtSetting('resetAppToken')) { settingUpdate('resetAppToken', sFALSE, sBOOL); resetAppToken() }
        }
    }
}

private void resetAppToken() {
    logWarn('resetAppToken | Current Access Token Removed...')
    state.remove('accessToken')
    if (getAccessToken()) {
        logInfo('resetAppToken | New Access Token Created...')
    }
    remTsVal(sSVR)
}

private void resetCapFilters() {
    List<String> remKeys = ((Map<String,Object>)settings).findAll { ((String)it.key).startsWith('remove') }.collect { (String)it.key }
    if (remKeys?.size() > iZ) {
        remKeys.each { String k->
            settingRemove(k)
        }
    }
}

private Boolean capFiltersSelected() {
    return ( ((Map<String,Object>)settings).findAll { ((String)it.key).startsWith('remove') && it.value }.collect { (String)it.key })?.size() > iZ
}

private String getFilterDesc() {
    String desc; desc = sBLANK
    List<String> remKeys = ((Map<String,Object>)settings).findAll { ((String)it.key).startsWith('remove') && it.value != null }.collect { (String)it.key }
    if (remKeys?.size()) {
        remKeys.sort().each { String k->
            String capName = k.replaceAll('remove', sBLANK)
            Integer capSize = settings[k]?.size()
            desc += spanSmBr("${capName}: (${capSize}) Device(s)", sCLR4D9)
        }
    }
    return desc
}

private void inputDupeValidation() {
    Map<String,Map<String,List>> clnUp = ['d': [:], 'o': [:]]
    Map<String,String> dMap
    dMap = [:] + deviceSettingKeys()
    dMap.remove('pushableButtonList'); dMap.remove('holdableButtonList'); dMap.remove('doubleTapableButtonList')
    dMap.remove('deviceList'); dMap.remove('sensorList'); dMap.remove('switchList')
    Map<String,Map<String,String>> items = [
        d: dMap,
        o: ['deviceList': 'Other', 'sensorList': 'Sensor', 'switchList': 'Switch']
    ]
    items.d.each { String k, String v->
        List priItems = (settings."${k}"?.size()) ? settings."${k}"?.collect { (String)it?.getDisplayName() } : null
        if (priItems && priItems.size()) {
            items.d.each { String k2, String v2->
                List secItems = (settings."${k2}"?.size()) ? settings."${k2}"?.collect { (String)it?.getDisplayName() } : null
                if (k != k2 && secItems) {
                    secItems?.retainAll(priItems)
                    if (secItems?.size()) {
                        clnUp.d[k2] = clnUp?.d[k2] ?: []
                        clnUp.d[k2] = (clnUp?.d[k2] + secItems)?.unique()
                    }
                }
            }

            items.o.each { String k2, String v2->
                List secItems = (settings."${k2}"?.size()) ? settings."${k2}"?.collect { (String) it?.getDisplayName() } : null
                if (secItems) {
                    secItems?.retainAll(priItems)
                    if (secItems?.size()) {
                        clnUp.o[k2] = clnUp?.o[k2] ?: []
                        clnUp.o[k2] = (clnUp?.o[k2] + secItems)?.unique()
                    }
                }
            }
        }
    }
    String out; out = sBLANK
    Boolean show,first
    show = false
    first = true
    if (clnUp.d.size() > iZ) {
        show = true
        clnUp.d.each { String k, List v->
            out += (first ? sBLANK : lineBr()) + spanBldBr("${items?.d[k]}:")
            out += spanBr(v.collect { " ${sBULLET} " + it.toString() }?.join(sLINEBR))
            first = false
        }
    }
    if (clnUp.o.size() > iZ) {
        show = true
        clnUp.o.each { String k, List v->
            out += (first ? sBLANK : lineBr()) + spanBldBr("${items?.o[k]}:")
            out += spanBr(v.collect { " ${sBULLET} " + it.toString() }?.join(sLINEBR))
            first = false
        }
    }
    if (show && out) {
        section(sectHead('Duplicate Device Validation:')) {
            paragraph spanBldBr('These Inputs Contain the Same Devices:', sCLRRED) + spanSmBr(out, sCLRRED) + spanSmBld('Please remove these duplicate items!', sCLRRED)
        }
    }
}

String getSetDesc() {
    List s = []
    if (bgtSetting('showEventLogs') || bdfltgtSetting('showEventLogs',true)) s.push("${sBULLET} Device Event Logging")
    if (bgtSetting('showCmdLogs') || bdfltgtSetting('showCmdLogs',true)) s.push("${sBULLET} Command Event Logging")
    if (bgtSetting('showDebugLogs')) s.push("${sBULLET} Debug Logging")
    return s.size() > iZ ? spanSmBr("${s.join('<br>')}", sCLR4D9) + inputFooter(sTTM, sCLR4D9) : inputFooter(sTTC, sCLRGRY, true)
}

def historyPage() {
    return dynamicPage(name: 'historyPage', title: sBLANK, install: false, uninstall: false) {
        List<Map> cHist = getCmdHistory()?.sort { (Long)it.gt }?.reverse()
        List<Map> eHist = getEvtHistory()?.sort { (Long)it.gt }?.reverse()
        section() {
            paragraph spanSmBldBr('Notice:', sCLRGRY, sINFO) + spanSm('This history is only stored in memory.  It is erased after every code update and Hub reboot.', sCLRGRY)
        }
        section(sectHead("Last (${cHist.size()}) Commands Received From HomeKit:")) {
            if (cHist.size() > iZ) {
                cHist.each { Map c ->
                    List hList = []
                    hList.push([name: 'Device:', val: c?.data?.device])
                    hList.push([name: 'Command:', val: c?.data?.cmd])
                    if (c?.data?.value1) hList.push([name: 'Value1:', val: c?.data?.value1])
                    if (c?.data?.value2) hList.push([name: 'Value2:', val: c?.data?.value2])
                    if (c?.data?.execTime) hList.push([name: 'ExecTime:', val: "${c?.data?.execTime}ms"])
                    hList.push([name: 'Date:', val: c.dt])
                    if (hList.size()) { paragraph kvListToHtmlTable(hList, sCLR4D9) }
                }
            } else { paragraph spanSm('No Command History Found...', sCLRGRY) }
        }
        section(sectHead("Last (${eHist.size()}) Events Sent to HomeKit:")) {
            if (eHist.size() > iZ) {
                eHist.each { Map h->
                    List hList = []
                    hList.push([name: 'Device:', val: h?.data?.device])
                    hList.push([name: 'Event:', val: h?.data?.name])
                    if (h?.data?.value) hList.push([name: 'Value:', val: h?.data?.value])
                    if (h?.data?.execTime) hList.push([name: 'ExecTime:', val: "${h?.data?.execTime}ms"])
                    if (hList.size()) { paragraph spanSmBldBr((String)h.dt, sCLR4D9) + kvListToHtmlTable(hList, sCLR4D9) }
                }
            } else { paragraph spanSm('No Event History Found...', sCLRGRY) }
        }
    }
}

private static String kvListToHtmlTable(List tabList, String color=sCLRGRY) {
    String str; str = sBLANK
    if (tabList?.size()) {
        str += "<table style='border: 1px solid ${color};border-collapse: collapse;'>"
        tabList.each { it->
            str += "<tr style='border: 1px solid ${color};'><td style='border: 1px solid ${color};padding: 0px 3px 0px 3px;'>${spanSmBld((String)it.name)}</td><td style='border: 1px solid ${color};padding: 0px 3px 0px 3px;'>${spanSmBr("${it.val}")}</td></tr>"
        }
        str += '</table>'
    }
    return str
}

def capFilterPage() {
    return dynamicPage(name: 'capFilterPage', title: 'Capability Filtering', install: false, uninstall: false) {
        section(sectHead('Restrict Temp Device Creation')) {
            input 'noTemp', sBOOL, title: inTS1('Remove Temperature from All Contacts and Water Sensors?', 'temperature'), required: false, defaultValue: false, submitOnChange: true
            if (bgtSetting('noTemp')) {
                input 'sensorAllowTemp', 'capability.sensor', title: inTS1('Allow Temps on these sensors', 'temperature'), description: inputFooter(sTTS, sCLRGRY, true), multiple: true, submitOnChange: true, required: false
            }
        }
        section(sectHead('Remove Capabilities from Sensor Devices')) {
            paragraph spanSmBldBr('Description:', sCLRGRY) + spanSm('These inputs will remove specific capabilities from a device preventing the addition of unwanted characteristics in devices under HomeKit', sCLRGRY)
            input 'removeAcceleration', 'capability.accelerationSensor', title: inTS1('Remove Acceleration from these Devices', 'acceleration'), description: inputFooter(sTTS, sCLRGRY, true), multiple: true, submitOnChange: true, required: false
            input 'removeBattery', 'capability.battery', title: inTS1('Remove Battery from these Devices', 'battery'), description: inputFooter(sTTS, sCLRGRY, true), multiple: true, submitOnChange: true, required: false
            input 'removeContact', 'capability.contactSensor', title: inTS1('Remove Contact from these Devices', 'contact'), description: inputFooter(sTTS, sCLRGRY, true), multiple: true, submitOnChange: true, required: false
            // input "removeEnergy", "capability.energyMeter", title: inTS1("Remove Energy Meter from these Devices", "power"), description: inputFooter(sTTS, sCLRGRY, true), multiple: true, submitOnChange: true, required: false
            input 'removeHumidity', 'capability.relativeHumidityMeasurement', title: inTS1('Remove Humidity from these Devices', 'humidity'), description: inputFooter(sTTS, sCLRGRY, true), multiple: true, submitOnChange: true, required: false
            input 'removeIlluminance', 'capability.illuminanceMeasurement', title: inTS1('Remove Illuminance from these Devices', 'illuminance'), description: inputFooter(sTTS, sCLRGRY, true), multiple: true, submitOnChange: true, required: false
            input 'removeMotion', 'capability.motionSensor', title: inTS1('Remove Motion from these Devices', 'motion'), description: inputFooter(sTTS, sCLRGRY, true), multiple: true, submitOnChange: true, required: false
            // input "removePower", "capability.powerMeter", title: inTS1("Remove Power Meter from these Devices", "power"), description: inputFooter(sTTS, sCLRGRY, true), multiple: true, submitOnChange: true, required: false
            input 'removePresence', 'capability.presenceSensor', title: inTS1('Remove Presence from these Devices', 'presence'), description: inputFooter(sTTS, sCLRGRY, true), multiple: true, submitOnChange: true, required: false
            input 'removeTamper', 'capability.tamperAlert', title: inTS1('Remove Tamper from these Devices', 'tamper'), description: inputFooter(sTTS, sCLRGRY, true), multiple: true, submitOnChange: true, required: false
            input 'removeTemp', 'capability.temperatureMeasurement', title: inTS1('Remove Temperature from these Devices', 'temperature'), description: inputFooter(sTTS, sCLRGRY, true), multiple: true, submitOnChange: true, required: false
            input 'removeWater', 'capability.waterSensor', title: inTS1('Remove Water from these Devices', 'water'), description: inputFooter(sTTS, sCLRGRY, true), multiple: true, submitOnChange: true, required: false
        }

        section(sectHead('Remove Capabilities from Actuator Devices')) {
            paragraph spanSmBldBr('Description:', sCLRGRY) + spanSm('These inputs will remove specific capabilities from a device preventing the addition of unwanted characteristics in devices under HomeKit', sCLRGRY)
            input 'removeColorControl', 'capability.colorControl', title: inTS1('Remove ColorControl from these Devices', 'color'), description: inputFooter(sTTS, sCLRGRY, true), multiple: true, submitOnChange: true, required: false
            input 'removeColorTemperature', 'capability.colorTemperature', title: inTS1('Remove ColorTemperature from these Devices', 'color'), description: inputFooter(sTTS, sCLRGRY, true), multiple: true, submitOnChange: true, required: false
            input 'removeLevel', 'capability.switchLevel', title: inTS1('Remove Level from these Devices', 'speed_knob'), description: inputFooter(sTTS, sCLRGRY, true), multiple: true, submitOnChange: true, required: false
            input 'removeLock', 'capability.lock', title: inTS1('Remove Lock from these Devices', 'lock'), description: inputFooter(sTTS, sCLRGRY, true), multiple: true, submitOnChange: true, required: false
            input 'removeSwitch', sCAP_SW, title: inTS1('Remove Switch from these Devices', sSW), description: inputFooter(sTTS, sCLRGRY, true), multiple: true, submitOnChange: true, required: false
            input 'removeValve', 'capability.valve', title: inTS1('Remove Valve from these Devices', 'valve'), description: inputFooter(sTTS, sCLRGRY, true), multiple: true, submitOnChange: true, required: false
        }

        section(sectHead('Remove Capabilities from Thermostats')) {
            paragraph spanSmBldBr('Description:', sCLRGRY) + spanSm('These inputs allow you to remove certain capabilities from thermostats allowing you to customize your experience in HomeKit (Certain Items may break the Thermostat under HomeKit)', sCLRGRY)
            input 'removeThermostat', 'capability.thermostat', title: inTS1('Remove Thermostat from these Devices', 'thermostat'), description: inputFooter(sTTS, sCLRGRY, true), multiple: true, submitOnChange: true, required: false
            input 'removeThermostatFanMode', 'capability.thermostat', title: inTS1('Remove Thermostat Fan from these Devices', 'thermostat'), description: inputFooter(sTTS, sCLRGRY, true), multiple: true, submitOnChange: true, required: false
            input 'removeThermostatCoolingSetpoint', 'capability.thermostat', title: inTS1('Remove Thermostat Cooling from these Devices', 'thermostat'), description: inputFooter(sTTS, sCLRGRY, true), multiple: true, submitOnChange: true, required: false
            input 'removeThermostatHeatingSetpoint', 'capability.thermostat', title: inTS1('Remove Thermostat Heating from these Devices', 'thermostat'), description: inputFooter(sTTS, sCLRGRY, true), multiple: true, submitOnChange: true, required: false
            input 'removeThermostatMode', 'capability.thermostat', title: inTS1('Remove Thermostat Modes from these Devices', 'thermostat'), description: inputFooter(sTTS, sCLRGRY, true), multiple: true, submitOnChange: true, required: false
        }

        section(sectHead('Remove Capabilities from Buttons')) {
            input "removeHoldableButton", "capability.holdableButton", title: inTS1("Remove Holdable Buttons from these Devices", "button"), description: inputFooter(sTTS, sCLRGRY, true), multiple: true, submitOnChange: true, required: false
            input "removeDoubleTapableButton", "capability.doubleTapableButton", title: inTS1("Remove Double Tapable Buttons from these Devices", "button"), description: inputFooter(sTTS, sCLRGRY, true), multiple: true, submitOnChange: true, required: false
            input "removePushableButton", "capability.pushableButton", title: inTS1("Remove Pushable Buttons from these Devices", "button"), description: inputFooter(sTTS, sCLRGRY, true), multiple: true, submitOnChange: true, required: false
        }

        section(sectHead('Reset Selected Filters:'), hideable: true, hidden: true) {
            input 'resetCapFilters', sBOOL, title: inTS1('Clear All Selected Filters?', 'reset'), required: false, defaultValue: false, submitOnChange: true
            if (settings.resetCapFilters) { settingUpdate('resetCapFilters', sFALSE, sBOOL); resetCapFilters() }
        }
    }
}

def donationPage() {
    return dynamicPage(name: 'donationPage', title: sBLANK, nextPage: 'mainPage', install: false, uninstall: false) {
        section(sBLANK) {
            String str; str = sBLANK
            str += spanSmBldBr('Hello User,') + spanSmBr("Please forgive the interuption but it's been 30 days since you installed/updated this App and I wanted to present you with this one time reminder that donations are accepted (We do not require them).")
            str += spanSmBr("If you have been enjoying the software and devices please remember that we have spent thousand's of hours of our spare time working on features and stability for those applications and devices.")
            str += spanSmBr('If you have already donated, thank you very much for your support!')
            str += spanSmBr('If you are just not interested in donating please ignore this message')
            str += spanSm('Thanks again for using Homebridge Hubitat')
            paragraph divSm(str, sCLRRED)
            input 'sentDonation', sBOOL, title: inTS1('Already Donated?'), defaultValue: false, submitOnChange: true
            href url: textDonateLink(), style: 'external', required: false, title: inTS1('Donations', 'donations'), description: inputFooter('Tap to open in browser', sCLRGRY, true)
        }
        updInstData('shownDonation', true)
    }
}

def confirmPage() {
    return dynamicPage(name: 'confirmPage', title: sBLANK, install: true, uninstall:true) {
        section(sectHead('Confirmation Page')) {
            paragraph spanSmBldBr('NOTICE:', sCLRGRY) + spanSm('The plugin no longer requires a restart to apply device changes in this app to HomeKit.<br><br>Once you press <b>Done</b> the Homebridge plugin will refresh your device changes after 15-20 seconds.')
        }
        appFooter()
    }
}

def deviceDebugPage() {
    return dynamicPage(name: 'deviceDebugPage', title: sBLANK, install: false, uninstall: false) {
        section(sectHead('View All Device Data Sent to HomeBridge:')) {
            href url: getAppEndpointUrl('alldevices'), style: 'external', required: false, title: inTS1('View Device Data Sent to Homebridge...', sINFO), description: sBLANK, disabled: true
        }

        if (devMode()) {
            section(sectHead('TimeStamp Debug Data:')) {
                Map tsMap = tsDtMapFLD[(String)app.getId().toString()] ?: [:]
                paragraph "${tsMap}"
            }
        }

        section(sectHead('View Individual Device Data:')) {
            paragraph spanSmBldBr('NOTICE:', sCLRGRY) + spanSm("Do you have a device that's not working under homekit like you want?<br> ${sBULLET} Select a device from one of the inputs below and it will show you all data about the device.", sCLRGRY)
            if (!debug_switch && !debug_other && !debug_garage && !debug_tstat) {
                input 'debug_sensor', 'capability.sensor', title:  inTS1('Sensors:', 'sensors'), description: inputFooter(sTTS, sCLRGRY, true), multiple: false, submitOnChange: true, required: false
            }
            if (!debug_sensor && !debug_other && !debug_garage && !debug_tstat) {
                input 'debug_switch', 'capability.actuator', title: inTS1('Switches:', sSW), description: inputFooter(sTTS, sCLRGRY, true), multiple: false, submitOnChange: true, required: false
            }
            if (!debug_switch && !debug_sensor && !debug_garage && !debug_tstat) {
                input 'debug_other', 'capability.*', title: inTS1('Others Devices:', 'devices2'), description: inputFooter(sTTS, sCLRGRY, true), multiple: false, submitOnChange: true, required: false
            }
            if (!debug_sensor && !debug_other && !debug_switch && !debug_tstat) {
                input 'debug_garage', 'capability.garageDoorControl', title: inTS1('Garage Doors:', 'garage_door'), description: inputFooter(sTTS, sCLRGRY, true), multiple: false, submitOnChange: true, required: false
            }
            if (!debug_sensor && !debug_other && !debug_switch && !debug_garage) {
                input 'debug_tstat', 'capability.thermostat', title: inTS1('Thermostats:', 'thermostat'), description: inputFooter(sTTS, sCLRGRY, true), multiple: false, submitOnChange: true, required: false
            }
            if (debug_other || debug_sensor || debug_switch || debug_garage || debug_tstat) {
                paragraph spanSmBld('Device Data:', sCLR4D9)
                paragraph divSm("<textarea rows='30' class='mdl-textfield' readonly='true'>${viewDeviceDebug()}</textarea>", sCLRGRY)
            }
        }
    }
}

public void clearTestDeviceItems() {
    settingRemove('debug_sensor')
    settingRemove('debug_switch')
    settingRemove('debug_other')
    settingRemove('debug_garage')
    settingRemove('debug_tstat')
}

def viewDeviceDebug() {
    def sDev; sDev = null
    if (debug_other)  { sDev = debug_other  }
    if (debug_sensor) { sDev = debug_sensor }
    if (debug_switch) { sDev = debug_switch }
    if (debug_garage) { sDev = debug_garage }
    if (debug_tstat)  { sDev = debug_tstat  }
    String json = new JsonOutput().toJson(getDeviceDebugMap(sDev))
    String jsonStr = new JsonOutput().prettyPrint(json)
    return jsonStr
}

private Map getDeviceDebugMap(dev) {
    Map r; r = [result: 'No Data Returned']
    if (dev) {
        def aa
        try {
            r = [:]
            r.name = dev.displayName?.toString()?.replaceAll("[#\$()!%&@^']", sBLANK)
            r.basename = dev.getName()
            r.deviceid = dev.getId()
            r.status = dev.getStatus()
            r.manufacturer = dev.manufacturerName ?: 'Unknown'
            r.model = dev?.modelName ?: dev?.getTypeName()
            r.deviceNetworkId = dev.getDeviceNetworkId()
            aa = dev.getLastActivity()
            r.lastActivity = aa ?: null
            r.capabilities = dev.capabilities?.collect { (String)it.name }?.unique()?.sort() ?: []
            aa = deviceCapabilityList(dev).sort { it?.key }
            r.capabilities_processed = aa ?: []
            r.capabilities_filtered = filteredOutCaps(dev) ?: []
            r.commands = dev.supportedCommands?.collect { (String)it.name }?.unique()?.sort() ?: []
            aa = deviceCommandList(dev).sort { it?.key }
            r.commands_processed = aa ?: []
            aa = getDeviceFlags(dev)
            r.customflags = aa ?: [:]
            r.attributes = [:]
            dev.supportedAttributes?.collect { (String)it.name }?.unique()?.sort()?.each { String it -> r.attributes[it] = dev.currentValue(it) }
            aa = deviceAttributeList(dev).sort { it?.key }
            r.attributes_processed = aa ?: []
            r.eventHistory = dev.eventsSince(new Date() - i1, [max: 20])?.collect { "${it?.date} | [${it?.name}] | (${it?.value}${it?.unit ? " ${it.unit}" : sBLANK})" }
        } catch (ex) {
            logError("Error while generating device data: ${ex}", ex)
        }
    }
    return r
}

private Integer getDeviceCnt(Boolean phyOnly=false) {
    List devices; devices= []
    List items = deviceSettingKeys().collect { (String)it.key }
    items?.each { String item ->
        List si= (List)settings[item]
        if (si && si.size() > iZ)
            devices = devices + si.collect { (String)"device_${(String)it.getId()}" }
    }
    if (!phyOnly) {
        virtSettingKeys().collect { (String)it.key }.each { String item->
            List si= (List)settings[item]
            if (si && si.size() > iZ) {
                String aa = item.replaceAll('List', sBLANK)
                devices = devices + si.collect { "${aa}_${it}".toString() }
            }
        }
    }
    Integer dSize; dSize = devices.unique().size()
    dSize = dSize ?: iZ
    if (bgtSetting('addSecurityDevice')) { dSize = dSize + i1 }
    return dSize
}

def installed() {
    logDebug("${(String)app.name} | installed() has been called...")
    state.installData = [initVer: appVersionFLD, dt: getDtNow(), updatedDt: 'Not Set', showDonation: false, shownChgLog: true]
    initialize()
}

def updated() {
    logDebug("${(String)app.name} | updated() has been called...")
    if (!state.installData) { state.installData = [initVer: appVersionFLD, dt: getDtNow(), updatedDt: getDtNow(), shownDonation: false] }
    unsubscribe()
    appCleanup()
    initialize()
    remTsVal(sLASTWU)
    if (bgtSetting('enableWebCoRE')) { webCoRE_poll(true) }
}

def initialize() {
    state.isInstalled = true
    remTsVal(sSVR)
    if (getAccessToken()) {
        subscribeToEvts()
        runEvery5Minutes('healthCheck')
        if (settings.showEventLogs && getLastTsValSecs(sEVTLOGEN, iZ) == iZ) { updTsVal(sEVTLOGEN) }
        if (settings.showDebugLogs && getLastTsValSecs(sDBGLOGEN, iZ) == iZ) { updTsVal(sDBGLOGEN) }
    } else { logError('initialize error: Unable to get or generate app access token') }
}

Boolean getAccessToken(Boolean disableRetry=false) {
    try {
        if (!state.accessToken) {
            state.accessToken = createAccessToken()
            remTsVal(sSVR)
            logWarn('App Access Token Missing... Generating New Token!!!')
            return true
        }
        return true
    } catch (ex) {
        if (!disableRetry) {
            enableOauth() // can fail depending on security settings
            return getAccessToken(true)
        } else {
            String msg = "Error: OAuth is not Enabled for ${app.getName()}!. Please click remove and Enable Oauth under in the HE console 'Apps Code'"
            logError("getAccessToken Exception: ${msg}",ex)
            return false
        }
    }
}

private void enableOauth() {
    Map params = [
        uri: "http://localhost:8080/app/edit/update?_action_update=Update&oauthEnabled=true&id=${app.appTypeId}".toString(),
        headers: ['Content-Type':'text/html;charset=utf-8']
    ]
    try {
        httpPost(params) { resp ->
            //LogTrace("response data: ${resp.data}")
        }
    } catch (ex) {
        logError("enableOauth something went wrong: ${ex}", ex)
    }
}

void subscribeToEvts() {
    runIn(6, 'registerDevices')
    logInfo('Starting Device Subscription Process...')
    if (bgtSetting('addSecurityDevice')) {
        logInfo('Subscribed to (HSM AlarmSystem Events)')
        subscribe(location, 'hsmStatus', changeHandler)
        subscribe(location, 'hsmAlert', changeHandler)
    }
    if ((List)settings.modeList) {
        logInfo("Subscribed to (${((List)settings.modeList).size() ?: iZ} Location Modes)")
        subscribe(location, 'mode', changeHandler)
    }
    if (bgtSetting('enableWebCoRE')) { webCoRE_init() }
}

private void healthCheck(Boolean ui=false) {
    checkVersionData()
    if (checkIfCodeUpdated(ui)) {
        logWarn('Code Version Change Detected... Health Check will occur on next cycle.')
        updated()
        return
    }
    webCoRE_poll()
    Integer lastUpd = getLastTsValSecs('lastActTs')
    Integer evtLogSec = getLastTsValSecs(sEVTLOGEN, iZ)
    Integer dbgLogSec = getLastTsValSecs(sDBGLOGEN, iZ)
    // log.debug "evtLogSec: $evtLogSec | dbgLogSec: $dbgLogSec"
    if (!ui && lastUpd > 14400) { remTsVal(sSVR) }

    if (evtLogSec > 60*60*2 && bgtSetting('showEventLogs')) { logWarn("Turning OFF Event Logs | It's been (${getLastTsValSecs(sEVTLOGEN, iZ)} sec)"); remTsVal(sEVTLOGEN); settingUpdate('showEventLogs', sFALSE, sBOOL) }
    else if (evtLogSec == iZ && bgtSetting('showEventLogs')) { updTsVal(sEVTLOGEN) }
    if (dbgLogSec > 60*60*2 && bgtSetting('showDebugLogs')) { logWarn("Turning OFF Debug Logs | It's been (${getLastTsValSecs(sDBGLOGEN, iZ)} sec)"); remTsVal(sDBGLOGEN); settingUpdate('showDebugLogs', sFALSE, sBOOL) }
    else if (dbgLogSec == iZ && bgtSetting('showDebugLogs')) { updTsVal(sDBGLOGEN) }
}

Boolean checkIfCodeUpdated(Boolean ui=false) {
    //if(!ui) logDebug("Code versions: ${state.codeVersions}")
    if (state.codeVersions?.mainApp != appVersionFLD) {
        updCodeVerMap('mainApp', appVersionFLD)
        Map iData = state.installData ?: [:]
        iData['updatedDt'] = getDtNow()
        iData['shownChgLog'] = false
        if (iData?.shownDonation == null) {
            iData['shownDonation'] = false
        }
        state.installData = iData
        logInfo('Code Version Change Detected... | Re-Initializing Homebridge App in 5 seconds')
        return true
    }
    return false
}

private void appCleanup() {
    List<String> removeItems = ['hubPlatform', 'cmdHistory', 'evtHistory', 'tsDtMap', 'lastMode', 'pollBlocked', 'devchanges', 'subscriptionRenewed']
    if (state.directIP && state.directPort) { // old cleanup
        state.pluginDetails = [
            directIP: state.directIP,
            directPort: state.directPort
        ]
        removeItems.push('directIP')
        removeItems.push('directPort')
    }
    removeItems.each { String it -> if (state?.containsKey(it)) state.remove(it) }
    List<String> removeSettings = ['removeColorTemp']
    removeSettings.each { String it -> if (settings.containsKey(it)) settingRemove(it) }
}

private List renderDevices() {
    Map devMap = [:]
    List devList = []
    List items; items = deviceSettingKeys().collect { (String)it.key }
    items = items + virtSettingKeys().collect { (String)it.key }
    items.each { String item ->
        List tl= LgtSetting(item)
        if (tl.size()) {
            tl.each { dev->
                Map devObj
                try {
                    devObj = getDeviceData(item, dev)
                    devObj = devObj != null ? devObj : [:]
                    if (devObj.size() > iZ) { devMap[(String)devObj.deviceid] = devObj }
                } catch (ex) {
                    logError("Setting key $item Device (${dev?.displayName}) | Render Exception: ${ex.message}", ex)
                }
            }
        }
    }
    if (bgtSetting('addSecurityDevice')) { devList?.push(getSecurityDevice()) }
    if (devMap.size() > iZ) { devMap.sort { (String)it.value.name }?.each { k, v-> devList.push(v) } }
    return devList
}

private void performPluginTest(){
    Map params = [
        uri: "http://localhost:8080/app/edit/update?_action_update=Update&oauthEnabled=true&id=${app.appTypeId}".toString(),
        headers: ['Content-Type':'text/html;charset=utf-8']
    ]
    try {
        httpPost(params) { resp ->
            //LogTrace("response data: ${resp.data}")
        }
    } catch(ex) {
        logError("enableOauth something went wrong: ${ex}", ex)
    }
}

private Map getDeviceData(String type, sItem) {
    // log.debug "getDeviceData($type, $sItem)"
    String curType; curType= 'device'
    String devId; devId= sBLANK //= sItem.toString()
    Boolean isVirtual; isVirtual= false
    String firmware; firmware= sNULL
    String name; name= sNULL
    Map optFlags = [:]
    def attrVal; attrVal= null
    def obj //= null
    switch (type) {
        case 'pistonList':
            isVirtual = true
            curType = 'Piston'
            optFlags['virtual_piston'] = i1
            devId = sItem.toString()
            obj = getPistonById(devId)
            if (obj) {
                name = 'Piston - ' + obj?.name
                attrVal = 'off'
            }
            break
        case 'modeList':
            isVirtual = true
            curType = 'Mode'
            optFlags['virtual_mode'] = i1
            obj = getModeById(sItem.toString())
            if (obj) {
// BUGFIX for modes deviceId may not be unique vs. device.id
                devId = 'm_'+sItem.toString()
                name = 'Mode - ' + (String)obj.name
                attrVal = modeSwitchState((String)obj.name)
            }
            break
        case 'securityKeypadsList':
            curType = 'Security Keypad'
        default:
            obj = sItem
            // Define firmware variable and initialize it out of device handler attribute`
            try {
                if (sItem?.hasAttribute('firmware')) { firmware = sItem?.currentValue('firmware')?.toString() }
            } catch (ignored) { firmware = sNULL }
            break
    }
    if (curType && obj) {
        if (curType == 'Security Keypad') {
            return [
                name: sItem?.displayName?.toString()?.replaceAll("[#\$()!%&@^']", sBLANK),
                basename: sItem?.name,
                deviceid: "securityKeypad_${sItem?.id}",
                status: sItem?.status,
                manufacturerName: sItem?.manufacturerName ?: pluginNameFLD,
                modelName: sItem?.modelName ?: sItem?.getTypeName(),
                serialNumber: sItem?.getDeviceNetworkId(),
                firmwareVersion: firmware ?: '1.0.0',
                lastTime: sItem?.getLastActivity() ?: null,
                capabilities: ['Alarm System Status': i1, 'Alarm': i1],
                commands: [],
                attributes: ['alarmSystemStatus': getSecurityKeypadMode(sItem?.currentValue('securityKeypad')?.toString())]
            ]
        }
        else {
            return [
                name: !isVirtual ? sItem?.displayName?.toString()?.replaceAll("[#\$()!%&@^']", sBLANK) : name?.toString()?.replaceAll("[#\$()!%&@^']", sBLANK),
                basename: !isVirtual ? sItem?.name : name,
                deviceid: !isVirtual ? sItem?.id : devId,
                status: !isVirtual ? sItem?.status : 'Online',
                manufacturerName: (!isVirtual ? sItem?.manufacturerName : pluginNameFLD) ?: pluginNameFLD,
                modelName: !isVirtual ? (sItem?.modelName ?: sItem?.getTypeName()) : curType+" Device",
                serialNumber: !isVirtual ? sItem?.getDeviceNetworkId() : curType+devId,
                firmwareVersion: firmware ?: '1.0.0',
                lastTime: !isVirtual ? (sItem?.getLastActivity() ?: null) : wnow(),
                capabilities: !isVirtual ? deviceCapabilityList(sItem) : [(curType) : i1],
                commands: !isVirtual ? deviceCommandList(sItem) : [on: i1],
                deviceflags: !isVirtual ? getDeviceFlags(sItem) : optFlags,
                attributes: !isVirtual ? deviceAttributeList(sItem) : [(sSW): attrVal]
            ]
        }
    }
    return null
}

String modeSwitchState(String mode) {
    return ((String)location?.getMode() == mode) ? 'on' : 'off'
}

def getSecurityDevice() {
    return [
        name: getAlarmSystemName(),
        basename: getAlarmSystemName(),
        deviceid: "alarmSystemStatus_${location?.id}",
        status: 'ACTIVE',
        manufacturerName: pluginNameFLD,
        modelName: getAlarmSystemName(),
        serialNumber: getAlarmSystemName(true),
        firmwareVersion: '1.0.0',
        lastTime: null,
        capabilities: ['Alarm System Status': i1, 'Alarm': i1],
        commands: [],
        attributes: ['alarmSystemStatus': getSecurityStatus()]
    ]
}

Map getDeviceFlags(device) {
    Map<String, Integer> opts = [:]
    [fan3SpdList: "fan_3_spd", fan4SpdList: "fan_4_spd", fan5SpdList: "fan_5_spd",
     lightNoAlList: "light_no_al"].each { String k, String v ->
        if (isDeviceInInput(k, (String)device.getId())) {
            opts[v] = i1
        }
    }
    // if(opts?.size()>iZ) log.debug "opts: ${opts}"
    return opts
}

def findDevice(String dev_id) {
    List allDevs; allDevs= []
    deviceSettingKeys().collect { (String)it.key }?.each { String key->
        List setL = LgtSetting(key)
        allDevs = allDevs + (setL ?: [])
    }
    def aa = allDevs.find { (String)it.getId() == dev_id }
    return aa ?: null
}

static def authError() {
    return [error: 'Permission denied']
}

static String getAlarmSystemName(Boolean abbr=false) {
    return (abbr ? 'HSM' : 'Hubitat Safety Monitor')
}

String getSecurityStatus(Boolean retInt=false) {
    String cur = (String)location.hsmStatus
    /*if (retInt) {
        switch (cur) {
            case 'armedHome':
            case 'stay':
                return iZ
            case 'armedAway':
            case 'away':
                return i1
            case 'armedNight':
            case 'night':
                return 2
            case 'disarmed':
            case 'off':
                return 3
            case 'intrusion-home':
            case 'intrusion-away':
            case 'intrusion-night':
                return 4
        }
    //} else { return cur ?: 'disarmed' }
    }*/
    return cur ?: 'disarmed'
}

void setAlarmSystemMode(String mode) {
    String sMode; sMode= sNULL
    switch (mode) {
        case 'armAway':
        case 'away':
            sMode = 'armAway'
            break
        case 'armNight':
            sMode = 'armNight'
            break
        case 'armHome':
        case 'night':
        case 'stay':
            sMode = 'armHome'
            break
        case 'disarm':
        case 'off':
            sMode = 'disarm'
            break
    }
    logInfo("Setting the ${getAlarmSystemName()} Mode to (${sMode})...")
    sendLocationEvent(name: 'hsmSetArm', value: sMode)
}

static String setSecurityKeypadMode(String cmd) {
    String kCmd; kCmd = sNULL
    switch (cmd) {
        case 'armAway':
        case 'away':
            kCmd = 'armAway'
            break
        case 'night':
        case 'armNight':
            kCmd = 'armNight'
            break
        case 'armHome':
        case 'home':
        case 'stay':
            kCmd = 'armHome'
            break
        case 'disarm':
        case 'off':
        case 'cancel':
            kCmd = 'disarm'
            break
    }
    // log.debug "setSecurityKeypadMode | StatusIn: (${cmd}) | ModeOut: (${kCmd})"
    return kCmd
}

static String getSecurityKeypadMode(String status) {
    // log.debug "getSecurityKeypadMode: ${status}"
    String hStatus; hStatus = sNULL
    switch (status) {
        case 'armed away':
            hStatus = 'armedAway'
            break
        case 'intrusion-away':   // accomodate custom drivers setting the securityKeypad attribute to custom values for intrusion
            hStatus = 'intrusion-away'
            break
        case 'armed night':
            hStatus = 'armedNight'
            break
        case 'intrusion-night':   // accomodate custom drivers setting the securityKeypad attribute to custom values for intrusion
            hStatus = 'intrusion-night'
            break
        case 'armed home':
            hStatus = 'armedHome'
            break
        case 'intrusion-home':   // accomodate custom drivers setting the securityKeypad attribute to custom values for intrusion
            hStatus = 'instrusion-home'
            break
        case 'disarmed':
            hStatus = 'disarmed'
            break
    }
    // log.debug "getSecurityKeypadMode | StatusIn: (${status}) | ModeOut: (${hStatus})"
    return hStatus
}

String getAppEndpointUrl(String subPath)   { return "${getApiServerUrl()}/${getHubUID()}/apps/${app?.id}${subPath ? "/${subPath}" : sBLANK}?access_token=${(String)state.accessToken}".toString() }
String getLocalEndpointUrl(String subPath) { return "${getLocalApiServerUrl()}/apps/${app?.id}${subPath ? "/${subPath}" : sBLANK}?access_token=${(String)state.accessToken}".toString() }
String getLocalUrl(String subPath) { return "${getLocalApiServerUrl()}/apps/${app?.id}${subPath ? "/${subPath}" : sBLANK}?access_token=${(String)state.accessToken}".toString() }

String renderConfig() {
    Map jsonMap = [
        platform: pluginNameFLD,
        name: pluginNameFLD,
        app_url_local: "${getLocalApiServerUrl()}/".toString(),
        app_url_cloud: "${getApiServerUrl()}/${getHubUID()}/apps/".toString(),
        app_id: app?.getId(),
        app_platform: platformFLD,
        use_cloud: bgtSetting('use_cloud_endpoint'),
        polling_seconds: (Integer)settings.polling_seconds ?: 3600,
        access_token: (String)state.accessToken,
        temperature_unit: (String)settings.temp_unit ?: (String)location.temperatureScale,
        validateTokenId: bgtSetting('validate_token'),
        adaptive_lighting: bdfltgtSetting('adaptive_lighting',true),
        consider_fan_by_name: bdfltgtSetting('consider_fan_by_name',true),
        consider_light_by_name: bgtSetting('consider_light_by_name'),
        adaptive_lighting_offset: (bgtSetting('adaptive_lighting') && settings.adaptive_lighting_offset) ? settings.adaptive_lighting_offset.toInteger() : iZ,
        round_levels: bdfltgtSetting('round_levels',true),
        logConfig: [
            debug: false,
            showChanges: true
        ]
    ]
    String cj = new JsonOutput().toJson(jsonMap)
    String cs = new JsonOutput().prettyPrint(cj)
    return cs
}

Map renderLocation() {
    return [
        latitude: location?.latitude,
        longitude: location?.longitude,
        mode: location?.mode,
        name: location?.name,
        temperature_scale: (String)settings.temp_unit ?: (String)location.temperatureScale,
        zip_code: location?.zipCode,
        hubIP: ((List)location?.hubs)[iZ]?.localIP,
        use_cloud: bgtSetting('use_cloud_endpoint'),
        app_version: appVersionFLD
    ]
}

def CommandReply(Boolean shw, String statusOut, String messageOut, Integer code) {
    String replyJson = new JsonOutput().toJson([status: statusOut, message: messageOut])
    if (shw) { logInfo(messageOut) }
    render contentType: sAPPJSON, data: replyJson, code: code
}

static Map getHttpHeaders(String headers) {
    Map obj = [:]
    new String(headers.decodeBase64()).split('\r\n')?.each { param ->
        List nameAndValue = param.split(sCLN)
        obj[(String)nameAndValue[iZ]] = (nameAndValue.length == i1) ? sBLANK : nameAndValue[i1].trim()
    }
    return obj
}

def deviceCommand() {
    // log.info("Command Request: $params")
    def val1 = request?.JSON?.value1 ?: null
    def val2 = request?.JSON?.value2 ?: null
    return processCmd((String)params?.id, (String)params?.command, val1, val2)
}

private processCmd(String idevId, String cmd, value1, value2) {
    String devId; devId=idevId
    Long execDt = wnow()
    Boolean shw = bgtSetting('showCmdLogs')
    if (shw) { logInfo("Plugin called Process Command | DeviceId: $devId | Command: ($cmd)${value1 ? " | Param1: ($value1)" : sBLANK}${value2 ? " | Param2: ($value2)" : sBLANK}") }
    if (!devId) { return }
    String command; command = cmd

    if (devId.contains("securityKeypad_") && (List)settings.securityKeypadsList) {
        command = setSecurityKeypadMode(command)
        devId = devId.replaceFirst("securityKeypad_", "")
    }

    if (devId == "alarmSystemStatus_${location?.id}" && bgtSetting('addSecurityDevice')) {
        setAlarmSystemMode(command)
        Long pt = execDt ? (wnow() - execDt) : 0L
        logCmd([cmd: command, device: getAlarmSystemName(), value1: value1, value2: value2, execTime: pt])
        return CommandReply(shw, sSUCC, "Security Alarm, Command: [$command]", 200)

    } else if (command == 'mode' &&  (List)settings.modeList) {
        if (shw) { logDebug("Virtual Mode Received: ${devId}") }
        String mdevId = devId.replaceAll('m_', sBLANK)
        changeMode(mdevId, shw)
        Long pt = execDt ? (wnow() - execDt) : 0L
        logCmd([cmd: command, device: 'Mode Device', value1: value1, value2: value2, execTime: pt])
        return CommandReply(shw, sSUCC, "Mode Device | Command: [$command] | Process Time: (${pt}ms)", 200)

    } else if (command == 'piston' && (List)settings.pistonList) {
        if (shw) { logDebug("Virtual Piston Received: ${devId}") }
        String aa = runPiston(devId, shw)
        Long pt = execDt ? (wnow() - execDt) : 0L
        logCmd([cmd: command, device: 'Piston Device', value1: value1, value2: value2, execTime: pt])
        return CommandReply(shw, sSUCC, "Piston | ${aa} | Command: [$command] | Process Time: (${pt}ms)", 200)

    } else {
        def device = findDevice(devId)
        String devN = device?.displayName
        if (!device) {
            logError("Device Not Found $devId")
            return CommandReply(shw, 'Failure', 'Device Not Found', 500)
        }
        if (!device?.hasCommand(command)) {
            logError("Device ${devN} does not have the command $command")
            return CommandReply(shw, 'Failure', "Device ${devN} does not have the command $command", 500)
        }

        if (command == "setColorTemperature" && device.currentValue("switch") != "on"){
            return CommandReply(shw, sSUCC, 'Command was setColorTemperature but device is not on', 200)
        }

        String cmdS
        cmdS = shw ? "Command Successful for Device | Name: ${devN} | Command: [${command}(".toString() : sBLANK
        try {
            if (value2 != null) {
                device."$command"(value1, value2)
                if (shw) { cmdS = cmdS + "$value1, $value2)]".toString() }
            } else if (value1 != null) {
                device."$command"(value1)
                if (shw) { cmdS = cmdS + "$value1)]".toString() }
            } else {
                device."$command"()
                if (shw) { cmdS = cmdS + ')]' }
            }
            if (shw) { logInfo(cmdS) }
            Long pt = execDt ? (wnow() - execDt) : 0L
            logCmd([cmd: command, device: devN, value1: value1, value2: value2, execTime: pt])
            return CommandReply(shw, sSUCC, "Name: ${devN} | Command: [${command}()] | Process Time: (${pt}ms)", 200)
        } catch (ex) {
            logError("Error Occurred for Device | Name: ${devN} | Command: [${command}()] ${ex}", ex)
            return CommandReply(shw, 'Failure', "Error Occurred For Device ${devN} | Command [${command}()]", 500)
        }
    }
}

private void changeMode(modeId, Boolean shw) {
    if (modeId) {
        def mode = findVirtModeDevice(modeId)
        if (mode) {
            if (shw) { logInfo("Setting the Location Mode to (${mode})...") }
            setLocationMode(mode as String)
        } else { logError("Unable to find a matching mode for the id: ${modeId}") }
    }
}

private runPiston(rtId, Boolean shw) {
    if (rtId) {
        Map rt = findVirtPistonDevice(rtId)
        String nm = (String)rt?.name
        if (nm) {
            if (shw) { logInfo("Executing the (${nm}) Piston...") }
            sendLocationEvent(name: rt.id, value:'homebridge', isStateChange: true, displayed: false, linkText: 'Execute Piston from homebridge', descriptionText: "Homebridge piston execute ${nm}", data: [:])
            runIn(2, 'endPiston', [data: [id:rtId, name:nm]])
            return nm
        } else { logError("Unable to find a matching piston for the id: ${rtId}") }
    }
    return null
}

void endPiston(evt) {
    changeHandler([deviceId:evt.id , name: 'webCoRE', value: 'pistonExecuted', displayName: evt.name, date: new Date()])
}

def deviceAttribute() {
    def device = findDevice((String)params?.id)
    String attribute = (String)params?.attribute

    Map res
    Integer code; code=200
    if (!device) {
        code=404
        res= [status: 'Failure', message: 'Device not found']
    } else {
        res=[currentValue: device?.currentValue(attribute)]
    }
    String resultJson = new JsonOutput().toJson(res)
    render contentType: sAPPJSON, data: resultJson, code: code
}

def findVirtModeDevice(id) {
    def aa = getModeById(id)
    return aa ?: null
}

static Map findVirtPistonDevice(id) {
    Map aa = getPistonById(id)
    return aa ?: null
}

Map deviceCapabilityList(device) {
    String devid= (String)device?.getId()
    if (!device || !devid) { return [:] }
    Map<String,Integer> capItems = ((List)device.getCapabilities())?.findAll { !((String)it.name in ignoreListFLD.capabilities) }?.collectEntries { capability-> [ ((String)capability.name) :i1 ] }

    if(isDeviceInInput("pushableButtonList", devid)) { capItems["Button"] = i1; capItems["PushableButton"] = i1 }
    else { capItems.remove("PushableButton") }

    if(isDeviceInInput("holdableButtonList", devid)) { capItems["Button"] = i1; capItems["HoldableButton"] = i1 }
    else { capItems.remove("HoldableButton") }

    if(isDeviceInInput("doubleTapableButtonList", devid)) { capItems["Button"] = i1; capItems["DoubleTapableButton"] = i1 }
    else { capItems.remove("DoubleTapableButton") }

    if (isDeviceInInput('lightList', devid)) { capItems['LightBulb'] = i1 }
    if (isDeviceInInput('outletList', devid)) { capItems['Outlet'] = i1 }
    if (isDeviceInInput('lightNoAlList', devid)) { capItems['LightBulb'] = i1 }
    if (isDeviceInInput('fanList', devid)) { capItems['Fan'] = i1 }
    if (isDeviceInInput('speakerList', devid)) { capItems['Speaker'] = i1 }
    if (isDeviceInInput('shadesList', devid)) { capItems['WindowShade'] = i1 }
    if (isDeviceInInput('securityKeypadsList', devid)) { capItems['SecurityKeypad'] = i1 }
    if (isDeviceInInput('garageList', devid)) { capItems['GarageDoorControl'] = i1 }
    if (isDeviceInInput('tstatList', devid)) { capItems['Thermostat'] = i1; capItems['ThermostatOperatingState'] = i1; capItems?.remove('ThermostatFanMode') }
    if (isDeviceInInput('tstatFanList', devid)) { capItems['Thermostat'] = i1; capItems['ThermostatOperatingState'] = i1 }
    if (isDeviceInInput('tstatHeatList', devid)) { capItems['Thermostat'] = i1; capItems['ThermostatOperatingState'] = i1; capItems.remove('ThermostatCoolingSetpoint') }
    //switchList, deviceList

    if (bgtSetting('noTemp') && capItems['TemperatureMeasurement'] && (capItems['ContactSensor'] || capItems['WaterSensor'])) {
        Boolean remTemp; remTemp = true
        if ((List)settings.sensorAllowTemp && isDeviceInInput('sensorAllowTemp', devid)) { remTemp = false }
        if (remTemp) { capItems.remove('TemperatureMeasurement') }
    }

    //This will filter out selected capabilities from the devices selected in filtering inputs.
    List<String> remKeys
    remKeys = ((Map)settings).findAll { ((String)it.key).startsWith('remove') && it.value != null }.collect { (String)it.key }
    if (!remKeys) remKeys = []
    remKeys.each { String k->
        String capName = k.replaceAll('remove', sBLANK)
        String theCap = (String)capFilterFLD[capName]
        if (theCap && capItems[theCap] && isDeviceInInput(k, devid)) {
            capItems?.remove(theCap)
            if (bgtSetting('showDebugLogs')) { logDebug("Filtering ${capName}") }
        }
    }
    return capItems?.sort { (String)it.key }
}

@Field static final Map<String, String> capFilterFLD = [
    'Acceleration': 'AccelerationSensor', 'Battery': 'Battery', 'Button': 'Button', 'ColorControl': 'ColorControl', 'ColorTemperature': 'ColorTemperature', 'Contact': 'ContactSensor', 'Energy': 'EnergyMeter', 'Humidity': 'RelativeHumidityMeasurement',
    'Illuminance': 'IlluminanceMeasurement', 'Level': 'SwitchLevel', 'Lock': 'Lock', 'Motion': 'MotionSensor', 'Power': 'PowerMeter', 'Presence': 'PresenceSensor', 'SecurityKeypad' : 'SecurityKeypad', 'Switch': 'Switch', 'Water': 'WaterSensor',
    'Thermostat': 'Thermostat', 'ThermostatFanMode': 'ThermostatFanMode', 'ThermostatOperatingState': 'ThermostatOperatingState', 'ThermostatSetpoint': 'ThermostatSetpoint', 'ThermostatCoolingSetpoint': 'ThermostatCoolingSetpoint', 'ThermostatHeatingSetpoint': 'ThermostatHeatingSetpoint',
    'Tamper': 'TamperAlert', 'Temp': 'TemperatureMeasurement', 'Valve': 'Valve', 'PushableButton': 'PushableButton', 'HoldableButton': 'HoldableButton', 'DoubleTapableButton': 'DoubleTapableButton',
]

private List filteredOutCaps(device) {
    List capsFiltered = []
    List<String> remKeys
    remKeys = ((Map)settings).findAll { ((String)it.key).startsWith('remove') && it.value != null }.collect { (String)it.key }
    if (!remKeys) remKeys = []
    remKeys.each { String k->
        String capName = k.replaceAll('remove', sBLANK)
        String theCap = (String)capFilterFLD[capName]
        if (theCap && isDeviceInInput(k, (String)device.getId())) { capsFiltered.push(theCap) }
    }
    return capsFiltered
}

Map deviceCommandList(device) {
    String devid= (String)device?.getId()
    if (!device || !devid) { return [:] }
    Map cmds = device.supportedCommands?.findAll { !((String)it.name in ignoreListFLD.commands) }?.collectEntries { c-> [ ((String)c.name) : i1 ] }
    if (isDeviceInInput('tstatList', devid)) { cmds.remove('setThermostatFanMode'); cmds.remove('fanAuto'); cmds.remove('fanOn'); cmds.remove('fanCirculate') }
    if (isDeviceInInput('tstatHeatList', devid)) { cmds.remove('setCoolingSetpoint'); cmds.remove('auto'); cmds.remove('cool') }
    if (isDeviceInInput('removeColorControl', devid)) { cmds.remove('setColor'); cmds.remove('setHue'); cmds.remove('setSaturation') }
    if (isDeviceInInput('removeColorTemperature', devid)) { cmds.remove('setColorTemperature') }
    if (isDeviceInInput('removeThermostatFanMode', devid)) { cmds.remove('setThermostatFanMode'); cmds.remove("setSupportedThermostatFanModes"); cmds.remove('fanAuto'); cmds.remove('fanOn'); cmds.remove('fanCirculate') }
    if (isDeviceInInput('removeThermostatMode', devid)) { cmds.remove('setThermostatMode'); cmds.remove("setSupportedThermostatModes"); cmds.remove('auto'); cmds.remove('cool'); cmds.remove('emergencyHeat'); cmds.remove('heat') }
    if (isDeviceInInput('removeThermostatCoolingSetpoint', devid)) { cmds.remove('setCoolingSetpoint'); cmds.remove('auto'); cmds.remove('cool') }
    if (isDeviceInInput('removeThermostatHeatingSetpoint', devid)) { cmds.remove('setHeatingSetpoint'); cmds.remove('heat'); cmds.remove('emergencyHeat'); cmds.remove('auto') }
    return cmds
}

Map deviceAttributeList(device) {
    String devid= (String)device?.getId()
    if (!device || !devid) { return [:] }
    //List<String> theAtts = ((List)device.getSupportedAttributes())?.collect { (String)it.name }?.unique()
    Map atts = ((List)device.getSupportedAttributes())?.findAll { !( (String)it.name in ignoreListFLD.attributes || (String)it.name in ignoreListFLD.evt_attributes ) }?.collectEntries { attribute->
        String attr=(String)attribute.name
        try {
            [(attr): device.currentValue(attr)]
        } catch (ignored) {
            [(attr): null]
        }
    }
    if (isDeviceInInput('tstatHeatList', devid)) { atts.remove('coolingSetpoint'); atts.remove('coolingSetpointRange') }
    if (isDeviceInInput('removeColorControl', devid)) { atts.remove('RGB'); atts.remove('color'); atts.remove('colorName'); atts.remove('hue'); atts.remove('saturation') }
    if (isDeviceInInput('removeColorTemperature', devid)) { atts.remove('colorTemperature') }
    if (isDeviceInInput('removeThermostatFanMode', devid)) { atts.remove('thermostatFanMode'); atts.remove('supportedThermostatFanModes') }
    if (isDeviceInInput('removeThermostatMode', devid)) { atts.remove('thermostatMode'); atts.remove('supportedThermostatModes') }
    if (isDeviceInInput('removeThermostatCoolingSetpoint', devid)) { atts.remove('thermostatCoolingSetpoint'); atts.remove('coolingSetpoint') }
    if (isDeviceInInput('removeThermostatHeatingSetpoint', devid)) { atts.remove('thermostatHeatingSetpoint'); atts.remove('heatingSetpoint') }
    return atts
}

def getAllData() {
    logTrace('Plugin called to Renew subscriptions')
    //    state.subscriptionRenewed = wnow()
    String deviceJson = new JsonOutput().toJson([location: renderLocation(), deviceList: renderDevices()])
    updTsVal('lastDeviceDataQueryDt')
    render contentType: sAPPJSON, data: deviceJson
}


static Map<String,String> deviceSettingKeys() {
    return [
        'lightList': 'Light Devices', 'lightNoAlList': 'Light (Blocked Adaptive Lighting) Devices', 'outletList': 'Outlet Devices',
        'pushableButtonList': 'Pushable Button Devices', 'holdableButtonList': 'Holdable Button Devices', 'doubleTapableButtonList': 'Double Tapable Button Devices',
    ] + fanSettingKeys() +
    [
        'speakerList': 'Speaker Devices', 'shadesList': 'Window Shade Devices', 'securityKeypadsList': 'Security Keypad Devices',
        'garageList': 'Garage Door Devices', 'tstatList': 'T-Stat Devices', 'tstatFanList': 'T-Stat + Fan Devices', 'tstatHeatList': 'T-Stat (HeatOnly) Devices',
        'sensorList': 'Sensor Devices', 'switchList': 'Switch Devices', 'deviceList': 'Other Devices',
    ]
}

static Map<String,String> fanSettingKeys() {
    return [
        'fanList': 'Fan Devices', 'fan3SpdList': 'Fans (3Spd) Devices', 'fan4SpdList': 'Fans (4Spd) Devices', 'fan5SpdList': 'Fans (5Spd) Devices',
    ]
}

static Map<String,String> virtSettingKeys() { return ['modeList': 'Mode Devices', 'pistonList': 'Piston Devices'] }


void registerDevices() {
    //This has to be done at startup because it takes too long for a normal command.
    Boolean shw
    deviceSettingKeys().each { String k, String v->
        shw= false //(k=='shadesList')
        List l= (List)settings[k]
        logDebug("Subscribed to (${l?.size() ?: iZ}) ${v}")
        registerChangeHandler(l,shw)
    }

    logInfo("Subscribed to (${getDeviceCnt(true)} Physical Devices)")
    logDebug('-----------------------------------------------')

    if (bgtSetting('restartService')) {
        logWarn('Sent Request to Homebridge Service to restart...')
        attemptServiceRestart()
        settingUpdate('restartService', sFALSE, sBOOL)
    }
    runIn(5, 'updateServicePrefs')
    runIn(8, 'sendDeviceRefreshCmd')
}

Boolean isDeviceInInput(String setKey, String devId) {
    List l= LgtSetting(setKey)
    if (l) {
        return (l.find { (String)it?.getId() == devId })
    }
    return false
}

@Field static final Map<String, String> attMapFLD = [
    'acceleration': 'Acceleration', 'battery': 'Battery', 'contact': 'Contact', 'energy': 'Energy', 'humidity': 'Humidity', 'illuminance': 'Illuminance',
    'level': 'Level', 'lock': 'Lock', 'motion': 'Motion', 'power': 'Power', 'presence': 'Presence', 'securityKeypad' : 'SecurityKeypad', 'speed': 'FanSpeed', 'switch': 'Switch', 'tamper': 'Tamper',
    'temperature': 'Temp', 'valve': 'Valve', 'pushed': 'PushableButton', 'held': 'HoldableButton', 'doubleTapped': 'DoubleTapableButton'
]

void registerChangeHandler(List devices, Boolean showlog=false) {
    devices?.each { device ->
        String devid= (String)device.getId()
        List<String> theAtts = ((List)device.getSupportedAttributes())?.collect { (String)it.name }?.unique()
        if (showlog) { log.debug "atts: ${theAtts}" }
        theAtts?.each { String att ->
            if (!(ignoreListFLD.evt_attributes.contains(att) || ignoreListFLD.attributes.contains(att))) {
                if (bgtSetting('noTemp') && att == 'temperature' && (device.hasAttribute('contact') || device.hasAttribute('water'))) {
                    Boolean skipAtt; skipAtt = true
                    if ((List)settings.sensorAllowTemp) {
                        skipAtt = isDeviceInInput('sensorAllowTemp', devid)
                    }
                    if (skipAtt) { return }
                }
                attMapFLD.each { String k, String v -> if (att == k && isDeviceInInput("remove${v}".toString(), devid)) { return } }
                if (
                    (att == 'pushed' && !isDeviceInInput('pushableButtonList', devid)) ||
                    (att == 'held' && !isDeviceInInput('holdableButtonList', devid)) ||
                    (att == 'doubleTapped' && !isDeviceInInput('doubleTapableButtonList', devid))
                ) { return }
                subscribe(device, att, 'changeHandler')
                if (showlog || devMode()) { log.debug "Registering ${device.displayName} for ${att} events" }
            } //else if(devMode()) log.debug "ignoring attribute $att for ${device.displayName}"
        }
    }
}

String getAlarmIntrusionMode() {
    String curMode = getSecurityStatus()
    switch(curMode) {
        case 'armedAway':
            return 'intrusion-away'
        case 'armedHome':
            return 'intrusion-home'
        case 'armedNight':
            return 'intrusion-night'
    }
    return "disarmed"
}

def changeHandler(evt) {
    Long execDt = wnow()
    List<Map> sendItems = []
    String src = evt.source
    String deviceid; deviceid = evt.getDeviceId()?.toString()
    String deviceName = (String)evt.displayName
    String attr; attr = (String)evt.name
    def value; value = evt.value
    Date dt = (Date)evt.date
    Boolean sendEvt; sendEvt = true
    Boolean evtLog = (getTsVal(sEVT) == sTRUE)

    // if(evt.name.startsWith('hsm')) {
    //     log.debug "${evt.name}: [evtSource: ${src}, evtDeviceName: ${deviceName}, evtDeviceId: ${deviceid}, evtAttr: ${attr}, evtValue: ${value}, evtUnit: ${evt?.unit ?: sBLANK}, evtDate: ${dt}]"
    // }
    switch ((String)evt.name) {
        case 'hsmStatus':
            deviceid = "alarmSystemStatus_${location?.id}"
            attr = 'alarmSystemStatus'
            sendItems.push([evtSource: src, evtDeviceName: deviceName, evtDeviceId: deviceid, evtAttr: attr, evtValue: value, evtUnit: evt?.unit ?: sBLANK, evtDate: dt])
            break
        case 'hsmAlert':
            deviceid = "alarmSystemStatus_${location?.id}"
            attr = 'alarmSystemStatus'
            if (value?.toString()?.startsWith('intrusion')) {
                sendItems.push([evtSource: src, evtDeviceName: deviceName, evtDeviceId: deviceid, evtAttr: attr, evtValue: getAlarmIntrusionMode(), evtUnit: evt?.unit ?: sBLANK, evtDate: dt])
            } else if (value?.toString() == 'cancel') {
                sendItems.push([evtSource: src, evtDeviceName: deviceName, evtDeviceId: deviceid, evtAttr: attr, evtValue: getSecurityStatus(), evtUnit: evt?.unit ?: sBLANK, evtDate: dt])
            } else { sendEvt = false }
            break
        case 'hsmRules':
        case 'hsmSetArm':
            sendEvt = false
            break
        case 'securityKeypad':
            deviceid = "securityKeypad_${deviceid}"
            attr = 'alarmSystemStatus'
            value = getSecurityKeypadMode("${value}")
            sendItems.push([evtSource: src, evtDeviceName: deviceName, evtDeviceId: deviceid, evtAttr: attr, evtValue: value, evtUnit: evt?.unit ?: sBLANK, evtDate: dt, evtData: null])
            break
        case 'alarmSystemStatus':
            deviceid = "alarmSystemStatus_${location?.id}"
            sendItems.push([evtSource: src, evtDeviceName: deviceName, evtDeviceId: deviceid, evtAttr: attr, evtValue: value, evtUnit: evt?.unit ?: sBLANK, evtDate: dt])
            break
        case 'mode':
            ((List<String>)settings.modeList)?.each { id->
                def md = getModeById(id)
                if (md && md.id) {
                    String devId = 'm_'+md.id.toString()
                    sendItems?.push([evtSource: 'MODE', evtDeviceName: "Mode - ${md.name}", evtDeviceId: devId, evtAttr: sSW, evtValue: modeSwitchState((String)md.name), evtUnit: sBLANK, evtDate: dt])
                }
            }
            break
        case 'webCoRE':
            if (bgtSetting('enableWebCoRE')) {
                sendEvt = false
                if ((String)evt.value == 'pistonList') {
                    List p; p = (List)webCoREFLD?.pistons ?: []
                    Map d = evt.jsonData ?: [:]
                    if (d.id && d.pistons && (d.pistons instanceof List)) {
                        p.removeAll { it.iid == d.id }
                        p += d.pistons.collect { [iid:d.id] + it }.sort { it.name }
                        def a = webCoREFLD?.cbk
                        webCoREFLD = [cbk: a, updated: wnow(), pistons: p]
                        updTsVal(sLASTWU)
                    }

                    if (evtLog) { logDebug("got webCoRE piston list event $webCoREFLD") }
                    break
                } else if ((String)evt.value == 'pistonExecuted') {
                    ((List<String>)settings.pistonList)?.each { id->
                        Map rt = getPistonById(id)
                        if (rt && rt.id) {
                            sendEvt = true
                            sendItems.push([evtSource: 'PISTON', evtDeviceName: "Piston - ${rt.name}", evtDeviceId: rt.id, evtAttr: sSW, evtValue: 'off', evtUnit: sBLANK, evtDate: dt])
                        }
                    }
                    break
                }
            }
            logDebug("unknown webCoRE event $evt.value")
            break
        case 'held':
        case 'pushed':
        case 'doubleTapped':
            Map evtData = [buttonNumber: value]
            sendItems.push([evtSource: src, evtDeviceName: deviceName, evtDeviceId: deviceid, evtAttr: "button", evtValue: attr, evtUnit: evt?.unit ?: sBLANK, evtDate: dt, evtData: evtData])
            break
        default:
            sendItems.push([evtSource: src, evtDeviceName: deviceName, evtDeviceId: deviceid, evtAttr: attr, evtValue: value, evtUnit: evt?.unit ?: sBLANK, evtDate: dt, evtData: null])
            break
    }

    if (sendEvt && sendItems.size() > iZ) {
        String server = getServerAddress()
        if (server == sCLN || server == sNLCLN ) { // can be configured ngrok??
            return
        }

        //Send Using the Direct Mechanism
        sendItems.each { Map send->
            if (evtLog) { //if(bgtSetting('showEventLogs')) {
                String unitStr
                switch ((String)send.evtAttr) {
                    case 'temperature':
                        unitStr = "${send?.evtUnit}"
                        break
                    case 'humidity':
                    case 'level':
                    case 'battery':
                        unitStr = '%'
                        break
                    case 'power':
                        unitStr = 'W'
                        break
                    case 'illuminance':
                        unitStr = ' Lux'
                        break
                    default:
                        unitStr = "${send?.evtUnit}"
                        break
                }
                logInfo("Sending ${send?.evtSource ?: sBLANK} Event (${send.evtDeviceName} | ${((String)send.evtAttr).toUpperCase()}: ${send.evtValue}${unitStr}) ${send.evtData ? "Data: ${send.evtData}" : sBLANK} to Homebridge at (${server})")
            }
            sendHttpPost(sUPD, [
                change_name     : send.evtDeviceName,
                change_device   : send.evtDeviceId,
                change_attribute: send.evtAttr,
                change_value    : send.evtValue,
                change_data     : send.evtData,
                change_date     : send.evtDate,
                app_id          : app?.getId(),
                access_token    : getTsVal(sATK)
            ], sEVTUPD, evtLog)
            logEvt([name: send.evtAttr, value: send.evtValue, device: send.evtDeviceName, execTime: wnow() - execDt])
        }
    }
    }

void sendHttpPost(String path, Map body, String src=sBLANK, Boolean evtLog, String contentType = sAPPJSON) {
    String server = getServerAddress()
    Boolean sendVia=bgtSetting('sendViaNgrok')
    String url= sendVia ? (String)settings.ngrokHttpUrl : sBLANK
    if (!devMode() || !(sendVia && url)) {
        if (server == sCLN || server == sNLCLN ) { logError("sendHttpPost: no plugin server configured src: $src   path: $path   $body"); return }
    }
    Map params = [
        uri: (devMode() && sendVia && url) ? "https://${url}.ngrok.io/${path}".toString() : "http://${server}/${path}".toString(),
        requestContentType: contentType,
        contentType: contentType,
        body: body,
        timeout: 20
    ]
    asynchttpPost(sASYNCCR, params, [execDt: wnow(), src: src, evtLog: evtLog])
}

void asyncHttpCmdResp(response, Map data) {
    if (getTsVal(sDBG) == sTRUE && bIs(data,'evtLog')) {
        def resp = response?.getData() // || null
        String src = data?.src ? (String)data.src : 'Unknown'
        logDebug(sASYNCCR + " | Src: ${src} | Resp: ${resp} | Status: ${response?.getStatus()} | Data: ${data}")
        logDebug("Send to plugin Completed | Process Time: (${data?.execDt ? (wnow()-(Long)data.execDt) : iZ}ms)")
    }
}

String getServerAddress() {
    String sv; sv = getTsVal(sSVR)
    if (sv == sNULL) {
        Map pluginDetails = state.pluginDetails ?: [:]
        sv = "${pluginDetails.directIP}:${pluginDetails.directPort}".toString()
        updTsVal(sSVR, sv)
        updTsVal(sDBG, bgtSetting('showDebugLogs').toString())
        updTsVal(sEVT, bgtSetting('showEventLogs').toString())
        updTsVal(sATK, (String)state.accessToken)
        updTsVal('lastActTs')
    }
    return sv
}

def getModeById(String mId) {
    return ((List)location?.getModes())?.find { it?.id?.toString() == mId }
}

def getModeByName(String name) {
    return ((List)location?.getModes())?.find { (String)it?.name == name }
}

@Field volatile static Map<String,Object> webCoREFLD = [:]

private static String webCoRE_handle() { return 'webCoRE' }

public static String webCore_icon() { return 'https://raw.githubusercontent.com/ady624/webCoRE/master/resources/icons/app-CoRE.png' }

private webCoRE_init(pistonExecutedCbk=null) {
    if (bgtSetting('enableWebCoRE')) {
        if (settings.pistonList) { logInfo("Subscribed to (${settings.pistonList.size()} WebCoRE Pistons)") }
        subscribe(location, webCoRE_handle(), changeHandler)
        if (!webCoREFLD) {
            webCoREFLD = [:] + [cbk:true] // pistonExecutedCbk]
            webCoRE_poll(true)
        }
    }
}

private void webCoRE_poll(Boolean now = false) {
    if (bgtSetting('enableWebCoRE')) {
        Integer lastUpd = getLastTsValSecs(sLASTWU)
        if ((lastUpd > (3600 * 24)) || (now && lastUpd > 300)) {
            sendLocationEvent(name: 'webCoRE.poll', value: 'poll') // ask webCoRE for piston list
            updTsVal(sLASTWU)
        }
    }
}

public static List webCoRE_list() {
    return ((List<Map>)webCoREFLD?.pistons)?.sort { it?.name }?.collect { [(it?.id): ((String)it?.aname)?.replaceAll('<[^>]*>', sBLANK)] }
}

static Map getPistonById(String rId) {
    return ((List<Map>)webCoREFLD?.pistons)?.find { it?.id == rId }
}

static Map getPistonByName(String name) {
    return ((List<Map>)webCoREFLD?.pistons)?.find { it?.name == name }
}

void settingUpdate(String name, String value, String type=sNULL) {
    if (name && type) { app.updateSetting(name, [type: type, value: value]) }
    else if (name && type == sNULL) { app.updateSetting(name, value) }
}

void settingRemove(String name) {
    // logTrace("settingRemove($name)...")
    if (name && settings.containsKey(name)) { app.removeSetting(name) }
}

static Boolean devMode() {
    return devModeFLD
}

void activateDirectUpdates(Boolean isLocal=false) {
    logTrace("activateDirectUpdates: ${getServerAddress()}${isLocal ? ' | (Local)' : sBLANK}")
    sendHttpPost('initial', [
        app_id: app.getId(),
        access_token: (String)state.accessToken
    ], 'activateDirectUpdates', bgtSetting('showDebugLogs'))
}

void attemptServiceRestart(Boolean isLocal=false) {
    logTrace("attemptServiceRestart: ${getServerAddress()}${isLocal ? ' | (Local)' : sBLANK}")
    sendHttpPost('restart', [
        app_id: app.getId(),
        access_token: (String)state.accessToken
    ], 'attemptServiceRestart', bgtSetting('showDebugLogs'))
}

void sendDeviceRefreshCmd(Boolean isLocal=false) {
    logTrace("sendDeviceRefreshCmd: ${getServerAddress()}${isLocal ? ' | (Local)' : sBLANK}")
    sendHttpPost('refreshDevices', [
        app_id: app.getId(),
        access_token: (String)state.accessToken
    ], 'sendDeviceRefreshCmd', bgtSetting('showDebugLogs'))
}

void updateServicePrefs(Boolean isLocal=false) {
    logTrace("updateServicePrefs: ${getServerAddress()}${isLocal ? ' | (Local)' : sBLANK}")
    sendHttpPost('updateprefs', [
        app_id: app.getId(),
        access_token: (String)state.accessToken,
        use_cloud: bgtSetting('use_cloud_endpoint'),
        validateTokenId: bgtSetting('validate_token'),
        local_hub_ip: ((List)location?.hubs)[iZ]?.localIP
    ], 'updateServicePrefs', bgtSetting('showDebugLogs'))
}

def pluginStatus() {
    logTrace('Plugin called... pluginStatus()')
    def body = request?.JSON
    state.pluginUpdates = [hasUpdate: (body?.hasUpdate == true), newVersion: (body?.newVersion ?: null)]
    if (body?.version) { updCodeVerMap('plugin', (String)body?.version) }
    String resultJson = new JsonOutput().toJson([status: 'OK'])
    render contentType: sAPPJSON, data: resultJson
}

def enableDirectUpdates() {
    logTrace('Plugin called enableDirectUpdates()')
    // log.trace "enableDirectUpdates: ($params)"
    state.pluginDetails = [
        directIP: params?.ip,
        directPort: params?.port,
        version: params?.version ?: null
    ]
    remTsVal(sSVR)
    updCodeVerMap('plugin', (String)params?.version ?: sNULL)
    activateDirectUpdates()
    updTsVal('lastDirectUpdsEnabled')
    String resultJson = new JsonOutput().toJson([status: 'OK'])
    render contentType: sAPPJSON, data: resultJson
}

mappings {
    path('/devices')                        { action: [GET: 'getAllData']           }
    path('/alldevices')                     { action: [GET: 'renderDevices']        }
    path('/deviceDebug')                    { action: [GET: 'viewDeviceDebug']      }
    path('/location')                       { action: [GET: 'renderLocation']       }
    path('/pluginStatus')                   { action: [POST: 'pluginStatus']        }
    path('/:id/command/:command')           { action: [POST: 'deviceCommand']       }
    path('/:id/attribute/:attribute')       { action: [GET: 'deviceAttribute']      }
    path('/startDirect/:ip/:port/:version') { action: [POST: 'enableDirectUpdates'] }
}

def appInfoSect() {
    Boolean isNote; isNote = false
    String tStr
    tStr = spanSmBld('Version:', sCLRGRY) + spanSmBr(" v${appVersionFLD}", sCLRGRY)
    tStr += state?.pluginDetails?.version ? spanSmBld('Plugin:', sCLRGRY) + spanSmBr(" v${state?.pluginDetails?.version}", sCLRGRY) : sBLANK
    section (sectH3TS((String)app.name, tStr, getAppImg('hb_tonesto7'), 'orange')) {
        Map minUpdMap = getMinVerUpdsRequired()
        List codeUpdItems = codeUpdateItems(true)
        if (bIs(minUpdMap,'updRequired') && ((List)minUpdMap.updItems).size() > iZ) {
            isNote = true
            String str3
            str3 = spanSmBldBr('Updates Required:', sCLRRED)
            ((List)minUpdMap.updItems).each { item-> str3 += spanSmBr("  ${sBULLET} ${item}", sCLRRED) }
            str3 += lineBr() + spanSmBld('If you just updated the code please press Done/Next to let the app process the changes.', sCLRRED)
            paragraph str3
        } else if (codeUpdItems?.size()) {
            isNote = true
            String str2
            str2 = spanSmBldBr('Code Updates Available:', sCLRRED)
            codeUpdItems?.each { item-> str2 += spanSmBr("  ${sBULLET} ${item}", sCLRRED) }
            paragraph str2
        }
        if (!isNote) { paragraph spanSm('No Issues to Report', sCLRGRY) }
        paragraph htmlLine(sCLRGRY)
    }
}

/**********************************************
        APP HELPER FUNCTIONS
***********************************************/

static String getAppImg(String imgName, String ext='.png') { return "https://raw.githubusercontent.com/tonesto7/homebridge-hubitat-tonesto7/${branchFLD}/images/${imgName}${ext}" }

static String getPublicImg(String imgName) { return "https://raw.githubusercontent.com/tonesto7/SmartThings-tonesto7-public/master/resources/icons/${imgName}.png" }

static String sectH3TS(String t, String st, String i = sNULL, String c=sCLR4D9) { return "<h3 style='color:${c};font-weight: bold'>${i ? "<img src='${i}' width='48'> " : sBLANK} ${t?.replaceAll("\\n", '<br>')}</h3>${st ?: sBLANK}" }
static String paraTS(String t, String i = sNULL, Boolean bold=true, String color=sNULL) { return "${color ? "<div style='color: $color;'>" : sBLANK}${bold ? '<b>' : sBLANK}${i ? "<img src='${i}' width='48'> " : sBLANK}${t?.replaceAll("\\n", '<br>')}${bold ? '</b>' : sBLANK}${color ? '</div>' : sBLANK}".toString() }
static String sectHead(String str, String img = sNULL) { return str ? "<h3 style='margin-top:0;margin-bottom:0;'>" + spanImgStr(img) + span(str, sCLR4D9, sNULL, true) + '</h3>' + "<hr style='background-color:${sCLRGRY};font-style:italic;height:1px;border:0;margin-top:0;margin-bottom:0;'>" : sBLANK }
//static String sTS(String t, String i = sNULL, Boolean bold=false) { return "<h3>${i ? "<img src='${i}' width='42'> " : sBLANK} ${bold ? '<b>' : sBLANK}${t?.replaceAll('\n', '<br>')}${bold ? '</b>' : sBLANK}</h3>" }
//static String s3TS(String t, String st, String i = sNULL, String c=sCLR4D9) { return "<h3 style='color:${c};font-weight: bold;'>${i ? "<img src='${i}' width='42'> " : sBLANK} ${t?.replaceAll('\n', '<br>')}</h3>${st ? "${st}" : sBLANK}" }
//static String pTS(String t, String i = sNULL, Boolean bold=true, String color=sNULL) { return "${color ? "<div style='color: $color;'>" : sBLANK}${bold ? '<b>' : sBLANK}${i ? "<img src='${i}' width='42'> " : sBLANK}${t?.replaceAll('\n', '<br>')}${bold ? '</b>' : sBLANK}${color ? '</div>' : sBLANK}" }

static String inTS1(String str, String img = sNULL, String clr=sNULL, Boolean und=true) { return spanSmBldUnd(str, clr, img) }
//static String inTS(String str, String img = sNULL, String clr=sNULL, Boolean und=true) { return divSm(strUnder(str?.replaceAll('\n', sSPACE).replaceAll('<br>', sSPACE), und), clr, img) }

// Root HTML Objects
static String span(String str, String clr=sNULL, String sz=sNULL, Boolean bld=false, Boolean br=false) { return str ? "<span ${(clr || sz || bld) ? "style='${clr ? "color: ${clr};" : sBLANK}${sz ? "font-size: ${sz};" : sBLANK}${bld ? 'font-weight: bold;' : sBLANK}'" : sBLANK}>${str}</span>${br ? sLINEBR : sBLANK}" : sBLANK }
static String div(String str, String clr=sNULL, String sz=sNULL, Boolean bld=false, Boolean br=false) { return str ? "<div ${(clr || sz || bld) ? "style='${clr ? "color: ${clr};" : sBLANK}${sz ? "font-size: ${sz};" : sBLANK}${bld ? 'font-weight: bold;' : sBLANK}'" : sBLANK}>${str}</div>${br ? sLINEBR : sBLANK}" : sBLANK }
static String spanImgStr(String img=sNULL) { return img ? span("<img src='${(!img.startsWith('http://') && !img.startsWith('https://')) ? getAppImg(img) : img}' width='42'> ") : sBLANK }
//static String divImgStr(String str, String img=sNULL) { return ((str) ? div(img ? spanImg(img) + span(str) : str) : sBLANK) }
static String strUnder(String str, Boolean showUnd=true) { return str ? (showUnd ? "<u>${str}</u>" : str) : sBLANK }
//static String getOkOrNotSymHTML(Boolean ok) { return ok ? span("(${okSymFLD})", sCLRGRN2) : span("(${notOkSymFLD})", sCLRRED2) }
static String htmlLine(String color=sCLR4D9, Integer width = null) { return "<hr style='background-color:${color};height:1px;border:0;margin-top:0;margin-bottom:0;${width ? "width: ${width}px;" : sBLANK}'>" }
static String lineBr(Boolean show=true) { return show ? sLINEBR : sBLANK }
static String inputFooter(String str, String clr=sCLR4D9, Boolean noBr=false) { return str ? lineBr(!noBr) + divSmBld(str, clr) : sBLANK }
//static String inactFoot(String str) { return str ? inputFooter(str, sCLRGRY, true) : sBLANK }
//static String actFoot(String str) { return str ? inputFooter(str, sCLR4D9, false) : sBLANK }
//static String optPrefix() { return spanSm(' (Optional)', 'violet') }

// Custom versions of the root objects above
//static String spanBld(String str, String clr=sNULL, String img=sNULL)      { return str ? spanImgStr(img) + span(str, clr, sNULL, true)            : sBLANK }
static String spanBldBr(String str, String clr=sNULL, String img=sNULL)    { return str ? spanImgStr(img) + span(str, clr, sNULL, true, true)      : sBLANK }
static String spanBr(String str, String clr=sNULL, String img=sNULL)       { return str ? spanImgStr(img) + span(str, clr, sNULL, false, true)     : sBLANK }
static String spanSm(String str, String clr=sNULL, String img=sNULL)       { return str ? spanImgStr(img) + span(str, clr, sSMALL)                 : sBLANK }
static String spanSmBr(String str, String clr=sNULL, String img=sNULL)     { return str ? spanImgStr(img) + span(str, clr, sSMALL, false, true)    : sBLANK }
static String spanSmBld(String str, String clr=sNULL, String img=sNULL)    { return str ? spanImgStr(img) + span(str, clr, sSMALL, true)           : sBLANK }
static String spanSmBldUnd(String str, String clr=sNULL, String img=sNULL) { return str ? spanImgStr(img) + span(strUnder(str), clr, sSMALL, true) : sBLANK }
static String spanSmBldBr(String str, String clr=sNULL, String img=sNULL)  { return str ? spanImgStr(img) + span(str, clr, sSMALL, true, true)     : sBLANK }
//static String spanMd(String str, String clr=sNULL, String img=sNULL)       { return str ? spanImgStr(img) + span(str, clr, sMEDIUM)                : sBLANK }
//static String spanMdBr(String str, String clr=sNULL, String img=sNULL)     { return str ? spanImgStr(img) + span(str, clr, sMEDIUM, false, true)   : sBLANK }
//static String spanMdBld(String str, String clr=sNULL, String img=sNULL)    { return str ? spanImgStr(img) + span(str, clr, sMEDIUM, true)          : sBLANK }
//static String spanMdBldBr(String str, String clr=sNULL, String img=sNULL)  { return str ? spanImgStr(img) + span(str, clr, sMEDIUM, true, true)    : sBLANK }

//static String divBld(String str, String clr=sNULL, String img=sNULL)        { return str ? div(spanImgStr(img) + span(str), clr, sNULL, true, false)   : sBLANK }
//static String divBldBr(String str, String clr=sNULL, String img=sNULL)      { return str ? div(spanImgStr(img) + span(str), clr, sNULL, true, true)    : sBLANK }
//static String divBr(String str, String clr=sNULL, String img=sNULL)         { return str ? div(spanImgStr(img) + span(str), clr, sNULL, false, true)   : sBLANK }
static String divSm(String str, String clr=sNULL, String img=sNULL)         { return str ? div(spanImgStr(img) + span(str), clr, sSMALL)              : sBLANK }
//static String divSmBr(String str, String clr=sNULL, String img=sNULL)       { return str ? div(spanImgStr(img) + span(str), clr, sSMALL, false, true) : sBLANK }
static String divSmBld(String str, String clr=sNULL, String img=sNULL)      { return str ? div(spanImgStr(img) + span(str), clr, sSMALL, true)        : sBLANK }
//static String divSmBldBr(String str, String clr=sNULL, String img=sNULL)    { return str ? div(spanImgStr(img) + span(str), clr, sSMALL, true, true)  : sBLANK }

def appFooter() {
    section() {
        // paragraph htmlLine('orange')
        paragraph spanSm("<div style='text-align:center;'><b><u>Homebridge Hubitat</u></b><br><a href='https://www.paypal.com/cgi-bin/webscr?cmd=_s-xclick&hosted_button_id=RVFJTG8H86SK8&source=url' target='_blank'><img width='120' height='120' src='https://raw.githubusercontent.com/tonesto7/homebridge-hubitat-tonesto7/master/images/donation_qr.png'></a><br><br>Please consider donating if you find this integration useful.</div>", sCLRORG)
    }
}

static String dashItem(String inStr, String strVal, newLine=false) { return "${(inStr == sBLANK && !newLine) ? sBLANK : '\n'} - ${strVal}".toString() }

static String textDonateLink() { return 'https://www.paypal.com/donate?hosted_button_id=5GMA6C3RTLXH6' }

static Integer versionStr2Int(String str) { return str ? str.tokenize('-')[iZ]?.replaceAll("\\.", sBLANK)?.toInteger() : null }

static String versionCleanup(String str) { return str ? str.tokenize('-')[iZ] : sNULL }

static Boolean codeUpdIsAvail(String inewVer, String icurVer, String type) {
    Boolean result; result = false
    String latestVer
    String newVer, curVer
    newVer=inewVer
    curVer=icurVer
    if (newVer && curVer) {
        newVer = versionCleanup(newVer)
        curVer = versionCleanup(curVer)
        List<String> versions = [newVer, curVer] as List<String>
        if (newVer != curVer) {
            latestVer = versions.max { a, b ->
                List verA = a?.tokenize('.'); List verB = b?.tokenize('.')
                Integer commonIndices = Math.min(verA?.size(), verB?.size())
                for (Integer i = iZ; i < commonIndices; ++i) {
                    if (verA[i]?.toInteger() != verB[i]?.toInteger()) {
                        return verA[i]?.toInteger() <=> verB[i]?.toInteger()
                    }
                }
                verA?.size() <=> verB?.size()
            }
            result = (latestVer == newVer)
        }
    }
    return result
}

Boolean appUpdAvail() { return (state?.appData?.versions && state?.codeVersions?.mainApp && codeUpdIsAvail((String)state?.appData?.versions?.mainApp, appVersionFLD, 'main_app')) }
Boolean pluginUpdAvail() { return (state?.appData?.versions && state?.codeVersions?.plugin && codeUpdIsAvail((String)state?.appData?.versions?.plugin, (String)state?.codeVersions?.plugin, 'plugin')) }

private Map getMinVerUpdsRequired() {
    Boolean updRequired; updRequired = false
    List updItems = []
    Map codeItems = [plugin: 'Homebridge Plugin']
    Map<String,String> codeVers = (Map<String, String>)state.codeVersions ?: [:]
    codeVers?.each { String k, String v->
        try {
            if (codeItems?.containsKey(k) && v != null && (versionStr2Int(v) < (Integer)minVersionsFLD[k])) { updRequired = true; updItems.push(codeItems[k]) }
        } catch (ex) {
            logError("getMinVerUpdsRequired Error: ${ex}", ex)
        }
    }
    return [updRequired: updRequired, updItems: updItems]
}

private List codeUpdateItems(Boolean shrt=false) {
    Boolean appUpd = appUpdAvail()
    Boolean plugUpd = pluginUpdAvail()
    List updItems = []
    if (appUpd) updItems.push("${!shrt ? '\nHomebridge ' : sBLANK}App: (v${state?.appData?.versions?.mainApp?.toString()})")
    if (plugUpd) updItems.push("${!shrt ? '\n' : sBLANK}Plugin: (v${state?.appData?.versions?.plugin?.toString()})")
    return updItems
}

@Field volatile static Map<String,Map> tsDtMapFLD = [:]

Integer getLastTsValSecs(String val, Integer nullVal=1000000) {
    String appId = app.getId().toString()
    Map tsMap = tsDtMapFLD[appId] ?: [:]
    return (val && tsMap && tsMap[val]) ? GetTimeDiffSeconds((String)tsMap[val]).toInteger() : nullVal
}

private void updTsVal(String key, String dt=sNULL) {
    String appId = app.getId().toString()
    Map data = tsDtMapFLD[appId] ?: [:]
    if (key) { data[key] = dt ?: getDtNow() }
    tsDtMapFLD[appId] = data
    tsDtMapFLD = tsDtMapFLD
}

private void remTsVal(key) {
    String appId = app.getId().toString()
    Map data = tsDtMapFLD[appId] ?: [:]
    if (key) {
        if( key instanceof List) {
            List<String> klist = (List)key
            klist.each { k-> if (data.containsKey(k)) { data.remove(k) } }
        } else {
            String ks = key
            if (ks && data.containsKey(ks)) { data.remove(ks) }
        }
        tsDtMapFLD[appId] = data
        tsDtMapFLD = tsDtMapFLD
    }
}

private String getTsVal(String val) {
    String appId = app.getId().toString()
    Map tsMap = tsDtMapFLD[appId]
    if (val && tsMap && tsMap[val]) { return (String)tsMap[val] }
    return sNULL
}

private void updCodeVerMap(String key, String val) {
    Map cv; cv = (Map)state.codeVersions
    if (cv == null) cv = [:]
    if (val && (!cv.containsKey(key) || (cv.containsKey(key) && (String)cv[key] != val))) { cv[key] = val }
    if (cv.containsKey(key) && val == sNULL) { cv.remove(key) }
    state.codeVersions = cv
}

private void updInstData(String key, val) {
    Map iData = (Map)state.installData ?: [:]
    iData[key] = val
    state.installData = iData
}

private getInstData(String key) {
    Map iMap = (Map)state.installData
    if (key && iMap && iMap[key]) { return iMap[key] }
    return null
}

private void checkVersionData(Boolean now = false) { //This reads a JSON file from GitHub with version numbers
    Integer lastUpd = getLastTsValSecs('lastAppDataUpdDt')
    if (now || !state.appData || (lastUpd > (3600 * 6))) {
        if (now && (lastUpd < 300)) { return }
        getConfigData()
    }
}

void getConfigData() {
    Map params = [
        uri: 'https://raw.githubusercontent.com/tonesto7/homebridge-hubitat-tonesto7/master/appData.json',
        contentType: sAPPJSON,
        timeout: 20
    ]
    Map data = (Map)getWebData(params, 'appData', false)
    if (data) {
        state.appData = data
        updTsVal('lastAppDataUpdDt')
        logDebug("Successfully Retrieved (v${data.appDataVer}) of AppData Content from GitHub Repo...")
    }
}

private getWebData(Map params, String desc, Boolean text=true) {
    try {
        httpGet(params) { resp ->
            if (resp?.status != 200) { logWarn("${resp?.status} $params") }
            if (resp?.data) {
                if (text) { return resp.data.text?.toString() }
                return resp.data
            }
        }
    } catch (ex) {
        if (ex instanceof groovyx.net.http.HttpResponseException) { logWarn("${desc} file not found") }
        else { logError("getWebData Exception | params: $params, desc: $desc, text: $text | Error: ${ex}", ex) }
        if (text) { return "${desc} info not found" }
        return null
    }
}

/******************************************
|       DATE | TIME HELPERS
******************************************/
static String formatDt(Date dt, Boolean tzChg=false) {
    SimpleDateFormat tf = new SimpleDateFormat('E MMM dd HH:mm:ss z yyyy')
    if (tzChg && mTZ()) { tf.setTimeZone(mTZ()) }
    return tf.format(dt)
}

static String getDtNow() {
    Date now = new Date()
    return formatDt(now)
}

Long GetTimeDiffSeconds(String lastDate, String sender=sNULL) {
    if (lastDate) {
        if (!lastDate.contains('dtNow')) {
            //String stopVal = getDtNow()
            Long start = Date.parse('E MMM dd HH:mm:ss z yyyy', lastDate).getTime()
            //Long stop = Date.parse("E MMM dd HH:mm:ss z yyyy", stopVal).getTime()
            Long stop = wnow()
            Long diff = (Long)((stop - start) / 1000L)
            return diff
        }
    } else {
        logError("GetTimeDiffSeconds Exception: (${sender ? "$sender | " : sBLANK}lastDate: $lastDate)")
    }
    return 10000L
}

/******************************************
|       Changelog Logic
******************************************/
Boolean showDonationOk() { return ((Boolean)state.isInstalled && !state?.installData?.shownDonation && getDaysSinceUpdated() >= 30 && !bgtSetting('sentDonation')) }

Integer getDaysSinceUpdated() {
    def t0 = state.installData?.updatedDt
    String updDt = t0 ? (String)t0 : sNULL
    if (updDt == sNULL || updDt == 'Not Set') {
        updInstData('updatedDt', getDtNow())
        return iZ
    }
    Date start = Date.parse('E MMM dd HH:mm:ss z yyyy', updDt)
    Date stop = new Date()
    if (start && stop) { return (stop - start) }
    return iZ
}

String changeLogData() {
    String txt
    txt = (String)getWebData([uri: 'https://raw.githubusercontent.com/tonesto7/homebridge-hubitat-tonesto7/master/CHANGELOG-app.md', contentType: 'text/plain; charset=UTF-8', timeout: 20], 'changelog', true)
    txt = txt?.replaceAll('##', sBLANK)?.replaceAll(/(_\*\*)/, '<b>')?.replaceAll(/(\*\*_)/, '</b>') // Replaces header format
    txt = txt?.replaceAll(/(- )/, "   ${sBULLET} ")
    txt = txt?.replaceAll(/(\[NEW])/, spanSmBld('[NEW]'))
    txt = txt?.replaceAll(/(\[UPDATE])/, spanSmBld('[FIX]'))
    txt = txt?.replaceAll(/(\[FIX])/, spanSmBld('[FIX]'))
    return txt // Replaces ## then **_ and _** in changelog data
}

Boolean showChgLogOk() { return ((Boolean)state.isInstalled && ((String)state.curAppVer != appVersionFLD || state?.installData?.shownChgLog != true)) }

private changeLogPage() {
    return dynamicPage(name: 'changeLogPage', title: sBLANK, nextPage: 'mainPage', install: false) {
        section(sectHead('Release Notes:', 'change_log')) { paragraph spanSm(changeLogData()) }
        state.curAppVer = appVersionFLD
        updInstData('shownChgLog', true)
    }
}

private void addToHistory(String logKey, Map data, Integer max=10) {
    String appId = app.getId().toString()
    Boolean ssOk = true
    /* groovylint-disable-next-line UnusedVariable */
    Boolean aa = getTheLock(sHMLF, "addToHistory(${logKey})")
    // log.trace "lock wait: ${aa}"

    Map<String,List> memStore = historyMapFLD[appId] ?: [:]
    List eData; eData = (List)memStore[logKey] ?: []
    if (eData.find { it?.data == data }) {
        releaseTheLock(sHMLF)
        return
}
    eData.push([dt: getDtNow(), gt: wnow(), data: data])
    Integer lsiz = eData.size()
    if (!ssOk || lsiz > max) { eData = eData.drop( (lsiz - max) ) }
    updMemStoreItem(logKey, eData)

    releaseTheLock(sHMLF)
}

private void logDebug(String msg)  { if (bgtSetting('showDebugLogs')) logPrefix(sDBG, msg, "purple") }
private void logTrace(String msg)  { if (bgtSetting('showDebugLogs')) logPrefix('trace', msg, sCLRGRY) }
private void logInfo(String msg)   { logPrefix(sINFO, msg, sCLR9B1) }
private void logWarn(String msg)   { logPrefix('warn', msg, sCLRORG) }
private void logError(String msg, ex=null) {
    logPrefix('error', msg, sCLRRED)
    String a
    try {
        if (ex) a = getExceptionMessageWithLine(ex)
    } catch (ignored) {
    }
    if(a) { logPrefix('error', a, sCLRRED) }
}

private void logPrefix(String lvl, String msg, String color = sNULL) {
    String pad = sBLANK
    if (lvl in ['warn', sINFO]) { pad = sSPACE }
    log."$lvl" pad + span("Homebridge (v${appVersionFLD}) | ", sCLRGRY) + span(msg, color)
}

private List<Map> getCmdHistory() {
    Boolean aa = getTheLock(sHMLF, 'getCmdHistory')
    // log.trace "lock wait: ${aa}"

    List<Map> his; his = getMemStoreItem('cmdHistory')
    if (his == null) his = []
    List<Map> newHis = (List<Map>)[] + his

    releaseTheLock(sHMLF)
    return newHis
}

private List<Map> getEvtHistory() {
    Boolean aa = getTheLock(sHMLF, 'getEvtHistory')
    // log.trace "lock wait: ${aa}"

    List<Map> his; his = getMemStoreItem('evtHistory')
    if (his == null) his = []
    List<Map> newHis = (List<Map>)[] + his

    releaseTheLock(sHMLF)
    return newHis
}

private void clearHistory() {
    String appId = app.getId().toString()
    Boolean aa = getTheLock(sHMLF, 'clearHistory')
    // log.trace "lock wait: ${aa}"

    historyMapFLD[appId] = [:]
    historyMapFLD = historyMapFLD

    releaseTheLock(sHMLF)
}

private void logEvt(Map evtData) { addToHistory('evtHistory', evtData, 25) }
private void logCmd(Map cmdData) { addToHistory('cmdHistory', cmdData, 25) }

@Field volatile static Map<String,Map> historyMapFLD = [:]

// FIELD VARIABLE FUNCTIONS
private void updMemStoreItem(String key, List val) {
    String appId = app.getId().toString()
    Map memStore = historyMapFLD[appId] ?: [:]
    memStore[key] = val
    historyMapFLD[appId] = memStore
    historyMapFLD = historyMapFLD
// log.debug("updMemStoreItem(${key}): ${memStore[key]}")
}

private List getMemStoreItem(String key) {
    String appId = app.getId().toString()
    Map<String, List> memStore = historyMapFLD[appId] ?: [:]
    return (List)memStore[key] ?: null
}

// Memory Barrier
@Field static Semaphore theMBLockFLD = new Semaphore(0)

static void mb(String meth=sNULL) {
    if (theMBLockFLD.tryAcquire()) {
        theMBLockFLD.release()
    }
}

@Field static final String sHMLF = 'theHistMapLockFLD'
@Field static Semaphore histMapLockFLD = new Semaphore(1)

private Integer getSemaNum(String name) {
    if (name == sHMLF) return iZ
    log.warn 'unrecognized lock name...'
    return iZ
// Integer stripes=22
// if(name.isNumber()) return name.toInteger()%stripes
// Integer hash=smear(name.hashCode())
// return Math.abs(hash)%stripes
// log.info "sema $name # $sema"
}

Semaphore getSema(Integer snum) {
    switch (snum) {
        case iZ:
            return histMapLockFLD
        default: log.error "bad hash result $snum"
            return null
    }
}

@Field volatile static Map<String,Long> lockTimesFLD = [:]
@Field volatile static Map<String,String> lockHolderFLD = [:]

Boolean getTheLock(String qname, String meth=sNULL, Boolean longWait=false) {
    Long waitT = longWait ? 1000L : 60L
    Boolean wait; wait = false
    Integer semaNum = getSemaNum(qname)
    String semaSNum = semaNum.toString()
    Semaphore sema = getSema(semaNum)
    while (!sema.tryAcquire()) {
        // did not get the lock
        Long timeL; timeL = lockTimesFLD[semaSNum]
        if (timeL == null) {
            timeL = wnow()
            lockTimesFLD[semaSNum] = timeL
            lockTimesFLD = lockTimesFLD
        }
        if (devMode()) { log.warn "waiting for ${qname} ${semaSNum} lock access, $meth, long: $longWait, holder: ${(String)lockHolderFLD[semaSNum]}" }
        pauseExecution(waitT)
        wait = true
        if ((wnow() - timeL) > 30000L) {
            releaseTheLock(qname)
            if (devMode()) { log.warn "overriding lock $meth" }
        }
    }
    lockTimesFLD[semaSNum] = wnow()
    lockTimesFLD = lockTimesFLD
    lockHolderFLD[semaSNum] = "${app.getId()} ${meth}".toString()
    lockHolderFLD = lockHolderFLD
    return wait
}

void releaseTheLock(String qname) {
    Integer semaNum = getSemaNum(qname)
    String semaSNum = semaNum.toString()
    Semaphore sema = getSema(semaNum)
    lockTimesFLD[semaSNum] = null
    lockTimesFLD = lockTimesFLD
    lockHolderFLD[semaSNum] = sNULL
    lockHolderFLD = lockHolderFLD
    sema.release()
}

private Long wnow(){ return (Long)now() }
private static TimeZone mTZ(){ return TimeZone.getDefault() }

@CompileStatic
private static Boolean bIs(Map m,String v){ (Boolean)m.get(v) }

private gtSetting(String nm){ return settings.get(nm) }
private Boolean bgtSetting(String nm){ return (Boolean)settings.get(nm)==true }
private Boolean bdfltgtSetting(String nm,Boolean dflt=true){
    if(settings.get(nm) == null) {
        settingUpdate(nm,dflt.toString(),sBOOL)
        return dflt
    }
    return bgtSetting(nm)
}

private List LgtSetting(String nm){ return (List)settings.get(nm) ?: [] }

static String myObj(obj){
    if(obj instanceof String)return 'String'
    else if(obj instanceof Map)return 'Map'
    else if(obj instanceof List)return 'List'
    else if(obj instanceof ArrayList)return 'ArrayList'
    else if(obj instanceof BigInteger)return 'BigInt'
    else if(obj instanceof Long)return 'Long'
    else if(obj instanceof Integer)return 'Int'
    else if(obj instanceof Boolean)return 'Bool'
    else if(obj instanceof BigDecimal)return 'BigDec'
    else if(obj instanceof Double)return 'Double'
    else if(obj instanceof Float)return 'Float'
    else if(obj instanceof Byte)return 'Byte'
    else if(obj instanceof com.hubitat.app.DeviceWrapper)return 'Device'
    else{
        //      if(eric()) log.error "object: ${describeObject(obj)}"
        return 'unknown'
    }
}

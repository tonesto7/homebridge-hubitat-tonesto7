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
//file:noinspection SpellCheckingInspection

import groovy.json.JsonOutput
import groovy.transform.Field
import groovy.transform.CompileStatic

import java.text.SimpleDateFormat
import java.util.concurrent.Semaphore
import java.util.zip.GZIPOutputStream

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
    page(name: "attrFilterPage")
    page(name: 'developmentPage')
    page(name: 'pluginConfigPage')
    page(name: 'donationPage')
    page(name: 'historyPage')
    page(name: 'deviceDebugPage')
    page(name: 'settingsPage')
    page(name: 'confirmPage')
}

// STATICALLY DEFINED VARIABLES
@Field static final String appVersionFLD  = '2.9.0'
//@Field static final String appModifiedFLD = '08-29-2023'
@Field static final String branchFLD      = 'master'
@Field static final String platformFLD    = 'Hubitat'
@Field static final String pluginNameFLD  = 'Hubitat-v2'
@Field static final Boolean devModeFLD    = false
@Field static final Map minVersionsFLD    = [plugin: 290]
@Field static final String sNULL          = (String) null
@Field static final String sBLANK         = ''
@Field static final String sSPACE         = ' '
@Field static final String sBULLET        = '\u2022'
//@Field static final String sFRNFACE       = '\u2639'
//@Field static final String okSymFLD       = '\u2713'
//@Field static final String notOkSymFLD    = '\u2715'
//@Field static final String sPAUSESymFLD   = '\u275A\u275A'
@Field static final String sEXTNRL        = 'external'
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
@Field static final String sMEDIUM        = 'medium'
@Field static final String sSMALL         = 'small'
@Field static final String sCLR4D9        = '#2784D9'
@Field static final String sCLR9B1        = '#0299B1'
@Field static final String sCLRRED        = 'red'
//@Field static final String sCLRRED2       = '#cc2d3b'
@Field static final String sCLRGRY        = 'gray'
@Field static final String sCLRGRN        = 'green'
@Field static final String sCLRGRN2       = '#43d843'
@Field static final String sCLRORG        = 'orange'
@Field static final String sTTM           = 'Tap to modify...'
@Field static final String sTTC           = 'Tap to configure...'
//@Field static final String sTTP           = 'Tap to proceed...'
@Field static final String sTTV           = 'Tap to view...'
@Field static final String sTTS           = 'Tap to select...'
// @Field static final String sPOST          = 'Post'
@Field static final String sASYNCCR       = 'asyncHttpCmdResp'
@Field static final String sLASTWU        = 'lastwebCoREUpdDt'
@Field static final String sINFO          = 'info'
@Field static final String sCMD           = 'command'
@Field static final String sCAP_SW        = 'capability.switch'
@Field static final String sSW            = 'switch'
@Field static final Integer i0            = 0
@Field static final Integer i1            = 1

// IN-MEMORY VARIABLES (Cleared only on HUB REBOOT)

@Field static final Map<String,List<String>> allowedListFLD = [
    attributes: [
        "acceleration", "alarmSystemStatus", "battery", "button", "carbonDioxideMeasurement", "carbonMonoxide", "colorTemperature", "contact", 
        "coolingSetpoint", "door", "doubleTapped", "energy", "fanMode", "fanState", "fanTargetState", "heatingSetpoint", "held", "hue", "illuminance", 
        "level", "level", "lock", "motion", "mute", "outlet", "power", "powerSource", "presence", "pushed", "saturation", "smoke", "speed", "switch", 
        "tamper", "temperature", "thermostatFanMode", "thermostatMode", "thermostatOperatingState", "thermostatSetPoint", "valve", "volume", "water", "windowShade",
    ],
    capabilities: [
        "AccelerationSensor", "Actuator", "Alarm", "AlarmSystemStatus", "Audio Mute", "Audio Volume", "Battery", "Bulb", "Button",
        "CarbonDioxideMeasurement", "CarbonMonoxideDetector", "ColorControl", "ColorTemperature", "Configuration", "ContactSensor", "Door", "DoorControl", 
        "DoubleTapableButton", "EnergyMeter", "Fan", "FanControl", "FanLight", "GarageDoorControl", "HoldableButton", "IlluminanceMeasurement", "Light", 
        "LightBulb", "Lock", "LockCodes", "Mode", "MotionSensor", "Outlet", "Piston", "Polling", "PowerMeter", "PowerSource", "PresenceSensor", "PushableButton", 
        "Refresh", "RelativeHumidityMeasurement", 
        // "ReleasableButton", 
        "Routine", "Sensor", "SmokeDetector", "Speaker", "Switch", "SwitchLevel", "TamperAlert", 
        "TemperatureMeasurement", "Thermostat", "ThermostatCoolingSetpoint", "ThermostatFanMode", "ThermostatHeatingSetpoint", "ThermostatMode", 
        "ThermostatOperatingState", "ThermostatSetpoint", "Valve", "WaterSensor", "Window", "WindowShade",
    ],
    commands: [
        "armAway", "armHome", "disarm", "auto","heat","cool", "channelDown", "channelUp", "nextTrack", "previousTrack", "emergencyHeat", "fanAuto", 
        "fanCirculate", "fanOn", "flip", "mute", "on", "off", "open", "close", "pause", "push", "hold", "doubleTap", "setColorTemperature", "setHue", 
        "setSaturation", "setCoolingSetpoint", "setFanSpeed", "setHeatingSetpoint", "setLevel", "setPosition", "setSchedule", "setSpeed", 
        "setThermostatFanMode", "setThermostatMode","setThermostatSetpoint","setTiltLevel", "setVolume", "start", "stop", "unmute", "volumeDown", "volumeUp"
    ],
]

@Field static final Map<String, String> attMapFLD = [
    'acceleration': 'Acceleration', 'battery': 'Battery', 'contact': 'Contact', 'energy': 'Energy', 'humidity': 'Humidity', 'illuminance': 'Illuminance',
    'level': 'Level', 'lock': 'Lock', 'motion': 'Motion', 'power': 'Power', 'presence': 'Presence', 'securityKeypad' : 'SecurityKeypad', 'speed': 'FanSpeed', 'switch': 'Switch', 'tamper': 'Tamper',
    'temperature': 'Temp', 'valve': 'Valve', 'pushed': 'PushableButton', 'held': 'HoldableButton', 'doubleTapped': 'DoubleTapableButton'
]

@Field static final Map<String, String> capFilterFLD = [
    'Acceleration': 'AccelerationSensor', 'Battery': 'Battery', 'Button': 'Button', 'ColorControl': 'ColorControl', 'ColorTemperature': 'ColorTemperature', 'Contact': 'ContactSensor', 'Energy': 'EnergyMeter', 'Humidity': 'RelativeHumidityMeasurement',
    'Illuminance': 'IlluminanceMeasurement', 'Level': 'SwitchLevel', 'Lock': 'Lock', 'Motion': 'MotionSensor', 'Power': 'PowerMeter', 'Presence': 'PresenceSensor', 'SecurityKeypad' : 'SecurityKeypad', 'Switch': 'Switch', 'Water': 'WaterSensor',
    'Thermostat': 'Thermostat', 'ThermostatFanMode': 'ThermostatFanMode', 'ThermostatOperatingState': 'ThermostatOperatingState', 'ThermostatSetpoint': 'ThermostatSetpoint', 'ThermostatCoolingSetpoint': 'ThermostatCoolingSetpoint', 'ThermostatHeatingSetpoint': 'ThermostatHeatingSetpoint',
    'Tamper': 'TamperAlert', 'Temp': 'TemperatureMeasurement', 'Valve': 'Valve', 'PushableButton': 'PushableButton', 'HoldableButton': 'HoldableButton', 'DoubleTapableButton': 'DoubleTapableButton',
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

static void FILL_ListVars() {
    if(!ListVars){
        List<String> items
        items = deviceSettingKeys().collect { (String)it.key }
        items = items + virtSettingKeys().collect { (String)it.key }
        ListVars = items
    }
}

def mainPage() {
    // Fill up the ListVars array
    FILL_ListVars()
    Boolean isInst = ((Boolean)state.isInstalled == true)
    if (getBoolSetting('enableWebCoRE') && !webCoREFLD) { webCoRE_init() }
    // return dynamicPage(name: 'mainPage', nextPage: (isInst ? 'confirmPage' : sBLANK), install: !isInst, uninstall: true) {
    return dynamicPage(name: 'mainPage', nextPage: sBLANK, install: true, uninstall: true) {
        appInfoSect()
        section(sectHead('Device Configuration:')) {
            String deviceDesc = getSelectedDeviceDescs()
            href 'deviceSelectPage', title: inTS1('Device Selection', 'devices2'), required: false, description: (deviceDesc ? spanSm(deviceDesc, sCLR4D9) : inputFooter('Tap to select devices...', sCLRGRY, true))
        }

        inputDupeValidation()

        section(sectHead('Attribute/Capability Filtering:')) {
            String aFilterDesc = getCustAttrFilterDesc()
            String cFilterDesc = getCapFilterDesc()
            href 'attrFilterPage', title: inTS1('Filter out attributes from your devices', 'filter'), description: aFilterDesc + (attrFiltersSelected() ? inputFooter(sTTM, sCLR4D9) : inputFooter(sTTC, sCLRGRY, true)), required: false
            href 'capFilterPage', title: inTS1('Filter out capabilities from your devices', 'filter'), description: cFilterDesc + (capFiltersSelected() ? inputFooter(sTTM, sCLR4D9) : inputFooter(sTTC, sCLRGRY, true)), required: false
        }

        section(sectHead('Location Options:')) {
            input 'addSecurityDevice', sBOOL, title: inTS1("Allow ${getAlarmSystemName()} Control in HomeKit?", 'alarm_home'), required: false, defaultValue: true, submitOnChange: true
        }

        section(sectHead('HomeBridge Plugin:')) {
            String pluginStatus = getPluginStatusDesc()
            href 'pluginConfigPage', style: 'embedded', required: false, title: inTS1('Generate Config for HomeBridge', sINFO), description: pluginStatus + inputFooter(sTTV, sCLRGRY, true)
        }

        section(sectHead('History Data & Device Debug:')) {
            href 'historyPage', title: inTS1('View Command and Event History', 'backup'), description: inputFooter(sTTV, sCLRGRY, true)
            href 'deviceDebugPage', title: inTS1('View Device Debug Data', sDBG), description: inputFooter(sTTV, sCLRGRY, true)
        }

        section(sectHead("Feature Requests/Issue Reporting"), hideable: true, hidden: true) {
            String issueUrl = "https://github.com/tonesto7/homebridge-hubitat-tonesto7/issues/new?assignees=tonesto7&labels=bug&template=bug_report.md&title=%28BUG%29+&projects=homebridge-hubitat-tonesto7%2F6"
            String featUrl = "https://github.com/tonesto7/homebridge-hubitat-tonesto7/issues/new?assignees=tonesto7&labels=enhancement&template=feature_request.md&title=%5BFeature+Request%5D&projects=homebridge-hubitat-tonesto7%2F6"
            String devUrl = "https://github.com/tonesto7/homebridge-hubitat-tonesto7/issues/new?assignees=tonesto7&labels=device_support&template=device_support.md&title=%5BDevice+Support%5D&projects=homebridge-hubitat-tonesto7%2F6"
            href url: featUrl, style: sEXTNRL, required: false, title: inTS1("New Feature Request", "info"), description: inputFooter("Tap to open browser", sCLRGRY, true)
            href url: devUrl, style: sEXTNRL, required: false, title: inTS1("Device Support", "info"), description: inputFooter("Tap to open browser", sCLRGRY, true)
            href url: issueUrl, style: sEXTNRL, required: false, title: inTS1("Report an Issue", "info"), description: inputFooter("Tap to open browser", sCLRGRY, true)
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
                if (getBoolSetting('sendViaNgrok')) { input 'ngrokHttpUrl', 'text', title: inTS1('Enter the ngrok code from the url'), required: true, submitOnChange: true }
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
            href url: url, style: sEXTNRL, title: inTS1('What is Adaptive Lighting?', sINFO), description: inputFooter('Tap to open in browser', sCLRGRY, true)
            input 'adaptive_lighting',  sBOOL, title: inTS1('Allow Supported Bulbs to Use HomeKit Adaptive Lighting?', sCMD), required: false, defaultValue: true, submitOnChange: true
            if (getBoolSetting('adaptive_lighting')) {
                input 'adaptive_lighting_offset', 'number', title: inTS1('Adaptive Lighting - Offset ColorTemp Conversions by +/- Mireds?', sCMD), range: '-100..100', required: false, defaultValue: 0, submitOnChange: true
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
            href url: url, style: sEXTNRL, title: inTS1('Test Plugin Communication?', sINFO), description: inputFooter('Tap to open in browser', sCLRGRY, true)
        }
    }
}

static Map deviceValidationErrors() {
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

    // if(tstatHeatList || tstatCoolList || tstatList || tstatFanList) {}
    return reqs
}

def deviceSelectPage() {
    return dynamicPage(name: 'deviceSelectPage', title: sBLANK, install: false, uninstall: false) {
        section(sectHead('Define Specific Categories:')) {
            paragraph spanSmBldBr('Description:', sCLR4D9) + spanSm('Each category below will adjust the device attributes to make sure they are recognized as the desired device type under HomeKit', sCLR4D9)
            paragraph spanSmBldBr('NOTE: ') + spanSmBldBr('Please do not select a device more than once in the inputs below')

            input 'lightList', sCAP_SW, title: inTS1("Lights: (${lightList ? lightList.size() : 0} Selected)", 'light_on'), description: inputFooter(sTTS, sCLRGRY, true), multiple: true, submitOnChange: true, required: false
            input 'outletList', sCAP_SW, title: inTS1("Outlets: (${outletList ? outletList.size() : 0} Selected)", 'outlet'), description: inputFooter(sTTS, sCLRGRY, true), multiple: true, submitOnChange: true, required: false
            input 'lightNoAlList', sCAP_SW, title: inTS1("Lights (No Adaptive Lighting): (${lightNoAlList ? lightNoAlList.size() : 0} Selected)", 'light_on'), description: inputFooter(sTTS, sCLRGRY, true), multiple: true, submitOnChange: true, required: false
            input 'garageList', 'capability.garageDoorControl', title: inTS1("Garage Doors: (${garageList ? garageList.size() : 0} Selected)", 'garage_door'), description: inputFooter(sTTS, sCLRGRY, true), multiple: true, submitOnChange: true, required: false
            input 'speakerList', sCAP_SW, title: inTS1("Speakers: (${speakerList ? speakerList.size() : 0} Selected)", 'media_player'), description: inputFooter(sTTS, sCLRGRY, true), multiple: true, submitOnChange: true, required: false
            input 'shadesList', 'capability.windowShade', title: inTS1("Window Shades: (${shadesList ? shadesList.size() : 0} Selected)", 'window_shade'), description: inputFooter(sTTS, sCLRGRY, true), multiple: true, submitOnChange: true, required: false
            input 'securityKeypadsList', 'capability.securityKeypad', title: inTS1("Security Keypads: (${securityKeypadsList ? securityKeypadsList.size() : 0} Selected)", 'devices2'), description: inputFooter(sTTS, sCLRGRY, true), multiple: true, submitOnChange: true, required: false
        }
        section(sectHead("Buttons:")) {
            if(pushableButtonList || holdableButtonList || doubleTapableButtonList) {
                paragraph spanSmBldBr("NOTICE:", sCLRRED) +
                        spanSmBr("Buttons are a weird device under HomeKit and don't allow any inbound action under Hubitat. They only allow you to execute actions/automations under HomeKit per button you've configured", sCLRRED) +
                        spanSmBr("Once the remote device is created under HomeKit it will remain in the unconfigured state so find it and configure each button number and pushed/held/tapped event in the Home app.", sCLRRED)
            }
            input "pushableButtonList", "capability.pushableButton", title: inTS1("Pushable Buttons: (${pushableButtonList ? pushableButtonList.size() : 0} Selected)", "button"), description: inputFooter(sTTS, sCLRGRY, true), multiple: true, submitOnChange: true, required: false
            input "holdableButtonList", "capability.holdableButton", title: inTS1("Holdable Buttons: (${holdableButtonList ? holdableButtonList.size() : 0} Selected)", "button"), description: inputFooter(sTTS, sCLRGRY, true), multiple: true, submitOnChange: true, required: false
            input "doubleTapableButtonList", "capability.doubleTapableButton", title: inTS1("Double Tapable Buttons: (${doubleTapableButtonList ? doubleTapableButtonList.size() : 0} Selected)", "button"), description: inputFooter(sTTS, sCLRGRY, true), multiple: true, submitOnChange: true, required: false
        }

        section(sectHead('Fans:')) {
            input 'fanList', sCAP_SW, title: inTS1("Fans: (${fanList ? fanList.size() : 0} Selected)", 'fan_on'), description: inputFooter(sTTS, sCLRGRY, true), multiple: true, submitOnChange: true, required: false
            input 'fan3SpdList', sCAP_SW, title: inTS1("Fans (3 Speeds): (${fan3SpdList ? fan3SpdList.size() : 0} Selected)", 'fan_on'), description: inputFooter(sTTS, sCLRGRY, true), multiple: true, submitOnChange: true, required: false
            input 'fan4SpdList', sCAP_SW, title: inTS1("Fans (4 Speeds): (${fan4SpdList ? fan4SpdList.size() : 0} Selected)", 'fan_on'), description: inputFooter(sTTS, sCLRGRY, true), multiple: true, submitOnChange: true, required: false
            input 'fan5SpdList', sCAP_SW, title: inTS1("Fans (5 Speeds): (${fan5SpdList ? fan5SpdList.size() : 0} Selected)", 'fan_on'), description: inputFooter(sTTS, sCLRGRY, true), multiple: true, submitOnChange: true, required: false
        }

        section(sectHead('Thermostats:')) {
            input 'tstatList', 'capability.thermostat', title: inTS1("Thermostats: (${tstatList ? tstatList.size() : 0} Selected)", 'thermostat'), description: inputFooter(sTTS, sCLRGRY, true), multiple: true, submitOnChange: true, required: false
            input 'tstatFanList', 'capability.thermostat', title: inTS1("Thermostats + Fan: (${tstatFanList ? tstatFanList.size() : 0} Selected)", 'thermostat'), description: inputFooter(sTTS, sCLRGRY, true), multiple: true, submitOnChange: true, required: false
            input 'tstatCoolList', 'capability.thermostat', title: inTS1("Cool Only Thermostats: (${tstatCoolList ? tstatCoolList.size() : 0} Selected)", 'thermostat'), description: inputFooter(sTTS, sCLRGRY, true), multiple: true, submitOnChange: true, required: false
            input 'tstatHeatList', 'capability.thermostat', title: inTS1("Heat Only Thermostats: (${tstatHeatList ? tstatHeatList.size() : 0} Selected)", 'thermostat'), description: inputFooter(sTTS, sCLRGRY, true), multiple: true, submitOnChange: true, required: false
        }

        section(sectHead('All Other Devices:')) {
            input 'sensorList', 'capability.sensor', title: inTS1("Sensors: (${sensorList ? sensorList.size() : 0} Selected)", 'sensors'), description: inputFooter(sTTS, sCLRGRY, true), multiple: true, submitOnChange: true, required: false
            input 'switchList', sCAP_SW, title: inTS1("Switches: (${switchList ? switchList.size() : 0} Selected)", sSW), description: inputFooter(sTTS, sCLRGRY, true), multiple: true, submitOnChange: true, required: false
            input 'deviceList', 'capability.*', title: inTS1("Others: (${deviceList ? deviceList.size() : 0} Selected)", 'devices2'), description: inputFooter(sTTS, sCLRGRY, true), multiple: true, submitOnChange: true, required: false
        }

        section(sectHead('Create Devices for Modes in HomeKit?')) {
            paragraph spanSmBldBr('What are these for?', sCLRGRY) + spanSm("Creates a virtual device for selected modes in HomeKit.<br> ${sBULLET} The switch will be ON when that mode is active.", sCLRGRY)
            List modes = ((List)location.getModes())?.sort { (String)it?.name }?.collect { [("${it?.id}".toString()): (String)it?.name] }
            input 'modeList', sENUM, title: inTS1('Create Devices for these Modes', 'mode'), required: false, description: inputFooter(sTTS, sCLRGRY, true), multiple: true, options: modes, submitOnChange: true
        }

        section(sectHead('Create Devices for WebCoRE Pistons in HomeKit?')) {
            input 'enableWebCoRE', sBOOL, title: inTS1('Enable webCoRE Integration', webCore_icon()), required: false, defaultValue: false, submitOnChange: true
            if (getBoolSetting('enableWebCoRE')) {
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
            if (getBoolSetting('resetAppToken')) { settingUpdate('resetAppToken', sFALSE, sBOOL); resetAppToken() }
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

private String getSelectedDeviceDescs() {
    List tl
    Boolean conf; conf=false
    for (String m in ListVars){
        if(!conf){
            tl = getListSetting(m)
            if(conf || tl.size()) { conf=true }
        }
    }
    String desc; desc= sNULL
    Integer devCnt = getDeviceCnt()
    if (conf) {
        //static Map<String,String> fanSettingKeys() {
        Integer fansize; fansize = 0
        List<String> items; items = fanSettingKeys().collect { (String)it.key }
        items.each { String item ->
            fansize += getListSetting(item).size()
        }

        Integer sz
        String s
        Map<String,String> akeys = deviceSettingKeys() + virtSettingKeys()
        items = [] + ListVars - items //fanSettingKeys()
        desc  = sBLANK
        items.each { String item ->
            tl = getListSetting(item)
            sz = tl.size()
            s = tl.size() > 1 ? akeys[item] : akeys[item].replace('Devices','Device')
            desc += tl.size() > 0 ? spanSmBld(s) + spanSmBr(" (${sz})") : sBLANK
        }
        desc += fansize > 0 ? spanSmBld("Fan Device${fansize > 1 ? 's' : sBLANK}") + spanSmBr(" (${fansize})") : sBLANK
        desc += getBoolSetting('addSecurityDevice') ? spanSmBld('HSM') + spanSmBr(' (1)') : sBLANK
        desc += htmlLine(sCLR4D9, 150)
        desc += spanSmBld('Devices Selected:')  + spanSmBr(" (${devCnt})")
        desc += (devCnt > 149) ? lineBr() + spanSmBld('NOTICE: ', sCLRRED) + spanSmBr('Homebridge only allows 149 Devices per HomeKit Bridge!!!', sCLRRED) : sBLANK
        desc += inputFooter(sTTM)
    }
    return desc
}

private void resetCapFilters() {
    List<String> remKeys = ((Map<String,Object>)settings).findAll { ((String)it.key).startsWith('remove') }.collect { (String)it.key }
    if (remKeys?.size() > 0) {
        remKeys.each { String k->
            settingRemove(k)
        }
    }
    settingRemove("customCapFilters")
}

private Boolean capFiltersSelected() {
    Map cFilters = parseCustomFilterStr(getStrSetting('customCapFilters') ?: sBLANK)
    Map perDev = cFilters?.perDevice ?: [:]
    List<String> global = cFilters?.global ?: []
    if (perDev && perDev?.keySet()?.size() || global && global?.size()) {
        return true
    }
    return ( ((Map<String,Object>)settings).findAll { ((String)it.key).startsWith('remove') && it.value }.collect { (String)it.key })?.size() > 0
}

private String getCapFilterDesc() {
    String desc; desc = sBLANK
    List<String> remKeys = ((Map<String,Object>)settings).findAll { ((String)it.key).startsWith('remove') && it.value != null }.collect { (String)it.key }
    if (remKeys?.size()) {
        remKeys.sort().each { String k->
            String capName = k.replaceAll('remove', sBLANK)
            Integer capSize = settings[k]?.size()
            desc += spanSmBr("${capName}: (${capSize}) Device(s)", sCLR4D9)
        }
    }
    if(desc.size() > 0) {
        desc += spanSmBr("", sCLR4D9)
    }
    List<String> capItems
    String s = getStrSetting('customCapFilters')
    capItems = s ? s.split(',').collect { String it ->  it.trim() } : []
    if (capItems?.size()) {
        capItems = capItems.unique().sort()
        desc += spanSmBr("Custom Capabilities: (${capItems.size()})", sCLR4D9)
        capItems.each { String cap->
            desc += spanSmBr(" ${sBULLET} ${cap}", sCLR4D9)
        }
    }
    return desc
}

private List<String> getCustCapFilters() {
    List<String> capItems
    String s = getStrSetting('customCapFilters')
    capItems = s ? s.split(',').collect { String it ->  it.trim() } : []
    return capItems?.size() ? capItems.unique().sort() : []
}

private void resetAttrFilters() {
    settingRemove('customAttrFilters')
}

private Boolean attrFiltersSelected() {
    Map cFilters = parseCustomFilterStr(getStrSetting('customAttrFilters') ?: sBLANK)
    Map perDev = cFilters?.perDevice ?: [:]
    List<String> global = cFilters?.global ?: []
    if (perDev && perDev.keySet()?.size() || global && global.size()) {
        return true
    }
    return false
}

private String getCustAttrFilterDesc() {
    String desc; desc = sBLANK
    Map cFilters = parseCustomFilterStr(getStrSetting('customAttrFilters') ?: sBLANK)
    // log.debug "getCustAttrFilterDesc | customFilters: ${cFilters}"
    Map perDev = cFilters?.perDevice ?: [:]
    List<String> global = cFilters?.global ?: []

    if (perDev && perDev.keySet()?.size()) {
        desc += spanSmBr("Per-Device Attributes: (${perDev.keySet().size()})", sCLR4D9)
        // perDev.each { String dev, Object attrsObj ->
        //     List attrs = attrsObj instanceof List ? attrsObj : attrsObj.toList()
        //     desc += spanSmBr("${dev}:", sCLR4D9)
        //     attrs.each { String attr->
        //         desc += spanSmBr(" ${sBULLET} ${attr}", sCLR4D9)
        //     }
        // }
    }

    if (global && global.size()) {
        List<String> attrItems = global.unique().sort()
        desc += spanSmBr("Global Attributes: (${attrItems.size()})", sCLR4D9)
        attrItems.each { String attr->
            desc += spanSmBr(" ${sBULLET} ${attr}", sCLR4D9)
        }
    }

    return desc
}

private void inputDupeValidation() {
    Map<String,Map<String,List>> clnUp = (['d': [:], 'o': [:]] as Map<String,Map<String, List>>)
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
    if (clnUp.d.size() > 0) {
        show = true
        clnUp.d.each { String k, List v->
            out += (first ? sBLANK : lineBr()) + spanBldBr("${items?.d[k]}:")
            out += spanBr(v.collect { " ${sBULLET} " + it.toString() }?.join(sLINEBR))
            first = false
        }
    }
    if (clnUp.o.size() > 0) {
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
    if (getBoolSetting('showEventLogs') || getBoolDefSetting('showEventLogs',true)) s.push("${sBULLET} Device Event Logging")
    if (getBoolSetting('showCmdLogs') || getBoolDefSetting('showCmdLogs',true)) s.push("${sBULLET} Command Event Logging")
    if (getBoolSetting('showDebugLogs')) s.push("${sBULLET} Debug Logging")
    return s.size() > 0 ? spanSmBr("${s.join('<br>')}", sCLR4D9) + inputFooter(sTTM, sCLR4D9) : inputFooter(sTTC, sCLRGRY, true)
}

def historyPage() {
    return dynamicPage(name: 'historyPage', title: sBLANK, install: false, uninstall: false) {
        List<Map> cHist = getCmdHistory()?.sort { (Long)it.gt }?.reverse()
        List<Map> eHist = getEvtHistory()?.sort { (Long)it.gt }?.reverse()
        section() {
            paragraph spanSmBldBr('Notice:', sCLRGRY, sINFO) + spanSm('This history is only stored in memory.  It is erased after every code update and Hub reboot.', sCLRGRY)
        }
        section(sectHead("Last (${cHist.size()}) Commands Received From HomeKit:")) {
            if (cHist.size() > 0) {
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
            if (eHist.size() > 0) {
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
            if (getBoolSetting('noTemp')) {
                input 'sensorAllowTemp', 'capability.sensor', title: inTS1('Allow Temps on these sensors', 'temperature'), description: inputFooter(sTTS, sCLRGRY, true), multiple: true, submitOnChange: true, required: false
            }
        }
        section(sectHead('Remove Sensor Capabilities')) {
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

        section(sectHead('Remove Actuator Capabilities')) {
            paragraph spanSmBldBr('Description:', sCLRGRY) + spanSm('These inputs will remove specific capabilities from a device preventing the addition of unwanted characteristics in devices under HomeKit', sCLRGRY)
            input 'removeColorControl', 'capability.colorControl', title: inTS1('Remove ColorControl from these Devices', 'color'), description: inputFooter(sTTS, sCLRGRY, true), multiple: true, submitOnChange: true, required: false
            input 'removeColorTemperature', 'capability.colorTemperature', title: inTS1('Remove ColorTemperature from these Devices', 'color'), description: inputFooter(sTTS, sCLRGRY, true), multiple: true, submitOnChange: true, required: false
            input 'removeLevel', 'capability.switchLevel', title: inTS1('Remove Level from these Devices', 'speed_knob'), description: inputFooter(sTTS, sCLRGRY, true), multiple: true, submitOnChange: true, required: false
            input 'removeLock', 'capability.lock', title: inTS1('Remove Lock from these Devices', 'lock'), description: inputFooter(sTTS, sCLRGRY, true), multiple: true, submitOnChange: true, required: false
            input 'removeSwitch', sCAP_SW, title: inTS1('Remove Switch from these Devices', sSW), description: inputFooter(sTTS, sCLRGRY, true), multiple: true, submitOnChange: true, required: false
            input 'removeValve', 'capability.valve', title: inTS1('Remove Valve from these Devices', 'valve'), description: inputFooter(sTTS, sCLRGRY, true), multiple: true, submitOnChange: true, required: false
        }

        section(sectHead('Remove Thermostats Capabilities')) {
            paragraph spanSmBldBr('Description:', sCLRGRY) + spanSm('These inputs allow you to remove certain capabilities from thermostats allowing you to customize your experience in HomeKit (Certain Items may break the Thermostat under HomeKit)', sCLRGRY)
            input 'removeThermostat', 'capability.thermostat', title: inTS1('Remove Thermostat from these Devices', 'thermostat'), description: inputFooter(sTTS, sCLRGRY, true), multiple: true, submitOnChange: true, required: false
            input 'removeThermostatFanMode', 'capability.thermostat', title: inTS1('Remove Thermostat Fan from these Devices', 'thermostat'), description: inputFooter(sTTS, sCLRGRY, true), multiple: true, submitOnChange: true, required: false
            input 'removeThermostatCoolingSetpoint', 'capability.thermostat', title: inTS1('Remove Thermostat Cooling from these Devices', 'thermostat'), description: inputFooter(sTTS, sCLRGRY, true), multiple: true, submitOnChange: true, required: false
            input 'removeThermostatHeatingSetpoint', 'capability.thermostat', title: inTS1('Remove Thermostat Heating from these Devices', 'thermostat'), description: inputFooter(sTTS, sCLRGRY, true), multiple: true, submitOnChange: true, required: false
            input 'removeThermostatMode', 'capability.thermostat', title: inTS1('Remove Thermostat Modes from these Devices', 'thermostat'), description: inputFooter(sTTS, sCLRGRY, true), multiple: true, submitOnChange: true, required: false
        }

        section(sectHead('Remove Buttons Capabilities')) {
            input "removeHoldableButton", "capability.holdableButton", title: inTS1("Remove Holdable Buttons from these Devices", "button"), description: inputFooter(sTTS, sCLRGRY, true), multiple: true, submitOnChange: true, required: false
            input "removeDoubleTapableButton", "capability.doubleTapableButton", title: inTS1("Remove Double Tapable Buttons from these Devices", "button"), description: inputFooter(sTTS, sCLRGRY, true), multiple: true, submitOnChange: true, required: false
            input "removePushableButton", "capability.pushableButton", title: inTS1("Remove Pushable Buttons from these Devices", "button"), description: inputFooter(sTTS, sCLRGRY, true), multiple: true, submitOnChange: true, required: false
        }

        section(sectHead('Custom Capabilities')) {
            paragraph spanSmBldBr('Description:', sCLRGRY) + spanSm('This input allows you to define custom capabilities per device and/or globally to prevent unwanted characteristics in devices under HomeKit', sCLRGRY) + 
                spanSmBr("There are 2 ways to format the data:", sCLRGRY) + 
                spanSmBr(" ${sBULLET} To filter out a specific device capabilities wrap the item in brackets like [device_id1:Battery,Temperature], [device_id2:Acceleration,Illuminance]", sCLRGRY) +
                spanSmBr(" ${sBULLET} To filter out an capabilities from all devices don't use brackets", sCLRGRY) + 
                spanSmBr(" ${sBULLET} Make sure to separate each type (per-device and global) with a comma (,)") + 
                spanSmBr(" ${sBULLET} Use the Device Debug page to see if your filter is working...", sCLRGRY) +
                spanSmBr("Here is an example of mixing per-device and global filters: [device_id1:Battery,Temperature], [device_id2:Acceleration,Illuminance], SwitchLevel", sCLRORG)
            input "customCapFilters", "textarea", title: inTS1("Enter custom capabilities", "filter"), description: "Enter the filters using the format mentioned above...",  submitOnChange: true, required: false
        }

        section(sectHead('Reset Filters:'), hideable: true, hidden: true) {
            input 'resetCapFilters', sBOOL, title: inTS1('Clear All Capability Filters?', 'reset'), required: false, defaultValue: false, submitOnChange: true
            if (getBoolSetting('resetCapFilters')) { settingUpdate('resetCapFilters', sFALSE, sBOOL); resetCapFilters() }
        }
    }
}

def attrFilterPage() {
    return dynamicPage(name: 'attrFilterPage', title: 'Attribute Filtering', install: false, uninstall: false) {
        section(sectHead('Custom Attributes')) {
            paragraph spanSmBldBr('Description:', sCLRGRY) + spanSm('This input allows you to define custom attributes per device or globally to prevent subsciption events and/or the addition of unwanted characteristics in devices under HomeKit', sCLRGRY) + 
                spanSmBr("There are 2 ways to format the data:", sCLRGRY) + 
                spanSmBr(" ${sBULLET} To filter out a specific device attributes wrap the item in brackets like [device_id1:speed,switch], [device_id2:temperature,motion]", sCLRGRY) +
                spanSmBr(" ${sBULLET} To filter out an attribute from all devices don't use brackets", sCLRGRY) + 
                spanSmBr(" ${sBULLET} Make sure to separate each type (per-device and global) with a comma (,)") + 
                spanSmBr(" ${sBULLET} Use the Device Debug page to see if your filter is working...", sCLRGRY) +
                spanSmBr("Here is an example of mixing per-device and global filters: [device_id1:speed,switch], [device_id2:temperature,motion], temperature", sCLRORG)
            input "customAttrFilters", "textarea", title: inTS1("Enter custom attributes", "filter"), description: "Enter the filters using the format mentioned above...",  submitOnChange: true, required: false
        }

        section(sectHead('Reset Filters:'), hideable: true, hidden: true) {
            input 'resetAttrFilters', sBOOL, title: inTS1('Clear All Attibute Filters?', 'reset'), required: false, defaultValue: false, submitOnChange: true
            if (getBoolSetting('resetAttrFilters')) { settingUpdate('resetAttrFilters', sFALSE, sBOOL); resetAttrFilters() }
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
            href url: textDonateLink(), style: sEXTNRL, required: false, title: inTS1('Donations', 'donations'), description: inputFooter('Tap to open in browser', sCLRGRY, true)
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
            href url: getAppEndpointUrl('alldevices'), style: sEXTNRL, required: false, title: inTS1('View Device Data Sent to Homebridge...', sINFO), description: sBLANK, disabled: true
        }

        if (devMode()) {
            section(sectHead('TimeStamp Debug Data:')) {
                Map tsMap = tsDtMapFLD[gtAppId()] ?: [:]
                paragraph "${tsMap}"
            }
        }

        section(sectHead('View Individual Device Data:')) {
            paragraph spanSmBldBr('NOTICE:', sCLRGRY) + spanSm("Do you have a device that's not working under homekit like you want?<br> ${sBULLET} Select a device from one of the inputs below and it will show you all data about the device.", sCLRGRY)
            input 'debug_device', 'capability.*', title: inTS1('All Devices:', 'devices2'), description: inputFooter(sTTS, sCLRGRY, true), multiple: false, submitOnChange: true, required: false
        }
        if (debug_other || debug_sensor || debug_switch || debug_garage || debug_tstat || debug_device) {
            section(sectHead('Device Data:'), hideable: false, hidden: false) {
                String desc; desc = viewDeviceDebugPretty()
                if (desc) {
                    // paragraph spanSmBld('Device Data:', sCLR4D9)
                    paragraph divSm(desc, sCLRGRY)
                } else {
                    paragraph spanSmBld('No Device Data Received', sCLRRED)
                }
            }
            section(sectHead('Device Data (JSON):'), hideable: false, hidden: false) {
                // paragraph spanSmBld('Device Data:', sCLR4D9)
                paragraph divSm("<textarea rows='30' class='mdl-textfield' readonly='true'>${viewDeviceDebugAsJson()}</textarea>", sCLRGRY)
            }
        }
    }
}

void clearTestDeviceItems() {
    settingRemove('debug_device')
}

private String viewDeviceDebugPretty() {
    def sDev; sDev = null
    if (debug_device) { sDev = debug_device }
    Map<String,Object> devData = getDeviceDebugMap(sDev)
    String desc; desc = sNULL
    if(devData) {
        desc = spanMdBldBr(strUnder('MetaData:'), sCLR4D9)
        desc += spanSmBld('DisplayName:')      + spanSmBr(" ${devData.name}", sCLRGRY)
        desc += spanSmBld('BaseName:')         + spanSmBr(" ${devData.basename}", sCLRGRY)
        desc += spanSmBld('DeviceID:')         + spanSmBr(" ${devData.deviceid}", sCLRGRY)
        desc += spanSmBld('Status:')           + spanSmBr(" ${devData.status}", sCLRGRY)
        desc += spanSmBld('Manufacturer:')     + spanSmBr(" ${devData.manufacturer}", sCLRGRY)
        desc += spanSmBld('Model:')            + spanSmBr(" ${devData.model}", sCLRGRY)
        desc += spanSmBld('DeviceNetworkId:')  + spanSmBr(" ${devData.deviceNetworkId}", sCLRGRY)
        desc += spanSmBld('LastActivity:')     + spanSmBr(" ${devData.lastActivity}", sCLRGRY)

        // List device attributes
        desc += lineBr() +  spanMdBldBr(strUnder('Attributes:'), sCLR4D9)
        Map<String,Object> tmp = (Map<String,Object>)devData.attributes
        if(tmp.size()) {
            tmp.keySet().sort().each { String att ->
                Boolean ck = ((List<String>)devData.attributes_filtered).contains(att)
                def val = tmp[att]
                String clr = (ck ? sCLRGRY : sCLRGRN)
                String status = (ck ? 'Filtered' : 'Allowed')
                desc += spanSm(" ${sBULLET} ") + (ck ? spanSmBr(att + ": ${val.toString()}" + " (${status})", clr) : spanSmBldBr(att + ": ${val.toString()}" + " (${status})", clr)) 
            }
        } else { desc += spanSmBldBr('No Attributes Found', sCLRRED) }

        // List device capabilities
        desc += lineBr() +  spanMdBldBr(strUnder('Capabilities:'), sCLR4D9)

        List<String> tmp1

        tmp1 = (List<String>)devData.capabilities
        if(tmp1?.size()) {
            tmp1.sort().each { String cap ->
                Boolean ck = ((List<String>)devData.capabilities_filtered).contains(cap)
                String clr = (ck ? sCLRGRY : sCLRGRN)
                String status = (ck ? 'Filtered' : 'Allowed')
                desc += spanSm(" ${sBULLET} ") + (ck ? spanSmBr(cap + " (${status})", clr) : spanSmBldBr(cap + " (${status})", clr)) 
            }
        } else { desc += spanSmBldBr('No Capabilities Found', sCLRRED) }

        // List device commands
        desc += lineBr() +  spanMdBldBr(strUnder('Commands:'), sCLR4D9)
        tmp1 = (List<String>)devData.commands
        if(tmp1?.size()) {
            tmp1.sort().each { String cmd ->
                Boolean ck = ((List<String>)devData.commands_filtered).contains(cmd)
                String clr = (ck ? sCLRGRY : sCLRGRN)
                String status = (ck ? 'Filtered' : 'Allowed')
                desc += spanSm(" ${sBULLET} ") + (ck ? spanSmBr(cmd + " (${status})", clr) : spanSmBldBr(cmd + " (${status})", clr)) 
            }
        } else { desc += spanSmBldBr('No Commands Found', sCLRRED) }

        // List event history
        desc += lineBr() +  spanMdBldBr(strUnder('Event History:'), sCLR4D9)
        tmp1 = (List<String>)devData.eventHistory
        if(tmp1?.size()) {
            tmp1.each { String evt ->
                desc += spanSmBr(" ${sBULLET} " + evt, sCLRGRY)
            }
        } else { desc += spanSmBldBr('No Events Found', sCLRRED) }
    }
    return desc
}

private String viewDeviceDebugAsJson() {
    def sDev; sDev = null
    if (debug_other)  { sDev = debug_other  }
    if (debug_sensor) { sDev = debug_sensor }
    if (debug_switch) { sDev = debug_switch }
    if (debug_garage) { sDev = debug_garage }
    if (debug_tstat)  { sDev = debug_tstat  }
    if (debug_device) { sDev = debug_device }
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
            r.deviceid = gtDevId(dev)
            r.status = dev.getStatus()
            r.manufacturer = dev.manufacturerName ?: 'Unknown'
            r.model = dev?.modelName ?: dev?.getTypeName()
            r.deviceNetworkId = dev.getDeviceNetworkId()
            aa = dev.getLastActivity()
            r.lastActivity = aa ?: null
            r.capabilities = dev.capabilities?.collect { (String)it.name }?.unique()?.sort() ?: []
            aa = deviceCapabilityList(dev)
            r.capabilities_processed = aa ?: [:]
            r.capabilities_filtered = filteredOutCaps(dev) ?: []
            r.commands = dev.supportedCommands?.collect { (String)it.name }?.unique()?.sort() ?: []
            aa = deviceCommandList(dev).sort { it?.key }
            r.commands_processed = aa ?: [:]
            r.commands_filtered = filteredOutCommands(dev) ?: []
            aa = getDeviceFlags(dev)
            r.customflags = aa ?: [:]
            r.attributes = [:]
            dev.supportedAttributes?.collect { (String)it.name }?.unique()?.sort()?.each { String it -> r.attributes[it] = dev.currentValue(it) }
            aa = deviceAttributeList(dev).sort { it?.key }
            r.attributes_processed = aa ?: [:]
            r.attributes_filtered = filteredOutAttrs(dev) ?: []
            r.eventHistory = dev.eventsSince(new Date() - 1, [max: 20])?.collect { "${it?.date} | [${it?.name}] | (${it?.value}${it?.unit ? " ${it.unit}" : sBLANK})" }
        } catch (ex) {
            logError("Error while generating device data: ${ex}", ex)
        }
    }
    return r
}

private Integer getDeviceCnt(Boolean phyOnly=false) {
    List devices; devices = []
    List items = deviceSettingKeys().collect { (String)it.key }
    items?.each { String item ->
        List si = getListSetting(item)
        if (si && si.size() > 0)
            devices = devices + si.collect { (String)"device_${gtDevId(it)}" }
    }
    if (!phyOnly) {
        virtSettingKeys().collect { (String)it.key }.each { String item->
            List si = getListSetting(item)
            if (si && si.size() > 0) {
                String aa = item.replaceAll('List', sBLANK)
                devices = devices + si.collect { "${aa}_${it}".toString() }
            }
        }
    }
    Integer dSize; dSize = devices.unique().size()
    dSize = dSize ?: 0
    if (getBoolSetting('addSecurityDevice')) { dSize = dSize + 1 }
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
    if (getBoolSetting('enableWebCoRE')) { webCoRE_poll(true) }
}

def initialize() {
    state.isInstalled = true
    remTsVal(sSVR)
    if (getAccessToken()) {
        subscribeToEvts()
        runEvery5Minutes('healthCheck')
        if (getBoolSetting('showEventLogs') && getLastTsValSecs(sEVTLOGEN, 0) == 0) { updTsVal(sEVTLOGEN) }
        if (getBoolSetting('showDebugLogs') && getLastTsValSecs(sDBGLOGEN, 0) == 0) { updTsVal(sDBGLOGEN) }
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
    if (getBoolSetting('addSecurityDevice')) {
        logInfo('Subscribed to (HSM AlarmSystem Events)')
        subscribe(location, 'hsmStatus', changeHandler)
        subscribe(location, 'hsmAlert', changeHandler)
    }
    if (getListSetting('modeList')) {
        logInfo("Subscribed to (${getListSetting('modeList').size() ?: 0} Location Modes)")
        subscribe(location, 'mode', changeHandler)
    }
    if (getBoolSetting('enableWebCoRE')) { webCoRE_init() }
}

@CompileStatic
private void healthCheck(Boolean ui=false) {
    checkVersionData()
    if (checkIfCodeUpdated(ui)) {
        logWarn('Code Version Change Detected... Health Check will occur on next cycle.')
        updated()
        return
    }
    webCoRE_poll()
    Integer lastUpd = getLastTsValSecs('lastActTs')
    Integer evtLogSec = getLastTsValSecs(sEVTLOGEN, 0)
    Integer dbgLogSec = getLastTsValSecs(sDBGLOGEN, 0)
    // log.debug "evtLogSec: $evtLogSec | dbgLogSec: $dbgLogSec"
    if (!ui && lastUpd > 14400) { remTsVal(sSVR) }

    if (evtLogSec > 7200 && getBoolSetting('showEventLogs')) { logWarn("Turning OFF Event Logs | It's been (${evtLogSec} sec)"); remTsVal(sEVTLOGEN); settingUpdate('showEventLogs', sFALSE, sBOOL) }
    else if (evtLogSec == 0 && getBoolSetting('showEventLogs')) { updTsVal(sEVTLOGEN) }
    if (dbgLogSec > 7200 && getBoolSetting('showDebugLogs')) { logWarn("Turning OFF Debug Logs | It's been (${dbgLogSec} sec)"); remTsVal(sDBGLOGEN); settingUpdate('showDebugLogs', sFALSE, sBOOL) }
    else if (dbgLogSec == 0 && getBoolSetting('showDebugLogs')) { updTsVal(sDBGLOGEN) }
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
    List<String> removeSettings = ['removeColorTemp', 'hubitatQueryString']
    removeSettings.each { String it -> if (settings.containsKey(it)) settingRemove(it) }
}

private List renderDevices() {
    Map<String,Object> devMap = [:]
    List devList = []
    List items; items = deviceSettingKeys().collect { (String)it.key }
    items = items + virtSettingKeys().collect { (String)it.key }
    items.each { String item ->
        List tl= getListSetting(item)
        if (tl.size()) {
            tl.each { dev->
                Map<String,Object> devObj
                try {
                    devObj = getDeviceData(item, dev)
                    devObj = devObj != null ? devObj : [:]
                    if (devObj.size() > 0) { devMap[(String)devObj.deviceid] = devObj }
                } catch (ex) {
                    logError("Setting key $item Device (${dev?.displayName}) | Render Exception: ${ex.message}", ex)
                }
            }
        }
    }
    if (getBoolSetting('addSecurityDevice')) { devList?.push(getSecurityDevice()) }
    if (devMap.size() > 0) { devMap.sort { (String)it.value.name }?.each { k, v-> devList.push(v) } }
    return devList
}

private Map performPluginTest(){
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
        null
    }
}

private Map<String,Object> getDeviceData(String type, sItem) {
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
            optFlags['virtual_piston'] = 1
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
            optFlags['virtual_mode'] = 1
            obj = fndMode(sItem.toString())
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
            if (sItem) {
                try {
                    if (sItem.hasAttribute('firmware')) {
                        firmware = sItem.currentValue('firmware')?.toString()
                    }
                } catch (ignored) {
                    firmware = sNULL
                }
            }
            break
    }
    if (curType && obj && sItem) {
        if (curType == 'Security Keypad') {
            return [
                name: sItem.displayName?.toString()?.replaceAll("[#\$()!%&@^']", sBLANK),
                basename: sItem.name,
                deviceid: "securityKeypad_${sItem.id}",
                status: sItem.status,
                manufacturerName: sItem.manufacturerName ?: pluginNameFLD,
                modelName: sItem.modelName ?: sItem.getTypeName(),
                serialNumber: sItem.getDeviceNetworkId(),
                firmwareVersion: firmware ?: '1.0.0',
                lastTime: sItem?.getLastActivity() ?: null,
                capabilities: ['Alarm System Status': 1, 'Alarm': 1],
                commands: [],
                attributes: ['alarmSystemStatus': getSecurityKeypadMode((String)sItem.currentValue('securityKeypad')?.toString())]
            ]
        }
        else {
            return [
                name: !isVirtual ? sItem.displayName?.toString()?.replaceAll("[#\$()!%&@^']", sBLANK) : name?.toString()?.replaceAll("[#\$()!%&@^']", sBLANK),
                basename: !isVirtual ? sItem.name : name,
                deviceid: !isVirtual ? sItem.id : devId,
                status: !isVirtual ? sItem.status : 'Online',
                manufacturerName: (!isVirtual ? sItem.manufacturerName : pluginNameFLD) ?: pluginNameFLD,
                modelName: !isVirtual ? (sItem.modelName ?: sItem.getTypeName()) : curType+" Device",
                serialNumber: !isVirtual ? sItem.getDeviceNetworkId() : curType+devId,
                firmwareVersion: firmware ?: '1.0.0',
                lastTime: !isVirtual ? (sItem.getLastActivity() ?: null) : wnow(),
                capabilities: !isVirtual ? deviceCapabilityList(sItem) : [(curType) : 1],
                commands: !isVirtual ? deviceCommandList(sItem) : [on: 1],
                deviceflags: !isVirtual ? getDeviceFlags(sItem) : optFlags,
                attributes: !isVirtual ? deviceAttributeList(sItem) : [(sSW): attrVal]
            ]
        }
    }
    return null
}

String modeSwitchState(String mode) {
    return ((String)location.getMode() == mode) ? 'on' : 'off'
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
        capabilities: ['Alarm System Status': 1, 'Alarm': 1],
        commands: [],
        attributes: ['alarmSystemStatus': getSecurityStatus()]
    ]
}

@CompileStatic
Map getDeviceFlags(device) {
    Map<String, Integer> opts = [:]
    [fan3SpdList: "fan_3_spd", fan4SpdList: "fan_4_spd", fan5SpdList: "fan_5_spd",
     lightNoAlList: "light_no_al"].each { String k, String v ->
        if (isDeviceInInput(k, gtDevId(device))) {
            opts[v] = 1
        }
    }
    // if(opts?.size()>0) log.debug "opts: ${opts}"
    return opts
}

def findDevice(String dev_id) {
    List allDevs; allDevs= []
    deviceSettingKeys().collect { (String)it.key }?.each { String key->
        List setL = getListSetting(key)
        allDevs = allDevs + (setL ?: [])
    }
    def aa = allDevs.find { gtDevId(it) == dev_id }
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
                return 0
            case 'armedAway':
            case 'away':
                return 1
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

static String mapSecurityKeypadMode(String cmd) {
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
    // log.debug "mapSecurityKeypadMode | StatusIn: (${cmd}) | ModeOut: (${kCmd})"
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
        app_id: gtAppId(),
        app_platform: platformFLD,
        use_cloud: getBoolSetting('use_cloud_endpoint'),
        polling_seconds: (Integer)settings.polling_seconds ?: 3600,
        access_token: (String)state.accessToken,
        temperature_unit: getStrSetting('temp_unit') ?: (String)location.temperatureScale,
        validateTokenId: getBoolSetting('validate_token'),
        adaptive_lighting: getBoolDefSetting('adaptive_lighting',true),
        consider_fan_by_name: getBoolDefSetting('consider_fan_by_name',true),
        consider_light_by_name: getBoolSetting('consider_light_by_name'),
        adaptive_lighting_offset: (getBoolSetting('adaptive_lighting') && settings.adaptive_lighting_offset) ? settings.adaptive_lighting_offset.toInteger() : 0,
        round_levels: getBoolDefSetting('round_levels',true),
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
        temperature_scale: getStrSetting('temp_unit') ?: (String)location.temperatureScale,
        zip_code: location?.zipCode,
        hubIP: ((List)location?.hubs)[0]?.localIP,
        use_cloud: getBoolSetting('use_cloud_endpoint'),
        app_version: appVersionFLD
    ]
}

def CommandReply(Boolean shw, String statusOut, String messageOut, Integer code) {
    String replyJson = new JsonOutput().toJson([status: statusOut, message: messageOut])
    if (shw) { logInfo(messageOut) }
    wrender contentType: sAPPJSON, data: replyJson, code: code
}

static Map getHttpHeaders(String headers) {
    Map obj = [:]
    new String(headers.decodeBase64()).split('\r\n')?.each { param ->
        List nameAndValue = param.split(sCLN)
        obj[(String)nameAndValue[0]] = (nameAndValue.length == 1) ? sBLANK : nameAndValue[1].trim()
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
    Boolean shw = getBoolSetting('showCmdLogs')
    if (shw) { logInfo("Plugin called Process Command | DeviceId: $devId | Command: ($cmd)${value1 ? " | Param1: ($value1)" : sBLANK}${value2 ? " | Param2: ($value2)" : sBLANK}") }
    if (!devId) { return }
    String command; command = cmd

    if (devId.contains("securityKeypad_") && getListSetting('securityKeypadsList')) {
        command = mapSecurityKeypadMode(command)
        devId = devId.replaceFirst("securityKeypad_", "")
    }

    if (devId == "alarmSystemStatus_${location?.id}" && getBoolSetting('addSecurityDevice')) {
        setAlarmSystemMode(command)
        Long pt = execDt ? (wnow() - execDt) : 0L
        logCmd([cmd: command, device: getAlarmSystemName(), value1: value1, value2: value2, execTime: pt])
        return CommandReply(shw, sSUCC, "Security Alarm, Command: [$command]", 200)

    } else if (command == 'mode' &&  getListSetting('modeList')) {
        if (shw) { logDebug("Virtual Mode Received: ${devId}") }
        String mdevId = devId.replaceAll('m_', sBLANK)
        changeMode(mdevId, shw)
        Long pt = execDt ? (wnow() - execDt) : 0L
        logCmd([cmd: command, device: 'Mode Device', value1: value1, value2: value2, execTime: pt])
        return CommandReply(shw, sSUCC, "Mode Device | Command: [$command] | Process Time: (${pt}ms)", 200)

    } else if (command == 'piston' && getListSetting('pistonList')) {
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

private void changeMode(String modeId, Boolean shw) {
    if (modeId) {
        Map<String,String> mode = fndMode(modeId)
        if (mode) {
            if (shw) { logInfo("Setting the Location Mode to (${mode.name})...") }
            setLocationMode(mode.name)
        } else { logError("Unable to find a matching mode for the id: ${modeId}") }
    }
}

private runPiston(rtId, Boolean shw) {
    if (rtId) {
        Map rt = findVirtPistonDevice(rtId)
        String name = (String)rt?.name
        if (name) {
            if (shw) { logInfo("Executing the (${name}) Piston...") }
            sendLocationEvent(name: rt.id, value:'homebridge', isStateChange: true, displayed: false, linkText: 'Execute Piston from homebridge', descriptionText: "Homebridge piston execute ${name}", data: [:])
            runIn(2, 'endPiston', [data: [id:rtId, name:name]])
            return name
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
    wrender contentType: sAPPJSON, data: resultJson, code: code
}

static Map findVirtPistonDevice(id) {
    Map aa = getPistonById("${id}".toString())
    return aa ?: null
}

Map<String,Integer> deviceCapabilityList(device) {
    String devid = gtDevId(device)
    if (!device || !devid) { return [:] }
    Map<String,Integer> capItems = ((List)device.getCapabilities())?.findAll { (String)it.name in allowedListFLD.capabilities }?.collectEntries { capability-> [ ((String)capability.name) :1 ] }

    if(isDeviceInInput("pushableButtonList", devid)) { capItems["Button"] = 1; capItems["PushableButton"] = 1 }
    else { capItems.remove("PushableButton") }

    if(isDeviceInInput("holdableButtonList", devid)) { capItems["Button"] = 1; capItems["HoldableButton"] = 1 }
    else { capItems.remove("HoldableButton") }

    if(isDeviceInInput("doubleTapableButtonList", devid)) { capItems["Button"] = 1; capItems["DoubleTapableButton"] = 1 }
    else { capItems.remove("DoubleTapableButton") }

    if (isDeviceInInput('lightList', devid)) { capItems['LightBulb'] = 1 }
    if (isDeviceInInput('outletList', devid)) { capItems['Outlet'] = 1 }
    if (isDeviceInInput('lightNoAlList', devid)) { capItems['LightBulb'] = 1 }
    if (isDeviceInInput('fanList', devid)) { capItems['Fan'] = 1 }
    if (isDeviceInInput('speakerList', devid)) { capItems['Speaker'] = 1 }
    if (isDeviceInInput('shadesList', devid)) { capItems['WindowShade'] = 1 }
    if (isDeviceInInput('securityKeypadsList', devid)) { capItems['SecurityKeypad'] = 1 }
    if (isDeviceInInput('garageList', devid)) { capItems['GarageDoorControl'] = 1 }
    if (isDeviceInInput('tstatList', devid)) { capItems['Thermostat'] = 1; capItems['ThermostatOperatingState'] = 1; capItems?.remove('ThermostatFanMode') }
    if (isDeviceInInput('tstatFanList', devid)) { capItems['Thermostat'] = 1; capItems['ThermostatOperatingState'] = 1 }
    if (isDeviceInInput('tstatCoolList', devid)) { capItems['Thermostat'] = 1; capItems['ThermostatOperatingState'] = 1; capItems.remove('ThermostatHeatingSetpoint') }
    if (isDeviceInInput('tstatHeatList', devid)) { capItems['Thermostat'] = 1; capItems['ThermostatOperatingState'] = 1; capItems.remove('ThermostatCoolingSetpoint') }
    //switchList, deviceList

    if (getBoolSetting('noTemp') && capItems['TemperatureMeasurement'] && (capItems['ContactSensor'] || capItems['WaterSensor'])) {
        Boolean remTemp; remTemp = true
        if (getListSetting('sensorAllowTemp') && isDeviceInInput('sensorAllowTemp', devid)) { remTemp = false }
        if (remTemp) { capItems.remove('TemperatureMeasurement') }
    }

    //This will filter out selected capabilities from the devices selected in filtering inputs.
    List<String> remKeys
    remKeys = ((Map<String,Object>)settings).findAll { ((String)it.key).startsWith('remove') && it.value != null }.collect { (String)it.key }
    if (!remKeys) remKeys = []
    Boolean sdl = getBoolSetting('showDebugLogs')
    remKeys.each { String k->
        String capName = k.replaceAll('remove', sBLANK)
        String theCap = (String)capFilterFLD[capName]
        if (theCap && capItems[theCap] && isDeviceInInput(k, devid)) {
            capItems?.remove(theCap)
            if (sdl) { logDebug("Filtering ${capName}") }
        }
    }
    return capItems?.sort { (String)it.key }
}

private List<String> filteredOutCaps(device) {
    List<String> capsFiltered; capsFiltered = []
    List<String> remKeys
    remKeys = ((Map<String,Object>)settings).findAll { ((String)it.key).startsWith('remove') && it.value != null }.collect { (String)it.key }
    if (!remKeys) remKeys = []
    remKeys.each { String k->
        String capName = k.replaceAll('remove', sBLANK)
        String theCap = capFilterFLD[capName]
        if (theCap && isDeviceInInput(k, gtDevId(device))) { capsFiltered.push(theCap) }
    }
    List custCaps = getCustCapFilters()
    if(custCaps) {
        capsFiltered = capsFiltered + device.capabilities?.findAll { ignoreCapability(device, (String)it.name) }?.collect { (String)it.name }
    }
    return capsFiltered
}

private Boolean ignoreCapability(device, String icap, Boolean inclIgnoreFld=false) {
    String cap; cap = icap.toLowerCase()
    // if (inclIgnoreFld && (cap in blockedListFLD.capabilities.collect { it.toLowerCase() })) { return true }
    if (inclIgnoreFld && !(cap in allowedListFLD.capabilities.collect { it.toLowerCase() })) { return true }
    Map customFilters = parseCustomFilterStr(getStrSetting('customCapFilters') ?: sBLANK)
    List<String> globalFilters = customFilters.global ?: []
    Map<String, List<String>> perDeviceFilters = customFilters.perDevice ?: [:]
    if (globalFilters.contains(cap)) { return true }
    String devid = gtDevId(device)
    if (perDeviceFilters[devid] && (((List<String>)perDeviceFilters[devid]).collect { it.toLowerCase() }?.contains(cap)) ) { return true }
    return false
}

Map<String,Integer> deviceCommandList(device) {
    String devid = gtDevId(device)
    if (!device || !devid) { return [:] }
    Map<String,Integer> cmds = device.supportedCommands?.findAll { !ignoreCommand((String)it.name) }?.collectEntries { c-> [ ((String)c.name) : 1 ] }
    if (isDeviceInInput('tstatList', devid)) { cmds.remove('setThermostatFanMode'); cmds.remove('fanAuto'); cmds.remove('fanOn'); cmds.remove('fanCirculate') }
    if (isDeviceInInput('tstatCoolList', devid)) { cmds.remove('setHeatingSetpoint'); cmds.remove('auto'); cmds.remove('heat') }
    if (isDeviceInInput('tstatHeatList', devid)) { cmds.remove('setCoolingSetpoint'); cmds.remove('auto'); cmds.remove('cool') }
    if (isDeviceInInput('removeColorControl', devid)) { cmds.remove('setColor'); cmds.remove('setHue'); cmds.remove('setSaturation') }
    if (isDeviceInInput('removeColorTemperature', devid)) { cmds.remove('setColorTemperature') }
    if (isDeviceInInput('removeThermostatFanMode', devid)) { cmds.remove('setThermostatFanMode'); cmds.remove("setSupportedThermostatFanModes"); cmds.remove('fanAuto'); cmds.remove('fanOn'); cmds.remove('fanCirculate') }
    if (isDeviceInInput('removeThermostatMode', devid)) { cmds.remove('setThermostatMode'); cmds.remove("setSupportedThermostatModes"); cmds.remove('auto'); cmds.remove('cool'); cmds.remove('emergencyHeat'); cmds.remove('heat') }
    if (isDeviceInInput('removeThermostatCoolingSetpoint', devid)) { cmds.remove('setCoolingSetpoint'); cmds.remove('auto'); cmds.remove('cool') }
    if (isDeviceInInput('removeThermostatHeatingSetpoint', devid)) { cmds.remove('setHeatingSetpoint'); cmds.remove('heat'); cmds.remove('emergencyHeat'); cmds.remove('auto') }
    return cmds
}

private static Boolean ignoreCommand(String cmd) {
    // return cmd && (cmd in blockedListFLD.commands)
    return cmd && !(cmd in allowedListFLD.commands)
}

private List<String> filteredOutCommands(device) {
    List<String> filtered = device.supportedCommands?.findAll { ignoreCommand((String)it.name) }?.collect { c->  (String)c.name } ?: []
    return filtered
}

private Map parseCustomFilterStr(String text) {
    Map result = [
        perDevice: [:],
        global: []
    ]

    // Match sections either inside [ ] or standalone without brackets.
    java.util.regex.Matcher matcher = text =~ /\[([^\]]+)\]|([^,\[]+)(?=\s*,|$)/
    matcher.each {
        String section
        section = it[0].trim()
        if (section.startsWith("[") && section.endsWith("]")) {
            section = section[1..-2]  // Remove the brackets
            String[] parts = section.split(":")
            if (parts.size() == 2) {
                String deviceId = parts[0].trim()
                String[] attributes = parts[1].split(",\\s*")
                result.perDevice[deviceId] = attributes
            }
        } else {
            // If no brackets, it's a global attribute
            result.global << section.trim()
        }
    }
    // log.debug "parseCustomFilterStr: ${result}"
    return result
}

private Boolean ignoreAttribute(device, String iattr, Boolean inclIgnoreFld=true) {
    String attr; attr = iattr.toLowerCase()
    if (inclIgnoreFld && !(attr in allowedListFLD.attributes.collect { it.toLowerCase() })) { return true }
    Map customFilters = parseCustomFilterStr(getStrSetting('customAttrFilters') ?: sBLANK)
    List<String> globalFilters = customFilters.global ?: []
    Map<String, List<String>> perDeviceFilters = customFilters.perDevice ?: [:]
    if (globalFilters.contains(attr)) { return true }
    String devid = gtDevId(device)
    if (perDeviceFilters[devid] && (((List<String>)perDeviceFilters[devid]).collect { it.toLowerCase() }?.contains(attr)) ) { return true }
    return false
}

private List<String> filteredOutAttrs(device) {
    List<String> filtered; filtered = []
    filtered = device.supportedAttributes?.findAll { ignoreAttribute(device, (String)it.name) }?.collect { (String)it.name }
    return filtered
}

Map<String,Object> deviceAttributeList(device) {
    String devid= gtDevId(device)
    if (!device || !devid) { return [:] }
    Map<String,Object> atts = ((List)device.getSupportedAttributes())?.findAll { (String)it.name in allowedListFLD.attributes }?.collectEntries { attribute ->
        String attr=(String)attribute.name
        try {
            // if(attr == "speed") {
            //     [(attr): getFanSpeedInteger(device.currentValue(attr))]
            // } else {
            [(attr): device.currentValue(attr)]
            // }
        } catch (ignored) {
            [(attr): null]
        }
    }
    if (isDeviceInInput('tstatCoolList', devid)) { atts.remove('heatingSetpoint'); atts.remove('heatingSetpointRange') }
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
    wrender contentType: sAPPJSON, data: deviceJson
}


static Map<String,String> deviceSettingKeys() {
    return [
        'lightList': 'Light Devices', 'lightNoAlList': 'Light (Block Adaptive Lighting) Devices', 'outletList': 'Outlet Devices',
        'pushableButtonList': 'Pushable Button Devices', 'holdableButtonList': 'Holdable Button Devices', 'doubleTapableButtonList': 'Double Tapable Button Devices',
    ] + fanSettingKeys() +
    [
        'speakerList': 'Speaker Devices', 'shadesList': 'Window Shade Devices', 'securityKeypadsList': 'Security Keypad Devices',
        'garageList': 'Garage Door Devices', 'tstatList': 'T-Stat Devices', 'tstatFanList': 'T-Stat + Fan Devices', 'tstatHeatList': 'T-Stat (HeatOnly) Devices', 'tstatCoolList': 'T-Stat (CoolOnly) Devices',
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
        shw = false //(k=='shadesList')
        List l = getListSetting(k)
        logDebug("Subscribed to (${l?.size() ?: 0}) ${v}")
        registerChangeHandler(l, shw)
    }

    logInfo("Subscribed to (${getDeviceCnt(true)} Physical Devices)")
    logDebug('-----------------------------------------------')

    if (getBoolSetting('restartService')) {
        logWarn('Sent Request to Homebridge Service to restart...')
        attemptServiceRestart()
        settingUpdate('restartService', sFALSE, sBOOL)
    }
    runIn(5, 'updateServicePrefs')
    runIn(8, 'sendDeviceRefreshCmd')
}

@CompileStatic
Boolean isDeviceInInput(String setKey, String devId) {
    List l = getListSetting(setKey)
    if (l) {
        return (l.find { gtDevId(it) == devId })
    }
    return false
}



void registerChangeHandler(List devices, Boolean showlog=false) {
    devices?.each { device ->
        String devid = gtDevId(device)
        List<String> theAtts = ((List)device.getSupportedAttributes())?.collect { (String)it.name }?.unique()
        if (showlog) { log.debug "atts: ${theAtts}" }
        theAtts?.each { String att ->
            if (allowedListFLD.attributes.contains(att)) {
                if (getBoolSetting('noTemp') && att == 'temperature' && (device.hasAttribute('contact') || device.hasAttribute('water'))) {
                    Boolean skipAtt; skipAtt = true
                    if (getListSetting('sensorAllowTemp')) {
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
            ((List<String>)getListSetting('modeList'))?.each { id ->
                Map<String,String> md = fndMode(id)
                if (md && md.id) {
                    String devId = 'm_'+md.id
                    sendItems.push([evtSource: 'MODE', evtDeviceName: "Mode - ${md.name}", evtDeviceId: devId, evtAttr: sSW, evtValue: modeSwitchState(md.name), evtUnit: sBLANK, evtDate: dt])
                }
            }
            break
        case 'webCoRE':
            if (getBoolSetting('enableWebCoRE')) {
                sendEvt = false
                if ((String)evt.value == 'pistonList') {
                    List<Map> p; p = (List<Map>)webCoREFLD?.pistons ?: []
                    Map d = evt.jsonData ?: [:]
                    if (d.id && d.pistons && (d.pistons instanceof List)) {
                        p.removeAll { it.iid == d.id }
                        p += ((List<Map>)d.pistons).collect { [iid:d.id] + it }.sort { (String)it.name }
                        def a = webCoREFLD?.cbk
                        webCoREFLD = [cbk: a, updated: wnow(), pistons: p]
                        updTsVal(sLASTWU)
                    }

                    if (evtLog) { logDebug("got webCoRE piston list event $webCoREFLD") }
                    break
                } else if ((String)evt.value == 'pistonExecuted') {
                    ((List<String>)getListSetting('pistonList'))?.each { String id ->
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

        // case 'speed': 
        //     if (isDeviceInInput('fanList', deviceid) || isDeviceInInput('fan3SpdList', deviceid) || isDeviceInInput('fan4SpdList', deviceid) || isDeviceInInput('fan5SpdList', deviceid)) {
        //         // Convert the speed to a number for Homebridge based on it's speed 3,4,5 speed type
        //         Integer fanSpd = 1
        //         if (isDeviceInInput('fan3SpdList', deviceid)) fanSpd = 3
        //         if (isDeviceInInput('fan4SpdList', deviceid)) fanSpd = 4
        //         if (isDeviceInInput('fan5SpdList', deviceid)) fanSpd = 5
        //         Integer newSpdVal = getFanSpeedInteger(value, fanSpd)

        //         log.debug "Fan Speed: ${value} | New Speed: ${newSpdVal}"
        //         sendItems.push([evtSource: src, evtDeviceName: deviceName, evtDeviceId: deviceid, evtAttr: attr, evtValue: newSpdVal, evtUnit: evt?.unit ?: sBLANK, evtDate: dt])
        //     }
        //     break
        default:
            sendItems.push([evtSource: src, evtDeviceName: deviceName, evtDeviceId: deviceid, evtAttr: attr, evtValue: value, evtUnit: evt?.unit ?: sBLANK, evtDate: dt, evtData: null])
            break
    }

    if (sendEvt && sendItems.size() > 0) {
        String server = getServerAddress()
        if (server == sCLN || server == sNLCLN ) { // can be configured ngrok??
            return
        }

        //Send Using the Direct Mechanism
        sendItems.each { Map send->
            if (evtLog) { //if(getBoolSetting('showEventLogs')) {
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
                        unitStr = "${send.evtUnit}"
                        break
                }
                logInfo("Sending ${send.evtSource ?: sBLANK} Event (${send.evtDeviceName} | ${((String)send.evtAttr).toUpperCase()}: ${send.evtValue}${unitStr}) ${send.evtData ? "Data: ${send.evtData}" : sBLANK} to Homebridge at (${server})")
            }
            sendHttpPost(sUPD, [
                change_name     : send.evtDeviceName,
                change_device   : send.evtDeviceId,
                change_attribute: send.evtAttr,
                change_value    : send.evtValue,
                change_data     : send.evtData,
                change_date     : send.evtDate,
                app_id          : gtAppId(),
                access_token    : getTsVal(sATK)
            ], sEVTUPD, evtLog)
            logEvt([name: send.evtAttr, value: send.evtValue, device: send.evtDeviceName, execTime: wnow() - execDt])
        }
    }
}

private static Integer getFanSpeedInteger(String speed, Integer numberOfSpeeds = 3) {
    Map<String, Integer> speedMappings = [
        "low": 0,
        "medium-low": 25,
        "medium": 50,
        "medium-high": 75,
        "high": 100,
        "on": 100,
        "off": 0,
        "auto": 50  // You can adjust this based on your needs
    ]

    Integer speedPercentage
    speedPercentage = speedMappings[speed] ?: 0
    // Adjust percentage based on the number of speeds
    //  -1 because index is 0-based
    speedPercentage = Math.round( ((speedPercentage / 100.0) * (numberOfSpeeds - 1)) * 100).toInteger()
    
    return speedPercentage

}

void sendHttpPost(String path, Map body, String src=sBLANK, Boolean evtLog, String contentType = sAPPJSON) {
    String server = getServerAddress()
    Boolean sendVia = getBoolSetting('sendViaNgrok')
    String url = sendVia ? getStrSetting('ngrokHttpUrl') : sBLANK
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
        logDebug("Send to plugin Completed | Process Time: (${data?.execDt ? (wnow()-(Long)data.execDt) : 0}ms)")
    }
}

@CompileStatic
String getServerAddress() {
    String sv; sv = getTsVal(sSVR)
    if (sv == sNULL) {
        Map pluginDetails = (Map)gtState('pluginDetails') ?: [:]
        sv = "${pluginDetails.directIP}:${pluginDetails.directPort}".toString()
        updTsVal(sSVR, sv)
        updTsVal(sDBG, getBoolSetting('showDebugLogs').toString())
        updTsVal(sEVT, getBoolSetting('showEventLogs').toString())
        updTsVal(sATK, (String)gtState('accessToken'))
        updTsVal('lastActTs')
    }
    return sv
}

String getPluginStatusDesc() {
    String out; out = sBLANK
    Map pluginDetails = state.pluginDetails ?: [:]
    if(pluginDetails && pluginDetails.keySet().size() > 0) {
        out += pluginDetails?.directIP && pluginDetails?.directPort ? spanSmBld('Plugin Server:', sCLRGRY) + spanSmBr(" ${pluginDetails?.directIP}:${pluginDetails?.directPort}", sCLRGRY) : sBLANK
        out += state?.pluginDetails?.version ? spanSmBld('Plugin Version:', sCLRGRY) + spanSmBr(" v${state?.pluginDetails?.version}", sCLRGRY) : sBLANK
        out += spanBr(" ")
    }
    return out
}

private Map<String,String> fndMode(String m){
    def mode= ((List)location.getModes())?.find{ it-> ((Long)it.getId()).toString()==m || (String)it.getName()==m }
    return mode ? [ id: ((Long)mode.getId()).toString(), name: (String)mode.getName()] :null
}

@Field volatile static Map<String,Object> webCoREFLD = [:]

private static String webCoRE_handle() { return 'webCoRE' }

static String webCore_icon() { return 'https://raw.githubusercontent.com/ady624/webCoRE/master/resources/icons/app-CoRE.png' }

private webCoRE_init(pistonExecutedCbk=null) {
    if (getBoolSetting('enableWebCoRE')) {
        List tmp = getListSetting('pistonList')
        if (tmp) { logInfo("Subscribed to (${tmp.size()} WebCoRE Pistons)") }
        subscribe(location, webCoRE_handle(), changeHandler)
        if (!webCoREFLD) {
            webCoREFLD = [:] + [cbk:true] // pistonExecutedCbk]
            webCoRE_poll(true)
        }
    }
}

private void webCoRE_poll(Boolean now = false) {
    if (getBoolSetting('enableWebCoRE')) {
        Integer lastUpd = getLastTsValSecs(sLASTWU)
        if ((lastUpd > (3600 * 24)) || (now && lastUpd > 300)) {
            sendLocationEvent(name: 'webCoRE.poll', value: 'poll') // ask webCoRE for piston list
            updTsVal(sLASTWU)
        }
    }
}

static List webCoRE_list() {
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
        app_id: gtAppId(),
        access_token: (String)state.accessToken
    ], 'activateDirectUpdates', getBoolSetting('showDebugLogs'))
}

void attemptServiceRestart(Boolean isLocal=false) {
    logTrace("attemptServiceRestart: ${getServerAddress()}${isLocal ? ' | (Local)' : sBLANK}")
    sendHttpPost('restart', [
        app_id: gtAppId(),
        access_token: (String)state.accessToken
    ], 'attemptServiceRestart', getBoolSetting('showDebugLogs'))
}

void sendDeviceRefreshCmd(Boolean isLocal=false) {
    logTrace("sendDeviceRefreshCmd: ${getServerAddress()}${isLocal ? ' | (Local)' : sBLANK}")
    sendHttpPost('refreshDevices', [
        app_id: gtAppId(),
        access_token: (String)state.accessToken
    ], 'sendDeviceRefreshCmd', getBoolSetting('showDebugLogs'))
}

void updateServicePrefs(Boolean isLocal=false) {
    logTrace("updateServicePrefs: ${getServerAddress()}${isLocal ? ' | (Local)' : sBLANK}")
    sendHttpPost('updateprefs', [
        app_id: gtAppId(),
        access_token: (String)state.accessToken,
        use_cloud: getBoolSetting('use_cloud_endpoint'),
        validateTokenId: getBoolSetting('validate_token'),
        local_hub_ip: ((List)location?.hubs)[0]?.localIP
    ], 'updateServicePrefs', getBoolSetting('showDebugLogs'))
}

def pluginStatus() {
    logTrace('Plugin called... pluginStatus()')
    def body = request?.JSON
    state.pluginUpdates = [hasUpdate: (body?.hasUpdate == true), newVersion: (body?.newVersion ?: null)]
    if (body?.version) { updCodeVerMap('plugin', (String)body?.version) }
    String resultJson = new JsonOutput().toJson([status: 'OK'])
    wrender contentType: sAPPJSON, data: resultJson
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
    wrender contentType: sAPPJSON, data: resultJson
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
        if (bIs(minUpdMap,'updRequired') && ((List)minUpdMap.updItems).size() > 0) {
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
static String strStrkTh(String str) { return str ? "<s>${str}</s>"  : sBLANK }
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
static String spanStrkTh(String str, String clr=sNULL)                     { return str ? span(strStrkTh(str), clr, sNULL, false, false) : sBLANK }
static String spanStrkThBr(String str, String clr=sNULL)                   { return str ? span(strStrkTh(str), clr, sNULL, false, true) : sBLANK }
static String spanStrkThBld(String str, String clr=sNULL)                  { return str ? span(strStrkTh(str), clr, sNULL, true, false) : sBLANK }
static String spanStrkThBldBr(String str, String clr=sNULL)                { return str ? span(strStrkTh(str), clr, sNULL, true, true) : sBLANK }
static String spanMd(String str, String clr=sNULL, String img=sNULL)       { return str ? spanImgStr(img) + span(str, clr, sMEDIUM)                : sBLANK }
static String spanMdBr(String str, String clr=sNULL, String img=sNULL)     { return str ? spanImgStr(img) + span(str, clr, sMEDIUM, false, true)   : sBLANK }
static String spanMdBld(String str, String clr=sNULL, String img=sNULL)    { return str ? spanImgStr(img) + span(str, clr, sMEDIUM, true)          : sBLANK }
static String spanMdBldBr(String str, String clr=sNULL, String img=sNULL)  { return str ? spanImgStr(img) + span(str, clr, sMEDIUM, true, true)    : sBLANK }

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

static Integer versionStr2Int(String str) { return str ? str.tokenize('-')[0]?.replaceAll("\\.", sBLANK)?.toInteger() : null }

static String versionCleanup(String str) { return str ? str.tokenize('-')[0] : sNULL }

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
                for (Integer i = 0; i < commonIndices; ++i) {
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

@CompileStatic
Integer getLastTsValSecs(String val, Integer nullVal=1000000) {
    String appId = gtAppId()
    Map tsMap = tsDtMapFLD[appId] ?: [:]
    return (val && tsMap && tsMap[val]) ? GetTimeDiffSeconds((String)tsMap[val]).toInteger() : nullVal
}

@CompileStatic
private void updTsVal(String key, String dt=sNULL) {
    String appId = gtAppId()
    Map data = tsDtMapFLD[appId] ?: [:]
    if (key) { data[key] = dt ?: getDtNow() }
    tsDtMapFLD[appId] = data
    tsDtMapFLD = tsDtMapFLD
}

private void remTsVal(key) {
    String appId = gtAppId()
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

@CompileStatic
private String getTsVal(String val) {
    String appId = gtAppId()
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

@CompileStatic
private void checkVersionData(Boolean now = false) { //This reads a JSON file from GitHub with version numbers
    Integer lastUpd = getLastTsValSecs('lastAppDataUpdDt')
    if (now || !gtState('appData') || (lastUpd > (3600 * 6))) {
        if (now && (lastUpd < 300)) { return }
        getConfigData()
    }
}

@CompileStatic
void getConfigData() {
    Map params = [
        uri: 'https://raw.githubusercontent.com/tonesto7/homebridge-hubitat-tonesto7/master/appData.json',
        contentType: sAPPJSON,
        timeout: 20
    ]
    Map data = (Map)getWebData(params, 'appData', false)
    if (data) {
        assignSt('appData',data)
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
@CompileStatic
static String formatDt(Date dt, Boolean tzChg=false) {
    SimpleDateFormat tf = new SimpleDateFormat('E MMM dd HH:mm:ss z yyyy')
    if (tzChg && getDefTz()) { tf.setTimeZone(getDefTz()) }
    return tf.format(dt)
}

@CompileStatic
static String getDtNow() {
    Date now = new Date()
    return formatDt(now)
}

@CompileStatic
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
Boolean showDonationOk() { return ((Boolean)state.isInstalled && !state?.installData?.shownDonation && getDaysSinceUpdated() >= 30 && !getBoolSetting('sentDonation')) }

Integer getDaysSinceUpdated() {
    def t0 = state.installData?.updatedDt
    String updDt = t0 ? (String)t0 : sNULL
    if (updDt == sNULL || updDt == 'Not Set') {
        updInstData('updatedDt', getDtNow())
        return 0
    }
    Date start = Date.parse('E MMM dd HH:mm:ss z yyyy', updDt)
    Date stop = new Date()
    if (start && stop) { return (stop - start) }
    return 0
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

@Field volatile static Map<String,Map<String,List<Map>>> historyMapFLD = [:]

private void addToHistory(String logKey, Map data, Integer max=10) {
    String appId = gtAppId()
    Boolean ssOk = true
    /* groovylint-disable-next-line UnusedVariable */
    getTheLock(sHMLF, "addToHistory(${logKey})")
    // log.trace "lock wait: ${aa}"

    Map<String,List<Map>> memStore = historyMapFLD[appId] ?: [:]
    List<Map> eData; eData = (List<Map>)memStore[logKey] ?: []
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

private void logDebug(String msg)  { if (getBoolSetting('showDebugLogs')) logPrefix(sDBG, msg, "purple") }
private void logTrace(String msg)  { if (getBoolSetting('showDebugLogs')) logPrefix('trace', msg, sCLRGRY) }
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
    String pad; pad = sBLANK
    if (lvl in ['warn', sINFO]) { pad = sSPACE }
    log."$lvl" pad + span("Homebridge (v${appVersionFLD}) | ", sCLRGRY) + span(msg, color)
}

private List<Map> getCmdHistory() {
    getTheLock(sHMLF, 'getCmdHistory')
    // log.trace "lock wait: ${aa}"

    List<Map> his; his = getMemStoreItem('cmdHistory')
    if (his == null) his = []
    List<Map> newHis = (List<Map>)[] + his

    releaseTheLock(sHMLF)
    return newHis
}

private List<Map> getEvtHistory() {
    getTheLock(sHMLF, 'getEvtHistory')
    // log.trace "lock wait: ${aa}"

    List<Map> his; his = getMemStoreItem('evtHistory')
    if (his == null) his = []
    List<Map> newHis = (List<Map>)[] + his

    releaseTheLock(sHMLF)
    return newHis
}

private void clearHistory() {
    String appId = gtAppId()
    getTheLock(sHMLF, 'clearHistory')
    // log.trace "lock wait: ${aa}"

    historyMapFLD.put(appId, [:] as Map<String,List<Map>>)
    historyMapFLD = historyMapFLD

    releaseTheLock(sHMLF)
}

private void logEvt(Map evtData) { addToHistory('evtHistory', evtData, 25) }
private void logCmd(Map cmdData) { addToHistory('cmdHistory', cmdData, 25) }

// FIELD VARIABLE FUNCTIONS
private void updMemStoreItem(String key, List val) {
    String appId = gtAppId()
    Map memStore = historyMapFLD[appId] ?: [:]
    memStore[key] = val
    historyMapFLD[appId] = memStore
    historyMapFLD = historyMapFLD
// log.debug("updMemStoreItem(${key}): ${memStore[key]}")
}

private List getMemStoreItem(String key) {
    String appId = gtAppId()
    Map<String, List<Map>> memStore = historyMapFLD[appId] ?: [:]
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

@CompileStatic
static Integer getSemaNum(String name) {
    if (name == sHMLF) return 0
    //log.warn 'unrecognized lock name...'
    return 0
    // Integer stripes=22
    // if(name.isNumber()) return name.toInteger()%stripes
    // Integer hash=smear(name.hashCode())
    // return Math.abs(hash)%stripes
    // log.info "sema $name # $sema"
}

@CompileStatic
static Semaphore getSema(Integer snum) {
    switch (snum) {
        case 0:
            return histMapLockFLD
        default: // log.error "bad hash result $snum"
            return null
    }
}

@Field volatile static Map<String,Long> lockTimesFLD = [:]
@Field volatile static Map<String,String> lockHolderFLD = [:]

@CompileStatic
void getTheLock(String qname,String meth=sNULL,Boolean longWait=false) {
    Boolean a = getTheLockW(qname,meth,longWait)
}

@CompileStatic
Boolean getTheLockW(String qname, String meth=sNULL, Boolean longWait=false) {
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
        if (devMode()) { logWarn "waiting for ${qname} ${semaSNum} lock access, $meth, long: $longWait, holder: ${(String)lockHolderFLD[semaSNum]}" }
        wpauseExecution(waitT)
        wait = true
        if ((wnow() - timeL) > 30000L) {
            releaseTheLock(qname)
            if (devMode()) { logWarn "overriding lock $meth" }
        }
    }
    lockTimesFLD[semaSNum] = wnow()
    lockTimesFLD = lockTimesFLD
    lockHolderFLD[semaSNum] = "${gtAppId()} ${meth}".toString()
    lockHolderFLD = lockHolderFLD
    return wait
}

@CompileStatic
static void releaseTheLock(String qname) {
    Integer semaNum = getSemaNum(qname)
    String semaSNum = semaNum.toString()
    Semaphore sema = getSema(semaNum)
    lockTimesFLD[semaSNum] = (Long)null
    lockTimesFLD = lockTimesFLD
    lockHolderFLD[semaSNum] = sNULL
    lockHolderFLD = lockHolderFLD
    sema.release()
}

String gtDevId(dev){ return (String)dev.getId() }

String gtAppId(){ return ((Long)app.getId()).toString() }

private Long wnow(){ return (Long)now() }
private static TimeZone getDefTz() { return TimeZone.getDefault() }

private void wpauseExecution(Long t) { pauseExecution(t) }

@CompileStatic
private static Boolean bIs(Map m,String v) { (Boolean)m.get(v) }

/** m.string  */
@CompileStatic
private static String sMs(Map m,String v) { (String)m[v] }

private void assignSt(String name,v) { ((Map)state).put(name,v) }
private gtState(String name) { return state.get(name) }

private getSetting(String name) { return settings.get(name) }
private String getStrSetting(String name) { return (String)settings.get(name) }
private Boolean getBoolSetting(String name) { return (Boolean)settings.get(name) == true }
private Boolean getBoolDefSetting(String name,Boolean defVal=true){
    if(settings.get(name) == null) {
        settingUpdate(name,defVal.toString(),sBOOL)
        return defVal
    }
    return getBoolSetting(name)
}

private List getListSetting(String name) { return (List)settings.get(name) ?: [] }

static String getObjType(obj) {
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

@Field static final String sAE = 'Accept-encoding'
@Field static final String sCE = 'Content-Encoding'
@Field static final String sGZIP = 'gzip'
@Field static final String sDATA = 'data'
@Field static final String sUTF8 = 'UTF-8'

private Map wrender(Map options=[:]){
    //debug "wrender: options:: ${options} "
    //debug "request: ${request} "
    Map h=(Map)request?.headers
    if(h && sMs(h,sAE)?.contains(sGZIP)){
//              debug "will accept gzip"
        String s=sMs(options,sDATA)
        Integer sz=s?.length()
        if(sz>256){
            try{
                String a= string2gzip(s)
                Integer nsz=a.size()
                if(devMode())logDebug "options.data is $sz after compression $nsz  saving ${Math.round((1.0D-(nsz/sz))*1000.0D)/10.0D}%"
//                              options[sDATA]=a
//                              options[sCE]=sGZIP
            }catch(ignored){}
        }
    }
    render(options)
}

static String string2gzip(String s) {
    ByteArrayOutputStream baos= new ByteArrayOutputStream()
    GZIPOutputStream zipStream= new GZIPOutputStream(baos)
    zipStream.write(s.getBytes(sUTF8))
    zipStream.close()
    byte[] result= baos.toByteArray()
    baos.close()
    return result.encodeBase64()
}

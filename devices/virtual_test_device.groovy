/* groovylint-disable DuplicateListLiteral, DuplicateMapLiteral, MethodParameterTypeRequired, UnnecessaryObjectReferences, UnnecessarySetter, VariableTypeRequired */
/*************
*  Virtual Omni Sensor Plus
*  Copyright 2021 Terrel Allen All Rights Reserved
*
*  This program is free software: you can redistribute it and/or modify
*  it under the terms of the GNU Affero General Public License as published
*  by the Free Software Foundation, either version 3 of the License, or
*  (at your option) any later version.
*
*  This program is distributed in the hope that it will be useful,
*  but WITHOUT ANY WARRANTY; without even the implied warranty of
*  MERCHANTABILITY or FITNESS FOR A PARTICULAR PURPOSE.  See the
*  GNU Affero General Public License for more details.
*
*  You should have received a copy of the GNU Affero General Public License
*  along with this program.  If not, see <http://www.gnu.org/licenses/>.
*
*  WARNING!!!
*  Use at your own risk.
*  Modify at your own risk.
*
*  USAGE
*  Repalces existing Virtual Omni Sensor driver
*  Adds additonal capabilities, commands, and attributes not available
*      in the default Virtual Omni Sensor driver
*
*  CHANGE LOG
*  v202110031411
*      -add threeAxis
*  v202110022249
*      -updates to event descriptive text for humidity
*      -add hours and minutes to change log dates
*  v202110020000
*      -change batteryLevel attribute back to battery
*  v202110010000
*      -add header
*      -add battery status
*      -add battery last updated
*  v20210930
*      -initial release w/ battery level and tamper
*
*************/
import groovy.json.JsonSlurper
import groovy.transform.Field

@Field static Map LIGHT_EFFECTS = [1:'Fire Place', 2:'Storm', 3:'Deep Fade', 4:'Lite Fade', 5:'Police']

metadata {
    definition(name: 'Virtual Omni Sensor Plus',
                namespace: 'whodunitGorilla',
                author: 'Terrel Allen',
                importUrl: 'https://raw.githubusercontent.com/terrelsa13/Device-Mirror-Plus/master/virtualOmniSensorPlus.groovy')
    {
        capability 'AccelerationSensor'
        capability 'AirQuality'
        capability 'Battery'
        capability 'Bulb'
        capability 'CarbonDioxideMeasurement'
        capability 'CarbonMonoxideDetector'
        capability 'ColorControl'
        capability 'ColorTemperature'
        capability 'ContactSensor'
        capability 'DoorControl'
        capability 'EnergyMeter'
        capability 'FanControl'
        capability 'FilterStatus'
        capability 'GarageDoorControl'
        capability 'IlluminanceMeasurement'
        capability 'LightEffects'
        capability 'Lock'
        capability 'MotionSensor'
        capability 'PowerMeter'
        capability 'PowerSource'
        capability 'PresenceSensor'
        capability 'RelativeHumidityMeasurement'
        capability 'SmokeDetector'
        capability 'Switch'
        capability 'SwitchLevel'
        capability 'TamperAlert'
        capability 'TemperatureMeasurement'
        capability 'ThreeAxis'
        capability 'WaterSensor'
        capability 'WindowShade'
        capability 'Valve'

        command 'bulbOn'
        command 'bulbOff'
        command 'doorOpen'
        command 'doorClose'
        command 'valveOpen'
        command 'valveClose'
        command 'windowShadeOpen'
        command 'windowShadeClose'
        command 'garageDoorOpen'
        command 'garageDoorClose'

        command 'setBulb', [[name: 'Set Bulb', constraints: ['on', 'off'], type: 'ENUM']]
        command 'setDoor', [[name: 'Set Door', constraints: ['open', 'closed'], type: 'ENUM']]
        command 'setLock', [[name: 'Set Lock', constraints: ['locked', 'unlocked with timeout', 'unlocked', 'unknown'], type: 'ENUM']]
        command 'setSwitch', [[name: 'Set Switch', constraints: ['on', 'off'], type: 'ENUM']]
        command 'setSwitchLevel', ['Number']
        command 'setValve', [[name: 'Set Valve', constraints: ['open', 'closed'], type: 'ENUM']]
        command 'setWindowShade', [[name: 'Set Window Shade', constraints: ['opening', 'partially open', 'closed', 'open', 'closing', 'unknown'], type: 'ENUM']]
        command 'setGarageDoor', [[name: 'Set Garage Door', constraints: ['unknown', 'open', 'closing', 'closed', 'opening'], type: 'ENUM']]

        command 'setHue', ['NUMBER']
        command 'setSaturation', ['NUMBER']
        command 'setColor', ['MAP']
        command 'setColorTemperature', ['NUMBER']

        command 'arrived'
        command 'departed'
        command 'accelerationActive'
        command 'accelerationInactive'
        command 'motionActive'
        command 'motionInactive'
        command 'open'
        command 'close'
        command 'CODetected'
        command 'COClear'
        command 'smokeDetected'
        command 'smokeClear'
        command 'setCarbonDioxide', ['Number']
        command 'setAirQualityIndex', ['Number']
        command 'setPM2_5', ['Number']
        command 'setIlluminance', ['Number']
        command 'setRelativeHumidity', ['Number']
        command 'setTemperature', ['Number']
        command 'wet'
        command 'dry'
        command 'setVariable', ['String']
        command 'setEnergy', ['Number']
        command 'setPower', ['Number']
        command 'setPowerSource', [[name: 'Set Power Source', constraints: ['battery', 'dc', 'mains', 'unknown'], type: 'ENUM']]
        command 'setBattery', ['Number']
        command 'batteryStatusIdle'
        command 'batteryStatusDischarging'
        command 'batteryStatusCharging'
        command 'tamperClear'
        command 'tamperDetected'
        command 'threeAxis', [[name:'x', type:'NUMBER', description:'X-Axis', constraints:['NUMBER']], [name:'y', type:'NUMBER', description:'Y-Axis', constraints:['NUMBER']], [name:'z', type:'NUMBER', description:'Z-Axis', constraints:['NUMBER']]]
        command 'setThreeAxis'
        command 'setSpeed', [[name: 'Set Speed', constraints: ['low', 'medium-low', 'medium', 'meidium-high', 'high', 'on', 'off', 'auto'], type: 'ENUM']]
        command 'setWaterLevel', ['Number']
        command 'cycleSpeed'
        command 'setFilterReplace'
        command 'setFilterNormal'

        command 'setLightEffects', [[name: 'Replace LightEffects', type: 'JSON_OBJECT']]

        attribute 'variable', 'String'
        attribute 'batteryStatus', 'String'
        attribute 'batteryLastUpdated', 'Date'
        attribute 'waterLevel', 'Number'
        attribute 'currentColor', 'String'
    }
    preferences {
        input name: 'logEnable', type: 'bool', title: 'Enable debug logging', defaultValue: true
        input name: 'txtEnable', type: 'bool', title: 'Enable descriptionText logging', defaultValue: true
    }
}

def logsOff() {
    log.warn 'debug logging disabled...'
    device.updateSetting('logEnable', [value:'false', type:'bool'])
}

def installed() {
    log.warn 'installed...'
    initialized()
    arrived()
    accelerationInactive()
    COClear()
    close()
    setIlluminance(50)
    setCarbonDioxide(350)
    setRelativeHumidity(35)
    motionInactive()
    smokeClear()
    setBulb('off')
    setDoor('closed')
    setLock('locked')
    setSwitch('off')
    setSwitchLevel(0)
    setValve('closed')
    setWindowShade('closed')
    setGarageDoor('closed')
    setAirQualityIndex(50)
    setPM2_5(10)
    setLevel(0)
    setTemperature(70)
    dry()
    setBatteryStatus('unknown')
    setFilterNormal()

    setHue(0)
    setSaturation(0)
    setColorTemperature(2700) // Default warm white

    tamperClear()
    runIn(1800, logsOff)
}

void initialized() {
    //Clear warning count for out of range battery level
    state.warningCount = 0
}

def updated() {
    log.info 'updated...'
    log.warn "debug logging is: ${logEnable == true}"
    log.warn "description logging is: ${txtEnable == true}"
    setInitialLightEffects()
    updateCurrentColor()
    if (logEnable) runIn(1800, logsOff)
}

def parse(String description) {
}

def arrived() {
    def descriptionText = "${device.displayName} has arrived"
    if (txtEnable) log.info "${descriptionText}"
    sendEvent(name: 'presence', value: 'present', descriptionText: descriptionText)
}

def departed() {
    def descriptionText = "${device.displayName} has departed"
    if (txtEnable) log.info "${descriptionText}"
    sendEvent(name: 'presence', value: 'not present', descriptionText: descriptionText)
}

def accelerationActive() {
    def descriptionText = "${device.displayName} acceleration is active"
    if (txtEnable) log.info "${descriptionText}"
    sendEvent(name: 'acceleration', value: 'active', descriptionText: descriptionText)
}

def accelerationInactive() {
    def descriptionText = "${device.displayName} acceleration is inactive"
    if (txtEnable) log.info "${descriptionText}"
    sendEvent(name: 'acceleration', value: 'inactive', descriptionText: descriptionText)
}

def CODetected() {
    def descriptionText = "${device.displayName} CO detected"
    if (txtEnable) log.info "${descriptionText}"
    sendEvent(name: 'carbonMonoxide', value: 'detected', descriptionText: descriptionText)
}

def COClear() {
    def descriptionText = "${device.displayName} CO clear"
    if (txtEnable) log.info "${descriptionText}"
    sendEvent(name: 'carbonMonoxide', value: 'clear', descriptionText: descriptionText)
}

def open() {
    def descriptionText = "${device.displayName} is open"
    if (txtEnable) log.info "${descriptionText}"
    sendEvent(name: 'contact', value: 'open', descriptionText: descriptionText)
}

def close() {
    def descriptionText = "${device.displayName} is closed"
    if (txtEnable) log.info "${descriptionText}"
    sendEvent(name: 'contact', value: 'closed', descriptionText: descriptionText)
}

def setIlluminance(lux) {
    def descriptionText = "${device.displayName} is ${lux} lux"
    if (txtEnable) log.info "${descriptionText}"
    sendEvent(name: 'illuminance', value: lux, descriptionText: descriptionText, unit: 'Lux')
}

def setCarbonDioxide(CO2) {
    def descriptionText = "${device.displayName}  Carbon Dioxide is ${CO2} ppm"
    if (txtEnable) log.info "${descriptionText}"
    sendEvent(name: 'carbonDioxide', value: CO2, descriptionText: descriptionText, unit: 'ppm')
}

def setAirQualityIndex(aqi) {
    def descriptionText = "${device.displayName}  Air Quality Index is ${aqi}"
    if (txtEnable) log.info "${descriptionText}"
    sendEvent(name: 'airQualityIndex', value: aqi, descriptionText: descriptionText)
}

def setPM2_5(pm) {
    def descriptionText = "${device.displayName}  PM 2.5 is ${pm}"
    if (txtEnable) log.info "${descriptionText}"
    sendEvent(name: 'pm25', value: pm, descriptionText: descriptionText)
}

def setRelativeHumidity(humid) {
    def descriptionText = "${device.displayName} humidity is ${humid}%"
    if (txtEnable) log.info "${descriptionText}"
    sendEvent(name: 'humidity', value: humid, descriptionText: descriptionText, unit: 'RH%')
}

def smokeDetected() {
    def descriptionText = "${device.displayName} smoke detected"
    if (txtEnable) log.info "${descriptionText}"
    sendEvent(name: 'smoke', value: 'detected', descriptionText: descriptionText)
}

def motionActive() {
    def descriptionText = "${device.displayName} is active"
    if (txtEnable) log.info "${descriptionText}"
    sendEvent(name: 'motion', value: 'active', descriptionText: descriptionText)
}

def motionInactive() {
    def descriptionText = "${device.displayName} is inactive"
    if (txtEnable) log.info "${descriptionText}"
    sendEvent(name: 'motion', value: 'inactive', descriptionText: descriptionText)
}

def smokeClear() {
    def descriptionText = "${device.displayName} smoke clear"
    if (txtEnable) log.info "${descriptionText}"
    sendEvent(name: 'smoke', value: 'clear', descriptionText: descriptionText)
}

def setTemperature(temp) {
    def unit = "°${location.temperatureScale}"
    def descriptionText = "${device.displayName} temperature is ${temp}${unit}"
    if (txtEnable) log.info "${descriptionText}"
    sendEvent(name: 'temperature', value: temp, descriptionText: descriptionText, unit: unit)
}

def wet() {
    def descriptionText = "${device.displayName} water wet"
    if (txtEnable) log.info "${descriptionText}"
    sendEvent(name: 'water', value: 'wet', descriptionText: descriptionText)
}

def dry() {
    def descriptionText = "${device.displayName} water dry"
    if (txtEnable) log.info "${descriptionText}"
    sendEvent(name: 'water', value: 'dry', descriptionText: descriptionText)
}

def setVariable(str) {
    def descriptionText = "${device.displayName} variable is ${str}"
    if (txtEnable) log.info "${descriptionText}"
    sendEvent(name: 'variable', value: str, descriptionText: descriptionText)
}

def setEnergy(energy) {
    def descriptionText = "${device.displayName} is ${energy} energy"
    if (txtEnable) log.info "${descriptionText}"
    sendEvent(name: 'energy', value: energy, descriptionText: descriptionText)
}

def setPower(power) {
    def descriptionText = "${device.displayName} is ${power} power"
    if (txtEnable) log.info "${descriptionText}"
    sendEvent(name: 'power', value: power, descriptionText: descriptionText)
}

String getBatteryStatus() {
    //return battery status
    return device.currentValue('batteryStatus')
}

def setBatteryStatus(status) {
    def descriptionText = "${device.displayName} battery status is ${status}"
    if (txtEnable) log.info "${descriptionText}"
    sendEvent(name: 'batteryStatus', value: status, descriptionText: descriptionText)
}

def setFilterNormal() {
    def descriptionText = "${device.displayName} filter status is normal"
    if (txtEnable) log.info "${descriptionText}"
    sendEvent(name: 'filterStatus', value: 'normal', descriptionText: descriptionText)
}

def setFilterReplace() {
    def descriptionText = "${device.displayName} filter status is replace"
    if (txtEnable) log.info "${descriptionText}"
    sendEvent(name: 'filterStatus', value: 'replace', descriptionText: descriptionText)
}

/**
 * Initializes the lightEffects attribute if not already set.
 */
def setInitialLightEffects() {
    if (!device.currentValue('lightEffects')) {
        log.info('Initializing lightEffects with default LIGHT_EFFECTS.')
        updateLightEffectsMap(LIGHT_EFFECTS)
    }
}

/**
 * Retrieves the lightEffects as a Map.
 * @return Map of light effects or null if parsing fails.
 */
private Map<String, String> getLightEffectsMap() {
    try {
        def effectsJson = device.currentValue('lightEffects') as String
        if (!effectsJson) {
            log.error('Light effects not set.')
            return null
        }
        return new JsonSlurper().parseText(effectsJson)
    } catch (ex) {
        log.error("Error parsing lightEffects JSON: ${ex}")
        return null
    }
}

/**
 * Updates the lightEffects attribute with the provided Map.
 * @param effectsMap Map of light effects to set.
 */
private void updateLightEffectsMap(Map<String, String> effectsMap) {
    try {
        def le = new groovy.json.JsonBuilder(effectsMap).toString()
        sendEvent(name: 'lightEffects', value: le, descriptionText: "${device.displayName} light effects updated.")

        // set the effectName to the first effect in the map
        if (effectsMap.size() > 0) {
            setEffectByName(effectsMap[1])
        }
        log.info("Light effects updated: ${le}")
    } catch (ex) {
        log.error("Error updating lightEffects JSON: ${ex}")
    }
}

/**
 * Validates if the provided effect number exists in the lightEffects map.
 * @param effectNumber The effect number to validate.
 * @param effectsMap The map of current light effects.
 * @return Boolean indicating validity.
 */
private boolean isValidEffectNumber(Number effectNumber, Map<String, String> effectsMap) {
    return effectsMap.containsKey(effectNumber.toString())
}

/**
 * Sets the current effect by its name.
 * @param effectName The name of the effect to set.
 */
private void setEffectByName(String effectName) {
    sendEvent(name: 'effectName', value: effectName, descriptionText: "${device.displayName} effect set to ${effectName}")
    log.info("Effect set to ${effectName}")
}

/**
 * Sets the current effect based on the effect number.
 * @param effectNumber The number corresponding to the desired effect.
 */
def setEffect(Number effectNumber) {
    try {
        def effectsMap = getLightEffectsMap()
        if (!effectsMap) return

        if (!isValidEffectNumber(effectNumber, effectsMap)) {
            log.error("Effect number ${effectNumber} is out of range. Valid keys: ${effectsMap.keySet()}.")
            return
        }

        def effectName = effectsMap[effectNumber.toString()] as String
        if (!effectName) {
            log.error("Effect number ${effectNumber} not found in LIGHT_EFFECTS.")
            return
        }

        setEffectByName(effectName)
    } catch (ex) {
        log.error("Error in setEffect: ${ex}")
    }
}

/**
 * Sets the next light effect in the sequence.
 */
def setNextEffect() {
    try {
        def effectsMap = getLightEffectsMap()
        if (!effectsMap) return

        def currentEffectName = device.currentValue('effectName') as String
        if (!currentEffectName) {
            log.error('Current effect name is not set.')
            return
        }

        def currentEffectEntry = effectsMap.find { it.value == currentEffectName }
        if (!currentEffectEntry) {
            log.error("Current effect name '${currentEffectName}' not found in LIGHT_EFFECTS.")
            return
        }

        def currentEffectNumber = currentEffectEntry.key.toInteger()
        def nextEffectNumber = (currentEffectNumber < effectsMap.size()) ? (currentEffectNumber + 1) : 1

        setEffect(nextEffectNumber)
    } catch (ex) {
        log.error("Error in setNextEffect: ${ex}")
    }
}

/**
 * Sets the previous light effect in the sequence.
 */
def setPreviousEffect() {
    try {
        def effectsMap = getLightEffectsMap()
        if (!effectsMap) return

        def currentEffectName = device.currentValue('effectName') as String
        if (!currentEffectName) {
            log.error('Current effect name is not set.')
            return
        }

        def currentEffectEntry = effectsMap.find { it.value == currentEffectName }
        if (!currentEffectEntry) {
            log.error("Current effect name '${currentEffectName}' not found in LIGHT_EFFECTS.")
            return
        }

        def currentEffectNumber = currentEffectEntry.key.toInteger()
        def previousEffectNumber = (currentEffectNumber > 1) ? (currentEffectNumber - 1) : effectsMap.size()

        setEffect(previousEffectNumber)
    } catch (ex) {
        log.error("Error in setPreviousEffect: ${ex}")
    }
}

/**
 * Updates the lightEffects attribute with a new set of effects.
 * @param newEffects JSON string representing the new light effects.
 */
def setLightEffects(String newEffects) {
    try {
        def newEffectsMap = new JsonSlurper().parseText(newEffects)

        // Optional: Validate newEffectsMap structure if necessary

        updateLightEffectsMap(newEffectsMap)
    } catch (ex) {
        log.error("Error setting lightEffects: ${ex}")
    }
}

// ====== Color Control and Color Temperature Methods ======

// Set Hue
def setHue(value) {
    if (value < 0 || value > 360) {
        log.warn "setHue: Invalid hue value: ${value}. Must be between 0 and 360."
        return
    }
    sendEvent(name: 'hue', value: value, descriptionText: "${device.displayName} hue set to ${value}°")
    updateCurrentColor()
}

// Set Saturation
def setSaturation(value) {
    if (value < 0 || value > 100) {
        log.warn "setSaturation: Invalid saturation value: ${value}. Must be between 0 and 100."
        return
    }
    sendEvent(name: 'saturation', value: value, descriptionText: "${device.displayName} saturation set to ${value}%")
    updateCurrentColor()
}

// Set Color (Hue and Saturation)
def setColor(colorMap) {
    if (colorMap.hue != null) {
        setHue(colorMap.hue)
    }
    if (colorMap.saturation != null) {
        setSaturation(colorMap.saturation)
    }
    if (colorMap.hex != null) {
    // Optionally, convert hex to hue and saturation
    // This requires additional implementation
    // For simplicity, it's omitted here
    }
    updateCurrentColor()
}

// Set Color Temperature
def setColorTemperature(value) {
    if (value < 1000 || value > 10000) { // Typical Kelvin range
        log.warn "setColorTemperature: Invalid color temperature value: ${value}. Must be between 1000K and 10000K."
        return
    }
    sendEvent(name: 'colorTemperature', value: value, descriptionText: "${device.displayName} color temperature set to ${value}K")

    // Optionally, reset hue and saturation when colorTemperature is set
    // Uncomment the following lines if desired
    // sendEvent(name: 'hue', value: null, descriptionText: "${device.displayName} hue reset due to color temperature change")
    // sendEvent(name: 'saturation', value: null, descriptionText: "${device.displayName} saturation reset due to color temperature change")

    updateCurrentColor()
}

// Helper method to update the currentColor attribute
def updateCurrentColor() {
    def hue = device.currentValue('hue')
    def saturation = device.currentValue('saturation')
    def colorTemperature = device.currentValue('colorTemperature')

    String colorString = ''

    if (colorTemperature != null) {
        colorString += "Color Temp: ${colorTemperature}K"
    }

    if (hue != null && saturation != null) {
        if (colorString) {
            colorString += ', '
        }
        colorString += "Hue: ${hue}°, Sat: ${saturation}%"
    }

    if (!colorString) {
        colorString = 'No color set'
    }

    sendEvent(name: 'currentColor', value: colorString, descriptionText: "${device.displayName} current color is ${colorString}")
}

def batteryStatusIdle() {
    setBatteryStatus('idle')
}

def batteryStatusDischarging() {
    setBatteryStatus('discharging')
}

def batteryStatusCharging() {
    setBatteryStatus('charging')
}

Number getBattery() {
    //return battery level
    return device.currentValue('battery')
}

//Command to set the battery level
def setBattery(level) {
    //def battery(level) {
    //Check battery level is 0 - 100
    if (level >= 0 && level <= 100) {
        //Get current date and time
        Date lastUpdate = new Date()
        //Get previous battery level
        Number prevBatteryLevel = getBattery()
        //No battery level set
        if (prevBatteryLevel == null) {
            setBatteryStatus('unknown')
        }
        //No change in battery level
        else if (prevBatteryLevel == level) {
            setBatteryStatus('idle')
        }
        //Battery level decreasing
        else if (prevBatteryLevel > level) {
            setBatteryStatus('discharging')
        }
        //Battery level increasing
        else /*(prevBatteryLevel < level)*/ {
            setBatteryStatus('charging')
        }
        //Set unit
        unit = '%'
        def descriptionTextLevel = "${device.displayName} battery level is ${level}${unit}"
        def descriptionTextLastUpdate = "${device.displayName} battery information last updated ${lastUpdate}"
        if (txtEnable) log.info "${descriptionTextLevel}"
        if (txtEnable) log.info "${descriptionTextLastUpdate}"
        //Update attributes
        sendEvent(name: 'battery', value: level, descriptionText: descriptionTextLevel, unit: unit)
        sendEvent(name: 'batteryLastUpdated', value : lastUpdate.format('yyyy/MM/dd HH:mm:ss'), descriptionText: descriptionTextLastUpdate)
        //Reset warning count if there have been previous warnings
        if (state.warningCount > 0) {
            state.warningCount = 0
            log.info('setBattery(): Warning count reset')
        }
    }
    // If the battery reading is outside the 0 - 100 range, log a warning and leave the current reading in place
    //   use the warning count state variable to make sure we don't spam the logs with repeated warnings
    else {
        if (state.warningCount < 10) {
            state.warningCount++
            if (getBattery() == null) {
                log.warn("setBattery(): Warning (#${state.warningCount}) - Battery level outside of 0%-100% range, ${device.displayName} not updated. Retaining ${prevBatteryLevel} battery level")
            }
            else {
                log.warn("setBattery(): Warning (#${state.warningCount}) - Battery level outside of 0%-100% range, ${device.displayName} not updated. Retaining prevoius battery level ${prevBatteryLevel}%")
            }
        }
    }
    }

//The other command to set battery level
def battery(level) {
    setBattery(level)
}

def tamperClear() {
    def descriptionText = "${device.displayName} tamper is clear"
    if (txtEnable) log.info "${descriptionText}"
    sendEvent(name: 'tamper', value: 'clear', descriptionText: descriptionText)
}

def tamperDetected() {
    def descriptionText = "${device.displayName} tamper is detected"
    if (txtEnable) log.info "${descriptionText}"
    sendEvent(name: 'tamper', value: 'detected', descriptionText: descriptionText)
}

//threeAxis(integer,integer,integer) input format: 0,0,0
def threeAxis(x, y, z) {
    def xyz = "x:${x},y:${y},z:${z}"
    def descriptionText = "${device.displayName} threeAxis is ${xyz}"
    if (txtEnable) log.info "${descriptionText}"
    sendEvent(name: 'threeAxis', value: xyz, descriptionText: descriptionText)
    sendEvent(name: 'xAxis', value: x)
    sendEvent(name: 'yAxis', value: y)
    sendEvent(name: 'zAxis', value: z)
}

//setThreeAxis(string) input format: [x:0,y:0,z:0]
def setThreeAxis(xyz) {
    if (xyz != null) {
        //remove open bracket
        removeBrackets = xyz.minus('[')
        //remove close bracket
        removeBrackets = removeBrackets.minus(']')
        //split string into an array at ","
        threeAxisArray = removeBrackets.split(',')
        //split strings into arrys at ":"
        xPair = threeAxisArray[0].split(':')
        yPair = threeAxisArray[1].split(':')
        zPair = threeAxisArray[2].split(':')
        //to integers
        int x = xPair[1] as Integer
        int y = yPair[1] as Integer
        int z = zPair[1] as Integer
        //command
        threeAxis(x, y, z)
    }
}

def setPowerSource(source) {
    def descriptionText = "${device.displayName} power source is ${source}"
    if (txtEnable) log.info "${descriptionText}"
    sendEvent(name: 'powerSource', value: source, descriptionText: descriptionText)
}

//Set fan speed
def setSpeed(speed) {
    def descriptionText = "${device.displayName} speed is ${speed}"
    if (txtEnable) log.info "${descriptionText}"
    sendEvent(name: 'speed', value: speed, descriptionText: descriptionText)
}

//The other fan speed setter
def setFanSpeed(speed) {
    setSpeed(speed)
}

//Get fan speed
String getFanSpeed() {
    //return fan speed
    return device.currentValue('speed')
}

//Cycle thru fan speeds
def cycleSpeed() {
    //log.debug("This is the current fan speed: ${getFanSpeed()}")
    String currentFanSpeed = getFanSpeed()
    if (currentFanSpeed == 'off') {
        setSpeed('low')
    }
    else if (currentFanSpeed == 'low') {
        setSpeed('medium-low')
    }
    else if (currentFanSpeed == 'medium-low') {
        setSpeed('medium')
    }
    else if (currentFanSpeed == 'medium') {
        setSpeed('medium-high')
    }
    else if (currentFanSpeed == 'medium-high') {
        setSpeed('high')
    }
    else if (currentFanSpeed == 'high') {
        setSpeed('auto')
    }
    else if (currentFanSpeed == 'auto') {
        setSpeed('off')
    }
    else if (currentFanSpeed == 'unknown') {
        setSpeed('off')
    }
    else { //(currentFanSpeed == null)
        setSpeed('unknown')
    }
}

//Set water level
def setWaterLevel(level) {
    def descriptionText = "${device.displayName} water level is ${level}"
    if (txtEnable) log.info "${descriptionText}"
    sendEvent(name: 'waterLevel', value: level, descriptionText: descriptionText)
}

def bulbOn() {
    setBulb('on')
}

def bulbOff() {
    setBulb('off')
}

def setBulb(value) {
    def descriptionText = "${device.displayName} bulb is ${value}"
    if (txtEnable) log.info "${descriptionText}"
    sendEvent(name: 'switch', value: value, descriptionText: descriptionText)
}

def doorOpen() {
    setDoor('open')
}

def doorClose() {
    setDoor('closed')
}

def setDoor(value) {
    def descriptionText = "${device.displayName} door is ${value}"
    if (txtEnable) log.info "${descriptionText}"
    sendEvent(name: 'door', value: value, descriptionText: descriptionText)
}

def lock() {
    def descriptionText = "${device.displayName} lock is locked"
    if (txtEnable) log.info "${descriptionText}"
    sendEvent(name: 'lock', value: 'locked', descriptionText: descriptionText)
}

def unlock() {
    def descriptionText = "${device.displayName} lock is unlocked"
    if (txtEnable) log.info "${descriptionText}"
    sendEvent(name: 'lock', value: 'unlocked', descriptionText: descriptionText)
}

def setLock(value) {
    def descriptionText = "${device.displayName} lock is ${value}"
    if (txtEnable) log.info "${descriptionText}"
    sendEvent(name: 'lock', value: value, descriptionText: descriptionText)
}

def setSwitch(value) {
    def descriptionText = "${device.displayName} switch is ${value}"
    if (txtEnable) log.info "${descriptionText}"
    sendEvent(name: 'switch', value: value, descriptionText: descriptionText)
}

def setSwitchLevel(value) {
    def descriptionText = "${device.displayName} switch level is ${value}"
    if (txtEnable) log.info "${descriptionText}"
    sendEvent(name: 'level', value: value, descriptionText: descriptionText)
}

def valveOpen() {
    setValve('open')
}

def valveClose() {
    setValve('closed')
}

def setValve(value) {
    def descriptionText = "${device.displayName} valve is ${value}"
    if (txtEnable) log.info "${descriptionText}"
    sendEvent(name: 'valve', value: value, descriptionText: descriptionText)
}

def windowShadeOpen() {
    setWindowShade('open')
}

def windowShadeClose() {
    setWindowShade('closed')
}

def setWindowShade(value) {
    def descriptionText = "${device.displayName} window shade is ${value}"
    if (txtEnable) log.info "${descriptionText}"
    sendEvent(name: 'windowShade', value: value, descriptionText: descriptionText)
}

def garageDoorOpen() {
    setGarageDoor('open')
}

def garageDoorClose() {
    setGarageDoor('closed')
}

def setGarageDoor(value) {
    def descriptionText = "${device.displayName} garage door is ${value}"
    if (txtEnable) log.info "${descriptionText}"
    sendEvent(name: 'door', value: value, descriptionText: descriptionText)
}

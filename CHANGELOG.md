## _**v2.10.0**_ (09-30-2024)

- [FIX] Updated the device name values sent to HomeKit to support Homebridge 2.0.0

## _**v2.9.4**_ (09-20-2023)

- [FIX] Fixed issues with some sensors not updating there status.
- [NEW] Added support for Air Quality sensors.

## _**v2.9.3**_ (09-20-2023)

- [FIX] Testing some fixes for the Garage Door Status and contacts

## _**v2.9.2**_ (09-04-2023)

- [FIX] Tweaks for better windowShade support.

## _**v2.9.0**_ (08-26-2023)

- [FIX] Tweaked the detection logic slightly to help with devices that show that they have invalid values for some characteristics.

## _**v2.8.3**_ (08-22-2023)

- [FIX] Package updates for security.

## _**v2.7.1**_ (01-21-2023)

- [FIX] Package updates for security.

## _**v2.6.0**_ (12-20-2022)

- [NEW] Added new pluginTest endpoint so the HE app can test if communication with the plugin is working.
- [FIX] Package updates for security.

## _**v2.5.18**_ (10-8-2022)

- [FIX] Disabled Debug Logging.


## _**v2.5.16**_ (10-8-2022)

- [NEW] Package updates for security.
- [FIX] Made changes to support HSM Alarm Triggers in HomeKit.

## _**v2.5.14**_

- [FIX] Lowered chalk package back to v4.x.
  
## _**v2.5.13**_

- [NEW] Package updates for security.

## _**v2.5.12**_

- [FIX] WindowShades will now be detected on devices with speed attributes.
- [NEW] Package updates for security.

## _**v2.5.11**_

- [NEW] Package updates for security.

## _**v2.5.9**_

- [NEW] Added Config Parameter (configure_light_by_name) to stop homebridge plugin from assigning device as a light because device has light in the name.
  
## _**v2.5.8**_

- [NEW] Added Config Parameter (configure_fan_by_name) to stop homebridge plugin from assigning device as a fan because device has Fan in the name.

## v2.5.7

- [FIX] Fixed AlarmSystem Triggers for Intrusion Alerts for HSM. 
  - Please note that when alerts occur you will see a warning in the logs like this: ```This plugin generated a warning from the characteristic 'Security System Target State': characteristic was supplied illegal value: number 4 exceeded maximum of 3. See https://git.io/JtMGR for more info.``` This error is harmless

## v2.5.6

- [FIX] Fixed exception when removing adaptive lighting from a device.

## v2.5.5

- [NEW] Support for marking switches as Outlets under HomeKit.

## v2.5.4

- [FIX] Minor fix for some water sensors not working.

## v2.5.3

- [FIX] Logging tweaks and cleanups.

## v2.5.2

- [FIX] Resolved bugs from recent log changes.

## v2.5.0

- [FIX] Switch status updates should now work correctly.
- [REMOVE] Removed custom logger and switched to native homebridge logging interface
  
## v2.4.1

- [NEW] Finally Added support for buttons/remotes under HomeKit.
- [FIX] Tried to add a check for values to detect if they are empty
- [FIX] Fixed issue with Adaptive Lighting not being removed when disabling via app or config file.
- [FIX] Bug fixes.
  
## v2.3.3

- [NEW] Added support for the new light input to block a light from supporting adaptive lighting .
- [FIX] Node package updates.

## v2.3.1-v2.3.2

- [NEW] Added support for HomeKit's new Adaptive Lighting (Only works with Bulbs supporting ColorTemp and Brightness) [Adaptive Lighting](https://www.howtogeek.com/712520/how-to-use-adaptive-lighting-with-apple-homekit-lights/#:~:text=The%20Adaptive%20Lighting%20feature%20was,home%20lights%20throughout%20the%20day.).
  - Please note that this feature may not set the temps correctly for certain bulbs and may require some tweaks to the config file. (See: adaptive_lighting_offset in the readme)
- [FIX] Tweaks colorTemp conversion logic.

## v2.3.0

- [NEW] Added support for FanControl capability and speed attributes in Fans.
- [UPDATE] Stripped out unnecessary capabilities and attributes for fan devices
- [FIX] Bug fixes and node package updates.

## v2.2.2

- [NEW] Added new config option for rounding levels <5 to 0 and > 95 to 100 (On by Default now).
- [FIX] Log cleanups.

## v2.2.0

- [NEW] Create virtual devices under HomeKit to trigger your WebCoRE pistons.
- [FIX] Tweaked value transforms for temperature, colorTemperature, to prevent errors.
- [FIX] Stopped ChargingState errors in logs.
- [FIX] Cleaned up unnecessary logging.
- [UPDATE] Code cleanups and optimizations.

## v2.1.3

- [FIX] Last plugin update broke HSM events.
- [FIX] Fixed validate token feature

## v2.1.2

- [NEW] Added logging for the PowerSource value

## v2.1.1

- [FIX] Fix for https responses.

## v2.1.0

- [FIX] There was an issue with the plugin not sending back the response to the HE app as JSON which would throw a 500 error.
- [UPDATE] Slight cleanup of the logic of updating config settings from Hubitat.
- [UPDATE] @jorhett submitted some logging cleanups and made them more human friendly on the plugin side.
- [UPDATE] Minor code cleanups and tweaks.

## v2.0.7

- [UPDATE] Restored support for charging state under batteries in HomeKit.

## v2.0.6

- [UPDATE] Added fan characteristic to thermostats.
- [FIX] Shades devices that don't use level commands should now work with setPosition.
- [FIX] Generic Zigbee RGBW bulb drivers were throwing error for setColorTemperature commands not being an integer.

## v2.0.2

- [FIX] HSM status updates should now work correctly.

## v2.0.0

- [NEW] **_Important NOTICE:_**
  
  - **Due to the changes in the plugin API you can not directly update the plugin from v1, you will need to add as a new accessory and setup your devices/automations/scenes again.
  On a positive note, you can use your existing hubitat app instance as long as you update it to the latest code.**

- [NEW] Completely rewrote the entire plugin from the ground up using modern javascript structure.
- [NEW] The code is now much cleaner, easier to update/maintain, and easier for others to follow.
- [NEW] The plugin is now faster, leaner, and way more stable than the previous versions.
- [NEW] The plugin now uses the Homebridge Dynamic platform API, meaning it no longer requires a restart of the Homebridge service for device changes to occur.
- [NEW] The plugin now utilizes the device cache on service restart to prevent losing all of your devices when the plugin fails to start for an extended period of time.
- [NEW] Plugin will now remove devices no longer selected under Hubitat App.
- [NEW] Logging system was rewritten to provide more insight into issues and status, as well as write them to a file.
- [NEW] Switched web request library from Request-Promise to Axios.
- [FIX] StatusActive characteristic now reports correctly.
- [NEW] Added support for bringing acceleration sensors into homekit as motion sensors.
- [FIX] Lot's of fixes for device state updates and device commands.
- [FIX] Added support for AirPurifier & AirQuality (@danielskowronski)
- [FIX] Delays on device event updates resolved.
- [FIX] Thermostat Mode fixes (@torandreroland)
- [NEW] Many, many other bug fixes for devices, commands and many other items.

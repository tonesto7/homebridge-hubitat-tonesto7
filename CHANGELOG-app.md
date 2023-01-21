## _**v2.7.0**_ (01-21-2023)
- [NEW] Added thermostat filters to the filters page.  So you can remove the fan, heat, cool, modes.
- [NEW] Added support for Security Keypads to be used as a security system. Thanks @lnjustin.
- [UPDATE] Removed the confirmation page so you now have one less click to save your settings.
- [UPDATE] Cleaned up device attributes subscriptions to reduce the number of subscriptions.

## _**v2.6.1**_ (12-21-2022)
- [FIX] Fix for plugin version not showing updated.
- 
## _**v2.6.0**_ (12-20-2022)
- [NEW] UI now shows the plugin ip and port on the Generate Config Button.
- [NEW] There is now a test plugin communication button on the plugin config page to that shows status, version, and the plugin config to test that Hubitat can reach the plugin.

## _**v2.5.17**_ (10-8-2022)
- [FIX] Disabled Debug Logging.

## _**v2.5.16**_ (10-8-2022)
- [FIX] Made changes to support HSM Alarm Triggers in HomeKit.

## _**v2.5.14**_
- [FIX] Updated minimum plugin version to address issues with plugin package chalk errors.
  
## _**v2.5.13**_
- [FIX] Changes to setColorTemperature() command to only set the color if the light is on. This is to address issues with adaptive lighting.
- [NEW] Updated minimum plugin version to 2.5.13.

## _**v2.5.12**_
- [NEW] Updated minimum plugin version to 2.5.12.

## _**v2.5.11**_
- [FIX] Code Optimizations and Bug fixes (Thanks @nh.schotfam).
- [FIX] Fixes for mode device issues for some users [This will remove old mode devices and create new ones under HomeKit] (Thanks @nh.schotfam).

## _**v2.5.10**_
- [FIX] Another fix to help filter out the color controls from devices in homekit (Thanks @jtp10181).

## _**v2.5.9**_
- [FIX] Fix for colorTemperature filters not filtering out the capability. (Thanks @jtp10181)
- [FIX] Fixed missing Filter icons for some of the inputs.
- [NEW] Added Config Parameter to stop homebridge plugin from assigning device as a light because device has light in the name.
- [NEW] Added description for selected capability filters on the main page so you can see each selected capability filter.

## _**v2.5.8**_
- [NEW] Added Config Parameter to stop homebridge plugin from assigning device as a fan because device has Fan in the name. 

## _**v2.5.7**_
- [FIX] Fixed AlarmSystem Triggers for Intrusion Alerts for HSM. 

## _**v2.5.6**_
- [FIX] Set the minimum plugin version to v2.5.6

## _**v2.5.5**_
- [NEW] Support for marking switches as Outlets under HomeKit.

## _**v2.5.4**_
- [FIX] Set the minimum plugin version to v2.5.4

## _**v2.5.2-2.5.3**_
- [FIX] NP error resolved in main app

## _**v2.5.1**_
- [NEW] Added filter for WaterSensors.
- [UPDATE] Increased minimum plugin version to 2.5.2.

## _**v2.5.0**_
- [UPDATE] Increased minimum plugin version to 2.5.0.

## _**v2.4.0-2.4.1**_
- [NEW] Added support to include buttons/remotes under HomeKit
- [FIX] Fixed issue with Adaptive Lighting not being removed when disabling via app or config file.
- [FIX] Bug fixes.

## _**v2.3.3**_
- [NEW] Added new light input to block a light from supporting adaptive lighting .
- [FIX] Code cleanups and optimizations.

## _**v2.3.1-v2.3.2 Changes**_
- [NEW] Support for Adaptive Lighting config file settings.
- [UPDATE] Updated the minimum plugin version to v2.3.1

## _**v2.3.0 Changes**_
- [UPDATE] Updated the UI theme to match Echo Speaks
- [FIX] Added support for 5-speed fans.
- [FIX] Fixed issue with Duplicate device message being empty.
- [FIX] Other bugfixes and optimizations.

## _**v2.2.2 Changes**_
- [FIX] Turning Off logs messages every few hours.
- [FIX] Added support to the config generator for a new round_levels options which rounds levels <5 to 0 and > 95 to 100.

## _**v2.2.1 Changes**_
- [FIX] java.lang.IllegalArgumentException: argument type mismatch error resolved.
- [FIX] Fixed code reversion in device debug logic.

## _**v2.2.0 Changes**_
- [NEW] WebCoRE support... Create virtual devices to trigger WebCoRE pistons. (@nh.schottfam)
- [NEW] Added new filters for colorTemp, and colorControl devices.
- [NEW] Device/Location event logging will automatically turn off after 6 hours to reduce unnecessary logging.
- [UPDATE] More code optimizations for significant performance boost. (@nh.schottfam)
- [UPDATE] Cleaned up change log layout.
- [UPDATE] Changed the device debug view view to show data inside the window. 
- [UPDATE] Added Oauth activation and tweaked access token logic.
- [UPDATE] Streamlined device/location event subscription logic.
- [FIX] Changes to help eliminate duplicate accessories being created in the plugin.
- [FIX] Modified device count logic to be more accurate.

## _**v2.1.6 Changes**_
- [UPDATE] So many optimizations to object types and state call reductions (Thanks @nh.schottfam).
- [UPDATE] removed memstore lock warnings from logging.
- [NEW] Toggle to hide command events from logging.

## _**v2.1.5 Changes**_
- [FIX] Another attempt at fixing Concurrent modification error for device/command history (Thanks @nh.schottfam).

## _**v2.1.4 Changes**_
- [FIX] Concurrent modification error for device/command history

## _**v2.1.3 Changes**_
- [FIX] Last plugin update broke HSM events.
- [UPDATE] Increased minimum plugin version to v2.1.3

## _**v2.1.2 Changes**_
- [FIX] Fix for mode switches not working
- [UPDATE] Cleaned up more attributes and capabilities from event subscriptions.

## _**v2.1.1 Changes**_
- [FIX] Fix for thermostat + fan input
- [FIX] Fixed Device debug not returning json data.
- [FIX] Showing device events in live logs was broken unless debug logging was enabled.
- [ADDED] Time to execute is now captured for all commands and events and added to history for reference.

## _**v2.1.0 Changes**_
- [UPDATE] Calls to read/write from state (aka the DB) for all command and event history have been removed and stored in shared memory (Thanks @nh_schott_fam).
- [UPDATE] Cleaned up code and removed references to ST version.
- [UPDATE] Converted all plugin communications back to Async HTTP requests to reduce resource usage.
- [UPDATE] Added a new thermostat input for selecting Thermostats to show with fans. The original thermostat input will no longer display the thermostat.
- [UPDATE] Added more attribute filters to prevent many dozens of event subscriptions for attributes that will not be used by HomeKit.
- [UPDATE] Moved some of the plugin settings to the render config page.  This allows you to modify some of the plugin settings and it updates the rendered config realtime.
- [UPDATE] Modified the app icon gradient to include hubitat green color.

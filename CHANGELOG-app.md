## v2.1.0 Changes
- [UPDATE] Calls to read/write from state (aka the DB) for all command and event history have been removed and stored in shared memory (Thanks @nh_schott_fam).
- [UPDATE] Cleaned up code and removed references to ST version.
- [UPDATE] Converted all plugin communications back to Async HTTP requests to reduce resource usage.
- [UPDATE] Added a new thermostat input for selecting Thermostats to show with fans. The original thermostat input will no longer display the thermostat.
- [UPDATE] Added more attribute filters to prevent many dozens of event subscriptions for attributes that will not be used by HomeKit.
- [UPDATE] Moved some of the plugin settings to the render config page.  This allows you to modify some of the plugin settings and it updates the rendered config realtime.

## v2.0.8 Changes
- [NEW] Support for powerSource events

## v2.0.7 Changes
- [UPDATE] Modified the Other devices input to show all available devices

## v2.0.6 Changes
- [NEW] Updated version info to latest app and plugin.

## v2.0.5 Changes
- [NEW] View full device data output sent to Homebridge for debugging issues.

## v2.0.4 Changes
- [FIX] HSM status updates should now be sent to HomeKit correctly.
- [FIX] Device filters should now work correctly again.
- [UPDATE] Modified the plugin config to show under the UI instead of loading a web page.

## v2.0.3 Changes
- [FIX] Fixed device count to include HSM device when enabled.

## v2.0.2 Changes
- [UPDATE] App UI updates to the header, footer, and device selection inputs.  I borrowed some inspiration for the footer from Hubitat Package Manager (Thanks @dman2306). 

## v2.0.0 Changes
- [NEW] **_IMPORTANT NOTICE:_**
  - **Due to the changes in the plugin API you can not directly update the plugin from v1, you will need to add as a new accessory and setup your devices/automations/scenes again.
    On a positive note, you can use the same Hubitat App instance as long as you update to the latest code.**

- [UPDATE] Restructured and cleaned up the app UI so it's more organized and easier to manage.
- [UPDATE] Optimized the command/event streaming system to perform faster and more reliably.
- [UPDATE] Added support for passing the pressed button number when provided (Buttons not fully tested on HE).
- [UPDATE] Added option to validate the appId and token on all commands/requests made to the Hubitat app so if you have more than one instance of the Homebridge app it doesn't start sending events to the wrong plugin.
- [UPDATE] Modified the event subscription logic to ignore many of the non-standard attributes to increase performance and reduce timeouts on subscription.
- [NEW] The app now detects duplicate devices and cleans up the data so Homekit doesn't try to create duplicate devices and throw an error.
- [NEW] Add acceleration sensors into homekit as motion sensors.
- [NEW] Define devices as a garage door, thermostat, or heat-only thermostat under defined device types options.
- [NEW] Device/Location Events and Commands history page to review events and commands sent and received by the plugin.
- [NEW] Device data viewer where you can select a device and see all available attributes, capabilities, commands that will be sent to HomeKit as well as the last 30 device events.
- [NEW] Expanded capability filters to include more capabilities.
- [NEW] Added timeouts to all Groovy app HTTP commands (this was the cause of the progressive hub slowdowns in the previous version).
- [FIX] Minor fixes to provide better Window Shade support in the plugin.
- [FIX] Dozens of other bug fixes, tweaks, optimizations, and cleanups from v1.
- [REMOVE] Energy and Power capabilities have been removed (they are not natively supported by HomeKit).


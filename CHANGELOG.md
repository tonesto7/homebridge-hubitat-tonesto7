## v2.0.0

- [NEW] Added timeouts to Groovy app commands
- [NEW] Completely rewrote the entire plugin using modern javascript structure.
- [NEW] The code is now much cleaner, easier to update/maintain, and easier for others to follow.
- [NEW] This translates into a faster/leaner and way more stable plugin than previous versions.
- [NEW] The plugin now uses the Homebridge Dynamic platform API, meaning it no longer requires a restart of the Homebridge service for device changes to occur.
- [NEW] The plugin now utilizes the device cache on service restart to prevent losing all of your devices when the plugin fails to start for an extended period of time.
- [NEW] Plugin will now remove devices no longer selected under Hubitat App.
- [NEW] Introduced an all-new logging system to provide more insight into issues and status, as well as write them to a file.
- [NEW] I used all of the issues from my existing plugin to repair this new version.
- [NEW] Switched web request library from Request-Promise to Axios.
- [FIX] StatusActive characteristic now reports correctly.
- [NEW] Added support for bringing acceleration sensors into homekit as motion sensors.
- [FIX] Lot's of fixes for device state updates and device commands.
- [FIX] Added support for AirPurifier & AirQuality (@danielskowronski)
- [FIX] Delays on device event updates resolved. (@devarshi) #33 #40
- [FIX] Thermostat Mode fixes (@torandreroland)
- [FIX] Minor bugfixes and optimizations.
- [NEW] Many, many other bug fixes for devices, commands and many other items.
- [NEW] **_Important NOTICE:_**
- **Due to the changes in the plugin API you can not directly update the plugin from v1, you will need to add as a new accessory and setup your devices/automations/scenes again.
  On a positive note, you can use the same SmartApp instance though as long as you update to the latest code.**

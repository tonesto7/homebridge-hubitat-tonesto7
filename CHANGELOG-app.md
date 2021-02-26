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



## [3.0.1] - 2025-09-08

- [NEW] **Smart Health Monitoring**: Added intelligent health checks that automatically detect and recover from connection issues
- [NEW] **Better Performance**: Implemented device update batching and improved connection pooling for faster, more reliable communication
- [NEW] **Enhanced Reliability**: Added circuit breaker protection to prevent cascading failures and improve overall stability
- [UPDATE] **Health Check Timing**: Synchronized monitoring intervals with Hubitat app for better coordination
- [UPDATE] **Connection Management**: Improved connection handling with better keep-alive settings and increased capacity
- [FIX] **Memory Warnings**: Removed unnecessary memory usage alerts that were causing false warnings
- [FIX] **Connection Issues**: Resolved stability problems that could cause intermittent communication failures

## [3.0.0] - 2025-09-07

- [NEW] Modular system with 30+ specialized device handlers (see src/devices).
- [NEW] Centralized configuration management restructured for better performance, reliability, and clarity.
- [NEW] Improved API communications between Homebridge and Hubitat.
- [NEW] Enhanced logging system.
- [NEW] Better device attribute and capability update management.
- [NEW] Direct connection handling through web server.
- [NEW] Support for Filter Status Devices.
- [NEW] Smart lighting features with adaptive brightness.
- [NEW] Selectable LED effects for supported devices.
- [NEW] Better support for multi-button devices.
- [NEW] More precise fan speed controls.
- [NEW] Improved temperature handling.
- [NEW] Improved thermostat logic and support for various scenarios.
- [NEW] Device commands will now be batched and queued efficiently.
- [NEW] Automatic retry system when operations fail.
- [NEW] Better error handling and recovery mechanisms.
- [NEW] Support for plugin health checks from the app which sends metrics to the hubitat app and displays in the app header.
- [NEW] More thorough attribute checking.
- [NEW] Object cleanup during plugin shutdown process.
- [UPDATE] Entire code base has been restructured using ES modules for improved performance and maintainability.
- [UPDATE] Standardized programming patterns.
- [UPDATE] Better organized and separated code components.
- [UPDATE] Improved device state handling.
- [FIX] Temperature conversion issues resolved.
- [FIX] Device state update problems corrected.
- [FIX] Memory leaks addressed.
- [FIX] Plugin and Device Error handling and logging improved for better debugging.
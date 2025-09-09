## [3.0.3] - 2025-09-08
- [UPDATE] **Metrics Dashboard**: Added aggregated metrics view and instance-specific metrics view


## [3.0.1] - 2025-09-08

- [NEW] **Advanced Metrics & Analytics Dashboard**: Complete metrics collection system with persistent storage, command tracking, device history, and real-time monitoring
- [NEW] **Better Performance**: Implemented device update batching and improved connection pooling for faster, more reliable communication
- [UPDATE] **Queue System Optimization**: Switched from persistent file-based queue to memory-based queue for better performance and reliability
- [UPDATE] **Health Check Timing**: Synchronized monitoring intervals with Hubitat app for better coordination
- [FIX] **Water Valve Accessory**: Fixed issue where switch service was incorrectly assigned when device has Valve capability
- [FIX] **Memory Management**: Optimized queue cleanup and removed old persistent queue files for better resource usage
- [FIX] **Platform Registration**: Fixed the issue where the platform was not registering correctly as a dynamic platform which prevented device changes after startup
- [REMOVE] **Legacy Queue Implementation**: Cleaned up old persistent queue system files and switched to memory-based approach


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
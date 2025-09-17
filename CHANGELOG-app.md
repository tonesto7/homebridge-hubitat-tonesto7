## _**v3.0.6**_ (9-17-2025)

- [UPDATE] **Minimum Plugin Version**: Set to v3.0.6 of the plugin

## _**v3.0.5**_ (9-12-2025)

- [UPDATE] **Metrics Dashboard**: Added aggregated metrics view and instance-specific metrics view
- [FIX] **Fixed**: Fixed issue where device display name was causing errors when no longer available

## _**v3.0.1**_ (9-08-2025)
- [UPDATE] **Plugin Status Monitoring**: Improved plugin health validation and connection status tracking
- [FIX] **Memory Usage Warnings**: Disabled unnecessary memory usage warning checks

## _**v3.0.0**_ (9-07-2025)

- [NEW] Added device filter management pages for granular device capability control
- [NEW] Added fan6SpdList support for enhanced fan control options
- [NEW] Added adaptive_lighting_off_when_on option for HomeKit lighting control
- [NEW] Added configurable polling_seconds option (default: 900 seconds)
- [NEW] Added lightEffects capability support
- [NEW] Added CSS styling overrides for improved UI experience
- [NEW] Added plugin health checks with plugin metrics to app header with alerts if plugin is not responding or is running low on memory.
- [UPDATE] Enhanced device name sanitization with new sanitizeName() function
- [UPDATE] Improved device capability filtering with per-device controls
- [UPDATE] Reorganized settings pages for better navigation
- [UPDATE] Enhanced device debugging page with improved formatting
- [UPDATE] Added structured error handling and detailed logging
- [UPDATE] Modernized UI elements with consistent styling and improved layout
- [UPDATE] Added support for Homebridge 2.0.0
- [FIX] Resolved mode device ID uniqueness issues
- [FIX] Corrected device capability filtering logic
- [FIX] Improved handling of null/empty values in device data
- [FIX] Fixed device attribute processing bugs
- [FIX] Corrected command processing issues
- [REMOVE] Deprecated HTML styling methods
- [REMOVE] Unused variables and constants
- [REMOVE] Legacy helper functions
- [REMOVE] Legacy fan speed handling code
- [REMOVE] Unused humidity control capabilities


# CLAUDE.md

This file provides guidance to Claude Code (claude.ai/code) when working with code in this repository.

## Project Overview

This is the homebridge-hubitat-tonesto7 plugin - a Homebridge plugin that enables integration between Hubitat smart home hubs and Apple HomeKit. The plugin uses a companion Hubitat app (homebridge-v2.groovy) to communicate with devices and relay events to HomeKit.

## Key Architecture Components

### Plugin Structure (JavaScript/Node.js)
- **Entry Point**: `src/index.js` - Registers the platform with Homebridge
- **Platform Core**: `src/HubitatPlatform.js` - Main platform class coordinating all managers
- **Device Manager**: `src/AccessoryManager.js` - Manages HomeKit accessory lifecycle
- **Communication**: `src/HubitatClient.js` - Handles API communication with Hubitat hub
- **Web Server**: `src/WebServer.js` - Express server for direct device updates from Hubitat
- **Device Types**: `src/devices/` - Individual device implementations (Switch, Light, Fan, etc.)

### Hubitat App (Groovy)
- **Location**: `apps/homebridge-v2.groovy` - Companion app installed on Hubitat hub
- Handles device discovery, event subscriptions, and direct communication with the plugin

### Communication Flow
1. Plugin requests devices from Hubitat app via REST API
2. Hubitat app sends real-time device updates to plugin's WebServer (default port 8000)
3. Plugin translates Hubitat capabilities to HomeKit characteristics
4. Direct connection enables near real-time updates without polling

## Development Commands

```bash
# Install dependencies
npm install

# Run linting (ESLint)
npm test

# Format code with Prettier
npm run prettier

# Start Homebridge with plugin (for testing)
npm start

# Start Homebridge in debug mode
npm run start-debug

# Free up port 8000 if blocked
npm run freeport
```

## Code Style Requirements

- **Module System**: ES6 modules (type: "module" in package.json)
- **Node Version**: ^18.20.4 || <25.0.0
- **Linting**: ESLint with Prettier integration
- **Style Rules**:
  - Semicolons required
  - Strict equality (===) required
  - ES6+ features preferred (arrow functions, classes, const/let)

## Important Implementation Details

### Adding New Device Types
1. Create new device class in `src/devices/` extending base device pattern
2. Define `relevantAttributes` static property for attribute filtering
3. Implement `configure()` and `handleAttributeUpdate()` methods
4. Register device in `src/AccessoryManager.js` device mapping

### Manager Pattern
The codebase uses a manager pattern for separation of concerns:
- **ConfigManager**: Handles configuration validation and updates
- **LogManager**: Centralized logging with debug/info/warn/error levels
- **VersionManager**: Tracks plugin and app versions
- **AccessoryManager**: Device lifecycle management

### Direct Connection
- WebServer listens on configurable port (default 8000)
- Hubitat app must be able to reach Homebridge instance IP
- Uses Express with rate limiting for security
- Validates requests with access token

### HomeKit Mappings
- Hubitat capabilities map to HomeKit services/characteristics
- Custom characteristics use CommunityTypes when needed
- Adaptive lighting supported for compatible bulbs
- Device type can be forced via Hubitat app configuration

## Configuration

Plugin configuration in Homebridge config.json includes:
- `app_url_local` / `app_url_cloud`: Hubitat app endpoints
- `app_id`: Hubitat app instance ID
- `access_token`: OAuth token for authentication
- `direct_port`: WebServer listening port
- `use_cloud`: Enable cloud communication fallback
- `excluded_capabilities`: Per-device capability exclusions

## Testing Approach

- No formal test framework currently configured
- Use `npm test` to run ESLint for code quality checks
- Manual testing via `npm start` with test Homebridge instance
- Device simulation through Hubitat virtual devices recommended
# homebridge-hubitat-tonesto7

This is based off of @pdlove homebridge-smartthings

[![npm version](https://badge.fury.io/js/homebridge-hubitat-tonesto7.svg)](https://badge.fury.io/js/homebridge-hubitat-tonesto7)
Current Smartapp version - 1.0.1

### Direct Updates
This method is nearly instant.
This option allows the hub to send updates directly to your homebridge-hubitat-tonesto7 installation.
The hub must be able to send an http packet to your device so make sure to allow incoming traffic on the applicable port.
The port used for this can be configured by the "direct_port" setting and defaults to 8000.
The program will attempt to determine your IP address automatically, but that can be overridden by "direct_ip" which is useful if you have multiple addresses.
As a note, the hub isn't actual doing any of the processing so if you lose Internet, updates will stop. I'm told it "doesn't currently" support it, so there is hope.

When properly setup, you should see something like this in your Homebridge startup immediately after the PIN:
```
[1/29/2017, 8:28:45 AM] Homebridge is running on port 51826.
[1/29/2017, 8:28:45 AM] [Hubitat] Direct Connect Is Listening On 192.168.0.49:8000
[1/29/2017, 8:28:45 AM] [Hubitat] Hubitat Hub Communication Established
```
## Installation

Installation comes in two parts:

### Hubitat API installation
A custom JSON API has been written to interface with Hubitat.

If you installed the previous update that doesn't allow selecting devices, you need to goto "My Locations" and then "List Smartapps" to remove the multiple installation.

* Open your Hubitat web interface
* Goto "Apps Code"
* Copy/Paste the code from [https://raw.githubusercontent.com/tonesto7/homebridge-hubitat-tonesto7/master/smartapps/tonesto7/homebridge-hubitat.src/homebridge-hubitat.groovy] 
* Press Save
* Press Oauth and Enable it 
* Press Save
* Your Done with the Hubitat code install.

* Click on the app in the list and then click "App Settings"
* Scroll down to the OAuth section and click "Enable OAuth in Smartapp"
* Select "Update" at the bottom.

* In the Hubitat Interface, goto "Apps" and select "add new app". 
* At the top right and select "Homebridge-Hubitat"
* Tap the plus next to an appropriate device group and then check off each device you would like to use.
 * There are several categories because of the way Hubitat assigns capabilities.
  * Almost all devices contain the Refresh capability and are under the "Most Devices" group
  * Some sensors don't have a refresh and are under the "Sensor Devices" group.
  * Some devices, mainly Virtual Switches, only have the Switch Capability and are in the "All Switches".
 * If you select the same device in multiple categories it will only be shown once in HomeKit, so you can safely check them all in all groups.
 * If a device isn't listed, let me know by submitting an issue on GitHub.
* Tap Done and then Done.

### Homebridge Installation

1. Install homebridge using: npm install -g homebridge
2. Install this plugin using: npm install -g homebridge-hubitat-tonesto7
3. Update your configuration file. See sample config.json snippet below.

### Config.json Settings

Example of all settings. Not all ssettings are required. Read the breakdown below.
```
	{
	   "platform": "homebridge-hubitat",
    	"name": "Hubitat",
        "app_url": "10.0.0.40/api/app/15/",
        "app_id": "THIS-SHOULD-BE-YOUR-APPID",
        "access_token": "THIS-SHOULD-BE-YOUR-TOKEN",
        "polling_seconds": 3600,
        "update_method": "direct",
        "direct_ip": "192.168.0.45",
        "direct_port": 8000,
        "api_seconds": 30
	}
```
* "platform" and "name"
**_Required_**
 * This information is used by homebridge to identify the plugin and should be the settings above.

* "app_url", "app_id" and "access_token"
**_Required_**
 * To get this information, open Hubitat on your phone, goto "Automation">"SmartApps">"JSON Complete API" and tap on Config
 * The app_url in the example may be different for you.

* "polling_seconds"
**_Optional_** Defaults to 3600
 * Identifies how often to get full updates. At this interval, homebridge-Hubitat will request a complete device dump from the API just in case any subscription events have been missed.
 * This defaults to once every hour. I have had it set to daily in my installation with no noticable issues.

* "update_method"
**_Optional_** Defaults to direct
 * See *Device Updates from Hubitat* for more information.
 * Options are: "direct", "pubnub", "api" and a recommended in that order.


* "direct_ip"
**_Optional_** Defaults to first available IP on your computer
 * This setting only applies if update_method is direct.
 * Most installations won't need this, but if for any reason it can't identify your ip address correctly, use this setting to force the IP presented to Hubitat for the hub to send to.

* "direct_port"
**_Optional_** Defaults to 8000
 * This setting only applies if update_method is direct.
 * This is the port that homebridge-Hubitat will listen on for traffic from your hub. Make sure your firewall allows incoming traffic on this port from your hub's IP address.

* "api_seconds"
**_Optional_** Defaults to 30
 * This setting only applies if update_method is api.
 * This is how often the api will poll for updates. This update method is not recommended.

##Reporting Devices for Development

* The first step is to install the smartapp to the device
 * This is done by opening Hubitat on your phone and going to "My Home">"SmartApps">"JSON Complete API". Tap all devices and make sure it is enabled in the list.
 * If you cannot find the device in this list, please submit an Issue on Github with the make/model of the device. More information will be needed, but that will be a good start.
* The next step is to start Homebridge and watch the first part of the initialization where it says "Device Added"/"Device Skipped"
 * If it says "Device Skipped", copy/paste that entire line to an Issue on Github. It supplies all the information needed to get the device up an working if HomeKit can support it.
 * If it says "Device Added" then the device should appear in HomeKit. If specific function is missing, post the Device Added line and identify what you are missing from it.
* If a large number of similar devices are Skipped or missing functionality, it may just be a Capability that is missing. If so, it will be listed in the "Unknown Capabilities" line item.

 
## What's New

* 1.0.0
 * [SmartApp] Ported app over from my SmartThings version.
 * [Homebridge] Reworked alot of the code to allow for better direct communication with Hubitat



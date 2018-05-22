# homebridge-hubitat-tonesto7

This is based off of @pdlove homebridge-smartthings

[![npm version](https://badge.fury.io/js/homebridge-hubitat-tonesto7.svg)](https://badge.fury.io/js/homebridge-hubitat-tonesto7)

```Current Smartapp version: 1.1.3```


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

### Hubitat App Installation

* Open your Hubitat web interface
* Goto "Apps Code"
* Copy/Paste the code from [Hubitat App Code](https://raw.githubusercontent.com/tonesto7/homebridge-hubitat-tonesto7/master/smartapps/tonesto7/homebridge-hubitat.src/homebridge-hubitat.groovy) 
* Press Save
* Press Oauth and Enable it 
* Press Save
* Your Done with the Hubitat code install.

* Click on the app in the list and then click "App Settings"
* Scroll down to the OAuth section and click "Enable OAuth in Smartapp"
* Select "Update" at the bottom.

* In the Hubitat Interface, goto "Apps" and select "+ Load New App". 
* Select "Homebridge (Hubitat)" from the list of User Apps
* Tap on the input next to an appropriate device group and then select each device you would like to use (The same devices can be in any of the 3 inputs)
 * There are several categories because of the way Hubitat assigns capabilities. So you might not see your device in one, but might in another.
  * Almost all devices contain the Refresh capability and are under the "Other Devices" group
  * Some sensors don't have a refresh and are under the "Sensor Devices" group.
  * Some devices, mainly Virtual Switches, only have the Switch Capability and are in the "Switch Devices".
 * If you select the same device in multiple categories it will only be shown once in HomeKit, so you can safely check them all in all groups.
 * If a device isn't listed, let me know by submitting an issue on GitHub.
* Tap Done and then Done.

### Homebridge Installation

1. Install homebridge using: npm i -g homebridge (See [Homebridge Instructions](https://github.com/nfarina/homebridge/blob/master/README.md)
2. Install this plugin using: npm i -g homebridge-hubitat-tonesto7
3. Update your configuration file. See sample config.json snippet below.

### Config.json Settings

Example of all settings. Not all settings are required. Read the breakdown below.
```
	{
	    "platform": "Hubitat", 
    	"name": "Hubitat",
        "app_url": "10.0.0.40/api/app/15/",
        "access_token": "THIS-SHOULD-BE-YOUR-TOKEN",
        "direct_ip": "192.168.0.45",
        "direct_port": 8000,
	}
```
* "platform" and "name"
**_Required_**
 * This information is used by homebridge to identify the plugin and should be the settings above.

* "app_url" and "access_token"
**_Required_**
 * To get this information, open Hubitat web interface in your browser, goto "Apps"> "Homebridge (Hubitat)" and tap on "View Configuration Data for Homebridge"
 * The app_url in the example may be different for you.

* "direct_ip"
**_Optional_** Defaults to first available IP on your computer
 * This setting only applies if update_method is direct.
 * Most installations won't need this, but if for any reason it can't identify your ip address correctly, use this setting to force the IP presented to Hubitat for the hub to send to.

* "direct_port"
**_Optional_** Defaults to 8000
 * This setting only applies if update_method is direct.
 * This is the port that homebridge-Hubitat will listen on for traffic from your hub. Make sure your firewall allows incoming traffic on this port from your hub's IP address.

## What's New

* 1.0.0
 * [Hubitat App] Ported app over from my SmartThings version.
 * [Homebridge] Reworked alot of the code to allow for better direct communication with Hubitat

* 1.0.1
 * [Hubitat App] Set Hubitat Safety Monitor Support to Off by Default.

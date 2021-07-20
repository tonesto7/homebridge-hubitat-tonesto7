# homebridge-hubitat-tonesto7
[![verified-by-homebridge](https://badgen.net/badge/homebridge/verified/purple)](https://github.com/homebridge/homebridge/wiki/Verified-Plugins)
[![npm](https://img.shields.io/npm/v/homebridge-hubitat-tonesto7?style=for-the-badge)](https://www.npmjs.com/package/homebridge-hubitat-tonesto7)
[![npm](https://img.shields.io/npm/dt/homebridge-hubitat-tonesto7?style=for-the-badge)](https://www.npmjs.com/package/homebridge-hubitat-tonesto7)
![npm](https://img.shields.io/npm/dw/homebridge-hubitat-tonesto7?style=for-the-badge)
![GitHub repo size](https://img.shields.io/github/repo-size/tonesto7/homebridge-hubitat-tonesto7?style=for-the-badge)

[![GitHub issues](https://img.shields.io/github/issues/tonesto7/homebridge-hubitat-tonesto7?style=for-the-badge)](https://github.com/tonesto7/homebridge-hubitat-tonesto7/issues)
[![GitHub pull requests](https://img.shields.io/github/issues-pr/tonesto7/homebridge-hubitat-tonesto7?style=for-the-badge)](https://github.com/tonesto7/homebridge-hubitat-tonesto7/pulls)

![CodeFactor Grade](https://img.shields.io/codefactor/grade/github/tonesto7/homebridge-hubitat-tonesto7/master?style=for-the-badge)
![Known Vulnerabilities](https://img.shields.io/snyk/vulnerabilities/github/tonesto7/homebridge-hubitat-tonesto7?style=for-the-badge)

![GitHub Workflow Status (branch)](https://img.shields.io/github/workflow/status/tonesto7/homebridge-hubitat-tonesto7/Node.js%20CI/master?style=for-the-badge)

[![Donate](https://img.shields.io/badge/donate-paypal-green.svg?style=for-the-badge)](https://www.paypal.com/cgi-bin/webscr?cmd=_s-xclick&hosted_button_id=RVFJTG8H86SK8&source=url)

## About
<p align="left">
  <img width="100" height="100" src="https://raw.githubusercontent.com/tonesto7/homebridge-hubitat-tonesto7/master/images/hb_tonesto7.png">
</p>
V2 of this plugin is a complete rewrite of the homebridge-hubitat-tonesto7 plugin using modern Javascript structure with classes, promises, and arrow functions.

![GitHub tag (latest SemVer)](https://img.shields.io/github/v/tag/tonesto7/homebridge-hubitat-tonesto7?label=Latest%20Hubitat%20App%20Version&sort=semver&style=for-the-badge)

## Credits
Big thanks for @Areson for his help/motivation in rewriting this.
Another shout out to @nh.schotfam for your help on the optimizations for hubitat.

I also wanted to mention the following projects I referenced for inspiration for a few minor items and fixes:
* [homebridge-wink3](https://github.com/sibartlett/homebridge-wink3)
* [homebridge-hubconnect-hubitat](https://github.com/danTapps/homebridge-hubitat-hubconnect)

## Change Log:

### Hubitat App:

- See [CHANGELOG](https://github.com/tonesto7/homebridge-hubitat-tonesto7/blob/master/CHANGELOG-app.md)

### Homebridge Plugin:

- See [CHANGELOG](https://github.com/tonesto7/homebridge-hubitat-tonesto7/blob/master/CHANGELOG.md)

#### Direct Updates from Hubitat
 * Device/location events are almost real-time.
 * This option allows the hub to send updates directly to your homebridge-hubitat-tonesto7 installation.
 * The hub must be able to send an http packet to your device so make sure to allow incoming traffic on the applicable port.
 * The port used for this can be configured by the `direct_port` setting and defaults to `8000`.
 * The program will attempt to determine your IP address automatically, but that can be overridden by `direct_ip` which is useful if you have multiple addresses.
 * The plugin and hubitat will continue to function when you lose internet (with the exception of controlling any cloud based devices).

When properly setup, you should see something like this in your Homebridge startup immediately after the PIN:
```
[11/25/2019, 4:44:46 PM] [Hubitat-v2] Devices to Remove: (0) []
[11/25/2019, 4:44:46 PM] [Hubitat-v2] Devices to Update: (40)
[11/25/2019, 4:44:46 PM] [Hubitat-v2] Devices to Create: (0) []
[11/25/2019, 4:44:46 PM] [Hubitat-v2] Total Initialization Time: (2 seconds)
[11/25/2019, 4:44:46 PM] [Hubitat-v2] Unknown Capabilities: ["Power Source"]
[11/25/2019, 4:44:46 PM] [Hubitat-v2] Hubitat DeviceCache Size: (40)
[11/25/2019, 4:44:46 PM] [Hubitat-v2] WebServer Initiated...
[11/25/2019, 4:44:46 PM] [Hubitat-v2] Sending StartDirect Request to Hubitat | SendToLocalHub: (false)
[11/25/2019, 4:44:46 PM] [Hubitat-v2] Direct Connect Enabled and Listening on 10.0.0.163:8000
```

# Installation

Installation comes in two parts:

## 1. Hubitat App Installation

### Option 1: Automated Install
   * Install [Hubitat Package Manager](https://github.com/dcmeglio/hubitat-packagemanager)
   * Search for Homebridge v2 under the Package Manager

### Option 2: Import from GitHub URL

* Open the Hubitat UI in your web browser
* Click on **`Apps Code`** in left navigation panel
* Click **`New App`** on the top right of page
* Click the **`Import`** button:
  * Paste in this URL: `https://raw.githubusercontent.com/tonesto7/homebridge-hubitat-tonesto7/master/apps/homebridge-v2.groovy`
* Click the **`Import`** button
   * Click `OK` on the confirmation prompt
* Click **`Save`** and wait for the spining wheel to disappear and the page refreshes
* Click on the `OAUTH` button:
   * Click **`Enable OAuth in App`**
   * Click **`Update`** at the bottom.
   * (If you are upgrading from a previous version of this project, OAuth will likely already be enabled and you can safely disregard this step)

## 2. Hubitat App Configuration

* In the Hubitat UI, click on `Apps` in the left navigation panel and click `Add User App`.
* Select `Homebridge v2` from the choices on the list.
* **Configuring the App:**

   In **`Define Device Types`** there are 8 inputs that can be used to force a device to be discovered as a specific type in HomeKit.
   **NOTE:** Do not select the same device in more that one input. If you select a device here, do not select that same device in the other device inputs on the previous page.

   For any other devices you would like to add that weren't added in the previous step, just tap on the input next to an appropriate device group and then select each device you would like to use. (The same devices can be selected in any of the Sensor, Switch, Other inputs)
    * There are several categories here because of the way Hubitat assigns capabilities. You might not see your device in one, but might in another.
    * Almost all devices contain the Refresh capability and are under the "Other Devices" group.
    * Some sensors don't have a refresh and are under the "Sensor Devices" group.
    * Some devices, mainly Virtual Switches, only have the Switch Capability and are in the "Switch Devices" group.

    **If you select the same device in multiple categories, it will only be shown once in HomeKit. You can safely check them all in all groups, aside from the NOTICE above.**

 * Tap **`Done`**
 * Tap **`Done`**
 You are finished with the App configuration!
 </br>

## 3. Homebridge Plugin Installation:

***NOTICE:*** I highly recommend using [homebridge-config-ui-x](https://github.com/oznu/homebridge-config-ui-x) to manage your homebridge instance, plugin and configs. This will allow you to use the web based form to configure this plugin.

 1. Install homebridge using: `npm i -g homebridge` (For Homebridge Install: [Homebridge Instructions](https://github.com/nfarina/homebridge/blob/master/README.md))
 2. Install Hubitat plugin using: `npm i -g homebridge-hubitat-tonesto7`
 3. Update your configuration file using the config generator inside the Hubitat App as the template to copy/paste into platform section of the Homebridge config.json.

### Config.json Settings Example

#### Example of all settings. Not all settings are required. Read the breakdown below.

```json
   {
      "platform": "Hubitat-v2",
      "name": "Hubitat-v2",
      "app_url_local": "http://10.0.0.40/apps/api/",
      "app_url_cloud": "https://cloud.hubitat.com/api/561d981e-f986-4f7f-941d-5d43d1d0e0e1/apps/",
      "app_id": 436,
      "app_platform": "Hubitat",
      "use_cloud": true,
      "access_token": "1888d2bc-7792-1114-9f32-e4724e388a26",
      "communityUserName": "tonesto7",
      "direct_ip": "10.0.0.15",
      "direct_port": 8000,
      "temperature_unit": "F",
      "validateTokenId": false,
      "adaptive_lighting": true,
      "adaptive_lighting_offset": 0,
      "excluded_capabilities": {
         "HUBITAT-DEVICE-ID-1": [
            "Switch",
            "Temperature Measurement"
         ]
      },
      "logConfig": {
         "debug": false,
         "showChanges": true
      }
   }
```


 * __<u>`platform`</u>__ & __<u>`name`</u>__  _Required_

    This information is used by homebridge to identify the plugin and should be the settings above.

 * __<u>`app_url_local`</u>__ & __<u>`app_url_cloud`</u>__ & __<u>`app_id`</u>__ & __<u>`access_token`</u>__  _Required_
    
    <span style="color: orange;"><b>NOTICE:</b> The app_url's in the example will be different for you.</span>
    
    To get this information, open the installed Hubitat Homebridge V2 App the Hubitat Web UI, and tap on `View Configuration Data for Homebridge`
    

 * __<u>`use_cloud`</u>__ _Required_ | _Default: `false`_

    This will enable the plugin to communicate with the hubitat app via the cloud url.  (Mostly useful for troubleshooting local communication issues via ports)

 * __<u>`communityUserName`</u>__  _Optional_ | _Default:_ ''
    
    Only needed when you are having issues with the plugin and you want me to be able to identify your reported exception errors.

 * __<u>`direct_ip`</u>__  _Optional_ | _Default: 'First available IP on your computer'_

    Most installations won't need this, but if for any reason it can't identify your ip address correctly, use this setting to force the IP presented to Hubitat for the hub to send to.

 * __<u>`direct_port`</u>__  _Optional_ | _Default: `8000`_
    
    This is the port that the `homebridge-hubitat-tonesto7` plugin will listen on for traffic from your hub. Make sure your firewall allows incoming traffic on this port from your Hubitat hub IP address to your HomeBridge instance.

 * __<u>`temperature_unit`</u>__  _Optional_ | _Default: `F`_
    
    This will allow you to define the temp unit to use.  This can also be set in the HUbitat App

 * __<u>`validateTokenId`</u>__  _Optional_ | _Default: `false`_
    
    This forces the plugin to validate the Hubitat app token and location with that defined in the plugin configuration

 * __<u>`adaptive_lighting`</u>__  _Optional_ | _Default: `true`_
    
    This enables support for bulbs with Color Temp and Brightness to use HomeKit's new [Adaptive Lighting](https://www.howtogeek.com/712520/how-to-use-adaptive-lighting-with-apple-homekit-lights/#:~:text=The%20Adaptive%20Lighting%20feature%20was,home%20lights%20throughout%20the%20day.) features.

 * __<u>`adaptive_lighting_offset`</u>__  _Optional_ | _Default: `0`_
    
    Defines a custom temperature adjustment factor. This can be used to define a linear deviation from the HomeKit Controller defined ColorTemperature schedule. For example supplying a value of -10 will reduce the ColorTemperature, which is calculated from the transition schedule, by 10 mired for every change.

 * __<u>`consider_fan_by_name`</u>__  _Optional_ | _Default: `true`_
    
    By default the plugin will identify a fan device by using a devices label, and whether it has Fan in the label.

 * __<u>`consider_light_by_name`</u>__  _Optional_ | _Default: `false`_
    
    By default the plugin will identify a light device by using a devices label, and whether it has Light in the label.

 * __<u>`excluded_capabilities`</u>__ _Optional_ | _Default: '{}' (None)_

    NOTICE: The Hubitat app offers many inputs to help filter out device capabilities. Only use this if the available inputs don't meet your needs. Specify the Hubitat device by ID and the associated capabilities you want the plugin to ignore.
    This prevents a Hubitat device creating unwanted or redundant HomeKit accessories.

 * __<u>`logConfig`</u>__ _Optional_
    
    Define log output format options as well as enable the log file output.

   - __<u>`debug`</u>__ _Optional_ | _Default: `false`_
        
        Enables Debug log output.

   - __<u>`showChanges`</u>__ _Optional_ | _Default: `true`_

    Logs device event changes received from Hubitat.


## Frequently Asked Question:

 ***Q:*** Can this support Axis Blinds?
***A:*** Maybe, it can support any device that has the windowShade capability and/or level attributes.

## Known Issues:

* None reported yet...

## DONATIONS:
<p align="left">
  <img width="200" height="200" src="https://raw.githubusercontent.com/tonesto7/homebridge-hubitat-tonesto7/master/images/donation_qr.png">
</p>

[![PayPal Donations](https://img.shields.io/badge/donate-paypal-green.svg?style=for-the-badge)](https://www.paypal.com/donate?hosted_button_id=5GMA6C3RTLXH6)

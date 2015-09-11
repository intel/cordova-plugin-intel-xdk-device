
/*
Copyright 2015 Intel Corporation

Licensed under the Apache License, Version 2.0 (the "License"); you may not use this file 
except in compliance with the License. You may obtain a copy of the License at

       http://www.apache.org/licenses/LICENSE-2.0

Unless required by applicable law or agreed to in writing, software distributed under the 
License is distributed on an "AS IS" BASIS, WITHOUT WARRANTIES OR CONDITIONS OF ANY KIND, 
either express or implied. See the License for the specific language governing permissions 
and limitations under the License
*/

    // This try/catch is temporary to maintain backwards compatibility. Will be removed and changed to just 
    // require('cordova/exec/proxy') at unknown date/time.
    var commandProxy;
    try {
        commandProxy = require('cordova/windows8/commandProxy');
    } catch (e) {
        commandProxy = require('cordova/exec/proxy');
    }
    var cordova = require('cordova');

    var deviceProxy = {
        shouldAutoRotate: false,
        orientationSensor: null,
        closeImage: null,
        virtualPagesCount: 0,
        smsDevice: null,
        smsArgs: "",

        initialize: function(success, fail, args) {
            //Initialize namespace intel.xdk.device.
            window.intel = window.intel || {};
            var intel = window.intel;
            intel.xdk = intel.xdk || {};
            intel.xdk.device = intel.xdk.device || {};

            var proxy = deviceProxy;

            //Bind connection to intel.xdk.device.
            intel.xdk.device.connection = proxy.getConnection();
            //Dispatch event 'intel.xdk.device.connection.update'.
            proxy.createAndDispatchEvent('intel.xdk.device.connection.update', { success: true });

            //Bind hasCaching to intel.xdk.device.
            intel.xdk.device.hasCaching = false;

            //Bind hasStreaming to intel.xdk.device.
            intel.xdk.device.hasStreaming = false;

            //Bind lastStation to intel.xdk.device.
            intel.xdk.device.lastStation = null;

            //Bind phonegapversion to intel.xdk.device.
            intel.xdk.device.phonegapversion = cordova.version;

            //Bind model to intel.xdk.device.
            intel.xdk.device.model = 'Model information is not available in windows store app.';

            //Bind osversion to  intel.xdk.device.
            intel.xdk.device.osversion = '8';

            //Bind uuid to intel.xdk.device.
            intel.xdk.device.uuid = 'Serial number is not available in windows store app.';

            //Bind platform to intel.xdk.device.
            intel.xdk.device.platform = 'windows8';

            //Bind orientation to intel.xdk.device.
            intel.xdk.device.initialOrientation = proxy.getOrientation();

            //Bind orientation to intel.xdk.device.
            intel.xdk.device.orientation = intel.xdk.device.initialOrientation;

            //Bind queryString to intel.xdk.device.
            intel.xdk.device.queryString = '';

            //Listen to orientationchanged event.
            proxy.orientationSensor = Windows.Devices.Sensors.SimpleOrientationSensor.getDefault();

            if (proxy.orientationSensor != null)
                proxy.orientationSensor.addEventListener('orientationchanged', function(e) {
                    var currentOrientation = proxy.getOrientation();

                    //handle should automatic rotate
                    if (proxy.shouldAutoRotate) {
                        switch (currentOrientation) {
                        case 0:
                            Windows.Graphics.Display.DisplayInformation.autoRotationPreferences = Windows.Graphics.Display.DisplayOrientations.portrait;
                            break;
                        case 90:
                            Windows.Graphics.Display.DisplayInformation.autoRotationPreferences = Windows.Graphics.Display.DisplayOrientations.landscape;
                            break;
                        case 180:
                            Windows.Graphics.Display.DisplayInformation.autoRotationPreferences = Windows.Graphics.Display.DisplayOrientations.portraitFlipped;
                            break;
                        case -90:
                            Windows.Graphics.Display.DisplayInformation.autoRotationPreferences = Windows.Graphics.Display.DisplayOrientations.landscapeFlipped;
                            break;
                        default:
                            break;
                        }
                    }

                    //update intel.xdk.device.orientation
                    intel.xdk.device.orientation = currentOrientation;

                    //Fire the intel.xdk.device.orientation.change event.
                    proxy.createAndDispatchEvent('intel.xdk.device.orientation.change', { orientation: currentOrientation });
                });

            //Dispatch event 'intel.xdk.device.init'.
            proxy.createAndDispatchEvent('intel.xdk.device.init', {
                connection: proxy.getConnection(),
                hasCaching: false,
                hasStreaming: false,
                lastStation: null,
                phonegapversion: cordova.version,
                model: 'Model information is not available in windows store app.',
                osversion: '8',
                uuid: 'Serial number is not available in windows store app.',
                platform: 'windows8',
                initialOrientation: proxy.getOrientation(),
                orientation: proxy.getOrientation(),
                queryString: ''
            });
        },

        addRemoteScript: function(success, fail, args) {
            var url = args[0];

            WinJS.xhr({ url: url }).then(function complete(res) {
                var script = res.response;

                //eval script
                eval(script);
                success(res);
            }, function error(e) {
                fail(res);
            }, function progress() {

            });
        },

        copyToClipboard: function(success, fail, args) {
            var text = args[0] || '';

            var dataPackage = new Windows.ApplicationModel.DataTransfer.DataPackage();
            dataPackage.requestedOperation = Windows.ApplicationModel.DataTransfer.DataPackageOperation.copy;
            dataPackage.setText(text);

            try {
                Windows.ApplicationModel.DataTransfer.Clipboard.setContent(dataPackage);
            } catch (e) {
                console.log('Fail to access clipboard, ' + e);
            }
        },

        getRemoteData: function(success, fail, args) {
            var url = args[0];
            var requestMethod = args[1].toUpperCase();
            var requestBody = args[2];
            var successCallback = args[3] || success || null;
            var errorCallback = args[4] || fail || null;

            var getRemoteDataProxy = deviceProxy.getRemoteDataProxy;

            getRemoteDataProxy(url, requestMethod, requestBody, null, successCallback, errorCallback);
        },

        getRemoteDataWithID: function(success, fail, args) {
            var url = args[0];
            var requestMethod = args[1].toUpperCase();
            var requestBody = args[2];
            var id = args[3];
            var successCallback = args[4] || success || null;
            var errorCallback = args[5] || fail || null;


            var getRemoteDataProxy = deviceProxy.getRemoteDataProxy;

            getRemoteDataProxy(url, requestMethod, requestBody, id, successCallback, errorCallback);
        },

        getRemoteDataExt: function (success, fail, args) {
            var paramsObj;

            if (args.length == 1 && typeof(args[0]) != "object")
                paramsObj = JSON.parse(args[0]);
            else
                paramsObj = args[0];

            var url = paramsObj.url;
            var requestBody = paramsObj.body;
            var requestMethod = paramsObj.method;
            var headers = paramsObj.headers;
            var id = paramsObj.id;

            var getRemoteDataProxy = deviceProxy.getRemoteDataProxy;

            var options = {
                url: url,
                data: requestBody,
                type: requestMethod,
            };

            //Parse headers
            if (headers) {
                var headersObj = {};
                var headersArray = headers.split('&');
                for (var i = 0; i < headersArray.length; i++) {
                    var pair = headersArray[i].split('=');
                    var key = pair[0];
                    var value = pair[1];
                    headersObj.key = value;
                }

                options.headers = headersObj;
            }

            WinJS.xhr(options).then(
                function (data) {
                    var responseString = data.response;

                    var statusCode = data.status;
                    var respHeaders = "headers:{";
                    var cookieData = "[";

                    //forEach (var key in resp.Headers.AllKeys)
                    //{
                    //                if (key.ToLower() == "set-cookie")
                    //        cookieData += String.Format("'{0}',", resp.Headers[key].Replace("'", "\\'"));
                    //        respHeaders += String.Format("'{0}':'{1}',", key, resp.Headers[key].Replace("'", "\\'"));
                    //    }
                    ////trim off the last character
                    //                    if (cookieData != "[")
                    //cookieData = cookieData.Substring(0, cookieData.Length - 1);
                    respHeaders += "'All-Cookies':" + cookieData + "]";
                    respHeaders += "}";

                    var statusExtra = "{status:" + statusCode + "," + respHeaders + "}";

                    //var e = document.createEvent('Events');
                    //e.initEvent('intel.xdk.device.remote.data', true, true);
                    //e.success = true;
                    //e.id = id;
                    //e.response = responseString;
                    //e.extras = statusExtra;
                    //document.dispatchEvent(e);
                    proxy.createAndDispatchEvent('intel.xdk.device.remote.data', { id: id, success: true, response: responseString, extras: statusExtra });
                    success({ success: true, id: id, response: responseString, extras: statusExtra });

                }, function (e) {
                    e = e.response;

                    //var ev = document.createEvent('Events');
                    //ev.initEvent('intel.xdk.device.remote.data', true, true);
                    //ev.success = false;
                    //ev.id = id;
                    //ev.response = '';
                    //ev.extras = {};
                    //ev.error = e;
                    //document.dispatchEvent(ev);
                    proxy.createAndDispatchEvent('intel.xdk.device.remote.data', { id: id, success: false, response: "", extras: {}, error: e });

                }, function progress(data) {

                });
        },

        hideStatusBar: function (success, fail, args) {
            //var dialog = new Windows.UI.Popups.MessageDialog('intel.xdk.device.hideStatusBar is not supported in windows8.');
            //dialog.showAsync();
            deviceProxy.createAndDispatchEvent('intel.xdk.device.hideStatusBar', { success: false, message: "intel.xdk.device.hideStatusBar is not supported in windows8." });

            success({ success: false, message: "intel.xdk.device.hideStatusBar is not supported in windows8." });
        },

        addVirtualPage: function() {
            deviceProxy.virtualPagesCount++;
        },

        removeVirtualPage: function() {
            deviceProxy.virtualPagesCount--;
        },

        blockRemotePages: function() {
            //var dialog = new Windows.UI.Popups.MessageDialog('intel.xdk.device.blockRemotePages is not supported in windows8.');
            //dialog.showAsync();       
            deviceProxy.createAndDispatchEvent('intel.xdk.device.hideStatusBar', { success: false, message: "intel.xdk.device.hideStatusBar is not supported in windows8." });
        },

        runInstallNativeApp: function() {
            //var dialog = new Windows.UI.Popups.MessageDialog('intel.xdk.device.runInstallNativeApp is not supported in windows8.');
            //dialog.showAsync();           
            deviceProxy.createAndDispatchEvent('intel.xdk.device.hideStatusBar', { success: false, message: "intel.xdk.device.hideStatusBar is not supported in windows8." });
        },

        scanBarcode: function() {
            cordova.plugins.barcodeScanner.scan(
                    function (result) {
                        var format = "QR_CODE";
                        var e = document.createEvent('Events');
                        e.initEvent('intel.xdk.device.barcode.scan', true, true);
                        e.success = true;
                        e.codetype = format;
                        e.codedata = result;
                        document.dispatchEvent(e);

                        //errorPopup("We got a barcode\n" +
                        //      "Result: " + result.text + "\n" +
                        //      "Format: " + result.format + "\n" +
                        //      "Cancelled: " + result.cancelled);
                    },
                    function (error) {
                        errorPopup("Scanning failed: " + error);
                    }
                 );
        },

        sendEmail: function(success, fail, args) {
            var bodyText = args[0];
            var toString = args[1];
            var subjectText = args[2];
            var isHTML = args[3];
            var ccString = args[4];
            var bccString = args[5];


            var mailto = new Windows.Foundation.Uri("mailto:?to=" + toString + "&subject=" + subjectText + "&body=" + bodyText + "&cc=" + ccString + "&bcc=" + bccString);
            Windows.System.Launcher.launchUriAsync(mailto);

        },

        sendSMS: function(success, fail, args) {
            if (deviceProxy.smsDevice == null) {
                deviceProxy.smsArgs = args;
                var smsDeviceOperation = Windows.Devices.Sms.SmsDevice.getDefaultAsync();
                smsDeviceOperation.done(deviceProxy.smsDeviceReceived, deviceProxy.smsErrorCallback);
            } else {
                deviceProxy.smsDeviceSend();
            }
        },

        smsDeviceReceived: function(smsDeviceResult) {
            smsDevice = smsDeviceResult;
            deviceProxy.smsDeviceSend();
        },

        smsDeviceSend: function() {
            try {
                if (smsDevice !== null) {
                    // Defines a text message
                    var bodyText = deviceProxy.smsArgs[0];
                    var toNumber = deviceProxy.smsArgs[1];

                    var smsMessage = new Windows.Devices.Sms.SmsTextMessage();
                    smsMessage.body = bodyText;
                    smsMessage.to = toNumber;
                    var sendSmsMessageOperation = smsDevice.sendMessageAsync(smsMessage);

                    sendSmsMessageOperation.done(function(reply) {
                        // susscess sent 

                    }, deviceProxy.smsErrorCallback);
                } else {
                    // No SMS device found
                }
            } catch (err) {
                // "SMS message was not sent
            }
        },

        smsErrorCallback: function(error) {
            WinJS.log && WinJS.log(error.name + " : " + error.description, "sample", "error");
        },

        setAutoRotate: function(success, fail, args) {
            deviceProxy.shouldAutoRotate = (args[0] === 'true');
        },

        launchExternal: function(success, fail, args) {
            var url = new Windows.Foundation.Uri(args[0]);
            Windows.System.Launcher.launchUriAsync(url);
        },

        managePower: function(success, fail, args) {
            //var dialog = new Windows.UI.Popups.MessageDialog('intel.xdk.device.managerPower is not supported in windows8.');
            //dialog.showAsync();
            deviceProxy.createAndDispatchEvent('intel.xdk.device.managerPower', { success: false, message: "intel.xdk.device.managerPower is not supported in windows8." });
        },

        setBasicAuthentication: function() {
            //var dialog = new Windows.UI.Popups.MessageDialog('intel.xdk.device.setBasicAuthentication is not supported in windows8.');
            //dialog.showAsync();       
            deviceProxy.createAndDispatchEvent('intel.xdk.device.setBasicAuthentication', { success: false, message: "intel.xdk.device.setBasicAuthentication is not supported in windows8." });
        },

        setRotateOrientation: function(success, fail, args) {
            var orientation = args[0].toUpperCase();

            var autoRotationPreferences = Windows.Graphics.Display.DisplayInformation.autoRotationPreferences;

            switch (orientation) {
            case 'PORTRAIT':
                Windows.Graphics.Display.DisplayInformation.autoRotationPreferences = Windows.Graphics.Display.DisplayOrientations.portrait;
                break;
            case 'LANDSCAPE':
                Windows.Graphics.Display.DisplayInformation.autoRotationPreferences = Windows.Graphics.Display.DisplayOrientations.landscape;
                break;
            default:
                break;
            }
        },

        updateConnection: function(success, fail, args) {
            var proxy = deviceProxy;

            //Updata intel.xdk.device.connection.
            intel.xdk.device.connection = proxy.getConnection();

            //Dispatch the event intel.xdk.device.connection.update.
            proxy.createAndDispatchEvent('intel.xdk.device.connection.update', { connection: intel.xdk.device.connection, success: true });
            success({ connection: intel.xdk.device.connection, success: true });
        },

        closeRemoteSite: function() {
            var webview = document.getElementById('intelxdkdeviceremotewebview');
            if (webview) {
                //Remove remote webview.
                webview.parentNode.removeChild(webview);
                deviceProxy.closeImage.parentNode.removeChild(deviceProxy.closeImage);
                deviceProxy.closeImage = null;
            }
        },

        showRemoteSite: function(success, fail, args) {
            var url = args[0];
            var closeImageX = (args[1] == null) ? 48 : args[1];
            var closeImageY = (args[2] == null) ? 48 : args[2];
            var closeImageWidth = (args[3] == null) ? 48 : args[3];
            var closeImageHeight = (args[4] == null) ? 48 : args[4];

            var proxy = deviceProxy;
            deviceProxy.showRS(url, closeImageX, closeImageY, closeImageX, closeImageY, closeImageWidth, closeImageHeight);
        },

        showRemoteSiteExt: function(success, fail, args) {
            var url = args[0];
            var closeImagePortraitX = (args[1] == null) ? 48 : args[1];
            var closeImagePortraitY = (args[2] == null) ? 48 : args[2];
            var closeImageLandscapeX = (args[3] == null) ? 48 : args[3];
            var closeImageLandscapeY = (args[4] == null) ? 48 : args[4];
            var closeImageWidth = (args[5] == null) ? 55 : args[5];
            var closeImageHeight = (args[6] == null) ? 55 : args[6];

            var proxy = deviceProxy;
            proxy.showRS(url, closeImagePortraitX, closeImagePortraitY, closeImageLandscapeX, closeImageLandscapeY, closeImageWidth, closeImageHeight);
        },

        showRS: function(url, closeImagePortraitX, closeImagePortraitY, closeImageLandscapeX, closeImageLandscapeY, closeImageWidth, closeImageHeight) {
            //Get the current orientation.
            var currentOrientation = 'LANDSCAPE';
            if (intel.xdk.device.orientation == 0 || intel.xdk.device.orientation == 180) {
                currentOrientation = 'PORTRAIT';
            }

            //Set the close image position according to current orientation.
            var closeImageX = currentOrientation === 'LANDSCAPE' ? closeImageLandscapeX : closeImagePortraitX;
            var closeImageY = currentOrientation === 'LANDSCAPE' ? closeImageLandscapeY : closeImagePortraitY;

            //Initialize the remote webview.
            var webview = document.getElementById('intelxdkdeviceremotewebview');
            if (!webview) {
                webview = document.createElement("x-ms-webview");
                webview.id = 'intelxdkdeviceremotewebview';
            }

            webview.style.width = "100%"; //document.body.clientWidth + "px";  //'900';
            webview.style.height = "100%"; //document.body.clientHeight + "px";  //'600';
            webview.style.position = 'fixed';
            webview.style.top = '0px';
            webview.style.left = '0px';
            webview.style.zIndex = 1002;

            //webview.src = url;
            webview.navigate(url);

            document.body.appendChild(webview);

            //Set close image.
            if (!deviceProxy.closeImage) {
                deviceProxy.closeImage = new Image();
                deviceProxy.closeImage.src = '../../plugins/intel.xdk.device/remote_close.png';
                deviceProxy.closeImage.id = 'closeimage';
            }

            deviceProxy.closeImage.style.zIndex = 1003;
            deviceProxy.closeImage.style.position = 'fixed';
            deviceProxy.closeImage.style.left = closeImageX + "px";
            deviceProxy.closeImage.style.top = closeImageY + "px";
            deviceProxy.closeImage.style.height = closeImageHeight + "px";
            deviceProxy.closeImage.style.width = closeImageWidth + "px";
            document.body.appendChild(deviceProxy.closeImage);

            deviceProxy.closeImage.onclick = function(e) {
                deviceProxy.closeRemoteSite();
            };
        },

        init: function() {
        },

        getConnection: function() {
            var connectionProfile = Windows.Networking.Connectivity.NetworkInformation.getInternetConnectionProfile();

            if (!connectionProfile) {
                return 'none';
            }

            var connectionLevel = connectionProfile.getNetworkConnectivityLevel();

            switch (connectionLevel) {
                    //none
                case 0:
                    return 'none';
                    break;
                //localAccess
                case 1:
                    return 'wifi';
                    break;
                //constrainedInternetAccess || internetAccess
                default:
                    return 'wifi';
                    break;
            }
        },

        getOrientation: function() {
            var currentOrientation = 4;

            if (Windows.Devices.Sensors.SimpleOrientationSensor.getDefault() != null)
                currentOrientation = Windows.Devices.Sensors.SimpleOrientationSensor.getDefault().getCurrentOrientation();

            switch (currentOrientation) {
            case 0:
                return 90;
            case 1:
                return 180;
            case 2:
                return -90;
            case 3:
                return 0;
            default:
                return 90;
            }
        },

        createAndDispatchEvent: function (name, properties) {
            var e = document.createEvent('Events');
            e.initEvent(name, true, true);
            if (typeof properties === 'object') {
                for (key in properties) {
                    e[key] = properties[key];
                }
            }
            document.dispatchEvent(e);
        },

        getRemoteDataProxy: function (url, requestMethod, requestBody, uuid, successCallback, errorCallback, headers) {
            if (uuid) {
                requestBody += ('&uuid=' + uuid);
            }

            var options = {
                url: url,
                data: requestBody,
                type: requestMethod,
            };

            //Parse headers
            if (headers) {
                var headersObj = {};
                var headersArray = headers.split('&');
                for (var i = 0; i < headersArray.length; i++) {
                    var pair = headersArray[i].split('=');
                    var key = pair[0];
                    var value = pair[1];
                    headersObj.key = value;
                }

                options.headers = headersObj;
            }

            WinJS.xhr(options).then(function success(data) {
                data = data.response;

                if (typeof successCallback === 'function') {
                    if (uuid) {
                        //successCallback(uuid, data);
                        successCallback({uniqueID:uuid, data: data});
                    } else {
                        successCallback(data);
                    }

                } else if (typeof successCallback === 'string') {
                    if (typeof window[successCallback] === 'function') {
                        if (uuid) {
                            window[successCallback](uuid, data);
                        } else {
                            window[successCallback](data);
                        }
                    }
                }
            }, function error(e) {
                e = e.response;

                if (typeof errorCallback === 'function') {
                    if (uuid) {
                        errorCallback(uuid, e);
                    } else {
                        errorCallback(e);
                    }
                } else if (typeof errorCallback === 'string') {
                    if (typeof window[errorCallback] === 'function') {
                        if (uuid) {
                            window[errorCallback](uuid, e);
                        } else {
                            window[errorCallback](e);
                        }

                    }
                }
            }, function progress(data) {

            });
        },
    };

    commandProxy.add('IntelXDKDevice', deviceProxy);


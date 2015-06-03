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

var exec = require('cordova/exec');
var channel = require('cordova/channel');

//  On iOS, Orientation is controlled by methods in the app delegate, which belongs to Cordova,
//  so it is not possible for a plugin to control orientation directly. However, Cordova
//  provides an indirect mechanism through the `window.shouldRotateToOrientation` method.
//  If this method is defined, then, Cordova will call it to ask whether a particular
//  orientation is permitted.

module.exports = {
    _doOrientation : false,
    _orientation : "any",
    _shouldAutoRotate : true,
    
    // The `_recheckScreenOrientation` native code plugin method will
    // *    rotate the screen to a permitted orientation if a specific orientation has 
    //      been set
    // *    rotate the screen to match the physical device orientation if a specific 
    //      orientation has not been set and autorotation is allowed
    // It works by triggering the iOS rotation logic, which causes iOS to call
    // -[CDVViewController shouldAutorotateToInterfaceOrientation:], which calls
    // `window.shouldRotateToOrientation`, defined below.
    
	setAutoRotate : function(shouldAutoRotate){
        // If we haven't implemented the orientation control mechanism, then this function 
        // can't do anything.
	    if (this._doOrientation) {
            this._shouldAutoRotate = shouldAutoRotate;
            exec(null, null, "IntelXDKDevice", "_recheckScreenOrientation", []);
	    }
	},

	setRotateOrientation : function(orientation){
        // If we haven't implemented the orientation control mechanism, then this function 
        // can't do anything.
	    if (this._doOrientation) {
            this._orientation = orientation;
            exec(null, null, "IntelXDKDevice", "_recheckScreenOrientation", []);
        }
	},
	
	// At plugin initialization time, check there is already a window.shouldRotateToOrientation
	// method defined. If so, then someone else has already claimed Cordova's orientation
	// control mechanism. If not, then define it.
	initForOrientation : function(){
        this._doOrientation = ! window.shouldRotateToOrientation;
	    if (this._doOrientation) {
            me = this;
            window.shouldRotateToOrientation = function(orientation){
                orientation = (orientation + 360) % 360;    // -90  => 270
                switch (me._orientation) {
                    // If a specific permitted orientation has been set with a call to
                    // `setRotateOrientation`, then only that orientation is permitted.
                    case "portrait":
                        return (orientation == 0 || orientation == 180);
                    case "landscape":
                        return (orientation == 90 || orientation == 270);
                    // If a specific orientation has not been set, then rotation to any
                    // orientation is allowed if autoRotation has been permitted with a
                    // call to `setAutoRotate`.
                    default:
                        return me._shouldAutoRotate;
                }
            }
        }
	}
};

channel.createSticky('IntelXDKDeviceIOS');
channel.waitForInitialization('IntelXDKDeviceIOS');

channel.onCordovaReady.subscribe(function () {
    // **Do not** use the usual idiom:
    //      me = module.exports
    //      ...
    //      me.initForOrientation()
    // The `module.exports` in this file is a temporary object whose contents will have been
    // merged into the actual plugin object before this function is called.
    //
    intel.xdk.device.initForOrientation();
});

//Event intel.xdk.device.init will be fired once properties have been bound to intel.xdk.device.
document.addEventListener('intel.xdk.device.init',function(){
	channel.IntelXDKDeviceIOS.fire();
});

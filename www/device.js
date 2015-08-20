
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
var utils = require('cordova/utils');
var cordova = require('cordova');

/**
 * Provides access to the various notification features on the device.
 */

module.exports = {

    // blockRemotePages is not implemented in XDK. Use the built-in Cordova access control 
    // and white-listing capability instead:
    // <http://cordova.apache.org/docs/en/2.5.0/guide_whitelist_index.md.html>
	//
	// blockRemotePages: function(shouldblock, whitelist){...},

	getRemoteData : function(url, requestMethod, requestBody, successCallback, errorCallback){
		if(typeof successCallback == "function"){
			exec(successCallback, errorCallback, "IntelXDKDevice", "getRemoteData", [url, requestMethod, requestBody]);
		}
		else{
			exec(null, null, "IntelXDKDevice", "getRemoteData", [url, requestMethod, requestBody, successCallback, errorCallback]);
		}
	},

	getRemoteDataExt : function(paramsObj){
		exec(null, null, "IntelXDKDevice", "getRemoteDataExt", [paramsObj]);	
	},

	getRemoteDataWithID : function(url, requestMethod, requestBody, successCallback, errorCallback, uuid){
		if(typeof successCallback == "function"){
			exec(successCallback, errorCallback, "IntelXDKDevice", "getRemoteDataWithID", [url, requestMethod, requestBody, uuid]);
		}
		else{
			exec(null, null, "IntelXDKDevice", "getRemoteDataWithID", [url, requestMethod, requestBody, uuid, successCallback, errorCallback]);
		}
	},

	hideStatusBar : function(){
		exec(null, null, "IntelXDKDevice", "hideStatusBar", []);
	},

	launchExternal : function(url){
		exec(null, null, "IntelXDKDevice", "launchExternal", [url]);
	},

	managePower : function(shouldStayOn, onlyWhenPluggedIn){
		exec(null, null, "IntelXDKDevice", "managePower", [shouldStayOn, onlyWhenPluggedIn]);
	},

	runInstallNativeApp : function(appName, protocolHandler, appLocationURL, bundleID){
		exec(null, null, "IntelXDKDevice", "runInstallNativeApp", [appName, protocolHandler, appLocationURL, bundleID]);
	},

	scanBarcode : function(){
		exec(null, null, "IntelXDKDevice", "scanBarcode", []);
	},

	sendEmail : function(bodyText, toString, subjectText, isHTML, ccString, bccString){
		exec(null, null, "IntelXDKDevice", "sendEmail", [bodyText, toString, subjectText, isHTML, ccString, bccString]);
	},

	sendSMS : function(bodyText, toNumber){
		exec(null, null, "IntelXDKDevice", "sendSMS", [bodyText, toNumber]);
	},

	setAutoRotate : function(shouldAutoRotate){
		exec(null, null, "IntelXDKDevice", "setAutoRotate", [shouldAutoRotate]);
	},

	setBasicAuthentication : function(domain, username, password){
		exec(null, null, "IntelXDKDevice", "setBasicAuthentication", [domain, username, password]);
	},

	setRotateOrientation : function(orientation){
		exec(null, null, "IntelXDKDevice", "setRotateOrientation", [orientation]);
	},

	showRemoteSite : function(url, closeImageX, closeImageY, closeImageWidth, closeImageHeight){
		exec(null, null, "IntelXDKDevice", "showRemoteSite", [url, closeImageX, closeImageY, closeImageWidth, closeImageHeight]);
	},

	showRemoteSiteExt : function(url, closeImagePortraitX, closeImagePortraitY, closeImageLandscapeX, closeImageLandscapeY, closeImageWidth, closeImageHeight){
		exec(null, null, "IntelXDKDevice", "showRemoteSiteExt", [url, closeImagePortraitX, closeImagePortraitY, closeImageLandscapeX, closeImageLandscapeY, closeImageWidth, closeImageHeight]);
	},

	closeRemoteSite : function(){
		exec(null, null, "IntelXDKDevice", "closeRemoteSite",[]);
	},

	updateConnection : function(){
		exec(null, null, "IntelXDKDevice", "updateConnection", []);
	},

	mainViewExecute : function(command){
		exec(null, null, "IntelXDKDevice", "mainViewExecute", [command]);
	},

	addVirtualPage : function(){
		exec(null, null, "IntelXDKDevice", "addVirtualPage", []);
	},

	removeVirtualPage : function(){
		exec(null, null, "IntelXDKDevice", "removeVirtualPage", []);
	},

	copyToClipboard : function(text){
		exec(null, null, "IntelXDKDevice", "copyToClipboard", [text]);
	},

	init: function () {
		exec(null, null, "IntelXDKDevice", "initialize", []);
	},
}

var me = module.exports;

channel.createSticky('IntelXDKDevice');
channel.waitForInitialization('IntelXDKDevice');

channel.onCordovaReady.subscribe(function () {
    me.init();
});

//Event intel.xdk.device.init will be fired once properties have been bound to intel.xdk.device.
document.addEventListener('intel.xdk.device.init',function(){
	intel.xdk.device.phonegapversion = cordova.version;
	channel.IntelXDKDevice.fire();
});


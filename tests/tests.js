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

/*global exports, describe, it, xdescribe, xit, afterEach, beforeEach, expect*/
/*global jasmine,  setTimeout, intel, document, window, spyOn, console*/

exports.defineAutoTests = function(){
    describe('Device - Tests for intel.xdk.device', function () {
        var value, accOpt, frequency, count, startRange = -2, endRange = 2;
        var accelTest = {x:0, y:0,z:0}, setacceleration, getx, gety, getz;

        var serverURL = "http://www.html5dev-software.intel.com/wp-content/plugins/wp-video-lightbox/css/prettyPhoto.css";
        var url = 'http://www.cnet.com/';
        var shouldAutoRotate = false;

        jasmine.DEFAULT_TIMEOUT_INTERVAL = 5000;

        afterEach(function (done) {
            // wait between test cases to avoid interference
            setTimeout(function () {
                done();
            }, 500);
        });

        beforeEach(function (done) {
            //Obtain adjustRotation value
            //accOpt = new intel.xdk.accelerationOptions.AccelerationOptions();
            //value =  accOpt.adjustForRotation;
            //frequency = accOpt.frequency;
            done();
        });

        describe('Is intel.xdk.device defined',function(){
            it('intel.xdk.device is defined', function () {
                expect(intel.xdk.device).toBeDefined();
            });
            
            it('intel.xdk.device.RemoteDataParameters is defined', function () {
                expect(intel.xdk.device.RemoteDataParameters).toBeDefined();
            });
        });

        describe('intel.xdk.device properties defined', function () {
            it("should contain a connection specification that is a string", function () {
                expect(intel.xdk.device.connection).toBeDefined();
                expect(typeof intel.xdk.device.connection).toEqual('string');
            });

            it("should contain a hasCaching specification that is a string", function () {
                expect(intel.xdk.device.hasCaching).toBeDefined();
                expect(typeof intel.xdk.device.hasCaching).toEqual('string');
            });

            it("should contain a hasStreaming specification that is a string", function () {
                expect(intel.xdk.device.hasStreaming).toBeDefined();
                expect(typeof intel.xdk.device.hasStreaming).toEqual('string');
            });

            it("should contain a initialOrientation specification that is a string", function () {
                expect(intel.xdk.device.initialOrientation).toBeDefined();
                expect(typeof intel.xdk.device.initialOrientation).toEqual('string');
            });

            it("should contain a lastStation specification that is a string", function () {
                expect(intel.xdk.device.lastStation).toBeDefined();
                expect(typeof intel.xdk.device.lastStation).toEqual('string');
            });

            it("should contain a model specification that is a string", function () {
                expect(intel.xdk.device.model).toBeDefined();
                expect(typeof intel.xdk.device.model).toEqual('string');
            });

            it("should contain a orientation specification that is a string", function () {
                expect(intel.xdk.device.orientation).toBeDefined();
                expect(typeof intel.xdk.device.orientation).toEqual('string');
            });

            it("should contain a osversion specification that is a string", function () {
                expect(intel.xdk.device.osversion).toBeDefined();
                expect(typeof intel.xdk.device.osversion).toEqual('string');
            });

            it("should contain a phonegapversion specification that is a string", function () {
                expect(intel.xdk.device.phonegapversion).toBeDefined();
                expect(typeof intel.xdk.device.phonegapversion).toEqual('string');
            });

            it("should contain a platform specification that is a string", function () {
                expect(intel.xdk.device.platform).toBeDefined();
                expect(typeof intel.xdk.device.platform).toEqual('string');
            });

            it("should contain a queryString specification that is a string", function () {
                expect(intel.xdk.device.queryString).toBeDefined();
                expect(typeof intel.xdk.device.queryString).toEqual('string');
            });

            it("should contain a uuid specification that is a string", function () {
                expect(intel.xdk.device.uuid).toBeDefined();
                expect(typeof intel.xdk.device.uuid).toEqual('string');
            });
        });
        
        describe('blockRemotePages ', function () {
            xit('is defined and it is a function', function () {
                expect( intel.xdk.device.blockRemotePages ).toBeDefined();
                expect( typeof intel.xdk.device.blockRemotePages ).toEqual('function');
            });
        });

        describe('addRemoteScript', function () {
            xit('is defined and it is a function', function () {
                expect( intel.xdk.device.addRemoteScript ).toBeDefined();
                expect( typeof intel.xdk.device.addRemoteScript ).toEqual('function');
            });
            
//            var temp = {};
//            temp.success = function (data) {
//                expect(data).not.toContain("404");
//                done();
//            }
//
//            temp.error = function (data) {
//                expect(data).not.toContain("404");
//                done();
//            }
//
//            it('Is addRemoteScript called with objects and correct value', function (done) {
//                intel.xdk.device.addRemoteScript(true, false);
//            });

        });

        describe('getRemoteData', function () {
            it('is defined and it is a function', function () {
                expect( intel.xdk.device.getRemoteData ).toBeDefined();
                expect( typeof intel.xdk.device.getRemoteData ).toEqual('function');
            });
            
            xit('Check if callback was called', function (done) {
                var temp = {};

                temp.success = function (data) {
                    expect(data).not.toContain("404");
                    done();
                };

                temp.error = function (data) {
                    done();
                };
                
                intel.xdk.device.getRemoteData(serverURL, "GET", "name=intel.xdk.device", temp.success, temp.error);
            });
        });

        describe('getRemoteDataExt', function () {
            it('is defined and it is a function', function () {
                expect( intel.xdk.device.getRemoteDataExt ).toBeDefined();
                expect( typeof intel.xdk.device.getRemoteDataExt ).toEqual('function');
            });
            
            xit('Check if callback was called', function (done) {
                var temp = {};

                temp.success = function (data) {
                    if (data.success)
                        expect(data.response).not.toContain("404");
                    else
                        expect(data.error).not.toContain("404");

                    done();
                };

                document.addEventListener("intel.xdk.device.remote.data", temp.success, false);

                temp.error = function (data) {
                    expect(data).not.toContain("404");
                    done();
                };

                //spyOn(temp,'success');
                //spyOn(temp,'error');

                var parameters = new intel.xdk.device.RemoteDataParameters();
                parameters.url = serverURL;
                parameters.id = '12345';
                parameters.method = 'GET';
                //parameters.body = status;

                //To add headers call addHeader
                parameters.addHeader("foo", "bar");
                parameters.addHeader("foo1", "bar1");
                parameters.addHeader("cookie", "foo");

                intel.xdk.device.getRemoteDataExt(parameters);
            });
        });

        describe('getRemoteDataWithID', function () {
            it('is defined and it is a function', function () {
                expect( intel.xdk.device.getRemoteDataWithID ).toBeDefined();
                expect( typeof intel.xdk.device.getRemoteDataWithID ).toEqual('function');
            });

            xit('getRemoteDataWithID - Check if callback was called', function (done) {
                var temp = {};
                var uniqueID = 12345;

                var success = function (uniqueID, data) {
                    expect(data).not.toBeNull();
                    if (data !== null)   
                        expect(data).not.toContain("404");

                    done();
                };

                var error = function (uniqueID, data) {
                    expect(data).not.toBeUndefined();
                    //expect(data).not.toContain("404");
                    done();
                };

                //spyOn(temp,'success');
                //spyOn(temp,'error');

                //intel.xdk.device.getRemoteDataWithID(serverURL, "GET", "name=intel.xdk.device", "success", "error", uniqueID);
                intel.xdk.device.getRemoteDataWithID(serverURL, "GET", "name=intel.xdk.device", success, error, uniqueID);
            });
        });

        describe('hideStatusBar', function () {
            it('is defined and it is a function', function () {
                expect( intel.xdk.device.hideStatusBar ).toBeDefined();
                expect( typeof intel.xdk.device.hideStatusBar ).toEqual('function');
            });
        });

        describe('launchExternal', function () {
            it('is defined and it is a function', function () {
                expect( intel.xdk.device.launchExternal ).toBeDefined();
                expect( typeof intel.xdk.device.launchExternal ).toEqual('function');
            });
        });

        describe('managePower', function () {
            it('is defined and it is a function', function () {
                expect( intel.xdk.device.managePower ).toBeDefined();
                expect( typeof intel.xdk.device.managePower ).toEqual('function');
            });
        });

        describe('scanBarcode', function () {
            it('is defined and it is a function', function () {
                expect( intel.xdk.device.scanBarcode ).toBeDefined();
                expect( typeof intel.xdk.device.scanBarcode ).toEqual('function');
            });

            //it('Is scanBarcode called with objects and correct value', function () {
            //    intel.xdk.device.scanBarcode();
            //});
        });

        describe('sendEmail', function () {
            it('is defined and it is a function', function () {
                expect( intel.xdk.device.sendEmail ).toBeDefined();
                expect( typeof intel.xdk.device.sendEmail ).toEqual('function');
            });

            //it('Is sendEmail called with objects and correct value', function () {
            //     intel.xdk.device.sendEmail("This is text email from intel.xdk.device api.", "html5tools@intel.com,html5tools@gmail.com", "Text mail", true, "cc@intel.com", "bcc@intel.com");
            //});
        });

        describe('sendSMS', function () {
            it('is defined and it is a function', function () {
                expect( intel.xdk.device.sendSMS ).toBeDefined();
                expect( typeof intel.xdk.device.sendSMS ).toEqual('function');
            });

            //it('Is sendSMS called with objects and correct value', function () {
            //     intel.xdk.device.sendSMS("This is test short message", "10086");
            //});
        });

        describe('setAutoRotate', function () {
            it('is defined and it is a function', function () {
                expect( intel.xdk.device.setAutoRotate ).toBeDefined();
                expect( typeof intel.xdk.device.setAutoRotate ).toEqual('function');
            });
        });

        describe('setBasicAuthentication', function () {
            it('Is setBasicAuthentication defined and it is a function', function () {
                expect( intel.xdk.device.setBasicAuthentication ).toBeDefined();
                expect( typeof intel.xdk.device.setBasicAuthentication ).toEqual('function');
            });
        });

        describe('setRotateOrientation', function () {
            it('is defined and it is a function', function () {
                expect(intel.xdk.device.setRotateOrientation).toBeDefined();
                expect( typeof intel.xdk.device.setRotateOrientation ).toEqual('function');
                expect(function () {
                    intel.xdk.device.setRotateOrientation("landscape");
                    intel.xdk.device.setRotateOrientation("portrait");
                }).not.toThrow();
            });
        });

        describe('showRemoteSite', function () {
            it('is defined and it is a function', function () {
                expect(intel.xdk.device.showRemoteSite).toBeDefined();
                expect( typeof intel.xdk.device.showRemoteSite ).toEqual('function');
            });
        });

        describe('closeRemoteSite', function () {
            it('is defined and it is a function', function () {
                expect(intel.xdk.device.closeRemoteSite).toBeDefined();
                expect( typeof intel.xdk.device.closeRemoteSite ).toEqual('function');
            });
        });

        describe('updateConnection', function () {
            it('Is updateConnection defined and it is a function', function () {
                expect(intel.xdk.device.updateConnection).toBeDefined();
                expect( typeof intel.xdk.device.updateConnection ).toEqual('function');
            });
        });
        
        describe('addVirtualPage', function () {
            it('is defined and it is a function', function () {
                expect(intel.xdk.device.addVirtualPage).toBeDefined();
                expect(typeof intel.xdk.device.addVirtualPage).toEqual('function');
            });
        });

        describe('removeVirtualPage', function () {
            it('is defined and it is a function', function () {
                expect(intel.xdk.device.removeVirtualPage).toBeDefined();
                expect(typeof intel.xdk.device.removeVirtualPage).toEqual('function');
            });
        });

        describe('copyToClipboard', function () {
            it('is defined and it is a function', function () {
                expect(intel.xdk.device.copyToClipboard).toBeDefined();
                expect(typeof intel.xdk.device.copyToClipboard).toEqual('function');
            });
        });

        describe('mainViewExecute', function () {
            it('is defined and it is a function', function () {
                expect(intel.xdk.device.mainViewExecute).toBeDefined();
                expect(typeof intel.xdk.device.mainViewExecute).toEqual('function');
            });
        });
    });
};

exports.defineManualTests = function (contentEl, createActionButton) {
    'use strict';
        
    function logMessage(message, color) {
        var log = document.getElementById('info'),
            logLine = document.createElement('div');
        
        if (color) {
            logLine.style.color = color;
        }
        
        logLine.innerHTML = message;
        log.appendChild(logLine);
    }

    function clearLog() {
        var log = document.getElementById('info');
        log.innerHTML = '';
    }
    
    function testNotImplemented(testName) {
        return function () {
            console.error(testName, 'test not implemented');
        };
    }
    
    function init() {
        document.addEventListener('intel.xdk.device.barcode.scan', function(e){
            console.log('event:',e.type);
            console.log(e.success? e.codedata : 'fail');
        });
        
        document.addEventListener('intel.xdk.device.remote.data', function(e){
            console.log('event:',e.type);
            console.log(e.success? 'response: '+ e.response : 'error:' + e.error);
        },false);
        
        document.addEventListener('intel.xdk.device.hardware.back',function(e){
            console.log('event:',e.type);
            TestSuite.VIRTUAL_PAGES--;
        });

        document.addEventListener('intel.xdk.device.connection.update', function(e){
            console.log('event:',e.type);
            console.log('current connection:',intel.xdk.device.connection);
        });
        
        document.addEventListener('intel.xdk.device.orientation.change', function(e){
            console.log('event:',e.type);
            console.log('current orientation:',e.orientation);
        }, false);
        
        document.addEventListener('intel.xdk.device.continue', function(e){
            console.log('event:',e.type);
        }, false);
        
        document.addEventListener('intel.xdk.device.pause', function(e){
            console.log('event:',e.type);
        }, false);
    }
    
    /** object to hold properties and configs */
    var TestSuite = {};
  
    TestSuite.$markup = '<h3>Show Properties</h3>' +
        '<div id="buttonShowProperties"></div>' +
        'Expected result: should show all properties in the info box' +
        
        '<h3>Add Virtual Page</h3>' +
        '<div id="buttonAddVirtualPage"></div>' +
        'Expected result: ' +
        
        '<h3>Remove Virtual Page</h3>' +
        '<div id="buttonRemoveVirtualPage"></div>' +
        'Expected result: ' +
        
        '<h3>Show Remote Site</h3>' +
        '<div id="buttonShowRemoteSite"></div>' +
        'Expected result: ' +
        
        '<h3>Show Remote Site Ext</h3>' +
        '<div id="buttonShowRemoteSiteExt"></div>' +
        'Expected result: ' +
        
        '<h3>Hide Status Bar</h3>' +
        '<div id="buttonHideStatusBar"></div>' +
        'Expected result: ' +
        
        '<h3>Launch External</h3>' +
        '<div id="buttonLaunchExternal"></div>' +
        'Expected result: ' +
        
        '<h3>Manage Power</h3>' +
        '<div id="buttonManagePower"></div>' +
        'Expected result: ' +
        
        '<h3>Scan Bar Code</h3>' +
        '<div id="buttonScanBarCode"></div>' +
        'Expected result: ' +
        
        '<h3>Send Email</h3>' +
        '<div id="buttonSendEmail"></div>' +
        'Expected result: ' +
        
        '<h3>Send SMS</h3>' +
        '<div id="buttonSendSMS"></div>' +
        'Expected result: ' +
        
        '<h3>Set Auto Rotate</h3>' +
        '<div id="buttonAutoRotateTrue"></div>' +
        'Expected result: ' +
        '<div id="buttonAutoRotateFalse"></div>' +
        'Expected result: ' +
        
        '<h3>Set Orientation</h3>' +
        '<div id="buttonSetOrientationPortrait"></div>' +
        'Expected result: ' +
        '<div id="buttonSetOrientationLandscape"></div>' +
        'Expected result: ' +
        '<div id="buttonSetOrientationAny"></div>' +
        'Expected result: ' +
        
        '<h3>Update Connection</h3>' +
        '<div id="buttonUpdateConnection"></div>' +
        'Expected result: ' +
        
        '<h3>Get Remote Data</h3>' +
        '<div id="buttonGetRemoteData"></div>' +
        'Expected result: ' +
        '<div id="buttonGetRemoteDataWithID"></div>' +
        'Expected result: ' +
        '<div id="buttonGetRemoteDataExt"></div>' +
        'Expected result: ' +
        
        '<h3>Copy to Clipboard</h3>' +
        '<div id="buttonCopyToClipboard"></div>' +
        'Expected result: ' +
        
        '';
    
    contentEl.innerHTML = '<div id="info"></div>' + TestSuite.$markup;

    TestSuite.VIRTUAL_PAGES = 0;
    TestSuite.URL = 'http://www.cnet.com/';
    TestSuite.SERVER_URL = "http://www.html5dev-software.intel.com/wp-content/plugins/wp-video-lightbox/css/prettyPhoto.css";
    
    createActionButton('showProperties()', function () {
        clearLog();
        
        var property_list = [
            'connection','hasCaching','hasStreaming',
            'initialOrientation', 'model', 'orientation',
            'osversion', 'phonegapversion', 'platform',
            'queryString', 'uuid'
        ];
        
        property_list.forEach(function(key){
            var obj = {};
            obj['intel.xdk.device.' + key] = intel.xdk.device[key];
            logMessage(JSON.stringify(obj,null,'\t'),'green');
        });
    }, 'buttonShowProperties');
    
    createActionButton('addVirtualPage()',function(){
        console.log('executing', 'intel.xdk.device.addVirtualPage');
        intel.xdk.device.addVirtualPage();
        TestSuite.VIRTUAL_PAGES++;
        console.log('virtual pages:',TestSuite.VIRTUAL_PAGES);
    },'buttonAddVirtualPage');
    
    createActionButton('removeVirtualPage()',function(){
        console.log('executing', 'intel.xdk.device.removeVirtualPage');
        intel.xdk.device.removeVirtualPage();
        TestSuite.VIRTUAL_PAGES--;
        console.log('virtual pages:',TestSuite.VIRTUAL_PAGES);
        
    },'buttonRemoveVirtualPage');
    
    createActionButton('showRemoteSite()',function(){
        console.log('executing', 'intel.xdk.device.showRemoteSite');
        intel.xdk.device.showRemoteSite(TestSuite.URL, 280, 0, 50, 50);
    },'buttonShowRemoteSite');
    
    createActionButton('showRemoteSiteExt()',function(){
        console.log('executing', 'intel.xdk.device.showRemoteSiteExt');
        intel.xdk.device.showRemoteSiteExt(TestSuite.URL, 280, 0, 280, 0, 50, 50);
    },'buttonShowRemoteSiteExt');
    
    createActionButton('hideStatusBar()',function(){
        console.log('executing', 'intel.xdk.device.hideStatusBar');
        intel.xdk.device.hideStatusBar();
    },'buttonHideStatusBar');
    
    createActionButton('launchExternal()',function(){
        console.log('executing', 'intel.xdk.device.launchExternal');
        intel.xdk.device.launchExternal(TestSuite.URL);
    },'buttonLaunchExternal');
    
    createActionButton('managePower()',function(){
        console.log('executing', 'intel.xdk.device.managePower');
        intel.xdk.device.managePower(true, false);
    },'buttonManagePower');
    
    createActionButton('scanBarCode()',function(){
        console.log('executing', 'intel.xdk.device.scanBarCode');
        intel.xdk.device.scanBarcode();
    },'buttonScanBarCode');
    
    createActionButton('sendEmail()',function(){
        console.log('executing', 'intel.xdk.device.sendEmail');
        intel.xdk.device.sendEmail("This is text email from intel.xdk.device api.", 
                                   "html5tools@intel.com,html5tools@gmail.com", 
                                   "Text mail", true, "cc@intel.com", "bcc@intel.com");
    },'buttonSendEmail');
    
    createActionButton('senSMS()',function(){
        console.log('executing', 'intel.xdk.device.sendSMS');
        intel.xdk.device.sendSMS("This is test short message", "10086");
    },'buttonSendSMS');
    
    createActionButton('setAutoRotate(true)',function(){
        console.log('executing', 'intel.xdk.device.setAutoRotate');
        intel.xdk.device.setAutoRotate(true);
    },'buttonAutoRotateTrue');
    
    createActionButton('setAutoRotate(false)',function(){
        console.log('executing', 'intel.xdk.device.setAutoRotate');
        intel.xdk.device.setAutoRotate(false);
    },'buttonAutoRotateFalse');
    
    createActionButton('setRotateOrientation(portrait)',function(){
        console.log('executing', 'intel.xdk.device.setRotateOrientation');
        intel.xdk.device.setRotateOrientation('portrait');
    },'buttonSetOrientationPortrait');
    
    createActionButton('setRotateOrientation(landscape)',function(){
        console.log('executing', 'intel.xdk.device.setRotateOrientation');
        intel.xdk.device.setRotateOrientation('landscape');
    },'buttonSetOrientationLandscape');
    
    createActionButton('setRotateOrientation(any)',function(){
        console.log('executing', 'intel.xdk.device.setRotateOrientation');
        intel.xdk.device.setRotateOrientation('any');
    },'buttonSetOrientationAny');
    
    createActionButton('updateConnection()',function(){
        console.log('executing', 'intel.xdk.device.updateConnection');
        intel.xdk.device.updateConnection();
    },'buttonUpdateConnection');
    
    createActionButton('getRemoteData()',function(){
        console.log('executing', 'intel.xdk.device.getRemoteData');
        
        var success = function(data){
            console.log(data);
        };
        
        var error = function(err){
            console.error(err);
        };
        
        intel.xdk.device.getRemoteData(TestSuite.SERVER_URL, "GET", "name=intel.xdk.device", "success", "error");
    },'buttonGetRemoteData');
    
    createActionButton('getRemoteDataWithID()',function(){
        
        var success = function(data){
            console.log(data);
        };
        
        var error = function(err){
            console.error(err);
        };
        
        console.log('executing', 'intel.xdk.device.getRemoteDataWithID');
        intel.xdk.device.getRemoteDataWithID(TestSuite.SERVER_URL, "GET", "name=intel.xdk.device", "success", "error", 12345);
    },'buttonGetRemoteDataWithID');
    
    createActionButton('getRemoteDataExt()',function(){
        var paramsObj = new intel.xdk.device.RemoteDataParameters();

        paramsObj.url = TestSuite.SERVER_URL;
        paramsObj.id = "1234";
        paramsObj.body = "name=intel.xdk.device&type=event";
        paramsObj.method = 'GET';
        paramsObj.addHeader("Connection","Keep-Alive");
        paramsObj.addHeader("Content-Type", "multipart");

        console.log('executing', 'intel.xdk.device.getRemoteDataExt');
        intel.xdk.device.getRemoteDataExt(paramsObj);
    },'buttonGetRemoteDataExt');
    
    createActionButton('copyToClipboard()',function(){
        console.log('executing', 'intel.xdk.device.copyToClipboard');
        intel.xdk.device.copyToClipboard('some text');
    },'buttonCopyToClipboard');
    
    document.addEventListener('deviceready', init, false);
};
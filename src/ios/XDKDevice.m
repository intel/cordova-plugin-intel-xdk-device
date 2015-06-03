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

#import "XDKDevice.h"
#import "CDVBarcodeScanner.h"
#import <UIKit/UIKit.h>
#import <MessageUI/MessageUI.h>
#import <SystemConfiguration/SCNetworkReachability.h>

// "if(1)" turns OFF XDKog logging.
// "if(0)" turns ON XDKog logging.
#define XDKLog if(1); else NSLog


@interface XDKDevice () < MFMailComposeViewControllerDelegate
                        , MFMessageComposeViewControllerDelegate
                        , UIAlertViewDelegate
                        , XDK_CDVbcsProcessorDelegate
                        >

//! Web view created for showRemoteSite.
@property (nonatomic) UIWebView* remoteSiteWebView;

//! Close button for showRemoteSite web view.
@property (nonatomic) UIButton* remoteSiteCloseButton;

//! When posting an alert to tell the user that an app is not installed, this
//! will be the URL to acess that app in the App Store,
@property (nonatomic) NSString* appStoreURLForApp;

//! Internet connection status.
@property (nonatomic) NSString* connectionStatus;

//! Index of last-started connection check.
@property (nonatomic) NSUInteger lastStartedConnectionCheck;

//! Index of last-finished connection check.
@property (nonatomic) NSUInteger lastFinishedConnectionCheck;

//! Bar code scanner for active scanBarcode operation.
@property (nonatomic) XDK_CDVbcsProcessor* barcodeProcessor;

@end

@implementation XDKDevice

- (void)pluginInitialize
{
}


- (void)dealloc
{
    [self.remoteSiteCloseButton removeFromSuperview];
    [self.remoteSiteWebView removeFromSuperview];
}


#pragma mark - Miscellaneous

- (void) managePower:(CDVInvokedUrlCommand*)command
{
	BOOL shouldStayOn = [[command argumentAtIndex:0] boolValue];
	BOOL onlyIfPluggedIn = [[command argumentAtIndex:1] boolValue];
	
	UIDevice* device = [UIDevice currentDevice];
    UIApplication* app = [UIApplication sharedApplication];
	device.batteryMonitoringEnabled = YES;
    
	if (!shouldStayOn) {
		[app setIdleTimerDisabled:NO];
	}
    else if (onlyIfPluggedIn) {
        BOOL pluggedIn = device.batteryState == UIDeviceBatteryStateCharging ||
        device.batteryState == UIDeviceBatteryStateFull;
        [app setIdleTimerDisabled:pluggedIn];
    }
    else {
        [app setIdleTimerDisabled:YES];
    }
}


- (void) copyToClipboard:(CDVInvokedUrlCommand*)command
{
	NSString *snippet = [command argumentAtIndex:0];
	XDKLog(@"snippet being copied to cliboard: %@", snippet);
	UIPasteboard *pb = [UIPasteboard generalPasteboard];
	[pb setString:snippet];
}


- (void) hideStatusBar:(CDVInvokedUrlCommand*)command
{
	[[UIApplication sharedApplication] setStatusBarHidden:YES withAnimation:NO];
    
	//iOS7 specific
	BOOL isOS7 = ( [[[UIDevice currentDevice] systemVersion] floatValue] >= 7.0 );
	if  (isOS7) {
		self.webView.frame = [[UIScreen mainScreen] bounds];
	}
    else
    {
		self.viewController.view.frame = [[UIScreen mainScreen] bounds];
	}
	
}


- (void) launchExternal:(CDVInvokedUrlCommand*)command
{
	NSString *url = [command argumentAtIndex:0 withDefault:@"" andClass:[NSString class]];
	
	if (url.length == 0 ) return;
	
	[[UIApplication sharedApplication] openURL:[NSURL URLWithString:url]];
}


- (void) runInstallNativeApp:(CDVInvokedUrlCommand*)command
{
	NSString *appName = [command argumentAtIndex:0];
	NSString *runCommand = [command argumentAtIndex:1];
	NSString *installURL = [command argumentAtIndex:2];
    //NSString *bundleid = [command argumentAtIndex:3]; // not used on iOS
    
    if ([[UIApplication sharedApplication] canOpenURL:[NSURL URLWithString:runCommand]]) {
        [[UIApplication sharedApplication] openURL:[NSURL URLWithString:runCommand]];
    }
    else {
        self.appStoreURLForApp = [installURL copy];
        NSString* message = [NSString stringWithFormat:@"%@ is not installed. Install it from the App Store?", appName];
        UIAlertView *alert = [[UIAlertView alloc] initWithTitle:@"Missing Application"
                                                        message:message
                                                       delegate:self
                                              cancelButtonTitle:@"Cancel"
                                              otherButtonTitles:@"Install", nil];
        [alert show];
    }
}


- (void) alertView:(UIAlertView *)alertView didDismissWithButtonIndex:(NSInteger)buttonIndex
{
    if (buttonIndex == 1) {
        [[UIApplication sharedApplication] openURL:[NSURL URLWithString:self.appStoreURLForApp]];
    }
    self.appStoreURLForApp = nil;
}


// Called from intel.xdk.setAutoRotate and intel.xdk.setRotateOrientation to make sure
// the screen is in a correct orientation after a change to the orientation settings.
//
- (void) _recheckScreenOrientation:(CDVInvokedUrlCommand*)command
{
    // Changing the view hierarchy (and then changing it back again) causes the system
    // to recheck whether the window is in an acceptable orientation. If a call to
    // intel.xdk.device.setRotation("portrait"|"landscape") has invalidated the current
    // orientation, then this will have the effect of forcing a screen rotation.
    //
    if ([[[UIDevice currentDevice] systemVersion] floatValue] >= 8.0) {
        UIWindow* keyWindow =  [UIApplication sharedApplication].keyWindow;
        UIViewController* rootViewController = keyWindow.rootViewController;
        keyWindow.rootViewController = nil;
        keyWindow.rootViewController = rootViewController;
    }
    else {
        // This code is cleaner and works better in iOS7, but it crashes in iOS8.
        [self.viewController presentViewController:[UIViewController new]
                                          animated:NO
                                        completion:^{
            [self.viewController dismissViewControllerAnimated:NO completion:nil];
        }];
    }
    
    // A call to intel.xdk.device.setAutoRotate(true) or
    // intel.xdk.device.setRotateOrientation("any") may allow a rotation if the screen
    // orientation doesn't match the device orientation, but the code above won't
    // *force* the rotation, because the current orientation is acceptable (just not
    // preferred). This call tells the system to align the screen and device orientation
    // if possible.
    //
    [UIViewController attemptRotationToDeviceOrientation];
}


#pragma mark Get Remote Data

- (void) getRemoteData:(CDVInvokedUrlCommand*)command
{
    NSString* successCallback = [command argumentAtIndex:3];
    NSString* failureCallback = [command argumentAtIndex:4];
    [self getRemoteDataURL:[command argumentAtIndex:0 withDefault:@""]
                    method:[command argumentAtIndex:1 withDefault:@""]
                  postData:[command argumentAtIndex:2 withDefault:@""]
                   headers:@""
                   success:^(NSHTTPURLResponse* response, NSString* data) {
                       if (successCallback) {
                           NSString* script = [NSString stringWithFormat:@"%@(%@);",
                                               successCallback,
                                               quotedString(data)];
                           [self.commandDelegate evalJs:script];
                       }
                       else {
                           CDVPluginResult* result =
                           [CDVPluginResult resultWithStatus:CDVCommandStatus_OK
                                             messageAsString:data];
                           [self.commandDelegate sendPluginResult:result
                                                       callbackId:command.callbackId];
                       }
                   }
                   failure:^(NSString* message) {
                       if (failureCallback) {
                           NSString* script = [NSString stringWithFormat:@"%@(%@);",
                                               failureCallback,
                                               quotedString(message)];
                           [self.commandDelegate evalJs:script];
                       }
                       else {
                           CDVPluginResult* result =
                           [CDVPluginResult resultWithStatus:CDVCommandStatus_ERROR
                                             messageAsString:message];
                           [self.commandDelegate sendPluginResult:result
                                                       callbackId:command.callbackId];
                       }
                   }];
}

- (void) getRemoteDataExt:(CDVInvokedUrlCommand*)command
{
    NSDictionary* params = [command argumentAtIndex:0];
    [self getRemoteDataURL:params[@"url"]
                    method:params[@"method"]
                  postData:params[@"body"]
                   headers:params[@"headers"]
                   success:^(NSHTTPURLResponse* response, NSString* data) {
                       NSDictionary* extrasDictionary =
                       @{ @"headers": [response allHeaderFields],
                          @"status": @([response statusCode]),
                          @"statusText":
                              [NSHTTPURLResponse localizedStringForStatusCode:response.statusCode] };
                       NSError* err;
                       NSData* jsonData = [NSJSONSerialization dataWithJSONObject:extrasDictionary
                                                                          options:0
                                                                            error:&err];
                       NSString* extrasJSON = [[NSString alloc] initWithData:jsonData
                                                                    encoding:NSUTF8StringEncoding];
                       [self fireEvent:@"device.remote.data"
                               success:YES
                            components:@{ @"id": quotedString(params[@"id"]),
                                          @"response": quotedString(data),
                                          @"extras": extrasJSON }];
                   }
                   failure:^(NSString* message) {
                       [self fireEvent:@"device.remote.data"
                               success:NO
                            components:@{ @"id": quotedString(params[@"id"]),
                                          @"response": @"''",
                                          @"extras": @{},
                                          @"error": quotedString(message) }];
                   }];
}

- (void) getRemoteDataWithID:(CDVInvokedUrlCommand*)command
{
    NSInteger uniqueID = [[command argumentAtIndex:3] integerValue];
    NSString* successCallback = [command argumentAtIndex:4];
    NSString* failureCallback = [command argumentAtIndex:5];
    [self getRemoteDataURL:[command argumentAtIndex:0 withDefault:@""]
                    method:[command argumentAtIndex:1 withDefault:@""]
                  postData:[command argumentAtIndex:2 withDefault:@""]
                   headers:@""
                   success:^(NSHTTPURLResponse* response, NSString* data) {
                       if (successCallback) {
                           NSString* script = [NSString stringWithFormat:@"%@(%ld, %@);",
                                               successCallback,
                                               (long)uniqueID,
                                               quotedString(data)];
                           [self.commandDelegate evalJs:script];
                       }
                       else {
                           NSString* resultString = [NSString stringWithFormat:@"%ld, %@",
                                                     (long)uniqueID,
                                                     data];
                           CDVPluginResult* result =
                           [CDVPluginResult resultWithStatus:CDVCommandStatus_OK
                                             messageAsString:resultString];
                           [self.commandDelegate sendPluginResult:result
                                                       callbackId:command.callbackId];
                       }
                   }
                   failure:^(NSString* message) {
                       if (failureCallback) {
                           NSString* script = [NSString stringWithFormat:@"%@(%ld, %@);",
                                               failureCallback,
                                               (long)uniqueID,
                                               quotedString(message)];
                           [self.commandDelegate evalJs:script];
                       }
                       else {
                           NSString* resultString = [NSString stringWithFormat:@"%ld, %@",
                                                     (long)uniqueID,
                                                     message];
                           CDVPluginResult* result =
                           [CDVPluginResult resultWithStatus:CDVCommandStatus_ERROR
                                             messageAsString:resultString];
                           [self.commandDelegate sendPluginResult:result
                                                       callbackId:command.callbackId];
                       }
                   }];
}


- (void) getRemoteDataURL:(NSString*)url
                   method:(NSString*)method
                 postData:(NSString*)postData
                  headers:(NSString*)headers
                  success:(void(^)(NSHTTPURLResponse* response, NSString* result))success
                  failure:(void(^)(NSString* message))failure
{
    if (url.length == 0 || method.length == 0) return;
    
    NSMutableURLRequest *request = [NSMutableURLRequest
                                    requestWithURL:[NSURL URLWithString:url]
                                    cachePolicy:NSURLRequestReloadIgnoringLocalAndRemoteCacheData
                                    timeoutInterval:60];
    
    if ([method caseInsensitiveCompare:@"POST"] == NSOrderedSame) {
        [request setHTTPMethod:@"POST"];
        [request setHTTPBody:[postData dataUsingEncoding:NSUTF8StringEncoding]];
    }
    
    for (NSString* header in [headers componentsSeparatedByString:@"&"]) {
        NSArray* nameValue = [header componentsSeparatedByString:@"="];
        if (nameValue.count == 2) {
            NSString* name = nameValue[0];
            NSString* value = nameValue[1];
            if (name.length != 0 && value.length != 0) {
                [request addValue:value forHTTPHeaderField:name];
            }
        }
    }
    
    [NSURLConnection sendAsynchronousRequest:request
                                       queue:[NSOperationQueue new]
                           completionHandler:
     ^(NSURLResponse *URLresponse, NSData *data, NSError *connectionError) {
         NSHTTPURLResponse* response = (NSHTTPURLResponse*)URLresponse;
         if (!data) {
             failure([NSString stringWithFormat:@"error -- code: %ld, localizedDescription: %@",
                      (long)connectionError.code,
                      connectionError.localizedDescription]);
         }
         else if (response.statusCode < 200 || response.statusCode > 299) {
             failure([NSString stringWithFormat:@"error -- code: %ld, localizedDescription: %@",
                      (long)response.statusCode,
                      [NSHTTPURLResponse localizedStringForStatusCode:response.statusCode]]);
         }
         else {
             NSString* body = [[NSString alloc] initWithData:data
                                                    encoding:NSUTF8StringEncoding];
             // Remove byte order mark (BOM)
             if ([body hasPrefix:@"\u00ef\u00bb\u00bf"]) {
                 body = [body substringFromIndex:3];
             }
             success(response, body);
         }
     }];
}


#pragma mark Bar Codes

- (void) scanBarcode:(CDVInvokedUrlCommand*)command
{
    self.barcodeProcessor =  [[XDK_CDVbcsProcessor alloc]
                              initWithParentViewController:self.viewController
                              delegate:self];
    [self.barcodeProcessor scanBarcode];
}


- (void)barcodeScanSucceeded:(NSString *)text
                      format:(NSString *)format
{
    [self fireEvent:@"device.barcode.scan"
            success:YES
         components:@{ @"codetype": quotedString(format),
                       @"codedata": quotedString(text) }];
    self.barcodeProcessor = nil; // release
}


- (void)barcodeScanFailed:(NSString *)message
{
    [self fireEvent:@"device.barcode.scan"
            success:NO
         components:@{ @"codetype": @"''",
                       @"codedata": @"''" }];
    self.barcodeProcessor = nil; // release
}


- (void)barcodeScanCancelled
{
    [self fireEvent:@"device.barcode.scan"
            success:NO
         components:@{ @"codetype": @"''",
                       @"codedata": @"''" }];
    self.barcodeProcessor = nil; // release
}


#pragma mark Mail and SMS

- (void) sendEmail:(CDVInvokedUrlCommand*)command
{
    if (! [MFMailComposeViewController canSendMail]) {
        UIAlertView *alert = [[UIAlertView alloc]
                              initWithTitle:@"Mail Error"
                              message:@"This device is not able to send mail."
                              delegate:nil
                              cancelButtonTitle:@"OK"
                              otherButtonTitles:nil];
        [alert show];
        return;
    }
    
    NSString* body =    [command argumentAtIndex:0 withDefault:@"" andClass:[NSString class]];
    NSString* to =      [command argumentAtIndex:1 withDefault:@"" andClass:[NSString class]];
    NSString* subject = [command argumentAtIndex:2 withDefault:@"" andClass:[NSString class]];
    BOOL      isHTML = [[command argumentAtIndex:3 withDefault:@NO andClass:[NSNumber class]] boolValue];
    NSString* cc =      [command argumentAtIndex:4 withDefault:@"" andClass:[NSString class]];
    NSString* bcc =     [command argumentAtIndex:5 withDefault:@"" andClass:[NSString class]];
    
    MFMailComposeViewController* mailController = [MFMailComposeViewController new];
    mailController.mailComposeDelegate = self;
    if (to.length > 0)      [mailController setToRecipients:[to componentsSeparatedByString:@","]];
    if (cc.length > 0)      [mailController setCcRecipients:[cc componentsSeparatedByString:@","]];
    if (bcc.length > 0)     [mailController setBccRecipients:[bcc componentsSeparatedByString:@","]];
    if (subject.length > 0) [mailController setSubject:subject];
    [mailController setMessageBody:body isHTML:isHTML];
    [self.viewController presentViewController:mailController animated:YES completion:nil];
}


- (void) mailComposeController:(MFMailComposeViewController *)controller
didFinishWithResult:(MFMailComposeResult)result
error:(NSError *)error
{
    [self.viewController dismissViewControllerAnimated:YES completion:nil];
}


- (void) sendSMS:(CDVInvokedUrlCommand*)command
{
    if(! [MFMessageComposeViewController canSendText]) {
        UIAlertView *alert = [[UIAlertView alloc]
                              initWithTitle:@"SMS Error"
                              message:@"This device is not able to send text messages."
                              delegate:nil
                              cancelButtonTitle:@"OK"
                              otherButtonTitles:nil];
        [alert show];
        return;
    }
    
    NSString* body =    [command argumentAtIndex:0 withDefault:@"" andClass:[NSString class]];
    NSString* to =      [command argumentAtIndex:1 withDefault:@"" andClass:[NSString class]];
    
    MFMessageComposeViewController* messageController = [MFMessageComposeViewController new];
    messageController.messageComposeDelegate = self;
    if (to.length > 0) messageController.recipients = [to componentsSeparatedByString:@","];
        messageController.body = body;
        [self.viewController presentViewController:messageController animated:YES completion:nil];
}


- (void)messageComposeViewController:(MFMessageComposeViewController *)controller
didFinishWithResult:(MessageComposeResult)result
{
    [self.viewController dismissViewControllerAnimated:YES completion:nil];
}


#pragma mark Show/Close Remote Site

- (void) showRemoteSite:(CDVInvokedUrlCommand*)command
{
	NSString *url = [command argumentAtIndex:0 withDefault:@"" andClass:[NSString class]];
    NSInteger closeButtonXOffset = [[command argumentAtIndex:1 withDefault:@0 andClass:[NSNumber class]] integerValue];
    NSInteger closeButtonYOffset = [[command argumentAtIndex:2 withDefault:@0 andClass:[NSNumber class]] integerValue];
    NSInteger closeButtonXSize = [[command argumentAtIndex:3 withDefault:@48 andClass:[NSNumber class]] integerValue];
    NSInteger closeButtonYSize = [[command argumentAtIndex:4 withDefault:@48 andClass:[NSNumber class]] integerValue];
    
    CGRect closeButtonRect = CGRectMake(closeButtonXOffset,
                                        closeButtonYOffset,
                                        closeButtonXSize,
                                        closeButtonYSize);
    [self showRemoteSite:url
        closeButtonRectP:closeButtonRect
        closeButtonRectL:closeButtonRect];
}


- (void) showRemoteSiteExt:(CDVInvokedUrlCommand*)command
{
	NSString* url = [command argumentAtIndex:0 withDefault:@"" andClass:[NSString class]];
    NSInteger closeButtonXOffsetP = [[command argumentAtIndex:1 withDefault:@0 andClass:[NSNumber class]] integerValue];
    NSInteger closeButtonYOffsetP = [[command argumentAtIndex:2 withDefault:@0 andClass:[NSNumber class]] integerValue];
    NSInteger closeButtonXOffsetL = [[command argumentAtIndex:3 withDefault:@0 andClass:[NSNumber class]] integerValue];
    NSInteger closeButtonYOffsetL = [[command argumentAtIndex:4 withDefault:@0 andClass:[NSNumber class]] integerValue];
    NSInteger closeButtonXSize = [[command argumentAtIndex:5 withDefault:@48 andClass:[NSNumber class]] integerValue];
    NSInteger closeButtonYSize = [[command argumentAtIndex:6 withDefault:@48 andClass:[NSNumber class]] integerValue];
    
    CGRect closeButtonRectP = CGRectMake(closeButtonXOffsetP,
                                         closeButtonYOffsetP,
                                         closeButtonXSize,
                                         closeButtonYSize);
    CGRect closeButtonRectL = CGRectMake(closeButtonXOffsetL,
                                         closeButtonYOffsetL,
                                         closeButtonXSize,
                                         closeButtonYSize);
    
    [self showRemoteSite:url
        closeButtonRectP:closeButtonRectP
        closeButtonRectL:closeButtonRectL];
}


- (void) showRemoteSite:(NSString*)url
closeButtonRectP:(CGRect)closeButtonRectP    // Portrait
closeButtonRectL:(CGRect)closeButtonRectL    // Landscape
{
    if (url.length == 0) return;
    NSString* closeButtonFilePath = [[NSBundle mainBundle] pathForResource:@"remote_close"
                                                                    ofType:@"png"];
    UIImage* closeButtonImage = [UIImage imageWithContentsOfFile:closeButtonFilePath];
	
	self.remoteSiteCloseButton = [UIButton buttonWithType:UIButtonTypeCustom];
	self.remoteSiteCloseButton.frame =
    UIInterfaceOrientationIsPortrait(self.viewController.interfaceOrientation) ?
    closeButtonRectP : closeButtonRectL;
	[self.remoteSiteCloseButton setTitle:@"" forState:UIControlStateNormal];
	[self.remoteSiteCloseButton addTarget:self
                                   action:@selector(onRemoteClose:)
                         forControlEvents:UIControlEventTouchUpInside];
	[self.remoteSiteCloseButton setImage:closeButtonImage forState:UIControlStateNormal];
    
    UIView* rootView = self.viewController.view;
    self.remoteSiteWebView = [[UIWebView alloc] initWithFrame:rootView.bounds];
	NSURLRequest *remoteRequest = [NSURLRequest requestWithURL:[NSURL URLWithString:url]
                                                   cachePolicy:NSURLRequestUseProtocolCachePolicy
                                               timeoutInterval:20.0];
	[self.remoteSiteWebView loadRequest:remoteRequest];
    [rootView addSubview:self.remoteSiteWebView];
    [rootView addSubview:self.remoteSiteCloseButton];
}


- (void) closeRemoteSite:(CDVInvokedUrlCommand*)command
{
    [self closeRemoteSite];
}


- (void)onRemoteClose:(id)sender
{
    [self closeRemoteSite];
}


- (void) closeRemoteSite
{
    if (self.remoteSiteWebView) {
        [self.remoteSiteCloseButton removeFromSuperview];
        [self.remoteSiteWebView removeFromSuperview];
        [self fireEvent:@"device.remote.close" success:YES components:nil];
    }
}


- (void) mainViewExecute:(CDVInvokedUrlCommand*)command
{
    NSString* commandToExecute = [command argumentAtIndex:0 withDefault:@""];
    [self.commandDelegate evalJs:commandToExecute];
}


#pragma mark Connection Status


- (void) updateConnection:(CDVInvokedUrlCommand*)command
{
    [self checkConnectionStatusFireEvent:YES];
}


- (void)reportConnectionStatus
{
    // Update connection status variable in the Javascript.
    NSString* script = [NSString stringWithFormat:@"intel.xdk.device.connection = %@;",
                        quotedString(self.connectionStatus)];
    [self.commandDelegate evalJs:script];
    // Fire the notification.
    [self fireEvent:@"device.connection.update" success:YES components:nil];
}


- (void)checkConnectionStatusFireEvent:(BOOL)fireEvent
{
    if (self.lastFinishedConnectionCheck == self.lastStartedConnectionCheck) {
        self.connectionStatus = @"unknown";
    }
    NSUInteger connectionCheckIndex = (self.lastStartedConnectionCheck += 1);
    
    dispatch_async(dispatch_get_global_queue(DISPATCH_QUEUE_PRIORITY_DEFAULT, 0), ^{
        NSString *host = @"www.flycast.fm";
        SCNetworkReachabilityFlags flags;
        SCNetworkReachabilityRef reachability =
        SCNetworkReachabilityCreateWithName(NULL, [host UTF8String]);
        SCNetworkReachabilityGetFlags(reachability, &flags);
        CFRelease(reachability);
        
        BOOL isReachable     = (flags & kSCNetworkReachabilityFlagsReachable)          != 0;
        BOOL needsConnection = (flags & kSCNetworkReachabilityFlagsConnectionRequired) != 0;
        BOOL isCell          = (flags & kSCNetworkReachabilityFlagsIsWWAN)             != 0;
        
        // Execute on main queue to avoid possible race.
        dispatch_sync(dispatch_get_main_queue(), ^{
            if (connectionCheckIndex > self.lastFinishedConnectionCheck) {
                self.lastFinishedConnectionCheck = connectionCheckIndex;
                self.connectionStatus = !isReachable || needsConnection ? @"none"
                : isCell ?                          @"cell"
                :                                   @"wifi"
                ;
                if (fireEvent) [self reportConnectionStatus];
            }
        });
    });
    
    dispatch_after(dispatch_time(DISPATCH_TIME_NOW, (int64_t)(5.0 * NSEC_PER_SEC)),
                   dispatch_get_main_queue(), ^{
                       if (connectionCheckIndex > self.lastFinishedConnectionCheck) {
                           self.lastFinishedConnectionCheck = connectionCheckIndex;
                           self.connectionStatus =  @"none";
                           if (fireEvent) [self reportConnectionStatus];
                       }
                   });
}


#pragma mark Android-only

- (void) addVirtualPage:(CDVInvokedUrlCommand*)command
{}

- (void) removeVirtualPage:(CDVInvokedUrlCommand*)command
{}

- (void) setBasicAuthentication:(CDVInvokedUrlCommand*)command
{}


#pragma mark Initialize

- (void) initialize:(CDVInvokedUrlCommand*)command
{
    UIDevice *device = [UIDevice currentDevice];
    [self checkConnectionStatusFireEvent:NO];
    
    NSMutableString* script = [NSMutableString new];
    [script appendFormat:@"intel.xdk.device.connection=%@;", quotedString(self.connectionStatus)];
    [script appendFormat:@"intel.xdk.device.model=%@;", quotedString(device.model)];
    [script appendFormat:@"intel.xdk.device.initialOrientation=%@;", [self getOrientation]];
    [script appendFormat:@"intel.xdk.device.orientation=%@;", [self getOrientation]];
    [script appendFormat:@"intel.xdk.device.osversion=%@;", quotedString(device.systemVersion)];
    [script appendFormat:@"intel.xdk.device.platform=%@;", quotedString(@"iOS")];
    [script appendFormat:@"intel.xdk.device.uuid=%@;", quotedString([self getUUID])];
    
    [script appendFormat:@"intel.xdk.device.hasCaching=%@;", @"false"];
    [script appendFormat:@"intel.xdk.device.hasStreaming=%@;", @"false"];
    [script appendFormat:@"intel.xdk.device.hasAnalytics=%@;", @"false"];
    [script appendFormat:@"intel.xdk.device.hasPush=%@;", @"false"];
    [script appendFormat:@"intel.xdk.device.hasUpdates=%@;", @"false"];
    
    [self.commandDelegate evalJs:script];
    [self fireEvent:@"device.init" success:YES components:nil];
}


- (NSString*) getOrientation
{
	switch ([[UIApplication sharedApplication] statusBarOrientation]){
		case UIInterfaceOrientationPortrait:            return @"0";
		case UIInterfaceOrientationPortraitUpsideDown:  return @"180";
		case UIInterfaceOrientationLandscapeLeft:       return @"90";
		case UIInterfaceOrientationLandscapeRight:      return @"-90";
        default:                                        return nil;
	}
}

- (NSString*) getUUID
{
	//make it static so that assignment will persist for session
    static NSString *uniqueIdValue = nil;
    
	if(uniqueIdValue==nil) {
        UIDevice *device = [UIDevice currentDevice];
        
		BOOL isOS6 = [device.systemVersion floatValue] >= 6.0;
		if (isOS6) {
			uniqueIdValue = [device.identifierForVendor UUIDString];
		}
        else {
			//before iOS6 use CFUUIDCreate along with NSUserDefaults
			NSUserDefaults *defaults = [NSUserDefaults standardUserDefaults];
			NSString *uniqueIdKey = @"uniqueIdentifierForDevice";
			uniqueIdValue = [defaults objectForKey:uniqueIdKey];
			
			//first try to retrieve from NSUserDefaults
			if(uniqueIdValue==nil) {
				//if it wasn't in NSUserDefaults get it,
				//then store it in NSUserDefaults for next time
				CFUUIDRef uuid = CFUUIDCreate(kCFAllocatorDefault);
				uniqueIdValue = (__bridge_transfer NSString *)
                CFUUIDCreateString(kCFAllocatorDefault, uuid);
				CFRelease(uuid);
				[defaults setObject:uniqueIdValue forKey:uniqueIdKey];
				[defaults synchronize];
			}
		}
	}
    return uniqueIdValue;
}


#pragma mark - Utility methods

//! Fire a JavaScript event.
//!
//! Generates a string of JavaScript code to create and dispatch an event.
//! @param eventName    The name of the event (not including the @c "intel.xdk." prefix).
//! @param success      The boolean value to assign to the @a success field in the
//!                     event object.
//! @param components   Each key/value pair in this dictionary will be incorporated.
//!                     (Note that the value must be a string which is the JavaScript
//!                     representation of the value - @c "true" for a boolean value,
//!                     @c "'Hello'" for a string, @c "20" for a number, etc.)
//!
- (void) fireEvent:(NSString*)eventName
success:(BOOL)success
components:(NSDictionary*)components
{
    NSMutableString* eventComponents = [NSMutableString string];
    for (NSString *eachKey in components) {
        [eventComponents appendFormat:@"e.%@ = %@;", eachKey, components[eachKey]];
    }
    NSString* script = [NSString stringWithFormat:@"var e = document.createEvent('Events');"
                        "e.initEvent('intel.xdk.%@', true, true);"
                        "e.success = %@;"
                        "%@"
                        "document.dispatchEvent(e);",
                        eventName,
                        (success ? @"true" : @"false"),
                        eventComponents];
    XDKLog(@"%@", script);
    [self.commandDelegate evalJs:script];
}


//! Turn a string into a Javascript string literal.
//!
//! Given an arbitrary string, get a string containing a Javascript string literal that
//! represents the input string. For example:
//!
//! -   <<abc>>         => <<"abc">>
//! -   <<"abc">>       => <<"\"abc\"">>
//! -   <<x=" \t\n\r">> => <<"x=\" \\t\\n\\t\"">>
//!
//! @remarks
//! The implementation relies on the Cocoa built-in JSON serialization code to do the
//! quoting. Since JSON can only represent arrays and objects, the code creates an array
//! containing the input string, gets its JSON representation, and then strips the array
//! literal square brackets from the beginning and end of the string.
//!
//! @param string   The string to be quoted.
//! @return         The string literal that represents @a string.
//!
static NSString* quotedString(NSString* string)
{
    NSError* err;
    NSData* jsonData = [NSJSONSerialization dataWithJSONObject:@[string] options:0 error:&err];
    NSMutableCharacterSet* trimChars = [NSMutableCharacterSet whitespaceAndNewlineCharacterSet];
    [trimChars addCharactersInString:@"[]"];
    NSString* jsonString = [[NSString alloc] initWithData:jsonData encoding:NSUTF8StringEncoding];
    return [jsonString stringByTrimmingCharactersInSet:trimChars];
}


@end
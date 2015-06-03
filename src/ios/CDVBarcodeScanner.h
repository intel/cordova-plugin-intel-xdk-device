/*
 * PhoneGap is available under *either* the terms of the modified BSD license *or* the
 * MIT License (2008). See http://opensource.org/licenses/alphabetical for full text.
 *
 * Copyright 2011 Matt Kane. All rights reserved.
 * Copyright (c) 2011, IBM Corporation
 */

/*
 *  Revised for use in the intel.xdk.device plugin.
 */
#import <UIKit/UIKit.h>

@protocol XDK_CDVbcsProcessorDelegate <NSObject>

- (void)barcodeScanSucceeded:(NSString*)text format:(NSString*)format;
- (void)barcodeScanFailed:(NSString*)message;
- (void)barcodeScanCancelled;

@end


@interface XDK_CDVbcsProcessor : NSObject

- (id)initWithParentViewController:(UIViewController*)parentViewController
                          delegate:(id<XDK_CDVbcsProcessorDelegate>)delegate;
- (void)scanBarcode;

@end

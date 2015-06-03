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

#import "CDVBarcodeScanner.h"
#import <AVFoundation/AVFoundation.h>

//------------------------------------------------------------------------------
// use the all-in-one version of zxing that we built
//------------------------------------------------------------------------------
#import "zxing-all-in-one.h"


//------------------------------------------------------------------------------
// Delegate to handle view controller events
//------------------------------------------------------------------------------
@protocol XDK_CDVbcsViewControllerDelegate

- (void) viewControllerDidStartScanning;
- (void) viewControllerDidCancelScanning;

@end

//------------------------------------------------------------------------------
// view controller for the ui
//------------------------------------------------------------------------------
@interface XDK_CDVbcsViewController : UIViewController

@property (nonatomic, weak) id<XDK_CDVbcsViewControllerDelegate>    delegate;
@property (nonatomic)       AVCaptureVideoPreviewLayer*             previewLayer;
@property (nonatomic)       CGRect                                  frame;

- (id)initWithDelegate:(id<XDK_CDVbcsViewControllerDelegate>)delegate
          previewLayer:(AVCaptureVideoPreviewLayer*)previewLayer
                 frame:(CGRect)frame;

@end

//------------------------------------------------------------------------------
// class that does the grunt work
//------------------------------------------------------------------------------
@interface XDK_CDVbcsProcessor () < AVCaptureVideoDataOutputSampleBufferDelegate
                                  , XDK_CDVbcsViewControllerDelegate
                                  >

@property (nonatomic, weak) id<XDK_CDVbcsProcessorDelegate> delegate;
@property (nonatomic)       UIViewController*               parentViewController;
@property (nonatomic)       AVCaptureSession*               captureSession;
@property (nonatomic)       AVCaptureVideoPreviewLayer*     previewLayer;
@property (nonatomic)       BOOL                            capturing;

@end

@implementation XDK_CDVbcsProcessor

//--------------------------------------------------------------------------
- (id)initWithParentViewController:(UIViewController*)parentViewController
                          delegate:(id<XDK_CDVbcsProcessorDelegate>)delegate
{
    self = [super init];
    if (self) {
        self.delegate             = delegate;
        self.parentViewController = parentViewController;
        self.capturing            = NO;
    }
    return self;
}

//--------------------------------------------------------------------------
- (void)scanBarcode {
    NSString* errorMessage = [self setUpCaptureSession];
    if (errorMessage) {
        [self barcodeScanFailed:errorMessage];
        return;
    }
    
    XDK_CDVbcsViewController* viewController =
        [[XDK_CDVbcsViewController alloc] initWithDelegate:self
                                              previewLayer:self.previewLayer
                                                     frame:self.parentViewController.view.frame];
    
    [self.parentViewController presentViewController:viewController
                                            animated:YES
                                          completion:nil];
}

//--------------------------------------------------------------------------
- (void)viewControllerDidStartScanning
{
    self.capturing = YES;
}

//--------------------------------------------------------------------------
- (void)viewControllerDidCancelScanning
{
    [self barcodeScanCancelled];
}

//--------------------------------------------------------------------------
- (void)barcodeScanDone
{
    self.capturing = NO;
    [self.captureSession stopRunning];
    self.captureSession = nil;
    [self.parentViewController dismissViewControllerAnimated:YES
                                                  completion:nil];
    self.previewLayer = nil;
    NSLog(@"scan done");
}

//--------------------------------------------------------------------------
- (void)barcodeScanSucceeded:(NSString*)text format:(NSString*)format {
    [self barcodeScanDone];
    [self.delegate barcodeScanSucceeded:text format:format];
}

//--------------------------------------------------------------------------
- (void)barcodeScanFailed:(NSString*)message {
    [self barcodeScanDone];
    [self.delegate barcodeScanFailed:message];
}

//--------------------------------------------------------------------------
- (void)barcodeScanCancelled {
    [self barcodeScanDone];
    [self.delegate barcodeScanCancelled];
}

//--------------------------------------------------------------------------
- (NSString*)setUpCaptureSession
{
    AVCaptureSession* captureSession = [AVCaptureSession new];
    self.captureSession = captureSession;
    
    AVCaptureDevice* device = [AVCaptureDevice defaultDeviceWithMediaType:AVMediaTypeVideo];
    if (!device) return @"unable to obtain video capture device";
    
    NSError* error = nil;
    AVCaptureDeviceInput* input = [AVCaptureDeviceInput deviceInputWithDevice:device
                                                                        error:&error];
    if (!input) return @"unable to obtain video capture device input";
    
    AVCaptureVideoDataOutput* output = [AVCaptureVideoDataOutput new];
    if (!output) return @"unable to obtain video capture output";
    
    NSDictionary* videoOutputSettings = @{ (__bridge NSString*)kCVPixelBufferPixelFormatTypeKey:
                                               @(kCVPixelFormatType_32BGRA) };
    
    output.alwaysDiscardsLateVideoFrames = YES;
    output.videoSettings = videoOutputSettings;
    
    [output setSampleBufferDelegate:self queue:dispatch_get_main_queue()];
    
    if (![captureSession canSetSessionPreset:AVCaptureSessionPresetMedium]) {
        return @"unable to preset medium quality video capture";
    }
    captureSession.sessionPreset = AVCaptureSessionPresetMedium;
    
    if (![captureSession canAddInput:input]) {
        return @"unable to add video capture device input to session";
    }
    [captureSession addInput:input];
    
    if (![captureSession canAddOutput:output]) {
        return @"unable to add video capture output to session";
    }
    [captureSession addOutput:output];
    
    // setup capture preview layer
    self.previewLayer = [AVCaptureVideoPreviewLayer layerWithSession:captureSession];
    
    dispatch_async(dispatch_get_global_queue(DISPATCH_QUEUE_PRIORITY_DEFAULT, 0), ^{
        [captureSession startRunning];
    });
    
    return nil;
}

//--------------------------------------------------------------------------
// this method gets sent the captured frames
//--------------------------------------------------------------------------
- (void)captureOutput:(AVCaptureOutput*)captureOutput
didOutputSampleBuffer:(CMSampleBufferRef)sampleBuffer
       fromConnection:(AVCaptureConnection*)connection
{
    // Don't look at captured frames until the reticle is displayed.
    if (!self.capturing) return;
    
    using namespace zxing;
    
    // LuminanceSource is pretty dumb; we have to give it a pointer to
    // a byte array, but then can't get it back out again.  We need to
    // get it back to free it.  Saving it in imageBytes.
    uint8_t* imageBytes = 0;
    
    try {
        DecodeHints decodeHints;
        decodeHints.addFormat(BarcodeFormat_QR_CODE);
        decodeHints.addFormat(BarcodeFormat_DATA_MATRIX);
        decodeHints.addFormat(BarcodeFormat_UPC_E);
        decodeHints.addFormat(BarcodeFormat_UPC_A);
        decodeHints.addFormat(BarcodeFormat_EAN_8);
        decodeHints.addFormat(BarcodeFormat_EAN_13);
        decodeHints.addFormat(BarcodeFormat_CODE_128);
        decodeHints.addFormat(BarcodeFormat_CODE_39);
        //            decodeHints.addFormat(BarcodeFormat_ITF);   causing crashes
        
        // here's the meat of the decode process
        Ref<LuminanceSource>   luminanceSource   ([self getLuminanceSourceFromSample: sampleBuffer
                                                                          imageBytes:&imageBytes]);
        Ref<Binarizer>         binarizer         (new HybridBinarizer(luminanceSource));
        Ref<BinaryBitmap>      bitmap            (new BinaryBitmap(binarizer));
        Ref<MultiFormatReader> reader            (new MultiFormatReader());
        Ref<Result>            result            (reader->decode(bitmap, decodeHints));
        Ref<String>            resultText        (result->getText());
        BarcodeFormat          formatVal =       result->getBarcodeFormat();

        NSString* formatString = [self formatStringFrom:formatVal];
        NSString* resultString = [NSString stringWithCString:resultText->getText().c_str()
                                                      encoding:NSUTF8StringEncoding];
        
        [self barcodeScanSucceeded:resultString format:formatString];
    }
    catch (...) {}
    
    // free the buffer behind the LuminanceSource
    if (imageBytes) {
        free(imageBytes);
    }
}

//--------------------------------------------------------------------------
// convert barcode format to string
//--------------------------------------------------------------------------
- (NSString*)formatStringFrom:(zxing::BarcodeFormat)format {
    if (format == zxing::BarcodeFormat_QR_CODE)      return @"QR_CODE";
    if (format == zxing::BarcodeFormat_DATA_MATRIX)  return @"DATA_MATRIX";
    if (format == zxing::BarcodeFormat_UPC_E)        return @"UPC_E";
    if (format == zxing::BarcodeFormat_UPC_A)        return @"UPC_A";
    if (format == zxing::BarcodeFormat_EAN_8)        return @"EAN_8";
    if (format == zxing::BarcodeFormat_EAN_13)       return @"EAN_13";
    if (format == zxing::BarcodeFormat_CODE_128)     return @"CODE_128";
    if (format == zxing::BarcodeFormat_CODE_39)      return @"CODE_39";
    if (format == zxing::BarcodeFormat_ITF)          return @"ITF";
    return @"???";
}

//--------------------------------------------------------------------------
// convert capture's sample buffer (scanned picture) into the thing that
// zxing needs.
//--------------------------------------------------------------------------
- (zxing::Ref<zxing::LuminanceSource>) getLuminanceSourceFromSample:(CMSampleBufferRef)sampleBuffer
                                                         imageBytes:(uint8_t**)ptr
{
    CVImageBufferRef imageBuffer = CMSampleBufferGetImageBuffer(sampleBuffer);
    CVPixelBufferLockBaseAddress(imageBuffer, 0);
    
    size_t   bytesPerRow =            CVPixelBufferGetBytesPerRow(imageBuffer);
    size_t   width       =            CVPixelBufferGetWidth(imageBuffer);
    size_t   height      =            CVPixelBufferGetHeight(imageBuffer);
    uint8_t* baseAddress = (uint8_t*) CVPixelBufferGetBaseAddress(imageBuffer);
    
    // only going to get 90% of the min(width,height) of the captured image
    int       greyWidth  = (int)(9 * MIN(width, height) / 10);
    uint8_t*  greyData   = (uint8_t*) malloc(greyWidth * greyWidth);
    
    // remember this pointer so we can free it later
    *ptr = greyData;
    
    if (!greyData) {
        CVPixelBufferUnlockBaseAddress(imageBuffer,0);
        throw new zxing::ReaderException("out of memory");
    }
    
    size_t offsetX = (width  - greyWidth) / 2;
    size_t offsetY = (height - greyWidth) / 2;
    
    // pixel-by-pixel ...
    for (size_t i=0; i<greyWidth; i++) {
        for (size_t j=0; j<greyWidth; j++) {
            // i,j are the coordinates from the sample buffer
            // ni, nj are the coordinates in the LuminanceSource
            // in this case, there's a rotation taking place
            size_t ni = greyWidth-j;
            size_t nj = i;
            
            size_t baseOffset = (j+offsetY)*bytesPerRow + (i + offsetX)*4;
            
            // convert from color to grayscale
            // http://en.wikipedia.org/wiki/Grayscale#Converting_color_to_grayscale
            size_t value = 0.11 * baseAddress[baseOffset] +
            0.59 * baseAddress[baseOffset + 1] +
            0.30 * baseAddress[baseOffset + 2];
            
            greyData[nj*greyWidth + ni] = value;
        }
    }
    
    CVPixelBufferUnlockBaseAddress(imageBuffer,0);
    
    using namespace zxing;
    
    Ref<LuminanceSource> luminanceSource (
                                          new GreyscaleLuminanceSource(greyData,
                                                                       greyWidth, greyWidth,
                                                                       0, 0,
                                                                       greyWidth, greyWidth)
                                          );
    
    return luminanceSource;
}

@end

//------------------------------------------------------------------------------
// view controller for the ui
//------------------------------------------------------------------------------
@implementation XDK_CDVbcsViewController

//--------------------------------------------------------------------------
- (id)initWithDelegate:(id<XDK_CDVbcsViewControllerDelegate>)delegate
          previewLayer:(AVCaptureVideoPreviewLayer*)previewLayer
                 frame:(CGRect)frame
{
    self = [super init];
    if (self) {
        self.delegate = delegate;
        self.previewLayer = previewLayer;
        self.frame = frame;
    }
    return self;
}

//--------------------------------------------------------------------------
- (void)loadView {
    self.view = [[UIView alloc] initWithFrame: self.frame];
    
    // setup capture preview layer
    self.previewLayer.frame = self.view.bounds;
    self.previewLayer.videoGravity = AVLayerVideoGravityResizeAspectFill;
    
    if (self.previewLayer.connection.supportsVideoOrientation) {
        self.previewLayer.connection.videoOrientation = AVCaptureVideoOrientationPortrait;
    }
    
    [self.view.layer insertSublayer:self.previewLayer below:self.view.layer.sublayers[0]];
    [self.view addSubview:[self buildOverlayView]];
}

//--------------------------------------------------------------------------
- (void)viewWillAppear:(BOOL)animated {
    
    // set video orientation to what the camera sees
    self.previewLayer.connection.videoOrientation =
        [[UIApplication sharedApplication] statusBarOrientation];
    
    // this fixes the bug when the statusbar is landscape, and the preview layer
    // starts up in portrait (not filling the whole view)
    self.previewLayer.frame = self.view.bounds;
}

//--------------------------------------------------------------------------
- (void)viewDidAppear:(BOOL)animated {
    [super viewDidAppear:animated];
    [self.delegate viewControllerDidStartScanning];
}

//--------------------------------------------------------------------------
- (IBAction)cancelButtonPressed:(id)sender {
    [self.delegate viewControllerDidCancelScanning];
}

//--------------------------------------------------------------------------
- (UIView*)buildOverlayView {
    
    // Create the overlay view.
    
    CGRect bounds = self.view.bounds;
    bounds = CGRectMake(0, 0, bounds.size.width, bounds.size.height);
    
    UIView* overlayView = [[UIView alloc] initWithFrame:bounds];
    overlayView.autoresizesSubviews = YES;
    overlayView.autoresizingMask    = UIViewAutoresizingFlexibleWidth
                                    | UIViewAutoresizingFlexibleHeight
                                    ;
    overlayView.opaque              = NO;

    bounds = overlayView.bounds;
    CGFloat rootViewHeight = CGRectGetHeight(bounds);
    CGFloat rootViewWidth  = CGRectGetWidth(bounds);
    
    // Create a toolbar containing a Cancel button and add it to the overlay view.

    UIToolbar* toolbar = [UIToolbar new];
    toolbar.autoresizingMask = UIViewAutoresizingFlexibleWidth
                             | UIViewAutoresizingFlexibleTopMargin
                             ;
    
    UIBarButtonItem* cancelButton = [[UIBarButtonItem alloc]
                                     initWithBarButtonSystemItem:UIBarButtonSystemItemCancel
                                     target:(id)self
                                     action:@selector(cancelButtonPressed:)
                                     ];
    
    UIBarButtonItem* flexSpace = [[UIBarButtonItem alloc]
                                  initWithBarButtonSystemItem:UIBarButtonSystemItemFlexibleSpace
                                  target:nil
                                  action:nil
                                  ];
    
    toolbar.items = @[flexSpace, cancelButton, flexSpace];
    
    [toolbar sizeToFit];
    CGFloat toolbarHeight  = toolbar.frame.size.height;
    CGRect  toolbarRect    = CGRectMake(0, rootViewHeight - toolbarHeight, rootViewWidth, toolbarHeight);
    [toolbar setFrame:toolbarRect];
    
    [overlayView addSubview: toolbar];
    
    // Create the reticle and add it to the overlay view.
    
    UIImage* reticleImage = [self buildReticleImage];
    UIView* reticleView = [[UIImageView alloc] initWithImage: reticleImage];
    CGFloat minAxis = MIN(rootViewHeight, rootViewWidth);
    
    reticleView.frame = CGRectMake(0.5 * (rootViewWidth  - minAxis),
                                   0.5 * (rootViewHeight - minAxis),
                                   minAxis,
                                   minAxis
                                   );
    reticleView.opaque           = NO;
    reticleView.contentMode      = UIViewContentModeScaleAspectFit;
    reticleView.autoresizingMask = UIViewAutoresizingFlexibleLeftMargin
                                 | UIViewAutoresizingFlexibleRightMargin
                                 | UIViewAutoresizingFlexibleTopMargin
                                 | UIViewAutoresizingFlexibleBottomMargin
                                 ;
    
    [overlayView addSubview: reticleView];
    
    return overlayView;
}

//--------------------------------------------------------------------------

#define RETICLE_SIZE    500.0f
#define RETICLE_WIDTH    10.0f
#define RETICLE_OFFSET   60.0f
#define RETICLE_ALPHA     0.4f

//-------------------------------------------------------------------------
// builds the green box and red line
//-------------------------------------------------------------------------
- (UIImage*)buildReticleImage {
    UIImage* result;
    UIGraphicsBeginImageContext(CGSizeMake(RETICLE_SIZE, RETICLE_SIZE));
    CGContextRef context = UIGraphicsGetCurrentContext();
    
    {
        UIColor* color = [UIColor colorWithRed:1.0 green:0.0 blue:0.0 alpha:RETICLE_ALPHA];
        CGContextSetStrokeColorWithColor(context, color.CGColor);
        CGContextSetLineWidth(context, RETICLE_WIDTH);
        CGContextBeginPath(context);
        CGFloat lineOffset = RETICLE_OFFSET+(0.5*RETICLE_WIDTH);
        CGContextMoveToPoint(context, lineOffset, RETICLE_SIZE/2);
        CGContextAddLineToPoint(context, RETICLE_SIZE-lineOffset, 0.5*RETICLE_SIZE);
        CGContextStrokePath(context);
    }
    
    {
        UIColor* color = [UIColor colorWithRed:0.0 green:1.0 blue:0.0 alpha:RETICLE_ALPHA];
        CGContextSetStrokeColorWithColor(context, color.CGColor);
        CGContextSetLineWidth(context, RETICLE_WIDTH);
        CGContextStrokeRect(context,
                            CGRectMake(
                                       RETICLE_OFFSET,
                                       RETICLE_OFFSET,
                                       RETICLE_SIZE-2*RETICLE_OFFSET,
                                       RETICLE_SIZE-2*RETICLE_OFFSET
                                       )
                            );
    }
    
    result = UIGraphicsGetImageFromCurrentImageContext();
    UIGraphicsEndImageContext();
    return result;
}

#pragma mark XDK_CDVBarcodeScannerOrientationDelegate

- (BOOL)shouldAutorotate
{   
    return NO;
}

- (UIInterfaceOrientation)preferredInterfaceOrientationForPresentation
{
    return UIInterfaceOrientationPortrait;
}

- (NSUInteger)supportedInterfaceOrientations
{
    return UIInterfaceOrientationMaskPortrait;
}

- (BOOL)shouldAutorotateToInterfaceOrientation:(UIInterfaceOrientation)interfaceOrientation
{
    return YES;
}

- (void) willAnimateRotationToInterfaceOrientation:(UIInterfaceOrientation)orientation duration:(NSTimeInterval)duration
{
    [CATransaction begin];
    self.previewLayer.connection.videoOrientation = orientation;
    [self.previewLayer layoutSublayers];
    self.previewLayer.frame = self.view.bounds;
    [CATransaction commit];

    [super willAnimateRotationToInterfaceOrientation:orientation duration:duration];
}

@end

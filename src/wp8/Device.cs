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

using System;
using System.Collections.Generic;
using System.Linq;
using System.Text;
using System.Threading.Tasks;
using System.Windows.Resources;
using Windows.Storage;
using Windows.Storage.Streams;
using com.intel.html5tools.apppreview.Helpers;
using WPCordovaClassLib;
using WPCordovaClassLib.Cordova;
using WPCordovaClassLib.Cordova.Commands;
using WPCordovaClassLib.Cordova.JSON;
using Microsoft.Phone.Net.NetworkInformation;
using Microsoft.Phone.Info;
using System.Windows;
using System.Net;
using System.IO;
using Microsoft.Phone.Tasks;
using Microsoft.Phone.Controls;
using Microsoft.Phone.Shell;
using System.Windows.Media;
using System.Windows.Controls;
using System.Windows.Media.Imaging;
using Cordova.Extension.Commands.UI;

namespace Cordova.Extension.Commands
{
    class IntelXDKDevice : BaseCommand
    {
        PhoneApplicationPage page = null;

        private bool shouldAutoRotate = false;

        private static WebBrowser browser;
        private static ApplicationBarIconButton backButton;
        private static ApplicationBarIconButton fwdButton;
        private static Image closeButton;

        private BarCodeControl barCodecontrol;

        private IntelCookieJar amCookieJar = new IntelCookieJar();

        private static int closeImagePortraitX;
        private static int closeImagePortraitY;
        private static int closeImageLandscapeX;
        private static int closeImageLandscapeY;
        private static int closeImageWidth;
        private static int closeImageHeight;
        private int displayOrientation;

        private int virtualPagesCount = 0;
        private PageOrientation pageOrientation;
        private AppRequest appRequest;
        private AppConfigData configData;

        public IntelXDKDevice()
        {
            PhoneApplicationFrame frame = System.Windows.Application.Current.RootVisual as PhoneApplicationFrame;

            if (frame != null)
            {
                page = frame.Content as PhoneApplicationPage;
                page.OrientationChanged += page_OrientationChanged;

                this.pageOrientation = ((PhoneApplicationFrame)(Application.Current.RootVisual)).Orientation;

            }
        }

        #region Public Methods
        public void initialize(string jsonContact)
        {
            //connection
            String connection = getConnection();
            this.bindProperty("connection", connection);

            //hasCaching
            bool hasCaching = false;                                        //Hard code to false;
            this.bindProperty("hasCaching", hasCaching.ToString());

            //hasStreaming
            bool hasStreaming = false;
            this.bindProperty("hasStreaming", hasStreaming.ToString());     //Hard code to false

            //initialOrientation
            int initialOrientation = getOrientation();
            this.bindProperty("initialOrientation", initialOrientation.ToString());

            //lastStation
            String lastStation = null;                                      //Hard code to null
            this.bindProperty("lastStation", lastStation + "");

            //model
            String model = getModel();
            this.bindProperty("model", model.ToString());

            //orientation
            int orientation = getOrientation();
            this.bindProperty("orientation", orientation.ToString());

            //osversion
            String osversion = getOSVersion();
            this.bindProperty("osversion", osversion);

            //phonegapversion
            //phonegapversion was set in device.js, so not need to reset it in native code.

            //platform
            String platform = getPlatform();
            this.bindProperty("platform", platform);

            //queryString
            String queryString = getQueryString();
            this.bindProperty("queryString", queryString);

            //uuid
            String uuid = getUuid();
            this.bindProperty("uuid", uuid);
            
            //fire intel.xdk.device.init event.
            this.createAndDispatchEvent("intel.xdk.device.init");

            //A workaround to prevent following events fired more than once.
            //this.InvokeCustomScript(new ScriptCallback("eval", new String[] { "" }), false);
            InvokeCustomScript(new ScriptCallback("eval", new string[] { "var temp = {};" }), true);
        }

        public void copyToClipboard(String text)
        {
            text = JsonHelper.Deserialize<string[]>(text)[0];
            Deployment.Current.Dispatcher.BeginInvoke(delegate
            {
                Clipboard.SetText(text);
            });
        }

        public void getRemoteData(String args)
        {
            var arguments = JsonHelper.Deserialize<string[]>(args);
            String url = arguments[0];
            String method = arguments[1];
            String data = arguments[2];
            String successCallback = null;
            String errorCallback = null;

            if (arguments.Length > 4)
            {
                successCallback = arguments[3];
                errorCallback = arguments[4];
            }

            getRemoteDataProxy(url, method, data, null, successCallback, errorCallback);
        }

        public void getRemoteDataWithID(String args)
        {
            var arguments = JsonHelper.Deserialize<string[]>(args);
            String url = arguments[0];
            String method = arguments[1];
            String data = arguments[2];
            String uuid = arguments[3];
            String successCallback = null;
            String errorCallback = null;

            if (arguments.Length > 5)
            {
                successCallback = arguments[4];
                errorCallback = arguments[5];
            }

            getRemoteDataProxy(url, method, data, uuid, successCallback, errorCallback);
        }

        public void getRemoteDataExt(string parameters)
        {
            var arguments = JsonHelper.Deserialize<string[]>(parameters);
            RemoteDataParameters args = WPCordovaClassLib.Cordova.JSON.JsonHelper.Deserialize<RemoteDataParameters>(arguments[0].Replace("\\", ""));
            String url = args.url;
            String method = args.method;
            String data = args.body;
            String uuid = args.id;
            String headers = args.headers;
            Dictionary<String, String> headersDictionary = new Dictionary<string, string>();

            try
            {
                var req = WebRequest.CreateHttp(url.Replace("#", "%23"));
                Uri tmpUrl = new Uri(url, UriKind.Absolute);
                string hostName = tmpUrl.Host;
                req.CookieContainer = new CookieContainer();
                req.CookieContainer.Add(tmpUrl, amCookieJar.getCookies(tmpUrl.Host));
                AsyncCallback getTheResponse = ar =>
                {
                    try
                    {
                        string responseString;
                        var request = (HttpWebRequest)ar.AsyncState;
                        string statusCode = "200";
                        string respHeaders = "headers:{";
                        string cookieData = "[";
                        bool isJson = false;
                        using (var resp = (HttpWebResponse)request.EndGetResponse(ar))
                        {
                            using (var streamResponse = resp.GetResponseStream())
                            {
                                using (var streamRead = new StreamReader(streamResponse))
                                {
                                    responseString = streamRead.ReadToEnd();
                                }
                            }
                            responseString = responseString.Replace(@"\", @"\\").Replace(@"'", @"\'").Replace("\n", "").Replace("\r", "");//.Replace(@"""", @"""""");
                            statusCode = ((int)resp.StatusCode).ToString();
                            foreach (string key in resp.Headers.AllKeys)
                            {
                                if (key.ToLower() == "set-cookie")
                                    cookieData += String.Format("'{0}',", resp.Headers[key].Replace("'", "\\'"));
                                respHeaders += String.Format("'{0}':'{1}',", key, resp.Headers[key].Replace("'", "\\'"));
                            }
                            if (cookieData != "[")
                                cookieData = cookieData.Substring(0, cookieData.Length - 1);
                            respHeaders += "'All-Cookies':" + cookieData + "]";
                            respHeaders += "}";
                            amCookieJar.setCookies(hostName, resp.Cookies);
                        }
                        string statusExtra = "{status:" + statusCode + "," + respHeaders + "}";
                        string js = String.Format("javascript: var e = document.createEvent('Events');e.initEvent('intel.xdk.device.remote.data',true,true);e.success=true;e.id='{0}';e.response='{1}';e.extras={2};document.dispatchEvent(e);", uuid, responseString, statusExtra);
                        this.InvokeCustomScript(new ScriptCallback("eval", new String[] { js }), true);
                    }
                    catch (Exception ex)
                    {
                        string js = "var e = document.createEvent('Events');e.initEvent('intel.xdk.device.remote.data',true,true);e.success=false;e.id='" + uuid + "';e.response='';e.extras={};e.error='" + ex.Message + "';document.dispatchEvent(e);";
                        this.InvokeCustomScript(new ScriptCallback("eval", new String[] { js }), true);
                    }
                };
                AsyncCallback getTheStream = arstream =>
                {
                    try
                    {
                        string boundary = DateTime.Now.Ticks.ToString();
                        HttpWebRequest request = (HttpWebRequest)arstream.AsyncState;
                        Stream postStream = request.EndGetRequestStream(arstream);
                        StringBuilder postData = new StringBuilder();
                        byte[] byteArray = Encoding.UTF8.GetBytes(data.ToString());
                        postStream.Write(byteArray, 0, data.Length);
                        postStream.Close();
                        req.BeginGetResponse(getTheResponse, req);
                    }
                    catch (Exception streamEx)
                    {
                        String js = "var e = document.createEvent('Events');e.initEvent('intel.xdk.device.remote.data',true,true);e.success=false;e.id='" + uuid + "';e.response='';e.extras={};e.error='" + streamEx.Message + "';document.dispatchEvent(e);";
                        this.InvokeCustomScript(new ScriptCallback("eval", new String[] { js }), true);
                    }
                };
                if (headers.Contains("&"))
                {
            String[] headersArray = headers.Split('&');
            foreach (String header in headersArray)
            {
                String[] pair = header.Split('=');
                String key = pair[0];
                String value = pair[1];
                headersDictionary.Add(key, value);
            }
                }

                if (headersDictionary.Count > 0)
                {
                    foreach (KeyValuePair<string, string> items in headersDictionary)
                    {
                        if (!items.Key.Equals("Content-Type"))
                        {
                            if (items.Key.Equals("Accept"))
                            {
                                req.Accept = items.Value;
                            }
                            else
                            {
                                req.Headers[items.Key] = items.Value;
                            }
                        }
                    }
                }
                req.Method = "GET";
                if (method.ToLower() == "post")
                {
                    if (headersDictionary.Keys.Contains("Content-Type"))
                        req.ContentType = headersDictionary["Content-Type"];
                    else
                        req.ContentType = "application/x-www-form-urlencoded";
                    req.Method = "POST";
                    req.ContentLength = data.Length;
                    req.BeginGetRequestStream(getTheStream, req);
                }
                else
                    req.BeginGetResponse(getTheResponse, req);
            }
            catch (Exception ex)
            {
            }
        }

        public void addVirtualPage(string parameters)
        {
            virtualPagesCount++;
        }
        public void removeVirtualPage(string parameters)
        {
            virtualPagesCount--;
        }
        public void launchExternal(String args)
        {
            var arguments = JsonHelper.Deserialize<string[]>(args);

            if (arguments.Length < 1)
            {
                var js = string.Format("javascript:var ev = document.createEvent('Events');" +
                                       "ev.initEvent('intel.xdk.device.launchExternal',true,true);ev.success=false;" +
                                       "ev.filename='{0}';ev.message='{1}';document.dispatchEvent(ev);", "",
                    "Wrong number of parameters");
                InvokeCustomScript(new ScriptCallback("eval", new string[] {js}), true);
            }
            string url = HttpUtility.UrlDecode(arguments[0]);
            Windows.System.Launcher.LaunchUriAsync(new Uri(url));
        }

        public void setAutoRotate(string parameters)
        {
            string[] args = WPCordovaClassLib.Cordova.JSON.JsonHelper.Deserialize<string[]>(parameters);


            bool.TryParse(args[0], out shouldAutoRotate);
        }

        public void setRotateOrientation(string parameters)
        {
            Deployment.Current.Dispatcher.BeginInvoke(() =>
            {

                string[] args = WPCordovaClassLib.Cordova.JSON.JsonHelper.Deserialize<string[]>(parameters);

                if (args[0].ToUpper().Equals("LANDSCAPE"))
                    //Page.Orientation = PageOrientation.Landscape;
                    page.SupportedOrientations = SupportedPageOrientation.Landscape;
                else
                    page.SupportedOrientations = SupportedPageOrientation.Portrait;

                int orientation = page.SupportedOrientations == SupportedPageOrientation.Landscape ? 90 : -90;

                string js = "intel.xdk.device.orientation=" + orientation + ";";
                InvokeCustomScript(new ScriptCallback("eval", new string[] { js }), true);
            });
        }

        public void showRemoteSiteExt(string parameters)
        {
            string[] args = WPCordovaClassLib.Cordova.JSON.JsonHelper.Deserialize<string[]>(parameters);

            Uri loc = new Uri(args[0]);

            int.TryParse(args[1], out closeImagePortraitX);

            int.TryParse(args[2], out closeImagePortraitY);

            int.TryParse(args[3], out closeImageLandscapeX);

            int.TryParse(args[4], out closeImageLandscapeY);

            int.TryParse(args[5], out closeImageWidth);

            int.TryParse(args[6], out closeImageHeight);

            if (this.pageOrientation == PageOrientation.LandscapeLeft || this.pageOrientation == PageOrientation.LandscapeRight)
            {
                this.showRemoteSite("[\"" + loc + "\",\"" + closeImageLandscapeX + "\",\"" + closeImageLandscapeY + "\",\"" + closeImageWidth + "\",\"" + closeImageHeight + "\"]");
            }
            else
            {
                this.showRemoteSite("[\"" + loc + "\",\"" + closeImagePortraitX + "\",\"" + closeImagePortraitY + "\",\"" + closeImageWidth + "\",\"" + closeImageHeight + "\"]");
            }
        }

        public void showRemoteSite(string parameters)
        {
            string[] args = WPCordovaClassLib.Cordova.JSON.JsonHelper.Deserialize<string[]>(parameters);

            Uri loc = new Uri(args[0]);
            
            int closeImageX;
            int.TryParse(args[1], out closeImageX);

            int closeImageY;
            int.TryParse(args[2], out closeImageY);
            
            int closeImageWidth;
            int.TryParse(args[3], out closeImageWidth);

            int closeImageHeight;
            int.TryParse(args[4], out closeImageHeight);

            Deployment.Current.Dispatcher.BeginInvoke(() =>
            {
                if (browser != null)
                {
                    browser.Navigate(loc);
                }
                else
                {
                        if (page != null)
                        {
                            Grid grid = page.FindName("LayoutRoot") as Grid;
                            if (grid != null)
                            {
                                browser = new WebBrowser();
                                browser.Navigate(loc);

                                browser.LoadCompleted += new System.Windows.Navigation.LoadCompletedEventHandler(browser_LoadCompleted);

                                browser.Navigating += new EventHandler<NavigatingEventArgs>(browser_Navigating);
                                browser.NavigationFailed += new System.Windows.Navigation.NavigationFailedEventHandler(browser_NavigationFailed);
                                browser.Navigated += new EventHandler<System.Windows.Navigation.NavigationEventArgs>(browser_Navigated);
                                browser.IsScriptEnabled = true;
                                grid.Children.Add(browser);

                                closeButton = new Image();

                                Uri uri = new Uri("/Images/remote_close.png", UriKind.Relative);
                                BitmapImage imgSource = new BitmapImage(uri);
                                closeButton.Source = imgSource;

                                closeButton.Height = closeImageHeight;
                                closeButton.Width = closeImageWidth;
                                closeButton.HorizontalAlignment = HorizontalAlignment.Left;
                                closeButton.VerticalAlignment = VerticalAlignment.Top;
                                closeButton.Margin = new Thickness(closeImageX, closeImageY, 0, 0);
                                closeButton.Tap += closeButton_Tap;

                                grid.Children.Add(closeButton);
                            }

                            // don't show app bar.
                            //ApplicationBar bar = new ApplicationBar();
                            //bar.BackgroundColor = Colors.Black;
                            //bar.IsMenuEnabled = false;

                            //backButton = new ApplicationBarIconButton();
                            //backButton.Text = "Back";
                            //backButton.IconUri = new Uri("/Images/appbar.back.rest.png", UriKind.Relative);
                            //backButton.Click += new EventHandler(backButton_Click);
                            //backButton.IsEnabled = false;
                            //bar.Buttons.Add(backButton);

                            //fwdButton = new ApplicationBarIconButton();
                            //fwdButton.Text = "Forward";
                            //fwdButton.IconUri = new Uri("/Images/appbar.next.rest.png", UriKind.Relative);
                            //fwdButton.Click += new EventHandler(fwdButton_Click);
                            //fwdButton.IsEnabled = false;
                            //bar.Buttons.Add(fwdButton);

                            //ApplicationBarIconButton closeBtn = new ApplicationBarIconButton();
                            //closeBtn.Text = "Close";
                            //closeBtn.IconUri = new Uri("/Images/appbar.close.rest.png", UriKind.Relative);
                            //closeBtn.Click += new EventHandler(closeBtn_Click);
                            //bar.Buttons.Add(closeBtn);

                            //page.ApplicationBar = bar;
                        }

                    }
            });
        }

        public void hideStatusBar(string parameters)
        {
            Deployment.Current.Dispatcher.BeginInvoke(delegate
            {
                SystemTray.SetIsVisible(page, false);
            });
        }

        public void managePower(string parameters)
        {
            Deployment.Current.Dispatcher.BeginInvoke(delegate
            {
                string[] args = WPCordovaClassLib.Cordova.JSON.JsonHelper.Deserialize<string[]>(parameters);

                bool shouldStayOn = false;
                bool.TryParse(HttpUtility.UrlDecode(args[0]), out shouldStayOn);

                bool onlyWhenPluggedIn = false;
                bool.TryParse(HttpUtility.UrlDecode(args[1]), out shouldStayOn);

                if (shouldStayOn)
                {
                    if (onlyWhenPluggedIn)
                    {
                        bool isCharging = DeviceStatus.PowerSource == PowerSource.External;
                        if (isCharging)
                        {
                            PhoneApplicationService.Current.UserIdleDetectionMode = IdleDetectionMode.Disabled;
                        }
                    }
                    else
                    {
                        PhoneApplicationService.Current.UserIdleDetectionMode = IdleDetectionMode.Disabled;
                    }
                }
                else
                {
                    PhoneApplicationService.Current.UserIdleDetectionMode = IdleDetectionMode.Enabled;
                }
            });
        }

        public void sendEmail(string parameters)
        {
            Deployment.Current.Dispatcher.BeginInvoke(delegate
            {
                string[] args = WPCordovaClassLib.Cordova.JSON.JsonHelper.Deserialize<string[]>(parameters);

                string bodyText = args[0];
                string toString = args[1];
                string subjectText = args[2];
                string isHTML = args[3];
                string ccString = args[4];
                string bccString = args[5];

                EmailComposeTask emailcomposer = new EmailComposeTask();
                emailcomposer.To = toString;
                emailcomposer.Subject = subjectText;
                emailcomposer.Body = bodyText;
                emailcomposer.Bcc = bccString;
                emailcomposer.Cc = ccString;
                emailcomposer.Show();

            });
        }

        public void sendSMS(string parameters)
        {
            Deployment.Current.Dispatcher.BeginInvoke(delegate
            {
                string[] args = WPCordovaClassLib.Cordova.JSON.JsonHelper.Deserialize<string[]>(parameters);

                string bodyText = args[0];
                string toNumber = args[1];

                SmsComposeTask composeSMS = new SmsComposeTask()
                {
                    Body = bodyText,
                    To = toNumber,
                };
                composeSMS.Show();

            });
        }

        public void scanBarcode(string parameters)
        {

                Deployment.Current.Dispatcher.BeginInvoke(() =>
                {
                    if (page != null)
                    {
                        Grid grid = page.FindName("LayoutRoot") as Grid;
                        if (grid != null)
                        {
                            barCodecontrol = new BarCodeControl();

                            PageOrientation po = ((PhoneApplicationFrame)(Application.Current.RootVisual)).Orientation;
                            if (po == PageOrientation.Landscape || po == PageOrientation.LandscapeLeft || po == PageOrientation.LandscapeRight)
                            {
                                barCodecontrol.Height = Application.Current.Host.Content.ActualWidth;
                                barCodecontrol.Width = Application.Current.Host.Content.ActualHeight;
                            } else {
                                barCodecontrol.Height = Application.Current.Host.Content.ActualHeight;
                                barCodecontrol.Width = Application.Current.Host.Content.ActualWidth;
                            }
                            //barCodecontrol.viewFeed.Height = Application.Current.Host.Content.ActualHeight;
                            //barCodecontrol.viewFeed.Width = Application.Current.Host.Content.ActualWidth;

                            grid.Children.Add(barCodecontrol);

                            barCodecontrol.ReadComplete += barCodecontrol_Completed;
                        }
                    }
                    else
                    {
                    }
                });

        }

        public void closeRemoteSite(string parameters)
        {
            this.close();
        }

        public void updateConnection(string parameters)
        {
            String currentConnection = getConnection();
            //bindProperty("connection", currentConnection);
            //createAndDispatchEvent("intel.xdk.devcie.connection.update");

            string js = "javascript: intel.xdk.device.connection =  \"" + currentConnection + "\";var e =document.createEvent('Events');e.initEvent('intel.xdk.device.connection.update',true,true);document.dispatchEvent(e);";
            this.InvokeCustomScript(new ScriptCallback("eval", new String[] { js }), true);
        }
        #endregion

        #region Private Methods
        void barCodecontrol_Completed(object sender, string e)
        {
            Deployment.Current.Dispatcher.BeginInvoke(() =>
            {
                barCodecontrol.StopReadingBarcode();
                barCodecontrol.ReadComplete -= barCodecontrol_Completed;

                PhoneApplicationFrame frame = Application.Current.RootVisual as PhoneApplicationFrame;
                PhoneApplicationPage page = null;

                if (frame != null)
                {
                    page = frame.Content as PhoneApplicationPage;
                }

                if (page != null)
                {
                    Grid grid = page.FindName("LayoutRoot") as Grid;
                    if (grid != null)
                    {
                        page.OrientationChanged -= page_OrientationChanged;

                        grid.Children.Remove(barCodecontrol);
                        barCodecontrol = null;

                        // user hit back button
                        if (e == null)
                        {
                            string js = "var e=document.createEvent('Events');e.initEvent('intel.xdk.device.barcode.scan',true,true);e.success=false;e.codetype='';e.codedata='';document.dispatchEvent(e);";
                            InvokeCustomScript(new ScriptCallback("eval", new string[] { js }), true);
                        }
                        else
                        {
                            e = e.Replace(System.Environment.NewLine,"\\n");
                            string format = "QR_CODE";
                            string js = "var e=document.createEvent('Events');e.initEvent('intel.xdk.device.barcode.scan',true,true);e.success=true;e.codetype='" + format + "';e.codedata='" + e + "';document.dispatchEvent(e);";
                            InvokeCustomScript(new ScriptCallback("eval", new string[] { js }), true);
                        }
                    }
                }
                else
                {
                    string js = "var e=document.createEvent('Events');e.initEvent('intel.xdk.device.barcode.scan',true,true);e.success=false;e.codetype='';e.codedata='';document.dispatchEvent(e);";
                    InvokeCustomScript(new ScriptCallback("eval", new string[] { js }), true);
                }
            });
        }
        
        private void page_OrientationChanged(object sender, OrientationChangedEventArgs e)
        {

            Deployment.Current.Dispatcher.BeginInvoke(() =>
            {
                pageOrientation = e.Orientation;

                string js = "javascript:intel.xdk.device.orientation='" + this.getOrientation() + "';var e = document.createEvent('Events');e.initEvent('intel.xdk.device.orientation.change', true, true);e.success=true;e.orientation='" + this.getOrientation() + "';document.dispatchEvent(e);";
                InvokeCustomScript(new ScriptCallback("eval", new string[] { js }), false);

                if (page != null && browser != null)
                {
                    Grid grid = page.FindName("LayoutRoot") as Grid;
                    if (grid != null)
                    {
                        grid.Children.Remove(closeButton);

                        closeButton = new Image();

                        Uri uri = new Uri("/Images/remote_close.png", UriKind.Relative);
                        BitmapImage imgSource = new BitmapImage(uri);
                        closeButton.Source = imgSource;

                        closeButton.Height = closeImageHeight;
                        closeButton.Width = closeImageWidth;
                        closeButton.HorizontalAlignment = HorizontalAlignment.Left;
                        closeButton.VerticalAlignment = VerticalAlignment.Top;
                        closeButton.Tap += closeButton_Tap;

                        if (e.Orientation == PageOrientation.LandscapeLeft)
                        {
                            closeButton.Margin = new Thickness(closeImageLandscapeX, closeImageLandscapeY, 0, 0);
                        }
                        else if (e.Orientation == PageOrientation.LandscapeRight)
                        {
                            closeButton.Margin = new Thickness(closeImageLandscapeX, closeImageLandscapeY, 0, 0);
                        }
                        else if (e.Orientation == PageOrientation.PortraitUp)
                        {
                            closeButton.Margin = new Thickness(closeImagePortraitX, closeImagePortraitY, 0, 0);
                        }
                        else if (e.Orientation == PageOrientation.PortraitDown)
                        {
                            closeButton.Margin = new Thickness(closeImagePortraitX, closeImagePortraitY, 0, 0);
                        }
                    }
                    grid.Children.Add(closeButton);
                }
            });

        }

        void browser_LoadCompleted(object sender, System.Windows.Navigation.NavigationEventArgs e)
        {
        }

        void closeButton_Tap(object sender, System.Windows.Input.GestureEventArgs e)
        {
            this.close();
        }

        void browser_Navigated(object sender, System.Windows.Navigation.NavigationEventArgs e)
        {
        }

        void browser_NavigationFailed(object sender, System.Windows.Navigation.NavigationFailedEventArgs e)
        {
        }

        void browser_Navigating(object sender, NavigatingEventArgs e)
        {
        }

        void fwdButton_Click(object sender, EventArgs e)
        {
            if (browser != null)
            {
                try
                {
                    browser.InvokeScript("execScript", "history.forward();");
                }
                catch (Exception)
                {

                }
            }
        }

        void backButton_Click(object sender, EventArgs e)
        {
            if (browser != null)
            {
                try
                {
                    browser.InvokeScript("execScript", "history.back();");
                }
                catch (Exception)
                {

                }
            }
        }

        void closeBtn_Click(object sender, EventArgs e)
        {
            this.close();
        }

        private class RequestState
        {
            public  HttpWebRequest request { set;get; }

            public String successCallback { set;get; }

            public String errorCallback { set; get; }

            public String uuid { set; get; }

            public bool shouldFireEvent { set; get; }


            public RequestState(HttpWebRequest request, String successCallback, String errorCallback, String uuid, bool shouldFireEvent = false)
            {
                this.request = request;
                this.successCallback = successCallback;
                this.errorCallback = errorCallback;
                this.uuid = uuid;
                this.shouldFireEvent = shouldFireEvent;
            }
        }

        private void getRemoteDataProxy(String url, String method, String requestBody, String uuid, String successCallback, String errorCallback, Dictionary<String, String> headers = null)
        {

            //string[] args = WPCordovaClassLib.Cordova.JSON.JsonHelper.Deserialize<string[]>(parameters);

            //// requestUrl, requestMethod, requestBody, successCallback, errorCallback, id, hasId, headers, doHeaders
            //string url = HttpUtility.UrlDecode(args[0]);
            //string method = HttpUtility.UrlDecode(args[1]);
            //string body = HttpUtility.UrlDecode(args[2]);
            //string successCallback = HttpUtility.UrlDecode(args[3]);
            //string errorCallback = HttpUtility.UrlDecode(args[4]);
            //string id = args[5];

            bool hasId = (uuid == null) ? false : true;

            uuid = (uuid == null) ? "" : uuid;

            //string headers = HttpUtility.UrlDecode(args[7]);
            //string doHeaders = HttpUtility.UrlDecode(args[args.Length - 1]);

            //string[] headers = new string[parameters.Length-8];
            //Dictionary<string, string> headers = new Dictionary<string, string>();

            string name = "";
            string value = "";

            //for (int i = 7; i < parameters.Length - 1; i++)
            //{
            //    if (i % 2 == 1)
            //        name = HttpUtility.UrlDecode(args[i]);
            //    else
            //    {
            //        value = HttpUtility.UrlDecode(args[i]);
            //        headers.Add(name, value);
            //    }
            //}

            url = Uri.UnescapeDataString(url);

            try
            {
                var req = WebRequest.CreateHttp(url);
                Uri tmpUrl = new Uri(url, UriKind.Absolute);
                string hostName = tmpUrl.Host;
                req.CookieContainer = new CookieContainer();
                req.CookieContainer.Add(tmpUrl, amCookieJar.getCookies(tmpUrl.Host));


                // for GET handling
                AsyncCallback getTheResponse = ar =>
                {
                    try
                    {
                        string responseString;

                        var request = (HttpWebRequest)ar.AsyncState;
                        string statusCode = "200";
                        string respHeaders = "headers:{";
                        string cookieData = "[";
                        using (var resp = (HttpWebResponse)request.EndGetResponse(ar))
                        {
                            using (var streamResponse = resp.GetResponseStream())
                            {
                                using (var streamRead = new StreamReader(streamResponse))
                                {
                                    responseString = streamRead.ReadToEnd();
                                }
                            }
                            responseString = responseString.Replace(@"'", @"\'").Replace("\n", "").Replace("\r", "").Replace(@"\""", @"\\""");

                            statusCode = ((int)resp.StatusCode).ToString();
                            foreach (string key in resp.Headers.AllKeys)
                            {
                                if (key.ToLower() == "set-cookie")
                                    cookieData += String.Format("'{0}',", resp.Headers[key].Replace("'", "\'"));
                                respHeaders += String.Format("'{0}':'{1}',", key, resp.Headers[key].Replace("'", "\'"));
                            }
                            //trim off the last character
                            if (cookieData != "[")
                                cookieData = cookieData.Substring(0, cookieData.Length - 1);
                            respHeaders += "'All-Cookies':" + cookieData + "]";
                            respHeaders += "}";


                            amCookieJar.setCookies(hostName, resp.Cookies);
                        }


                        //String js = String.Format("javascript: var e = document.createEvent('Events');e.initEvent('intel.xdk.device.remote.data',true,true);e.success=true;e.id='{0}';e.response=\"{1}\";e.extras={2};document.dispatchEvent(e);", "", responseString, "");
                        string statusExtra = "{status:" + statusCode + "," + respHeaders + "}";

                        char delimiter = '"';

                        //string js = String.Format("javascript: var e = document.createEvent('Events');e.initEvent('intel.xdk.device.remote.data',true,true);e.success=true;e.id='{0}';e.response='{1}';e.extras={2};document.dispatchEvent(e);", id, responseString, statusExtra);
                        string js = "";
                        
                        if (successCallback != null) {
                            js = "javascript: " + successCallback + "(" +
                                (hasId ? (delimiter + uuid + delimiter + ", ") : "") +
                                "'" + responseString + "'" + ")";
                        } else {
                            if (hasId)
                                js = "javascript:var e = document.createEvent('Events');e.initEvent('intel.xdk.device.remote.data', true, true);e.success=true;e.response='" + responseString + "';e.id='" + uuid + "';document.dispatchEvent(e);";
                            else
                            js = "javascript:var e = document.createEvent('Events');e.initEvent('intel.xdk.device.remote.data', true, true);e.success=true;e.response='" + responseString + "';document.dispatchEvent(e);";
                        }

                        this.InvokeCustomScript(new ScriptCallback("eval", new String[] { js }), true);
                    }
                    catch (Exception ex)
                    {
                        //string js = String.Format("var e = document.createEvent('Events');e.initEvent('intel.xdk.device.remote.data',true,true);e.success=false;e.id='{0}';e.response='';e.extras={};e.error='{1}';document.dispatchEvent(e);", id, ex.Message);
                        string js = "var e = document.createEvent('Events');e.initEvent('intel.xdk.device.remote.data',true,true);e.success=false;e.id='" + uuid + "';e.response='';e.extras={};e.error='" + ex.Message + "';document.dispatchEvent(e);";
                        this.InvokeCustomScript(new ScriptCallback("eval", new String[] { js }), true);
                    }
                };

                // for POST handling
                AsyncCallback getTheStream = arstream =>
                {
                    try
                    {
                        string boundary = DateTime.Now.Ticks.ToString();
                        HttpWebRequest request = (HttpWebRequest)arstream.AsyncState;

                        Stream postStream = request.EndGetRequestStream(arstream);

                        StringBuilder postData = new StringBuilder();
                        byte[] byteArray = Encoding.UTF8.GetBytes(requestBody.ToString());

                        postStream.Write(byteArray, 0, requestBody.Length);
                        postStream.Close();
                        req.BeginGetResponse(getTheResponse, req);
                    }
                    catch (Exception streamEx)
                    {
                        //String js = string.Format("var e = document.createEvent('Events');e.initEvent('intel.xdk.device.remote.data',true,true);e.success=false;e.id='{0}';e.response='';e.extras={};e.error='{1}';document.dispatchEvent(e);", id, streamEx.Message);
                        String js = "var e = document.createEvent('Events');e.initEvent('intel.xdk.device.remote.data',true,true);e.success=false;e.id='" + uuid + "';e.response='';e.extras={};e.error='" + streamEx.Message + "';document.dispatchEvent(e);";
                        this.InvokeCustomScript(new ScriptCallback("eval", new String[] { js }), true);
                    }

                };
                req.Method = "GET";
                if (method.ToLower() == "post")
                {
                    if (headers.Keys.Contains("Content-Type"))
                        req.ContentType = headers["Content-Type"];
                    else
                        req.ContentType = "application/x-www-form-urlencoded";
                    req.Method = "POST";
                    req.ContentLength = requestBody.Length;
                    req.BeginGetRequestStream(getTheStream, req);
                }
                else
                    req.BeginGetResponse(getTheResponse, req);
            }
            catch (Exception ex)
            {
                //callback(null, ex);
            }
        }

        private void responseCallback(IAsyncResult asynchronousResult)
        {
            var request = ((RequestState) asynchronousResult.AsyncState).request;
            var successCallback = ((RequestState)asynchronousResult.AsyncState).successCallback;
            var errorCallback = ((RequestState)asynchronousResult.AsyncState).errorCallback;
            var uuid = ((RequestState)asynchronousResult.AsyncState).uuid;
            bool shouldFireEvent = ((RequestState)asynchronousResult.AsyncState).shouldFireEvent;
            //var request = (HttpWebRequest)asynchronousResult.AsyncState;

            try
            {
                using (var response = (HttpWebResponse)request.EndGetResponse(asynchronousResult))
                {
                    using (var streamResponse = response.GetResponseStream())
                    {
                        using (var streamRead = new StreamReader(streamResponse))
                        {
                            String remoteData = streamRead.ReadToEnd();
                            if (response.StatusCode == HttpStatusCode.OK)
                            {
                                if (successCallback != null)
                                {
                                    String js = successCallback + "('" + remoteData + "');";
                                    if (uuid != null)
                                    {
                                        js = successCallback + "('" + remoteData + "', '" + uuid + "');";
                                    }
                                    this.InvokeCustomScript(new ScriptCallback("eval", new String[] { successCallback + "('" + remoteData + "');" }), true);
                                }
                                else
                                {
                                    if (shouldFireEvent)
                                    {
                                        var properties = new Dictionary<String, String>();
                                        properties.Add("success", "true");
                                        properties.Add("response", remoteData);
                                        createAndDispatchEvent("intel.xdk.device.remote.data", properties);

                                        //A workaround to prevent following events fired more than once.
                                        this.InvokeCustomScript(new ScriptCallback("eval", new String[] { "" }), true);
                                    }
                                    DispatchCommandResult(new PluginResult(PluginResult.Status.OK, remoteData));
                                }
                            }
                            else 
                            {
                                if (errorCallback != null)
                                {
                                    String js = errorCallback + "('" + remoteData + "');";
                                    if (uuid != null) 
                                    {
                                        js = errorCallback + "('" + remoteData + "', '" + uuid + "');";
                                    }
                                    this.InvokeCustomScript(new ScriptCallback("eval", new String[] { js }), true);
                                }
                                else
                                {
                                    if (shouldFireEvent)
                                    {
                                        var properties = new Dictionary<String, String>();
                                        properties.Add("success", "false");
                                        properties.Add("response", remoteData);
                                        createAndDispatchEvent("intel.xdk.device.remote.data", properties);

                                        //A workaround to prevent following events fired more than once.
                                        this.InvokeCustomScript(new ScriptCallback("eval", new String[] { "" }), true);             
                                    }
                                    DispatchCommandResult(new PluginResult(PluginResult.Status.ERROR, remoteData));
                                }
                            }
                        }
                    }
                }
            }
            catch (Exception e)
            {
                System.Diagnostics.Debug.WriteLine(e);
            }
        }

        private String getConnection() 
        {
            bool isCell = DeviceNetworkInformation.IsCellularDataEnabled || DeviceNetworkInformation.IsCellularDataRoamingEnabled;
            bool isWifi = DeviceNetworkInformation.IsWiFiEnabled;

            if (isWifi) 
            {
                return "wifi";
            }

            if (isCell) 
            {
                return "cell";
            }

            return "none";
        }

        private int getOrientation()
        {
            if (this.pageOrientation == PageOrientation.LandscapeLeft)
            {
                return 90;
            }
            else if (this.pageOrientation == PageOrientation.LandscapeRight)
            {
                return -90;
            }
            else if (this.pageOrientation == PageOrientation.PortraitUp)
            {
                return 0;
            }
            else if (this.pageOrientation == PageOrientation.PortraitDown)
            {
                return 180;
            }
            else
            {
                return 0;
            }
        }

        private String getModel()
        {
            return DeviceStatus.DeviceName;
        }

        private String getOSVersion()
        {
            return "8";
        }

        private String getPlatform()
        {
            return "windows phone";
        }

        private String getQueryString()
        {
            return "";
        }

        private String getUuid()
        {
            return Windows.Phone.System.Analytics.HostInformation.PublisherHostId;
        }

        private void bindProperty(String property, String value)
        {
            //Initialize namespace intel.xdk.device
            this.InvokeCustomScript(new ScriptCallback("eval", new String[]{"if(typeof intel === 'undefined'){intel = {};} intel.xdk = intel.xdk || {}; intel.xdk.device = intel.xdk.device || {};"}), false);

            //Bind property
            this.InvokeCustomScript(new ScriptCallback("eval", new String[]{"intel.xdk.device." + property + "='" + value + "';"}), false);
        }

        private void createAndDispatchEvent(String eventName, Dictionary<String, String> properties = null)
        {
            String js = "var e = document.createEvent('Events');e.initEvent('" + eventName + "', true, true);";

            if (properties != null)
            {
                foreach(KeyValuePair<String, String> pair in properties)
                {
                    String key = pair.Key;
                    String value = pair.Value;
                    js += "e." + key + "=" + value + ";";
                }
            }

            js += "document.dispatchEvent(e);";
            this.InvokeCustomScript(new ScriptCallback("eval", new String[]{js}), false);
        }

        private void close(string options = "")
        {
            if (browser != null)
            {
                Deployment.Current.Dispatcher.BeginInvoke(() =>
                {
                    if (page != null)
                    {
                        Grid grid = page.FindName("LayoutRoot") as Grid;
                        if (grid != null)
                        {
                            grid.Children.Remove(browser);
                            grid.Children.Remove(closeButton);
                        }
                        page.ApplicationBar = null;
                    }
                    browser = null;
                });
            }
        }
        #endregion
    }

    public class RemoteDataParameters
    {
        public string url = "";
        public string  id = "";
        public string  method = "GET";
        public string body = "";
        public string headers = "";
    }

}

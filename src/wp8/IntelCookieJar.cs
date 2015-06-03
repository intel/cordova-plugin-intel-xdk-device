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
using System.Net;
using System.Text;
using System.Threading.Tasks;

namespace Cordova.Extension.Commands
{
    /// <summary>
    /// Basic class to manage cookies for CookieContainers that can persist across requests
    /// Not thread safe
    /// </summary>
    class IntelCookieJar
    {
        private Dictionary<string, CookieCollection> cookieJar = new Dictionary<string, CookieCollection>();

        public IntelCookieJar()
        {
        }

        public CookieCollection getCookies(string domain)
        {
            if (cookieJar.ContainsKey(domain))
                return cookieJar[domain];
            else
            {
                CookieCollection cj = new CookieCollection();
                cookieJar[domain] = cj;
                return cj;
            }
        }
        public void setCookies(string domain, CookieCollection cookies)
        {
            cookieJar[domain] = cookies;
        }
    }
}

DNS Proxy
=========

A simple DNS Proxy with configurable blocking capabilities. Can block domain based on ip address and mac address.

## Setup

1. Install Node
2. Clone the repo
3. Install dependencies of the API and the Core module
4. Run main
5. Edit filters
6. Redirect DNS trafic to the device running this project

## Auto Reload

By default, all changes in source.d and filters.d are automatically taken in account. You don't have to stop the DNSProxy

## Add more domains 

In the future I would like to be able to use the OpenDNS classification (https://community.opendns.com/domaintagging/categories), but for the moment it is not implemented.

If you want add custom domains you can append them to one of the "domain" file inside the prebuilt list.

The recommended whay to add domains is the following:

1. Create a custom folder in the source.d directory
2. Inside this folder create a folder for the category your website is in
3. Create a 'domain' file
4. On each line of the file add a new domain 

## Default blocking

In the filters.d directory a special filter is the default.json filter. It allows you to block some categories by default (for example 'adult', 'porn', 'weapons', 'drugs', ...).
If you want to change the default behaviour this is the file to change.

## Per user blocking

Each user has a file in filters.d with the following form:

```json
{
  "name": "UserName",
  "hosts": [
    "192.168.0.15"
  ],
  "block": {
    "categories": [
      "adult",
      "porn",
      "games",
      "socialnet"
    ]
  }
}
```

## API usage 

This project comes with a simple API that let you check available categories, category of a domain, retrieve user configuration and update user configuration

The API description is available in swagger format in the dns-proxy-api/api folder of this project or at https://app.swaggerhub.com/apis/Willena/dns-proxy-api/1.0.0 

## Credits

Thanks http://www.shallalist.de/ to provide a free to use list of categorized domains.

Thanks to https://github.com/ekristen/dns-proxy . It gave me a strong code base to work and add my features. It has been completely rewritten bu work similarly.

## License

This project is under the MIT licence.

```text


The MIT License (MIT)

Copyright (c) 2015 Guillaume VILLENA guillaume@villena.me

Permission is hereby granted, free of charge, to any person obtaining a copy of this software and associated documentation files (the "Software"), to deal in the Software without restriction, including without limitation the rights to use, copy, modify, merge, publish, distribute, sublicense, and/or sell copies of the Software, and to permit persons to whom the Software is furnished to do so, subject to the following conditions:

The above copyright notice and this permission notice shall be included in all copies or substantial portions of the Software.

THE SOFTWARE IS PROVIDED "AS IS", WITHOUT WARRANTY OF ANY KIND, EXPRESS OR IMPLIED, INCLUDING BUT NOT LIMITED TO THE WARRANTIES OF MERCHANTABILITY, FITNESS FOR A PARTICULAR PURPOSE AND NONINFRINGEMENT. IN NO EVENT SHALL THE AUTHORS OR COPYRIGHT HOLDERS BE LIABLE FOR ANY CLAIM, DAMAGES OR OTHER LIABILITY, WHETHER IN AN ACTION OF CONTRACT, TORT OR OTHERWISE, ARISING FROM, OUT OF OR IN CONNECTION WITH THE SOFTWARE OR THE USE OR OTHER DEALINGS IN THE SOFTWARE.

``` 

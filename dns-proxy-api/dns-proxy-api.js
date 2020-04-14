'use strict';

var path = require('path');
var http = require('http');
var oas3Tools = require('oas3-tools');

class DnsProxyAPI {
    constructor (DnsProxy) {
        this.dnsProxy = DnsProxy

    }

    startServer(){
        var serverPort = 8080;

// swaggerRouter configuration
        var options = {
            controllers: path.join(__dirname, './controllers')
        };

        var expressAppConfig = oas3Tools.expressAppConfig(path.join(__dirname, 'api/openapi.yaml'), options);
        expressAppConfig.getApp().use((req,res,next) => {
            req.dnsProxy = this.dnsProxy
            req.app = expressAppConfig.getApp()
            next()
        })

        expressAppConfig.addValidator();
        var app = expressAppConfig.getApp();


// Initialize the Swagger middleware
        http.createServer(app).listen(serverPort, function () {
            console.log('Your server is listening on port %d (http://localhost:%d)', serverPort, serverPort);
            console.log('Swagger-ui is available on http://localhost:%d/docs', serverPort);
        });
    }
}

module.exports.DnsProxyApi = DnsProxyAPI

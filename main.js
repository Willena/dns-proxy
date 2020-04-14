api = require('./dns-proxy-api/dns-proxy-api')
core = require('./dns-proxy-core/dns-proxy-core')

const proxy = new core.DnsProxy()
const proxyAPI = new api.DnsProxyApi(proxy)

proxy.startDnsServer()
proxyAPI.startServer()

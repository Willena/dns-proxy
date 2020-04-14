#!/usr/bin/env node

const fs = require('fs')
const rc = require('rc')
const dgram = require('dgram')
const packet = require('native-dns-packet')
// import wildcard from 'wildcard2'
const { loadAll} = require("./util")
const util = require('./util')
const chokidar = require('chokidar')
const arp = require('@network-utils/arp-lookup')
const path = require('path')


class DnsProxy {

  NAME = 'DnsProxy'
  DEFAULTS = {
    port: 53,
    logging: this.NAME+':query,'+this.NAME+':info,'+this.NAME+':debug',
    nameservers: [
      '192.168.0.20'
    ],
    fallback_timeout: 180,
    reload_config: false,
    reload_users:true,
    reload_domains: true,
    domainListFolder : "./source.d/",
    usersList : "./filters.d",
    arp_refresh_timeout : 30000
  }
  USER_FILTERS = {perUser : {}, perHost : {}}
  LOCAL_ARP_TABLE = { table : {} }
  DOMAINS = {}
  USER_STAT = {}

  constructor () {
    this.config = rc(this.NAME, this.DEFAULTS)

    process.env.DEBUG_FD = process.env.DEBUG_FD || 1
    process.env.DEBUG = process.env.DEBUG || this.config.logging
    let d = process.env.DEBUG.split(',')
    d.push('dnsproxy:error')
    process.env.DEBUG = d.join(',')

    this.loginfo = require('debug')(this.NAME+':info')
    this.logdebug = require('debug')(this.NAME+':debug')
    this.logquery = require('debug')(this.NAME+':query')
    this.logerror = require('debug')(this.NAME+':error')

    this.loadLocalARPTable(this.LOCAL_ARP_TABLE)
    this._arp_update_interval = setInterval(() => {this.loadLocalARPTable(this.LOCAL_ARP_TABLE)}, this.config.arp_refresh_timeout)

    /* Setup auto refresh for config files */
    if (this.config.reload_config === true) {
      const configFile = this.config.config
      const dnsProxy = this
      /* config File only */
      fs.watchFile(configFile, () =>  {
        loginfo('Config file changed, reloading config options')
        try {
          this.config = rc(dnsProxy.NAME, this.DEFAULTS)
        } catch (e) {
          logerror('error reloading configuration')
          logerror(e)
        }
      })
    }

    /* Refresh for domains */
    if (this.config.reload_domains) {
      /* Reload definitions of all domain by categories */
      // var watcher = chokidar.watch(config.domainListFolder, {ignored: /^\./, persistent: true});
      // watcher
      //     .on('add', function(path) {console.log('File', path, 'has been added');})
      //     .on('change', function(path) {console.log('File', path, 'has been changed');})
      //     // .on('unlink', function(path) {console.log('File', path, 'has been removed');})
      //     // .on('error', function(error) {console.error('Error happened', error);})
    }

    /* Reload user configs */
    if (this.config.reload_users){

      var watcher = chokidar.watch(this.config.usersList, {ignored: /^\./, persistent: true});
      watcher
        .on('add', path => this.loadSingleUserFilter(path, this.USER_FILTERS) )
        .on('change', path => this.loadSingleUserFilter(path, this.USER_FILTERS))
        .on('unlink', path => this.unLoadUserFilter(path, this.USER_FILTERS))
        .on('error', path => this.logerror('Could not load %j', path))
    }

    //Show current option set
    this.logdebug('options: %j', this.config)

    /* Finally load domains */
    this.DOMAINS = loadAll(this.config.domainListFolder)
    const numberDomains = Object.values(this.DOMAINS.stats).reduce((t, n) => t + n)
    this.loginfo("Found %j domains ", numberDomains)

  }

  startDnsServer(){
    this.server = dgram.createSocket('udp4')
    this.server.bind(this.config.port, this.config.host)

    this.server.on('listening', () =>  {
      this.loginfo('we are up and listening at %s on %s', this.config.host, this.config.port)
    })

    this.server.on('error', err =>  {
      this.logerror('udp socket error')
      this.logerror(err)
    })

    this.server.on('message', (message, rinfo) => {
      let returner = false
      let nameserver = this.config.nameservers[0]

      const query = packet.parse(message)
      const domain = query.question[0].name
      const type = query.question[0].type
      const ipSource = rinfo.address

      this.logdebug('query: %j', query)
      this.logdebug('query: IP source : %j', ipSource)

      if (this.DOMAINS.domains[domain]){
        const categories = this.DOMAINS.domains[domain]
        this.logdebug('domain: %j; category: %j', domain, this.DOMAINS.domains[domain])

        //Handle user
        const mac = this.LOCAL_ARP_TABLE[ipSource]
        if (this.USER_FILTERS.perHost[ipSource] || this.USER_FILTERS.perHost[mac]){
          const user = this.USER_FILTERS.perHost[ipSource] || this.USER_FILTERS.perHost[mac]
          this.logdebug('User %j matching request (%j ; %j)', user.name, ipSource, mac)

          for (let category of categories) {
            if (user.block.categories.includes(category)) {
              this.logdebug('%j is marked in category %j and will be blocked', domain, category)

              /* Send an unreachable address */
              let res = util.createAnswer(query, '0.0.0.0')
              this.server.send(res, 0, res.length, rinfo.port, rinfo.address)
              returner = true

              break;
            }
          }
        }

        // Handle default ...
        for (let category of categories) {
          if (this.USER_FILTERS.perUser.default.block.categories.includes(category)) {
            this.logdebug('%j is marked in category %j and will be blocked by default config', domain, category)

            /* Send an unreachable address */
            let res = util.createAnswer(query, '0.0.0.0')
            this.server.send(res, 0, res.length, rinfo.port, rinfo.address)
            returner = true
            break
          }
        }
      }
      else
        this.loginfo('domain: %j No category found !', domain)

      if (returner)
        return

      /* Forward and send to other serber */
      this.querydns(message, nameserver, rinfo, type)

    })

  }

  async querydns(message, nameserver, rinfo, type){
    /* Forward the request to the nameserver */
    let nameParts = nameserver.split(':')
    nameserver = nameParts[0]
    let port = nameParts[1] || 53
    let fallback

    const sock = dgram.createSocket('udp4')
    sock.send(message, 0, message.length, port, nameserver, () =>  {
      fallback = setTimeout(() => {
        this.querydns(message, this.config.nameservers[0], rinfo, type)
      }, this.config.fallback_timeout)
    })

    sock.on('error', (err) => {
      this.logerror('Socket Error: %s', err)
      process.exit(5)
    })

    sock.on('message', (response) => {
      clearTimeout(fallback)
      this.logquery('type: primary, nameserver: %s, query: %s, type: %s, answer: %s, source: %s:%s, size: %d', nameserver, domain, util.records[type] || 'unknown', util.listAnswer(response), rinfo.address, rinfo.port, rinfo.size)
      this.server.send(response, 0, response.length, rinfo.port, rinfo.address)
      sock.close()
    })
  }

  stopDnsServer(){
    this.server.close()
    clearInterval(this._arp_update_interval);
  }

  getStats(){

  }

  getPerUserStats(){

  }

  updateUser(user, data){
    fs.writeFile(this.config.usersList+'/'+user+'.json', JSON.stringify(data))
  }

  getUsers(){
    return this.USER_FILTERS.perUser
  }

  getRegisteredCategories(){
    return this.DOMAINS.categories
  }

  getRegisteredDomains(){
    return this.DOMAINS.domains
  }

  getARPTable(){
    return this.LOCAL_ARP_TABLE
  }

  loadLocalARPTable(oldTable) {
    // mac => [ IP1, IP2 ]
    // IP1 => mac

    oldTable.table = {}

    arp.getTable().then(table =>{

      for (let entry of table){
        if (!oldTable.table[entry.mac])
          oldTable.table[entry.mac] = []

        oldTable.table[entry.mac].push(entry.ip)
        oldTable.table[entry.ip] = entry.mac
      }

      this.loginfo("ARP Table refreshed")
    })

    return oldTable
  }

  unLoadUserFilter(filepath, filters){

    if (!filepath.endsWith(".json"))
      return

    const name = path.basename(filepath, ".json")

    if (!filters.perUser[name])
      return

    filters.perUser[name].hosts.forEach(host => {
      delete filters.perHost[host]
    })

    delete filters.perUser[name]

  }

 loadSingleUserFilter(filepath, filters){

    this.unLoadUserFilter(filepath, filters)

    if (!filepath.endsWith(".json"))
      return filters

    const name = path.basename(filepath, ".json")
    this.loginfo("Loading user config : %j" , name)
    const userData = JSON.parse(fs.readFileSync(filepath))
    filters.perUser[name] = userData

    userData.hosts.forEach(host => {
      filters.perHost[host] = userData
    })

    return filters
  }

}

module.exports.DnsProxy = DnsProxy


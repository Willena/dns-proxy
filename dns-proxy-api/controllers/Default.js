'use strict';

var utils = require('../utils/writer.js');

module.exports.categoriesGET = function categoriesGET (req, res, next) {
  let cat  = req.dnsProxy.getRegisteredCategories()
  utils.writeJson(res,utils.respondWithCode(res, {
    len: cat.length,
    data : cat
  }))
};

module.exports.domainsDomainGET = function domainsDomainGET (req, res, next, domain) {
  let domains = req.dnsProxy.getRegisteredDomains()
  if (domains[domain]) {
    utils.writeJson(res, utils.respondWithCode(200, {
      domain: domain,
      categories: domains[domain]
    }))
  }
  else {
    utils.writeJson(res, utils.respondWithCode(404, {
      message: "domain not yet registered"
    }))
  }

};

module.exports.domainsGET = function domainsGET (req, res, next) {
  let domains = req.dnsProxy.getRegisteredDomains()
  utils.writeJson(res, utils.respondWithCode(200, {
    len: domains.length,
    data : domains
  }))
};

module.exports.rootGET = function rootGET (req, res, next) {
  utils.writeJson(res, utils.respondWithCode(200, {
    message : 'No information for the moment; comming soon'
  }))
};

module.exports.usersGET = function usersGET (req, res, next) {
  let users = Object.keys(req.dnsProxy.getUsers())
  utils.writeJson(res, utils.respondWithCode(200, {
    len: users.length,
    data : users
  }))
};

module.exports.usersUsernameGET = function usersUsernameGET (req, res, next, username) {
  let users = req.dnsProxy.getUsers()
  if (users[username]){
    utils.writeJson(res, utils.respondWithCode(200, users[username]))
  }
  else {
    utils.writeJson(res, utils.respondWithCode(404, {
      message: "User does not exist"
    }))
  }
};

module.exports.usersUsernamePUT = function usersUsernamePUT (req, res, next, body, username) {
  req.dnsProxy.updateUser(username, body)
  return module.exports.usersUsernameGET(req, res, next, username)
};

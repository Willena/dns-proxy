const packet = require('native-dns-packet')
const fs = require('fs')
const path = require('path')


module.exports.records = {
  '1': 'A',
  '2': 'NS',
  '5': 'CNAME',
  '6': 'SOA',
  '12': 'PTR',
  '15': 'MX',
  '16': 'TXT',
  '28': 'AAAA'
}

module.exports.listAnswer = function (response) {
  let results = []
  const res = packet.parse(response)
  res.answer.map(function (r) {
    results.push(r.address || r.data)
  })
  return results.join(', ') || 'nxdomain'
}

module.exports.createAnswer = function (query, answer) {
  query.header.qr = 1
  query.header.rd = 1
  query.header.ra = 1
  query.answer.push({ name: query.question[0].name, type: 1, class: 1, ttl: 30, address: answer })

  const buf = Buffer.alloc(4096)
  const wrt = packet.write(buf, query)
  const res = buf.slice(0, wrt)

  return res
}

const walkSync = (dir, filelist = []) => {
  fs.readdirSync(dir).forEach(file => {

    filelist = fs.statSync(path.join(dir, file)).isDirectory()
      ? walkSync(path.join(dir, file), filelist)
      : filelist.concat(path.join(dir, file));

  });
  return filelist;
}

module.exports.loadCategory = function (path, category, domains, stats) {

  walkSync(path).filter(path => path.endsWith("domains")).forEach(pathDomain => {

    var fileDomains = fs.readFileSync(pathDomain).toString().split("\n");

    if (!stats[category])
      stats[category] = 0
    stats[category] += fileDomains.length


    for(domain of fileDomains) {
      if (!domains[domain]){
        domains[domain] = []
      }
      domains[domain].push(category)
    }
    console.log("Loaded " + fileDomains.length + " new domain in database for category "+ category + " from " + pathDomain)
  })

  return domains;
}

module.exports.loadAll = function (sourced) {
  // {
  //   "youtbe.com" : ["chat", "video", "..."]
  // }
  domains = {}
  stats = {}
  categories = []

  fs.readdirSync(sourced, { withFileTypes: true })
    .filter(source => source.isDirectory())
    .map(source => source.name).forEach(source => {
      fs.readdirSync(sourced+"/"+source+"/", { withFileTypes: true })
        .filter(folderCategories => folderCategories.isDirectory())
        .map(folderCategories => folderCategories.name).forEach(category => {
          categories.push(category)
          domains = module.exports.loadCategory(sourced+"/"+source+"/"+category+"/", category, domains, stats);
      })
  })

  return {domains, stats, categories}
}


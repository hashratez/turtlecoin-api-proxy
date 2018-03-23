'use strict'

const compression = require('compression')
const express = require('express')
const helmet = require('helmet')
const inherits = require('util').inherits
const EventEmitter = require('events').EventEmitter
const util = require('util')
const Request = require('request-promise')
const bodyparser = require('body-parser')
const NodeCache = require('node-cache')
const targetBlockTime = 30
const backupSeeds = [
  { host: 'nyc.turtlenode.io', port: 11898 },
  { host: 'sfo.turtlenode.io', port: 11898 },
  { host: 'ams.turtlenode.io', port: 11898 },
  { host: 'sin.turtlenode.io', port: 11898 },
  { host: 'daemon.turtle.link', port: 11898 }
]

function Self (opts) {
  opts = opts || {}
  if (!(this instanceof Self)) return new Self(opts)
  this.cacheTimeout = opts.cacheTimeout || 30
  this.bindIp = opts.bindIp || '0.0.0.0'
  this.bindPort = opts.bindPort || 80
  this.seeds = opts.seeds || backupSeeds
  this.cache = new NodeCache({stdTTL: this.cacheTimeout, checkPeriod: (Math.round(this.cacheTimeout / 2))})
  this.app = express()
  this.app.use(bodyparser.json())
  this.app.use((req, res, next) => {
    res.header('X-Requested-With', '*')
    res.header('Access-Control-Allow-Origin', '*')
    res.header('Access-Control-Allow-Headers', 'Origin, X-Requested-With, Content-Type, Accept')
    res.header('Access-Control-Allow-Methods', 'POST, GET, OPTIONS')
    next()
  })
  this.app.use(helmet())
  this.app.use(compression())

  this.app.get('/', (request, response) => {
    return response.status(404).send()
  })

  this.app.get('/globalHeight', (request, response) => {
    this._getGlobalHeight().then((data) => {
      return response.json(data)
    }).catch((err) => {
      this.emit('error', err)
      return response.status(400).send()
    })
  })

  this.app.get('/:node/getinfo', (request, response) => {
    if (!request.params.node) return response.status(400).send()
    this._getInfo(request.params.node).then((data) => {
      return response.json(data)
    }).catch((err) => {
      this.emit('error', err)
      return response.status(400).send()
    })
  })

  this.app.get('/:node/:port/getinfo', (request, response) => {
    if (!request.params.node || !request.params.port) return response.status(400).send()
    this._getInfo(request.params.node, request.params.port).then((data) => {
      return response.json(data)
    }).catch((err) => {
      this.emit('error', err)
      return response.status(400).send()
    })
  })

  this.app.get('/getinfo', (request, response) => {
    this._getInfo().then((data) => {
      return response.json(data)
    }).catch((err) => {
      this.emit('error', err)
      return response.status(400).send()
    })
  })

  this.app.get('/:node/getheight', (request, response) => {
    if (!request.params.node) return response.status(400).send()
    this._getHeight(request.params.node).then((data) => {
      return response.json(data)
    }).catch((err) => {
      this.emit('error', err)
      return response.status(400).send()
    })
  })

  this.app.get('/:node/:port/getheight', (request, response) => {
    if (!request.params.node || !request.params.port) return response.status(400).send()
    this._getHeight(request.params.node, request.params.port).then((data) => {
      return response.json(data)
    }).catch((err) => {
      this.emit('error', err)
      return response.status(400).send()
    })
  })

  this.app.get('/getheight', (request, response) => {
    this._getHeight().then((data) => {
      return response.json(data)
    }).catch((err) => {
      this.emit('error', err)
      return response.status(400).send()
    })
  })

  this.app.get('/:node/gettransactions', (request, response) => {
    if (!request.params.node) return response.status(400).send()
    this._getTransactions(request.params.node).then((data) => {
      return response.json(data)
    }).catch((err) => {
      this.emit('error', err)
      return response.status(400).send()
    })
  })

  this.app.get('/:node/:port/gettransactions', (request, response) => {
    if (!request.params.node || !request.params.port) return response.status(400).send()
    this._getTransactions(request.params.node, request.params.port).then((data) => {
      return response.json(data)
    }).catch((err) => {
      this.emit('error', err)
      return response.status(400).send()
    })
  })

  this.app.get('/gettransactions', (request, response) => {
    this._getTransactions().then((data) => {
      return response.json(data)
    }).catch((err) => {
      this.emit('error', err)
      return response.status(400).send()
    })
  })

  this.app.get('/:node/json_rpc', (request, response) => {
    if (!request.params.node) return response.status(400).send()
    this._getJsonRpc(request.params.node).then((data) => {
      return response.json(data)
    }).catch((err) => {
      this.emit('error', err)
      return response.status(400).send()
    })
  })

  this.app.get('/:node/:port/json_rpc', (request, response) => {
    if (!request.params.node || !request.params.port) return response.status(400).send()
    this._getJsonRpc(request.params.node, request.params.port).then((data) => {
      return response.json(data)
    }).catch((err) => {
      this.emit('error', err)
      return response.status(400).send()
    })
  })

  this.app.get('/json_rpc', (request, response) => {
    this._getJsonRpc().then((data) => {
      return response.json(data)
    }).catch((err) => {
      this.emit('error', err)
      return response.status(400).send()
    })
  })

  this.app.post('/:node/json_rpc', (request, response) => {
    this._postJsonRpc(request.body, request.params.node).then((data) => {
      return response.json(data)
    }).catch((err) => {
      this.emit('error', err)
      return response.status(400).send()
    })
  })

  this.app.post('/:node/:port/json_rpc', (request, response) => {
    if (!request.params.node || !request.params.port) return response.status(400).send()
    this._postJsonRpc(request.body, request.params.node, request.params.port).then((data) => {
      return response.json(data)
    }).catch((err) => {
      this.emit('error', err)
      return response.status(400).send()
    })
  })

  this.app.post('/json_rpc', (request, response) => {
    this._postJsonRpc(request.body).then((data) => {
      return response.json(data)
    }).catch((err) => {
      this.emit('error', err)
      return response.status(400).send()
    })
  })
}
inherits(Self, EventEmitter)

Self.prototype.start = function () {
  this.app.listen(this.bindPort, this.bindIp, () => {
    this.emit('ready', this.bindIp, this.bindPort)
  })
}

Self.prototype.stop = function () {
  this.app.stop()
  this.emit('stop')
}

Self.prototype._set = function (node, port, method, data, ttl) {
  ttl = ttl || this.cacheTimeout
  var key = util.format('%s%s%s', node, port, method)
  this.cache.set(key, data, ttl)
}

Self.prototype._get = function (node, port, method) {
  var key = util.format('%s%s%s', node, port, method)
  var ret = this.cache.get(key)
  if (!ret) return false
  return ret
}

Self.prototype._getInfo = function (node, port) {
  node = node || 'public.turtlenode.io'
  port = port || 11898
  return new Promise((resolve, reject) => {
    var cache = this._get(node, port, 'getinfo')
    if (cache) {
      cache.cached = true
      return resolve(cache)
    }
    Request(util.format('http://%s:%s/getinfo', node, port)).then((data) => {
      data = JSON.parse(data)
      data.cached = false
      data.node = {
        host: node,
        port: port
      }
      data.globalHashRate = Math.round(data.difficulty / targetBlockTime)
      this._set(node, port, 'getinfo', data)
      return resolve(data)
    }).catch((err) => {
      return resolve({error: err, node: {host: node, port: port}})
    })
  })
}

Self.prototype._getHeight = function (node, port) {
  node = node || 'public.turtlenode.io'
  port = port || 11898
  return new Promise((resolve, reject) => {
    var cache = this._get(node, port, 'getheight')
    if (cache) {
      cache.cached = true
      return resolve(cache)
    }
    Request(util.format('http://%s:%s/getheight', node, port)).then((data) => {
      data = JSON.parse(data)
      data.cached = false
      data.node = {
        host: node,
        port: port
      }
      this._set(node, port, 'getheight', data)
      return resolve(data)
    }).catch((err) => {
      return resolve({error: err, node: {host: node, port: port}})
    })
  })
}

Self.prototype._getGlobalHeight = function () {
  return new Promise((resolve, reject) => {
    var cache = this._get('network', 'network', 'globalheight')
    if (cache) {
      cache.cached = true
      return resolve(cache)
    }
    var promises = []
    for (var i = 0; i < this.seeds.length; i++) {
      var node = this.seeds[i]
      promises.push(this._getHeight(node.host, node.port))
    }
    Promise.all(promises).then((results) => {
      var heights = []
      for (var j = 0; j < results.length; j++) {
        if (!results[j].height) continue
        var height = results[j].height
        heights.push(height)
      }
      var data = {
        max: maxValue(heights),
        min: minValue(heights),
        avg: avgValue(heights),
        cached: false
      }
      this._set('network', 'network', 'globalheight', data)
      return resolve(data)
    }).catch((err) => {
      return resolve({error: err})
    })
  })
}

Self.prototype._getTransactions = function (node, port) {
  node = node || 'public.turtlenode.io'
  port = port || 11898
  return new Promise((resolve, reject) => {
    var cache = this._get(node, port, 'gettransactions')
    if (cache) {
      cache.cached = true
      return resolve(cache)
    }
    Request(util.format('http://%s:%s/gettransactions', node, port)).then((data) => {
      data = JSON.parse(data)
      data.cached = false
      data.node = {
        host: node,
        port: port
      }
      this._set(node, port, 'gettransactions', data)
      return resolve(data)
    }).catch((err) => {
      return resolve({error: err, node: {host: node, port: port}})
    })
  })
}

Self.prototype._getJsonRpc = function (node, port) {
  node = node || 'public.turtlenode.io'
  port = port || 11898
  return new Promise((resolve, reject) => {
    var cache = this._get(node, port, 'getjsonrpc')
    if (cache) {
      cache.cached = true
      return resolve(cache)
    }
    Request(util.format('http://%s:%s/json_rpc', node, port)).then((data) => {
      data = JSON.parse(data)
      data.cached = false
      data.node = {
        host: node,
        port: port
      }
      this._set(node, port, 'getjsonrpc', data)
      return resolve(data)
    }).catch((err) => {
      return resolve({error: err, node: {host: node, port: port}})
    })
  })
}

Self.prototype._postJsonRpc = function (content, node, port) {
  node = node || 'public.turtlenode.io'
  port = port || 11898
  return new Promise((resolve, reject) => {
    var method = JSON.stringify(content)
    var cache = this._get(node, port, method)
    if (cache) {
      cache.cached = true
      return resolve(cache)
    }
    var req = {
      method: 'POST',
      uri: util.format('http://%s:%s/json_rpc', node, port),
      json: true,
      body: content
    }
    Request(req).then((data) => {
      data.cached = false
      data.node = {
        host: node,
        port: port
      }
      this._set(node, port, method, data)
      return resolve(data)
    }).catch((err) => {
      return resolve({error: err, node: {host: node, port: port}})
    })
  })
}

function maxValue (arr) {
  return arr.reduce((a, b) => {
    return Math.max(a, b)
  })
}

function minValue (arr) {
  return arr.reduce((a, b) => {
    return Math.min(a, b)
  })
}

function avgValue (arr) {
  var sum = 0
  for (var i = 0; i < arr.length; i++) {
    sum += arr[i]
  }
  return Math.round(sum / arr.length)
}

module.exports = Self

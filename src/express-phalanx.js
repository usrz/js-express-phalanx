'use strict';

var sample_options = {
  "phalanx": {
    "host": "127.0.0.1",
    "port": 8080,
    "count": 5,
    "restart": true,
    "delay": 1000
  },
  "logging": {
    "error_log": "error.log",
    "accesS_log": {
      "file": "access_log",
      "size": "50m",
      "keep": 10,
      "compress": false
    }
  },
  "settings": {
    "foo": "BAR!",
    "baz": 123
  },
  "locals": {
    "salute": "Hello, world!"
  }
};

//console.log(JSON.stringify(options, null, 2));

var EventEmitter = require('events').EventEmitter;
var logrotate = require('logrotate-stream');
var errorlog = require('express-errorlog');
var requestid = require('express-request-id');
var express = require('express');
var cluster = require('cluster');
var morgan = require('morgan');
var log = require('errorlog')('(PID=' + process.pid + ')');

var MORGAN_FORMAT = ':date[iso] [:remote-addr] ":method :url HTTP/:http-version" :status :res[content-length] :response-time - :id';
morgan.token('id', function(req) {
  return req.id;
})


var Phalanx = function(options, callback) {

  // Check for proper construction
  if (!(this instanceof Phalanx)) {
    return new Phalanx(options);
  }

  var host = "127.0.0.1";
  var port = 8080;
  var count = 4;
  var delay = 100;

  // Master process
  if (cluster.isMaster) {
    for (var i = 0; i < count; i++) {
      var child = cluster.fork();
      child.on('message', function(what) {
        console.log("cmessage", what);
      });
    }

    cluster.on('exit', function(worker, code, signal) {
      console.log('worker ' + worker.process.pid + ' died');
      setTimeout(function() {
        cluster.fork();
      }, delay)
    });

  } else {
    var app = express();
    var listen = app.listen;

    // something for callback...
    var listencontext = null;
    var listencallback = null;
    app.listen = function() {
      var last = arguments[arguments.length - 1];
      if (typeof(last) === 'function') {
        listencontext = this;
        listencallback = last;
      }
    }

    app.use(requestid());
    app.use(morgan(MORGAN_FORMAT));

    if (callback) callback(app);

    // 404 on defaults and error log!
    app.use(function(req, res, next) { next(404); });
    app.use(errorlog());

    // callback the listener
    listen.call(app, port, host, function() {
      if (listencallback) {
        listencallback.call(listencontext);
      }
      process.send("msg");
    });
  }
}


new Phalanx({}, function(app) {
  log("APPLICATION STARTING");
})

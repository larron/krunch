#!/usr/bin/env node
var krunch = require('./krunch'),
    winston = require('winston'),
    a = process.argv.slice(2),
    k = krunch();

    if(a.length <= 0){
        return winston.error('Pass the config homie');
    }

    k.load(a[0]);
    k.watch();

#!/usr/bin/env node
var krunch = require('./krunch'),
    winston = require('winston'),
    a = process.argv.slice(2);

    if(a.length <= 0){
        return winston.error('Pass the config homie');
    }

    krunch(a[0]);

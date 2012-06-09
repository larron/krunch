#!/usr/bin/env node
var krunch = require('./krunch'),
    fs = require('fs'),
    winston = require('winston');

try{
    var config = fs.readFileSync('./.krunch', 'utf8');
    try{
        var data = JSON.parse(config);
        data.rewatch = true;
        try{
            krunch(data);
        }
        catch(e){
            winston.error('Couldn\'t load krunch module');
        }
    }
    catch(e){
        winston.error('Couldn\'t parse .krunch json configuration');
    }
}
catch(e){
    winston.error('Missing .krunch configuration');
}

#!/usr/bin/env node
var util = require('util');
var krunch = require('./krunch'),
    argv = require('optimist').options({
        usage: 'krunch -o js/output.js js/file1.js js/file2.js',
        e:{
            alias: 'env',
            describe: 'Environment name'
        },
        w:{
            alias: 'watch',
            describe: 'Re-krunch on file change'
        },
        c:{
            alias: 'config',
            describe: 'Location of json config'
        },
        o:{
            alias: 'output',
            describe: 'File output location'
        },
        p:{
            alias: 'pretty',
            describe: 'Pretty html or javascript output'
        },
        m:{
            alias: 'minify',
            describe: 'Minify output'
        },
        u:{
            alias: 'uglify',
            describe: 'Uglify javascript output'
        },
        t:{
            alias: 'type',
            describe: 'Html, js or less (only useful for command line)'
        }
    })
    .check(function(a){
        if(!('config' in a) && a._.length <= 0) throw 'Config or files to krunch [required]';
        else if(('config' in a) && (a._.length > 0)) throw 'Please pass either a json config or files to krunch (not both)';
        else if((a._.length > 0) && !('output' in a)) throw 'Output [required]';
        else if(('output' in a) && ('config' in a)) throw 'Can not set output and use a json config file';
    })
    .argv,
    config = {};
    krunch()._init(argv);

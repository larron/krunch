// TODO: Decide if watching less import paths is worth the additional lag and compile time?
var fs = require('fs'),
    util = require('util'),
    less = require('less'),
    jsp = require('uglify-js').parser,
    pro = require('uglify-js').uglify,
    winston = require('winston');

    var k = function(options){
        var t = this;
        t.data = options || {};
        t.watch();
        winston.warn('Now Watching :)');
        return t;
    };

    k.prototype.watch = function(){
        var t = this;
        ['html', 'less', 'js'].forEach(function(type){
            if(type in t.data){
                t.data[type].forEach(function(job){
                    if(!('files' in job)){
                        winston.warn('Missing file configuration');
                    }
                    else if(!('output' in job)){
                        winston.warn('Missing output configuration');
                    }
                    else{
                        job.files.forEach(function(file){
                            try{
                                fs.watchFile(file, {persistent: true, interval: 0}, function(curr, prev){
                                    if(curr.mtime.getTime() !== prev.mtime.getTime()){
                                        t[type](job);
                                    }
                                });
                            }
                            catch(e){
                                winston.warn('Missing file located at: ' + file);
                            }
                        });
                    }
                });
            }
        });
    };

    k.prototype.concat_files = function(files){
        var f = '';
        files.forEach(function(file){
            try{
                f += fs.readFileSync(file, 'utf8');
            }
            catch(e){
                winston.warn('Missing file located at: ' + file);
            }
        });
        return f;
    };

    k.prototype.html = function(j){
        var t = this;
        var file_in = t.concat_files(j.files);
        var file_out = j.output;
        try{
            fs.writeFileSync(file_out, file_in, 'utf8');
            winston.info('HTML Compiler Output: '+file_out);
        }
        catch(e){
            return winston.warn(util.inspect(e));
        }
    };

    k.prototype.less = function(j){
        var t = this;
        var file_in = t.concat_files(j.files);
        var file_out = j.output;
        var options = {compress: true, paths: []};
        if(('import_paths' in j) && (j.import_paths || false)){
            options.paths = j.import_paths;
        }
        else{
            options.paths.push('.', './less', './css');
        }
        if(!(j.minify || false)){
            options.compress = false;
        }
        var parser = new(less.Parser)({
            paths: options.paths,
            filename: file_out
        });
        try{
            parser.parse(file_in, function (e, tree) {
                if(e){
                    return winston.warn(util.inspect(e));
                }
                try{
                    fs.writeFileSync(file_out, tree.toCSS({ compress: options.compress }), 'utf8');
                    winston.info('LESS Compiler Output: '+file_out);
                }
                catch(e){
                    return winston.warn(util.inspect(e));
                }

            });
        }
        catch(e){
            winston.warn(util.inspect(e));
        }
    };

    k.prototype.js = function(j){
        var t = this;
        var file_in = t.concat_files(j.files);
        var file_out = j.output;
        try{
            var src = jsp.parse(file_in); // get ast
            if(j.uglify || false){
                src = pro.ast_mangle(src); // uglify
            }
            if(j.minify || false){
                src = pro.ast_squeeze(src); // compress
            }
            src = pro.gen_code(src); // gen
            fs.writeFileSync(file_out, src, 'utf8');
            winston.info('JS Compiler Output: '+file_out);
        }
        catch(e){
            winston.warn(util.inspect(e));
        }
    };

    var krunch = function(options){
        return new k(options);
    }; 
    
    module.exports = krunch;

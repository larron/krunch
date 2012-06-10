// TODO: Decide if watching less import paths is worth the additional lag and compile time?
// TODO: Allow for development and production based configs/vars for static urls and other vars that may need to be set?
// DONE: Allow comments in json configuration
var fs = require('fs'),
    util = require('util'),
    path = require('path'),
    less = require('less'),
    extend = require('node.extend'),
    jsp = require('uglify-js').parser,
    pro = require('uglify-js').uglify,
    winston = require('winston');

    var k = function(config){
        var t = this;
            t.watching = false,
            t.config = null,
            t.config_file = null;
        if(config || false){
            t.configure(config);
            t.watch();
        }
        return t;
    };

    k.prototype.configure = function(config){
        var t = this,
            c = config;
        if(typeof c == 'string'){
            try{
                c = t.strip_json_comments(c);
                try{
                    c = JSON.parse(c);
                }
                catch(e){
                    return winston.error('Couldn\'t parse config');
                }
            }
            catch(e){
                return winston.error('Couldn\'t remove comments from config');
            }
        }
        c = extend(true, {
            default: {
                watch: true,
                rewatch: true,
                html: {
                    path: ''
                },
                js: {
                    path: '',
                    minify: true,
                    uglify: true
                },
                less: {
                    path: '',
                    import_paths: ['.', './less', './css'],
                    minify: true
                }
            },
            html: [],
            js: [],
            less: []
        }, c);
        ['html', 'js', 'less'].forEach(function(type){
            var jobs = [];
            c[type].forEach(function(job){
                if(!('files' in job)){
                    winston.warn('Missing files in part of the config');
                }
                else if(!('output' in job)){
                    winston.warn('Missing an output in part of the config');
                }
                else{
                    job = extend(true, job, c.default[type]);
                    var files = [];
                    job.files.forEach(function(file){
                        files.push(path.join(job.path, file));
                    });
                    job.files = files;
                    jobs.push(job);
                }
            });
            c[type] = jobs;
        });
        t.config = c;
        return t;
    };

    k.prototype.load = function(config_file){
        var t = this, c;
        try{
            c = fs.readFileSync(config_file, 'utf8');
            t.config_file = config_file;
            t.configure(c);
        }
        catch(e){
            return winston.error('Can\'t find ' + config_file);
        }
        return t;
    };

    k.prototype.watch = function(){
        var t = this;
        if(!(t.config || false)){
            return winston.error('Missing config');
        }
        else if(t.watching){
            winston.warn('Already watching, please unwatch first');
        }
        else{
            ['html', 'js', 'less'].forEach(function(type){
                t.config[type].forEach(function(job){
                    job.files.forEach(function(file){
                        try{
                            fs.watchFile(file, {persistent: true, interval: 0}, function(curr, prev){
                                if(curr.mtime.getTime() !== prev.mtime.getTime()){
                                    t[type](job);
                                }
                            });
                        }
                        catch(e){
                            winston.warn('Missing ' + file);
                        }
                    });
                });
            });
            if(t.config_file || false){
                try{
                    fs.watchFile(t.config_file, {persistent: true, interval: 0}, function(curr, prev){
                        if(curr.mtime.getTime() !== prev.mtime.getTime()){
                            t.rewatch();
                        }
                    });
                }
                catch(e){
                    winston.warn('Can\'t find ' + t.config_file);
                }
            }
            t.watching = true;
            winston.info('Now Watching :)');
        }
        return t;
    };

    k.prototype.unwatch = function(){
        var t = this;
        if(!(t.config || false)){
            return winston.error('Missing config');
        }
        else if(!(t.watching)){
            winston.warn('You can\'t stop watching until you watch first');
        }
        else{
            ['html', 'js', 'less'].forEach(function(type){
                t.config[type].forEach(function(job){
                    job.files.forEach(function(file){
                        try{
                            fs.unwatchFile(file);
                        }
                        catch(e){
                            return winston.error('Can\'t stop watching ' + file);
                        }
                    });
                });
            });
            if(t.config_file || false){
                try{
                    fs.unwatchFile(t.config_file);
                }
                catch(e){
                    return winston.error('Can\'t stop watching ' + t.config_file);
                }
            }
            t.watching = false;
            winston.info('Now Unwatching :(');
        }
        return t;
    };

    k.prototype.rewatch = function(){
        var t = this;
        if(t.config_file || false){
            t.unwatch();
            t.load(t.config_file);
            t.watch();
        }
        else{
            winston.warn('No configuration file to watch');
        }
        return t;
    };

    k.prototype.html = function(j){
        var t = this,
            file_in = t.concat_files(j.files),
            file_out = j.output;
        try{
            fs.writeFileSync(file_out, file_in, 'utf8');
            winston.info('HTML Compiler Output: '+file_out);
        }
        catch(e){
            return winston.error('Couldn\'t save '+file_out);
        }
    };

    k.prototype.js = function(j){
        var t = this,
            file_in = t.concat_files(j.files),
            file_out = j.output;
        try{
            var src = jsp.parse(file_in); // get ast
            if(j.uglify){
                src = pro.ast_mangle(src); // uglify
            }
            if(j.minify){
                src = pro.ast_squeeze(src); // compress
            }
            src = pro.gen_code(src); // gen
            try{
                fs.writeFileSync(file_out, src, 'utf8');
                winston.info('JS Compiler Output: '+file_out);
            }
            catch(e){
                return winston.error('Couldn\'t save '+file_out);
            }
        }
        catch(e){
            return winston.error(util.inspect(e));
        }
    };

    k.prototype.less = function(j){
        var t = this,
            file_in = t.concat_files(j.files),
            file_out = j.output;
        var parser = new(less.Parser)({
            paths: path.basename(j.import_paths),
            filename: file_out
        });
        try{
            parser.parse(file_in, function(e, tree){
                if(e){
                    return winston.error(util.inspect(e));
                }
                try{
                    fs.writeFileSync(file_out, tree.toCSS({ compress: j.minify }), 'utf8');
                    winston.info('LESS Compiler Output: '+file_out);
                }
                catch(e){
                    return winston.error(util.inspect(e));
                }
            });
        }
        catch(e){
            return winston.error(util.inspect(e));
        }
    };

    k.prototype.concat_files = function(files){
        var f = '';
        files.forEach(function(file){
            try{
                f += fs.readFileSync(file, 'utf8');
            }
            catch(e){
                winston.warn('Missing ' + file);
            }
        });
        return f;
    };

    /* 
     * Credit: 
     * Kyle Simpson
     * https://github.com/getify/JSON.minify/blob/master/minify.json.js
    */ 

	k.prototype.strip_json_comments = function(json){
		var tokenizer = /"|(\/\*)|(\*\/)|(\/\/)|\n|\r/g,
			in_string = false,
			in_multiline_comment = false,
			in_singleline_comment = false,
			tmp, tmp2, new_str = [], ns = 0, from = 0, lc, rc;
            tokenizer.lastIndex = 0;
		while(tmp = tokenizer.exec(json)){
			lc = RegExp.leftContext;
			rc = RegExp.rightContext;
			if(!in_multiline_comment && !in_singleline_comment){
				tmp2 = lc.substring(from);
				if(!in_string){
					tmp2 = tmp2.replace(/(\n|\r|\s)*/g,"");
				}
				new_str[ns++] = tmp2;
			}
			from = tokenizer.lastIndex;
			if(tmp[0] == "\"" && !in_multiline_comment && !in_singleline_comment){
				tmp2 = lc.match(/(\\)*$/);
				if(!in_string || !tmp2 || (tmp2[0].length % 2) == 0){	// start of string with ", or unescaped " character found to end string
					in_string = !in_string;
				}
				from--; // include " character in next catch
				rc = json.substring(from);
			}
			else if(tmp[0] == "/*" && !in_string && !in_multiline_comment && !in_singleline_comment){
				in_multiline_comment = true;
			}
			else if(tmp[0] == "*/" && !in_string && in_multiline_comment && !in_singleline_comment){
				in_multiline_comment = false;
			}
			else if(tmp[0] == "//" && !in_string && !in_multiline_comment && !in_singleline_comment){
				in_singleline_comment = true;
			}
			else if((tmp[0] == "\n" || tmp[0] == "\r") && !in_string && !in_multiline_comment && in_singleline_comment){
				in_singleline_comment = false;
			}
			else if(!in_multiline_comment && !in_singleline_comment && !(/\n|\r|\s/.test(tmp[0]))){
				new_str[ns++] = tmp[0];
			}
		}
		new_str[ns++] = rc;
		return new_str.join("");
	};

    var krunch = function(config){
        return new k(config);
    }; 
    
    module.exports = krunch;

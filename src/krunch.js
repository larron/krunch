// TODO: Find less import paths and watch them
// TODO: Add success and failure callbacks to each parser
// TODO: Allow use of * and walking of an entire directory (recursively) -- https://github.com/substack/node-findit
// TODO: beforeOutput simple var templating, IE: API_ENDPOINT (should support multiple environments)
var fs = require('fs'),
    util = require('util'),
    find = require('findit').find,
    path = require('path'),
    less = require('less'),
    extend = require('node.extend'),
    jsp = require('uglify-js').parser,
    pro = require('uglify-js').uglify,
    winston = require('winston');

    /**
    A simple build and watch tool for javascript, html and less/css.

    @class krunch
    @constructor
    @return {Instance} krunch
    */
    var krunch = function(){
        this._watching = !1,
        this._config = null,
        this._commandLineConfig = null,
        this._configFileLocation = null;
    };

    /**
    mocha krunch.

    @method init
    @param {String|Object} config Location of a json config file or config as json or a javascript object.
    @return {Instance} krunch
    */
    krunch.prototype.init = function(config){
        if(typeof config == 'string' && config[0] != '{') this.load(config);
        else this.configure(config);
        this.all();
        if(this._config.watch) this.watch();
        return this;
    };

    krunch.prototype._init = function(argv){
        var config = {default:{html:{},js:{},less:{}}};
        if('env' in argv) config.env = argv.env;
        if('watch' in argv) config.watch = argv.watch;
        if('pretty' in argv) config.default.html.pretty = argv.pretty, config.default.js.pretty = argv.pretty;
        if('minify' in argv) config.default.html.minify = argv.minify, config.default.js.minify = argv.minify, config.default.less.minify = argv.minify;
        if('uglify' in argv) config.default.js.uglify = argv.uglify;
        if(('output' in argv) && (argv._.length > 0)){
            var output = argv.output,
                files = argv._,
                type = ('type' in argv) ? argv.type : output.split('.').pop();
            if(type == 'css') type = 'less';
            if(type in {html: '', js: '', less: ''}) config[type].push({output: output, files: files});
        }
        this._commandLineConfig = config;
        this.init(('config' in argv) ? argv.config : this._commandLineConfig);
        return this;
    };

    /**
    Configures instance in preparation to krunch.

    @method configure
    @param {String|Object} config Configuration as json or a javascript object.
    @return {Instance} krunch
    */
    krunch.prototype.configure = function(config){
        var config = this._prepConfig(config);
            config = this._extendConfig(config);
        return this._config = config,
               this._jobs = this._buildJobs(config),
               this;
    };

    krunch.prototype._prepConfig = function(config){
        if(typeof config == 'string'){
            try{
                config = this._stripCommentsFromJSON(config);
                try{
                    config = JSON.parse(config);
                }
                catch(e){
                    winston.error('Couldn\'t parse config');
                }
            }
            catch(e){
                winston.error('Couldn\'t remove comments from config');
            }
        }
        return config;
    };

    krunch.prototype._extendConfig = function(config){
        return extend(true, {
            env: null,
            watch: !1,
            default:{
                html:{
                    file_path: ''
                },
                js:{
                    file_path: '',
                    minify: !!1,
                    uglify: !!1,
                    pretty: !1
                },
                less:{
                    file_path: '',
                    import_paths: ['.', './less', './css'],
                    minify: !!1
                }
            },
            html: [],
            js: [],
            less: []
        }, config, this._commandLineConfig);
    };

    krunch.prototype._buildJobs = function(config){
        var t = this,
            jobs = {html: [], js: [], less: []};
        ['html', 'js', 'less'].forEach(function(type){
            config[type].forEach(function(job){
                var defaults = config.default[type],
                    job = t._buildJob(job, defaults);
                if(job || !1) jobs[type].push(job);
            });
        });
        return jobs;
    };
    
    krunch.prototype._buildJob = function(job, defaults){
        if(!('files' in job)) winston.warn('Missing files in the config');
        else if(!('output' in job)) winston.warn('Missing an output in the config');
        else{
            job = extend(true, {}, defaults, job);
            job.files = this._prepJobFiles(job);
            return job;
        }
        return null;
    };

    krunch.prototype._prepJobFiles = function(job){
        var files = [];
        job.files.forEach(function(file){
            files.push(path.join(job.file_path, file));
        });
        return files;
    };

    /**
    Loads a json config file & configures krunch.

    @method load
    @param {String} location Location of json config file to load.
    @return {Instance} krunch
    */
    krunch.prototype.load = function(location){
        this._configFileLocation = location;
        var config = this._loadConfigFile(location);
        return this.configure(config),
               this;
    };

    krunch.prototype._loadConfigFile = function(location){
        var config;
        try{
            config = fs.readFileSync(location, 'utf8');
        }
        catch(e){
            winston.error('Can\'t find ' + location);
        }
        return config;
    };

    /**
    Krunch all configured jobs.

    @method all
    @return {Instance} krunch
    */
    krunch.prototype.all = function(){
        return this.allHtml()
                   .allJs()
                   .allLess(),
               this;
    };

    krunch.prototype._all = function(type){
        var t = this;
        this._jobs[type].forEach(function(job){
            t[type](job);
        });
        return this;
    };

    /**
    Krunch all jobs configured for html.

    @method allHtml
    @return {Instance} krunch
    */
    krunch.prototype.allHtml = function(){
        return this._all('html');
    };

    /**
    Krunch an html job.

    @method html
    @param {Object} job Config for html job.
    @return {Instance} krunch
    */
    krunch.prototype.html = function(job){
        var fileOut = job.output,
            fileIn = this.concatFiles(job.files);
        try{
            fs.writeFileSync(fileOut, fileIn, 'utf8');
            winston.info('HTML Compiler Output: '+fileOut);
        }
        catch(e){
            winston.error('Couldn\'t save '+fileOut);
        }
        return this;
    };

    /**
    Krunch all jobs configured for js.

    @method allJs
    @return {Instance} krunch
    */
    krunch.prototype.allJs = function(){
        return this._all('js');
    };

    /**
    Krunch a js job.

    @method js
    @param {Object} job Config for js job.
    @return {Instance} krunch
    */
    krunch.prototype.js = function(job){
        var fileOut = job.output,
            fileIn = this.concatFiles(job.files),
            options = {};
        try{
            var src = jsp.parse(fileIn); // get ast
            if(job.pretty) options.beautify = !!1;
            else{
                if(job.uglify) src = pro.ast_mangle(src); // uglify
                if(job.minify) src = pro.ast_squeeze(src); // compress
            }
            src = pro.gen_code(src, options); // gen
            try{
                fs.writeFileSync(fileOut, src, 'utf8');
                winston.info('JS Compiler Output: '+fileOut);
            }
            catch(e){
                winston.error('Couldn\'t save '+fileOut);
            }
        }
        catch(e){
            winston.error(util.inspect(e));
        }
        return this;
    };

    /**
    Krunch all jobs configured for less.

    @method allLess
    @return {Instance} krunch
    */
    krunch.prototype.allLess = function(){
        return this._all('less');
    };

    /**
    Krunch a less job.

    @method less
    @param {Object} job Config for less job.
    @return {Instance} krunch
    */
    krunch.prototype.less = function(job){
        var fileOut = job.output,
            fileIn = this.concatFiles(job.files),
            parser = new(less.Parser)({
                paths: job.import_paths,
                filename: path.basename(fileOut)
            });
        try{
            parser.parse(fileIn, function(e, tree){
                if(e) winston.error(util.inspect(e));
                try{
                    fs.writeFileSync(fileOut, tree.toCSS({ compress: job.minify }), 'utf8');
                    winston.info('LESS Compiler Output: '+fileOut);
                }
                catch(e){
                    winston.error(util.inspect(e));
                }
            });
        }
        catch(e){
            winston.error(util.inspect(e));
        }
        return this;
    };

    /**
    Re-krunch on file change.

    @method watch
    @return {Instance} krunch
    */
    krunch.prototype.watch = function(){
        var t = this;
        if(!(this._config || false)) winston.error('Missing config');
        else if(this._watching) winston.warn('Already watching, please unwatch first');
        else{
            ['html', 'js', 'less'].forEach(function(type){
                t._config[type].forEach(function(job){
                    var files = job.files.slice();
                    if(type == 'less'){
                        var re = new RegExp('@import\s["\'](.+)["\'];', 'g'),
                            output = t.concatFiles(files),
                            extraLessFilesToWatch = [],
                            match = null;
                        while((match = re.exec(output)) || !1){
                            //extraLessFilesToWatch.push(path.join(job.file_path, match[0]));
                            extraLessFilesToWatch.push(match);
                        }
                        //files.push.apply(files, extraLessFilesToWatch);
                        util.debug(util.inspect('\n\n'+extraLessFilesToWatch)+'\n\n');
                    }
                    files.forEach(function(file){
                        try{
                            fs.watchFile(file, {persistent: true, interval: 0}, function(curr, prev){
                                if(curr.mtime.getTime() !== prev.mtime.getTime()) t[type](job);
                            });
                        }
                        catch(e){
                            winston.warn('Missing ' + file);
                        }
                    });
                });
            });
            this._watchConfigFile();
            this._watching = !!1;
            winston.info('Now Watching :)');
        }
        return this;
    };

    krunch.prototype._watchConfigFile = function(){
        var t = this;
        if(this._configFileLocation || !1){
            try{
                fs.watchFile(this._configFileLocation, {persistent: true, interval: 0}, function(curr, prev){
                    if(curr.mtime.getTime() !== prev.mtime.getTime()) t.rewatch();
                });
            }
            catch(e){
                winston.warn('Can\'t find ' + this._configFileLocation);
            }
        }
        return this;
    };

    /**
    Stop krunching on file change.

    @method unwatch
    @return {Instance} krunch
    */
    krunch.prototype.unwatch = function(){
        var t = this;
        if(!(this._config || !1)) winston.error('Missing config');
        else if(!(this._watching)) winston.warn('You can\'t stop watching until you watch first');
        else{
            ['html', 'js', 'less'].forEach(function(type){
                t._config[type].forEach(function(job){
                    job.files.forEach(function(file){
                        try{
                            fs.unwatchFile(file);
                        }
                        catch(e){
                            winston.error('Can\'t stop watching ' + file);
                        }
                    });
                });
            });
            this._unwatchConfigFile();
            this._watching = !1;
            winston.info('Now Unwatching :(');
        }
        return this;
    };

    krunch.prototype._unwatchConfigFile = function(){
        if(this._configFileLocation || !1){
            try{
                fs.unwatchFile(this._configFileLocation);
            }
            catch(e){
                winston.error('Can\'t stop watching ' + this._configFileLocation);
            }
        }
        return this;
    };

    /**
    Restart the watch process.

    @method rewatch
    @return {Instance} krunch
    */
    krunch.prototype.rewatch = function(){
        return this.unwatch().init((this._configFileLocation || !1) ? this._configFileLocation : this._config).watch(),
               this;
    };

    /**
    Create a file from an array of file locations

    @method concatFiles
    @return {Instance} krunch
    */
    krunch.prototype.concatFiles = function(files){
        var output = '';
        files.forEach(function(file){
            try{
                output += fs.readFileSync(file, 'utf8');
            }
            catch(e){
                winston.warn('Missing ' + file);
            }
        });
        return output;
    };

    /* 
     * Credit: 
     * Kyle Simpson
     * https://github.com/getify/JSON.minify/blob/master/minify.json.js
    */ 

	krunch.prototype._stripCommentsFromJSON = function(json){
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
    
    module.exports = function(){
        return new krunch();
    };

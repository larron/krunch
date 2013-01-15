var fs = require('fs'),
    krunch = require('./../../src/krunch'),
    mocha = require('mocha'),
    should = require('should');

describe('krunch', function(){

    var k,
        testTmpDir = './tests/units/tmp',
        testJsonConfigLocation = testTmpDir + '/test.json',
        testHtmlLocationOne = testTmpDir + '/test1.html',
        testHtmlLocationTwo = testTmpDir + '/test2.html',
        testJsLocationOne = testTmpDir + '/test1.js',
        testJsLocationTwo = testTmpDir + '/test2.js',
        testLessLocationOne = testTmpDir + '/test1.less',
        testLessLocationTwo = testTmpDir + '/test2.less',
        testConfiguration = function(){
            k.should.have.property('_config');
            k.should.have.property('_jobs');
            var config = k._config,
                jobs = k._jobs;
            config.should.be.a('object').with.keys('env', 'watch', 'default', 'html', 'js', 'less');
            jobs.should.be.a('object').with.keys('html', 'js', 'less');
            jobs.html.should.lengthOf(1);
            jobs.js.should.lengthOf(1);
            jobs.less.should.lengthOf(1);
        },
        obj = {
            default:{
                html:{
                    file_path: testTmpDir
                },
                js:{
                    file_path: testTmpDir
                },
                less:{
                    file_path: testTmpDir,
                    import_paths: [testTmpDir]
                }
            },
            html:[
                {
                    files:[
                        'test1.html',
                        'test2.html'
                    ],
                    output: testTmpDir + '/output.html'
                }
            ],
            js:[
                {
                    files:[
                        'test1.js',
                        'test2.js'
                    ],
                    output: testTmpDir + '/output.js'
                }
            ],
            less:[
                {
                    files:[
                        'test1.less',
                        'test2.less'
                    ],
                    output: testTmpDir + '/test.css'
                }
            ]
        },
        json = JSON.stringify(obj);


    beforeEach(function(){
        k = krunch();
        fs.mkdirSync(testTmpDir);
        fs.writeFileSync(testJsonConfigLocation, json, 'utf8');
        fs.writeFileSync(testTmpDir+'/test1.html', '<div>test1</div>', 'utf8');
        fs.writeFileSync(testTmpDir+'/test2.html', '<div>test2</div>', 'utf8');
        fs.writeFileSync(testTmpDir+'/test1.js', 'var test1 = {};', 'utf8');
        fs.writeFileSync(testTmpDir+'/test2.js', 'var test2 = {};', 'utf8');
        fs.writeFileSync(testTmpDir+'/test1.less', '.test1{font-weight: bold;} @import "test2.less";', 'utf8');
        fs.writeFileSync(testTmpDir+'/test2.less', '.test2{font-weight: bold;}', 'utf8');
    });

    afterEach(function(){
        fs.unlinkSync(testJsonConfigLocation);
        fs.unlinkSync(testTmpDir+'/test1.html');
        fs.unlinkSync(testTmpDir+'/test2.html');
        fs.unlinkSync(testTmpDir+'/test1.js');
        fs.unlinkSync(testTmpDir+'/test2.js');
        fs.unlinkSync(testTmpDir+'/test1.less');
        fs.unlinkSync(testTmpDir+'/test2.less');
        try{fs.unlinkSync(obj.html[0].output);}catch(e){}
        try{fs.unlinkSync(obj.js[0].output);}catch(e){}
        try{fs.unlinkSync(obj.less[0].output);}catch(e){}
        fs.rmdirSync(testTmpDir);
    });

    describe('.init()', function(){

        it('can be initialized with a javascript object', function(){
            k.init(obj);
            testConfiguration();
        });

        it('can be initialized with json', function(){
            k.init(json);
            testConfiguration();
        });

        it('can be initialized with a json config file location', function(){
            k.init(testJsonConfigLocation);
            testConfiguration();
        });

    });

    describe('.configure()', function(){

        it('can be configured with a javascript object', function(){
            k.configure(obj);
            testConfiguration();
        });

        it('can be configured with json', function(){
            k.configure(json);
            testConfiguration();
        });

    });

    describe('.load()', function(){

        it('should load a json config file and configure krunch', function(){
            k.load(testJsonConfigLocation);
            testConfiguration();
        });

    });

    describe.skip('.watch()', function(){

        it('should re-krunch on file change', function(done){
            k.configure(obj).watch();
            // remove html file output
            try{fs.unlinkSync(obj.html[0].output);}catch(e){}
            // lets edit html and see if output is re-krunched
            fs.writeFileSync(testTmpDir+'/test1.html', '<div>test1</div>', 'utf8');
            fs.existsSync(obj.html[0].output).should.be.true;
        });

    });

});

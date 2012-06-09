Krunch
======

Krunch is a NodeJS module entended to help a developer quickly organize a static codebase.

Krunch will concat, minify, and uglify LESS, JS and HTML files upon file change while you build whatever it is that you're developing.

Krunch is not suited for a production environment and works best for static websites, prototyping or full Javascript based applications.

Krunch is built for speed, and watches only files that you specify in your configuration.

As of now Krunch will not watch entire directories or LESS import paths.

Installation
------------

via npm: npm install krunch

via git: git clone https://github.com/larron/krunch.git ./node_modules/krunch

Configuration
-------------

Krunch will look for a .krunch file in your projects root directory containing a JSON configuration of the files you'd like to krunch.

### Example JSON Configuration

```json
{
    "less": [
        {
            "files": [
                "./less/reset.less",
                "./less/site.less"
            ],
            "output": "./css/site.css"
        },
        {
            "files": [
                "./less/admin.less"
            ],
            "output": "./css/admin.css"
        }
    ],
    "js": [
        {
            "files": [
                "./js/shared/jquery.js",
                "./js/shared/jhomie.js",
                "./js/jscript.js"
            ],
            "uglify": false,
            "output": "./js/site.js"
        }
    ],
    "html": [
        {
            "files": [
                "./html/layout.html",
                "./html/about.html",
                "./html/sitemap.html",
                "./html/services.html",
                "./html/tos.html",
                "./html/contact.html"
            ],
            "output": "./html/site.html"
        }
    ]
}
```

Now you can include one css and js file in your html vs including all of them, organize your files, minify, uglify, and limit your page requests.

### Options and Defaults

File and output locations are required for each krunch job.

Minification and JS Uglification are true by default, you can turn either of them off on a per job basis by adding the flags: { compress: false, minify: false }

For LESS files, import paths may be needed to locate imported less files. By default krunch will search your root directory, ./css and ./less directories. You can overwrite on a per job bases like so: { import_paths: ['.', '/some_other_dir'] }

### Krunch can be called through node.

I'm not sure what other use case would require you to call Krunch through node, however it's possible as our cli.js does exactly that.

```javascript
var krunch = require('krunch');
krunch(your_json_configuration);
```

Run Krunch
----------

node ./node_modules/krunch/lib/cli.js

Krunch
======
Krunch is a NodeJS module entended to help a developer quickly organize a static codebase.  
Krunch will concat, minify, and uglify LESS, JS and HTML files upon file change while you build whatever it is that you're developing.  
Krunch is not suited for a production environment and works best for static websites, prototyping or full Javascript based applications.  
Krunch is built for speed and watches only files that you specify in your configuration.  
As of now Krunch will not watch entire directories or LESS import paths.  

Installation
------------
npm install krunch -g

Configuration
-------------
Krunch requires a json configuration. Set defaults and overwrite them where necessary. Our program defaults are in the example below.  
(Javascript syle comments are supported in your json config)

### Example JSON Configuration

```json
{
    "default": {
        "html": {
            "path": ""
        },
        "js": {
            "path": "",
            "minify": true,
            "uglify": true
        },
        "less": {
            "path": "",
            "import_paths": [".", "./less", "./css"],
            "minify": true
        }
    },
    "html": [
        {
            "files": [
                "html/layout.html",
                "html/about.html",
                "html/sitemap.html",
                "html/services.html",
                "html/tos.html",
                "html/contact.html"
            ],
            "output": "html/site.html"
        }
    ],
    "js": [
        {
            "files": [
                "js/shared/jquery.js",
                "js/shared/jhomie.js",
                "js/jscript.js"
            ],
            "uglify": false,
            "output": "/js/site.js"
        }
    ],
    "less": [
        {
            "path": "somewhere_else",
            "files": [
                "less/reset.less",
                "less/site.less"
            ],
            "output": "css/site.css"
        },
        {
            "files": [
                "less/admin.less"
            ],
            "output": "css/admin.css"
        }
    ]
}
```

Now you can include one css/js file in your html vs including all of them, organize files, minify, uglify, and limit your page requests.

### Options and Defaults
Krunch will re-watch your files upon modification to your configuration unless it has been invoked dynmaically through node with no config file.

Files and output locations are required for each krunch job.

Paths found in the default are only prepended to each array of input files. Please specify a direct output file with the full path from root of your project.

If your LESS files use import functionality you will need to specify import paths if your imported less files can not be found by default in the root, /css or /less directories.

### Krunch can be called through node.

```javascript
var krunch = require('krunch');
krunch(your_json_configuration_or_path_to_config_file);
```

Run Krunch
----------
cd root_of_project  
krunch path_to_config_file

var fs = require('fs'),
    async = require('async'),
    restify = require('restify'),
    mongoose = require('mongoose'),
    yaml = require('js-yaml'),
    knox = require('knox'),
    github = require('octonode'),
    client = github.client(),
    models = require('./models'),
    configYaml,
    confArray;

module.exports = function(configFile, environment, restifyParam, mongooseParam){

    if(configFile){
        configYaml = fs.readFileSync(configFile, 'utf8');
    }else{
        configYaml = fs.readFileSync('./config.yml', 'utf8');
    }

    if(environment){
        process.env = environment;
    }

    if(restifyParam){
        restify = restifyParam;
    }

    if(mongooseParam){
        mongoose = mongooseParam;
    }

    confArray = yaml.load(configYaml);

    if(process.env.VCAP_SERVICES){
        console.log('USING MONGO FROM VCAP_SERVICES');
        try{
            var env = JSON.parse(process.env.VCAP_SERVICES);
        }catch(err){
            console.log('Error parsing VCAP_SERVICES');
            console.log(err);
        }
    }else{
        var env = {};
        env['mongodb-1.8'] = null;
    }

    async.forEach(confArray, function(conf, callback){
        async.parallel([
            function(callback){
                configureGitHub(conf, callback);
            },
            function(callback){
                configureSearchify(conf, callback);
            },
            function(callback){
                configureDatabase(conf, callback);
            },
            function(callback){
                configureS3(conf, callback);
            },
            function(callback){
                configureBlog(conf, callback);
            },
            function(callback){
                if(!conf.rootPath){
                    conf.rootPath = "/";
                }
                callback(null);
            }],
            function(err, results){
                if(results.length < 0){
                    async.forEach(results, function(item, callback){
                        if(item !== ''){
                            console.log('config errors: ' + item);
                        }
                        callback(null);
                    },callback);
                }else{
                    callback(null);
                }
        });
    });

    function configureGitHub(conf, callback){
        client = github.client();
        if(!conf.github.credentials){
            conf.github.credentials = {};
        }
        if(!conf.github.credentials.username){
            conf.github.credentials.username = conf.github.user;
        }
        if(conf.github.credentials.password_env_var){
            conf.github.credentials.password = process.env[conf.github.credentials.password_env_var];
        }else if(process.env.GITHUB_PASSWORD){
            conf.github.credentials.password = process.env.GITHUB_PASSWORD;
        }
        if(conf.github.credentials.password){
            client = github.client({
                username: conf.github.credentials.username,
                password: conf.github.credentials.password
            });
        }

        conf.github.repoName = conf.github.user + '/' + conf.github.repo;
        conf.github.ghrepo = client.repo(conf.github.repoName);
        callback(null);
    };

    function configureSearchify(conf, callback){
        var errs = [];
        if(!conf.searchify){
            conf.searchify = {};
        }

        if(conf.searchify.private_api_env_var){
            conf.searchify.url = process.env[conf.searchify.private_api_env_var];
        }else if(process.env.SEARCHIFY_PRIVATE_API_URL){
            conf.searchify.url = process.env.SEARCHIFY_PRIVATE_API_URL;
        }else{
            conf.searchify.url = null;
        }

        if(conf.searchify.url){
            conf.searchify.client = restify.createJsonClient({
                url: conf.searchify.url
            });
        }else{
            conf.searchify.client = null;
            errs.push('Missing searchify credentials.');
        }

        if(!conf.searchify.index){
            conf.searchify.index = conf.github.user + '-' + conf.github.repo;
        }

        if(conf.searchify.client){
            conf.searchify.client.get('/v1/indexes/' + conf.searchify.index, function(err, req, res, obj){
                if(res.statusCode !== 200){
                    conf.searchify.client = null;
                    errs.push('Searchify index does not exist: ' + conf.searchify.index);
                }
                callback(null, errs);
            });
        }else{
            callback(null, errs);
        }
    };

    function configureDatabase(conf, callback){
        conf.mongoConnectionURI = 'localhost';
        if(!conf.db){
            conf.db = conf.github.user + '-' + conf.github.repo;
        }
        if(env['mongodb-1.8']){
            async.forEach(env['mongodb-1.8'], function(item, callback2){
                if(item.name === conf.db){
                    console.log('*** NOT using localhost,', item.credentials.url);
                    conf.mongoConnectionURI = item.credentials.url;
                }
                callback2(null);
            },
            function(err){
                if(err){
                    callback(err);
                }else{
                    if(conf.mongoConnectionURI === 'localhost'){
                        conf.docsColl = mongoose.createConnection('localhost', conf.db);
                    }else{
                        conf.docsColl = mongoose.createConnection(conf.mongoConnectionURI);
                    }
                    conf.docsColl.on('error', console.error.bind(console, 'mongo connection error:'));
                    conf.Doc = conf.docsColl.model('document', models.docSchema);
                    conf.Menu = conf.docsColl.model('menu', models.menuSchema);
                    if(conf.blog){
                        conf.Blog = conf.docsColl.model('blog', models.blogSchema);
                    }
                    callback(null);
                }
            });
        }else{
            conf.docsColl = mongoose.createConnection('localhost', conf.db);
            conf.docsColl.on('error', console.error.bind(console, 'mongo connection error:'));
            conf.Doc = conf.docsColl.model('document', models.docSchema);
            conf.Menu = conf.docsColl.model('menu', models.menuSchema);
            if(conf.blog){
                conf.Blog = conf.docsColl.model('blog', models.blogSchema);
            }
            callback(null);
        }
    };

    function configureS3(conf, callback){
        if(!conf.assets){
            callback(null);
        }else{
            if(typeof(conf.assets) === "string"){
                conf.assets = { 
                    path: conf.assets
                };
            }
            if(!conf.assets.S3){
                conf.assets.S3 = {};
            }
            conf.assets.S3.key = null;
            conf.assets.S3.secret = null;

            if(conf.assets.S3.access_key_env_var && process.env[conf.assets.S3.access_key_env_var]){
                conf.assets.S3.key = process.env[conf.assets.S3.access_key_env_var];
            }else if(process.env.S3_ACCESS_KEY){
                conf.assets.S3.key = process.env.S3_ACCESS_KEY;
            }

            if(conf.assets.S3.secret_env_var && process.env[conf.assets.S3.secret_env_var]){
                conf.assets.S3.secret = process.env[conf.assets.S3.secret_env_var];
            }else if(process.env.S3_SECRET){
                conf.assets.S3.secret = process.env.S3_SECRET;
            }

            if(!conf.assets.S3.bucket){
                conf.assets.S3.bucket = conf.github.user + '-' + conf.github.repo;
            }

            if(conf.assets.S3.key && conf.assets.S3.secret){
                conf.assets.S3.client = knox.createClient({
                    key: conf.assets.S3.key,
                    secret: conf.assets.S3.secret,
                    bucket: conf.assets.S3.bucket
                });
            }else{
                conf.assets.S3 = null;
                console.log('Missing S3 credentials');
            }
            callback(null);
        }
    };

    function configureBlog(conf, callback){
        if(typeof(conf.blog) === "string"){
            conf.blog = { 
                path: conf.blog
            };
        }
        callback(null);
    };

    function getConf(user, repoName, callback){
        var currentConf = null;
        async.forEach(confArray, function(conf, forCallback){
            if(conf.github.user === user && conf.github.repo === repoName){
                currentConf = conf;
            }
            forCallback(null);
        },
        function(err){
            if(err){
                callback(err);
            }else{
                if(currentConf === null){
                    callback("Error: github username and repo name do not match any conf in config.json");
                }else{
                    callback(null, currentConf);
                }
            }
        });
    };

    return {
        getConf: getConf,
        configureGitHub: configureGitHub,
        configureSearchify: configureSearchify,
        configureDatabase: configureDatabase,
        configureS3: configureS3,
        configureBlog: configureBlog
    }
};

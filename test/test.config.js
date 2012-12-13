var fakeEnvironment = {
        GITHUB_PASSWORD: 'Something',
        SEARCHIFY_PRIVATE_API_URL: 'Something2',
        FAKE_SEARCHIFY_ENV_VAR: 'Something3'
    },
    fakeEnvironment2 = {
        GITHUB_PASSWORD: 'Something'
    },
    fakeRestify = {
        createJsonClient: function(trash){
            return {
                get: function(dummy, callback){
                    var response = {
                        statusCode: 200
                    };
                    callback(null, null, response, null);
                }
            }
        }
    },
    fakeMongoose = {
        createConnection: function(url, db){
            return {
                on: function(dummy1, dummy2){
                    return;
                },
                model: function(modelName, schema){
                    return modelName;
                }
            }
        }
    },
    fakeKnox = {
        createClient: function(obj){
            return obj;
        }
    },
    github = require('octonode'),
    client = github.client({
        username: 'joebadmo',
        password: 'Something'
    }),
    repo = client.repo('joebadmo/patchwork'),
    fakeConf = {
    github: {
        user: 'joebadmo',
        repo: 'patchwork'
    },
    db: 'explicitDB'
};

// Libarary to test
var config = require('../lib/config')('./test/test-data/test.config.yml', fakeEnvironment, fakeRestify, fakeMongoose);

exports['test getConf'] = function(test){
    test.expect(5);
    config.getConf('joebadmo', 'patchwork', function(err, conf){
        test.equal(conf.github.user, 'joebadmo');
        test.equal(conf.github.repo, 'patchwork');
        test.equal(conf.blog.path, 'blog');
        test.equal(conf.assets.path, 'assets');

        config.getConf('fake', 'shouldFail', function(err, conf){
            test.equal(err, "Error: github username and repo name do not match any conf in config.json");
            test.done();
        });
    });
};

exports['test configureGitHub'] = function (test) {
    config.configureGitHub(fakeConf, function(err){
        test.expect(6);
        test.equal(fakeConf.github.credentials.username, 'joebadmo');
        test.equal(fakeConf.github.credentials.password, 'Something');
        test.equal(fakeConf.github.ghrepo.name, client.repo('joebadmo/patchwork').name);
        test.equal(fakeConf.github.ghrepo.repo, client.repo('joebadmo/patchwork').repo);
        test.equal(fakeConf.github.ghrepo.credentials, client.repo('joebadmo/patchwork').credentials);
        test.equal(fakeConf.github.repoName, 'joebadmo/patchwork');
        test.done();
    });
};

exports['test configureSearchify'] = {
    'no searchify': function(test){
        config = require('../lib/config')('./test/test-data/test.config.yml', fakeEnvironment2, fakeRestify);
        config.configureSearchify(fakeConf, function(err, result){
            test.equal(result[0], 'Missing searchify credentials.');
            test.equal(fakeConf.searchify.url, null);
            test.equal(fakeConf.searchify.index, 'joebadmo-patchwork');
            test.done();
        });
    },
    'default env var': function(test){
        config = require('../lib/config')('./test/test-data/test.config.yml', fakeEnvironment, fakeRestify);
        config.configureSearchify(fakeConf, function(err, result){
            test.equal(fakeConf.searchify.url, 'Something2');
            test.equal(fakeConf.searchify.index, 'joebadmo-patchwork');
            test.done();
        });
    },
    'explicit env var': function(test){
        fakeConf.searchify.private_api_env_var = 'FAKE_SEARCHIFY_ENV_VAR';
        config.configureSearchify(fakeConf, function(err, result){
            test.equal(fakeConf.searchify.url, 'Something3');
            test.equal(fakeConf.searchify.index, 'joebadmo-patchwork');
            test.done();
        });
    }, 
    'explicit index': function(test){
        fakeConf.searchify.index = 'fakeIndex';
        config.configureSearchify(fakeConf, function(err, result){
            test.equal(fakeConf.searchify.index, 'fakeIndex');
            test.done();
        });
    }
};

exports['test configureDatabase'] = {
    'explicit db name': function(test){
        config.configureDatabase(fakeConf, function(err){
            test.equal(fakeConf.db, 'explicitDB');
            test.done();
        });
    },
    'no db in conf': function(test){
        fakeConf.db = null;
        config.configureDatabase(fakeConf, function(err){
            test.equal(fakeConf.db, 'joebadmo-patchwork');
            test.done();
        });
    },
    'local dev env': function(test){
        config.configureDatabase(fakeConf, function(err){
            test.equal(fakeConf.Doc, 'document');
            test.equal(fakeConf.Menu, 'menu');
            test.done();
        });
    },
    'no blog': function(test){
        config.configureDatabase(fakeConf, function(err){
            test.equal(fakeConf.Blog, null);
            test.done();
        });
    },
    'blog': function(test){
        fakeConf.blog = 'fakeBlog';
        config.configureDatabase(fakeConf, function(err){
            test.equal(fakeConf.Blog, 'blog');
            test.done();
        });
    },
    'no matching db in VCAP_SERVICES': function(test){
        var vcap = JSON.stringify({
            'mongodb-1.8': [
                {
                    name: 'fakeDB',
                    credentials: {
                        url: null
                    }
                },
                {
                    name: 'joebadmo-patchwork',
                    credentials: {
                        url: 'testURL'
                    }
                }
            ]
        });

        fakeEnvironment.VCAP_SERVICES = vcap;
        fakeConf.db = 'no-match';
        config = require('../lib/config')('./test/test-data/test.config.yml', fakeEnvironment, fakeRestify, fakeMongoose);
        config.configureDatabase(fakeConf, function(err){
            test.equal(fakeConf.mongoConnectionURI, 'localhost');
            test.equal(fakeConf.Doc, 'document');
            test.equal(fakeConf.Menu, 'menu');
            test.done();
        });
    },
    'matching db in VCAP_SERVICES': function(test){
        fakeConf.db = null;
        config.configureDatabase(fakeConf, function(err){
            test.equal(fakeConf.mongoConnectionURI, 'testURL');
            test.equal(fakeConf.Doc, 'document');
            test.equal(fakeConf.Menu, 'menu');
            test.done();
        });
    }
};

exports['test configureS3'] = {
    'no assets': function(test){
        config.configureS3(fakeConf, function(err){
            test.equal(fakeConf.assets, null);
            test.done();
        });
    },
    'just assets path': function(test){
        fakeConf.assets = 'fakeAssets';
        config.configureS3(fakeConf, function(err){
            test.equal(fakeConf.assets.path, 'fakeAssets');
            test.equal(fakeConf.assets.S3, null);
            test.done();
        });
    },
    'no key and secret': function(test){
        config.configureS3(fakeConf, function(err){
            test.equal(fakeConf.assets.S3, null);
            test.done();
        });
    },
    'default key and secret': function(test){
        fakeEnvironment.S3_ACCESS_KEY = 'fakeKey';
        fakeEnvironment.S3_SECRET = 'fakeSecret';
        config = require('../lib/config')('./test/test-data/test.config.yml', fakeEnvironment, fakeRestify, fakeMongoose, fakeKnox);
        config.configureS3(fakeConf, function(err){
            test.equal(fakeConf.assets.S3.key, 'fakeKey');
            test.equal(fakeConf.assets.S3.secret, 'fakeSecret');
            test.equal(fakeConf.assets.S3.client.key, 'fakeKey');
            test.equal(fakeConf.assets.S3.client.secret, 'fakeSecret');
            test.equal(fakeConf.assets.S3.client.bucket, 'joebadmo-patchwork');
            test.done();
        });
    },
    'explicit key and secret': function(test){
        fakeEnvironment.CUSTOM_S3_ACCESS_KEY = 'customFakeKey';
        fakeEnvironment.CUSTOM_S3_SECRET = 'customFakeSecret';
        fakeConf.assets.S3.access_key_env_var = 'CUSTOM_S3_ACCESS_KEY';
        fakeConf.assets.S3.secret_env_var = 'CUSTOM_S3_SECRET';
        config = require('../lib/config')('./test/test-data/test.config.yml', fakeEnvironment, fakeRestify, fakeMongoose, fakeKnox);
        config.configureS3(fakeConf, function(err){
            test.equal(fakeConf.assets.S3.key, 'customFakeKey');
            test.equal(fakeConf.assets.S3.secret, 'customFakeSecret');
            test.equal(fakeConf.assets.S3.client.key, 'customFakeKey');
            test.equal(fakeConf.assets.S3.client.secret, 'customFakeSecret');
            test.equal(fakeConf.assets.S3.client.bucket, 'joebadmo-patchwork');
            test.done();
        });
    },
    'default bucket': function(test){
        config.configureS3(fakeConf, function(err){
            test.equal(fakeConf.assets.S3.bucket, 'joebadmo-patchwork');
            test.equal(fakeConf.assets.S3.client.bucket, 'joebadmo-patchwork');
            test.done();
        });
    },
    'explicit bucket': function(test){
        fakeConf.assets.S3.bucket = 'fakebucket';
        config.configureS3(fakeConf, function(err){
            test.equal(fakeConf.assets.S3.bucket, 'fakebucket');
            test.equal(fakeConf.assets.S3.client.bucket, 'fakebucket');
            test.done();
        });
    }
};

exports['test configureBlog'] = {
    'blog': function(test){
        fakeConf.blog = 'fakeBlogPath';
        config.configureBlog(fakeConf, function(err){
            test.equal(fakeConf.blog.path, 'fakeBlogPath');
            test.done();
        });
    },
    'no blog': function(test){
        fakeConf.blog = null;
        config.configureBlog(fakeConf, function(err){
            test.equal(fakeConf.blog, null);
            test.done();
        });
    }
};

var _s = require('underscore.string');

function indexToSearch(fileObj, conf, callback){
    checkSearchConf(conf, function(err){
        if(err){
            console.log(err);
            callback(null);
        }else{
            conf.searchify.client.put('/v1/indexes/' + conf.searchify.index + '/docs', {docid: fileObj.docid, fields: {text: _s.stripTags(fileObj.body), title: fileObj.title, path: fileObj.path}}, function(err, req, res, obj){
                if(err){
                    console.log(err);
                }else{
                    console.log("Indexed to searchify: " + fileObj.path);
                }
                callback(null);
            });
        }
    });
};

function deindexFromSearch(path, conf, callback){
    checkSearchConf(conf, function(err){
        if(err){
            console.log(err);
            callback(null);
        }else{
            var delPath = '/v1/indexes/' + conf.searchify.index + '/docs/?' + 'docid=' + path.replace('.markdown','').replace('.md','').replace(/\//g,'-');
            conf.searchify.client.del(delPath, function(err, req, res){
                if(err){
                    console.log(err);
                }else{
                    console.log('deindexed from searchify: ' + path);
                }
                callback(null);
            });
        }
    });
};

function checkSearchConf(conf, callback){
    if(!conf.searchify.url){
        callback('No searchify url, skipping search index');
    }else if(!conf.searchify.client){
        callback('No searchify client, skipping search index');
    }else{
        callback(null);
    }
};

exports.indexToSearch = indexToSearch;
exports.deindexFromSearch = deindexFromSearch;

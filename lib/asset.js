var async = require('async'),
    https = require('https'),
    fs = require('fs');

function downloadFile(path, conf, callback){
    var options = {
        host: 'raw.github.com',
        port: 443,
        path: '/' + conf.github.repoName + '/master/' + path
    },
        request = https.get(options, function(res){
            var imagedata = '';
            res.setEncoding('binary');
            res.on('data', function(chunk){
                imagedata += chunk;
        });

        res.on('end', function(){
            fs.writeFile('./' + path, imagedata, 'binary', function(err){
                if(err){
                    console.log(err);
                }
                callback(null);
            });
        });
    });
};

function uploadToS3(filePath, conf, callback){
    conf.assets.S3.client.putFile('./' + filePath, filePath, {'x-amz-acl': 'public-read'}, function(err, res){
        if(err){
            console.log(err);
        }
        callback(null);
    });
};

function updateAsset(path, conf, callback){
    downloadFile(path, conf, function(err){
        if(err){
            callback(err);
        }else{
            uploadToS3(path, conf, function(err){
                if(err){
                    console.log(err);
                }
                callback(null);
            });
        }
    });
};

function updateAssetDir(path, conf, callback){
    var pathArr = path.split('/'),
        pathStr = '.';

    async.series([
            function(seriesCallback){
                async.forEachSeries(pathArr, function(item, forCallback){
                    pathStr += '/' + item;
                    forCallback(null);
                }, 
                function(err){
                    if(err){
                        console.log(err);
                    }else{
                        fs.stat(pathStr, function(err, stats){
                            // errno 2 -- ENOENT, No such file or directory 
                            if(err){
                                if(err.errno == 2 || 34){
                                    fs.mkdir(pathStr, function(err){
                                        if(err){
                                            console.log('mkdir error');
                                            console.log(err);
                                            seriesCallback(err);
                                        }else{
                                            seriesCallback(null);
                                        }
                                    });
                                }else{
                                    seriesCallback(err);
                                }
                            }else{
                                seriesCallback(null);
                            }
                        });
                    }
                })
            },
            function(seriesCallback){
                conf.github.ghrepo.contents(path, function(err, data){
                    async.forEach(data, function(item, forCallback){
                        if(item.type === 'file'){
                            updateAsset(item.path, conf, forCallback);
                        }else if(item.type === 'dir'){
                            updateAssetDir(item.path, conf, forCallback);
                        }else{
                            console.log('unknown file type: ' + item.path);
                        }
                    }, 
                    function(err){
                        if(err){
                            console.log(err);
                        }
                        seriesCallback(null)
                    });
                });
            }], callback);

};

function removeAsset(path, conf, callback){
    conf.assets.S3.client.deleteFile(path, function(err, res){
        if(err){
            callback(err);
        }else{
            console.log("Deleting " + path + " from S3: " + res.statusCode);
            callback(null);
        }
    });
};

exports.updateAssetDir = updateAssetDir;
exports.downloadFile = downloadFile;
exports.uploadToS3 = uploadToS3;
exports.updateAsset = updateAsset;
exports.removeAsset = removeAsset;

var async = require('async'),
    https = require('https'),
    fs = require('fs');

module.exports = function(fsParam, httpsParam, assetsParam){
    if(fsParam){
        fs = fsParam;
    }

    if(httpsParam){
        https = httpsParam;
    }

    if(assetsParam){
        getAssetList = assetsParam.getAssetList;
        updateAsset = assetsParam.updateAsset;
    }

    function handleAssets(conf, callback){
        if(conf.assets){
            getAssetList(conf.assets.path, conf, function(err, assetArr){
                if(err){
                    callback(err);
                }else{
                    async.forEachSeries(assetArr, 
                        function(item, forCallback){
                            updateAsset(item.path, conf, forCallback);
                        }, 
                        function(err){
                            console.log('Assets updated to S3');
                            callback(null);
                    });
                }
            });
        }else{
            console.log('No assets directory set in config.yml');
            callback(null);
        }
    };

    function getAssetList(path, conf, callback){
        var assetArray = [];
        conf.github.ghrepo.contents(path, function(err, data){
            if(err){
                callback(err);
            }else{
                parseAssetArray(data, function(err){
                    if(err){
                        callback(err);
                    }else{
                        callback(null, assetArray);
                    }
                });
            }
        });

        function parseAssetArray(inputArray, callback){
            async.forEach(inputArray, function(item, forCallback){
                if(item.type === 'file'){
                    assetArray.push(item);
                    forCallback(null);
                }else if(item.type === 'dir'){
                    conf.github.ghrepo.contents(item.path, function(err, data){
                        parseAssetArray(data, forCallback);
                    });
                }else{
                    console.log('unknown data type: ' + item.path);
                    forCallback(null);
                }
            }, 
            function(err){
                if(err){
                    console.log(err);
                }
<<<<<<< HEAD
                callback(null);
=======
            }); 
        };
    };

    function downloadFile(path, conf, callback){
        var options = {
            host: 'raw.github.com',
            port: 443,
            path: '/' + conf.github.repoName + '/master/' + path
        },
            imagedata = '';

        async.series([
            function(callback){
                checkDirExists(path, callback);
            },
            function(callback){
                var request = https.get(options, function(res){
                    res.setEncoding('binary');
                    res.on('data', function(chunk){
                        imagedata += chunk;
                    });
                    res.on('end', function(){
                        callback(null);
                    });
                });
            },
            function(callback){
                fs.writeFile('./' + path, imagedata, 'binary', function(err){
                    if(err){
                        console.log(err);
                    }
                    callback(null);
                });
            }],
            callback);
    };

    function checkDirExists(path, callback){
        var pathArr = path.split('/'),
            pathStr = './';

        pathArr.pop();
        async.forEachSeries(pathArr, function(item, forCallback){
            pathStr += item;
            var fserr = null;
            fs.stat(pathStr, function(err, stats){
                // errno 2 -- ENOENT, No such file or directory 
                if(err){
                    if(err.errno == 2 || 34){
                        fs.mkdir(pathStr, function(err){
                            if(err){
                                fserr = err;
                            }
                        });
                    }else{
                        console.log(err);
                        fserr = err;
                    }
                }
                pathStr += '/';
                forCallback(fserr);
>>>>>>> testing
            });
        }, callback);

<<<<<<< HEAD
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
=======
    };

    function uploadToS3(filePath, conf, callback){
        conf.assets.S3.client.putFile('./' + filePath, filePath, {'x-amz-acl': 'public-read'}, function(err, res){
            if(err){
                console.log(err);
            }
>>>>>>> testing
            callback(null);
        });
    };

    function updateAsset(path, conf, callback){
        async.series([
            function(callback){
                downloadFile(path, conf, callback);
            },
            function(callback){
                uploadToS3(path, conf, callback);
            }], callback);
    };

<<<<<<< HEAD
exports.updateAssetDir = updateAssetDir;
exports.downloadFile = downloadFile;
exports.uploadToS3 = uploadToS3;
exports.updateAsset = updateAsset;
exports.removeAsset = removeAsset;
=======
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

    return {
        getAssetList: getAssetList,
        downloadFile: downloadFile,
        uploadToS3: uploadToS3,
        updateAsset: updateAsset,
        removeAsset: removeAsset,
        handleAssets: handleAssets
    };
};
>>>>>>> testing

var async = require('async'),
    content = require('./content')(),
    menu = require('./menu')(),
    database = require('./database'),
    search = require('./search'),
    asset = require('./asset')(),
    config = require('./config')();


module.exports = function(contentParam, assetParam, databaseParam, searchParam, configParam){

    //dep injection
    if(contentParam){
        content = contentParam;
    }
    if(assetParam){
        asset = assetParam;
    }
    if(databaseParam){
        database = databaseParam;
    }
    if(searchParam){
        search = searchParam;
    }
    if(configParam){
        config = configParam;
    }

    function parsePayload(req, callback){
        var errorThrown = false;
        try{
            var payloadObj = JSON.parse(req.body.payload);
        }catch(err){
            callback(err);
            errorThrown = true;
        }
        if(!errorThrown){
            var lastCommit = payloadObj.commits[payloadObj.commits.length - 1],
                updated = lastCommit.added.concat(lastCommit.modified),
                removed = lastCommit.removed,
                deltaObj = {
                    repository: payloadObj.repository.name,
                    user: payloadObj.repository.owner.name,
                    updated: [],
                    updatedAssets: [],
                    removed: [],
                    removedAssets: [],
                    commit: {
                        id: lastCommit.id,
                        timestamp: lastCommit.timestamp
                    }
                };

            config.getConf(deltaObj.user, deltaObj.repository, function(err, conf){
                if(err){
                    callback(err);
                }else{
                    async.series([
                        function(callback){
                            filterPaths(updated, conf, function(err, filteredPaths){
                                deltaObj.updated = filteredPaths;
                                callback(err);
                            });
                        },
                        function(callback){
                            async.reject(updated, function(item, callback){
                                callback(conf.assets.path + '/' !== item.substring(0, conf.assets.path.length + 1));
                            },
                            function(results){
                                deltaObj.updatedAssets = results;
                                callback(null);
                            });
                        },
                        function(callback){
                            filterPaths(removed, conf, function(err, filteredPaths){
                                deltaObj.removed = filteredPaths;
                                callback(err);
                            });
                        },
                        function(callback){
                            async.reject(removed, function(item, callback){
                                callback(conf.assets.path + '/' !== item.substring(0, conf.assets.path.length + 1));
                            },
                            function(results){
                                deltaObj.removedAssets = results;
                                callback(null);
                            });
                        },
                    ],
                    function(err){
                        callback(err, conf, deltaObj);
                    });
                }
            });
        }
    };

    function filterPaths(pathArray, conf, callback){
        async.filter(pathArray, function(item, callback){
            callback(conf.assets.path + '/' !== item.substring(0, conf.assets.path.length + 1));
        },
        function(results){
            async.map(results, 
                function(path, callback){
                    conf.github.ghrepo.contents(path, callback);
                },
                function(err, fileObjArr){
                    content.filterFiles(fileObjArr,
                        function(err, filterResults){
                            async.map(filterResults,
                                function(fileObj, callback){
                                    callback(null, fileObj.path);
                                },
                                function(err, results){
                                    callback(err, results);
                                });
                    });
            });
        });
    };

    function handleUpdates(deltaObj, conf, callback){
        async.forEachSeries(deltaObj.updated, 
            function(path, forCallback){
                content.getFinishedContentObj(path, conf, function(err, finishedObj){
                    if(err){
                        forCallback(err);
                    }else{
                        async.parallel([
                            function(callback){
                                database.addToDB(finishedObj, conf, function(err){
                                    if(!err){
                                        console.log(finishedObj.path);
                                    }
                                    callback(null, err);
                                });
                            },
                            function(callback){
                                search.indexToSearch(finishedObj, conf, function(err){
                                    callback(null, err);
                                });
                            }
                        ],
                        function(err, results){
                            if(err){
                                console.log(err);
                            }
                            if(results){
                                async.forEach(results, function(item, callback){
                                    if(item){
                                        console.log(item);
                                    }
                                });
                            }
                            forCallback(null);
                        });
                    }
                });
            }, callback);
    };

    function handleUpdatedAssets(deltaObj, conf, callback){
        async.forEachSeries(deltaObj.updatedAssets,
            function(path, forCallback){
                asset.updateAsset(path, conf, function(err){
                    if(err){
                        console.log(err);
                    }
                    forCallback(null);
                });
            },
            function(err){
                callback(null);
        });
    };

    function handleRemovals(deltaObj, conf, callback){
        async.forEachSeries(deltaObj.removed, 
            function(path, forCallback){
                async.parallel([
                    function(callback){
                        database.removeFromDB(path, conf, function(err){
                            callback(null, err);
                        });
                    },
                    function(callback){
                        search.deindexFromSearch(path, conf, function(err){
                            callback(null, err);
                        });
                    }],
                    function(err, results){
                        if(err){
                            console.log(err);
                        }
                        if(results){
                            async.forEach(results, 
                                function(item, callback){
                                    if(item){
                                        console.log(item);
                                    }
                            });
                        }
                        forCallback(null);
                    }
                );
            }, callback);
    };

    function handleRemovedAssets(deltaObj, conf, callback){
        callback(null);
    };

    function pushPayload(req, callback){
        parsePayload(req, function(err, conf, deltaObj){
            async.parallel([
                function(callback){
                    handleUpdates(deltaObj, conf, callback);
                },
                function(callback){
                    handleUpdatedAssets(deltaObj, conf, callback);
                },
                function(callback){
                    handleRemovals(deltaObj, conf, callback);
                },
                function(callback){
                    handleRemovedAssets(deltaObj, conf, callback);
                },
                function(callback){
                    menu.indexMenu(conf, callback);
                }],
                function(err, results){
                    console.log('Updated commit ' + deltaObj.commit.id + ' ' + deltaObj.commit.timestamp);
                    callback(err);
                });
        });
    };

    return {
        parsePayload: parsePayload,
        pushPayload: pushPayload,
        handleUpdates: handleUpdates,
        handleUpdatedAssets: handleUpdatedAssets,
        handleRemovals: handleRemovals
    };
};

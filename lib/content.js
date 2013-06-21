var async = require('async'),
    request = require('request'),
    yaml = require('js-yaml'),
    pagedown = require('pagedown'),
    converter = new pagedown.Converter(),
    _s = require('underscore.string'),
    imgRegex = /\<img[\s\S]+?\/>/;


module.exports = function(requestParam){
    if(typeof requestParam !== 'undefined'){
        request = requestParam;
    }
    function parseDir(path, conf, options, callback){
        var resultArray = [];
        conf.github.ghrepo.contents(path, function(err, data){
            if(err){
                callback(err);
            }else{
                async.parallel(
                    [ function(callback){
                          filterFiles(data, function(err, validFiles){
                              if(err){
                                  callback(err);
                              }else{
                                  async.forEach(validFiles, function(item, callback){
                                      options.fileFunc(item, function(err, obj){
                                          if(err){
                                              callback(err)
                                          }else{
                                              resultArray.push(obj);
                                              callback(null);
                                          }
                                      });
                                  }, callback);
                              }
                          });
                      }
                    , function(callback){
                          filterDirs(data, conf, options.filterDirs, function(err, results){
                              async.forEach(results, function(item, callback){
                                  if(options.dirFunc){
                                      options.dirFunc(item, conf, options, function(err, result){
                                          if(err){
                                              callback(err);
                                          }else{
                                              resultArray.push(result);
                                              callback(null);
                                          }
                                      });
                                  }else{
                                      parseDir(item.path, conf, options, function(err, result){
                                          if(err){
                                              callback(err);
                                          }else{
                                              resultArray.push(result);
                                              callback(null);
                                          }
                                      });
                                  }
                              },
                              callback);
                          });
                      }
                    ],
                    function(err, results){
                        callback(err, resultArray);
                    });
            }
        });
    };

    function filterFiles(fileArray, callback){
        async.series([
            function(callback){
                async.filter(fileArray, isFile, function(results){
                    fileArray = results;
                    callback(null);
                });
            },
            function(callback){
                async.reject(fileArray, isDotfile, function(results){
                    fileArray = results;
                    callback(null);
                });
            },
            function(callback){
                async.filter(fileArray, isMarkdownFile, function(results){
                    fileArray = results;
                    callback(null);
                });
            },
            function(callback){
                async.reject(fileArray, isReadme, function(results){
                    fileArray = results;
                    callback(null);
                });
            }
        ],
        function(err){
            callback(null, fileArray);
        });
    };

    function isFile(item, callback){
        callback(item.type==='file');
    };
    function isDotfile(item, callback){
        var pathArr = item.path.split('/');
        if(pathArr[pathArr.length - 1].substring(0, 1) === '.'){
            callback(true);
        }else{
            callback(false);
        }
    };
    function isMarkdownFile(item, callback){
        if(item.path.toLowerCase().substring(item.path.length - 9) === '.markdown' || item.path.toLowerCase().substring(item.path.length - 3) === '.md'){
            callback(true);
        }else{
            callback(false);
        }
    };
    function isReadme(item, callback){
        if(item.path.toLowerCase().substring(0,6) === 'readme'){
            callback(true);
        }else{
            callback(false);
        }
    };

    function filterDirs(dirArray, conf, filterOpts, callback){
        async.series([
            function(callback){
                async.filter(dirArray,
                    function(item, callback){
                        isDir(item, callback);
                    },
                    function(results){
                        dirArray = results;
                        callback(null);
                });
            },
            function(callback){
                async.reject(dirArray,
                    function(item, callback){
                        isIgnored(item.path, conf, callback);
                    },
                    function(results){
                        dirArray = results;
                        callback(null);
                });
            },
            function(callback){
                async.reject(dirArray,
                    function(item, callback){
                        isAssetDir(item.path, conf, callback);
                    },
                    function(results){
                        dirArray = results;
                        callback(null);
                });
            },
            function(callback){
                if(filterOpts && filterOpts.skipBlogDir){
                    async.reject(dirArray,
                        function(item, callback){
                            isBlogDir(item.path, conf, callback);
                        },
                        function(results){
                            dirArray = results;
                            callback(null);
                    });
                }else{
                    callback(null);
                }
            }
        ],
        function(err){
            callback(null, dirArray);
        });
    };

    function isDir(item, callback){
        callback(item.type==='dir');
    };
    function isIgnored(path, conf, callback){
        if(conf.ignore){
            async.some(conf.ignore,
                function(dir, callback){
                    callback(dir === path);
                },callback);
        }else{
            callback(false);
        }
    };
    function isAssetDir(path, conf, callback){
        if(conf.assets && (path === conf.assets.path)){
            callback(true);
        }else{
            callback(false);
        }
    };
    function isBlogDir(path, conf, callback){
        if(conf.blog && (path === conf.blog.path)){
            callback(true);
        }else{
            callback(false);
        }
    };

    function getContent(path, conf, callback){
        conf.github.ghrepo.contents(path, function(err, data){
            if(err){
                callback(err);
            }else{
                if(data.type === 'file'){
                    var rawHeader = { Accept: 'application/vnd.github.beta.raw+json'
                                    , 'User-Agent': 'patchwork-thread (https://github.com/joebadmo/patchwork) terminal/0.0'
                                    };
                    if(conf.github.credentials){
                        var rawPath = 'https://' + conf.github.credentials.username + ':' + conf.github.credentials.password + '@api.github.com/repos/' + conf.github.repoName + '/contents/' + path;
                    }else{
                        var rawPath = 'https://api.github.com/repos/' + conf.github.repoName + '/contents/' + path;
                    }
                    var options = {
                        uri: rawPath,
                        headers: rawHeader
                    };
                    request(options, function(err2, rawContent, body){
                        if(err2){
                            callback(err2);
                        }else{
                            callback(null, rawContent);
                        }
                    });
                }else{
                    callback('Not a file: ' + path);
                }
            }
        });
    }

    function parseContent(rawContent, callback){
        //regex to find yaml front matter
        var regex = /^\s*---[\s\S]+?---\s*/gi,
            idRegex = /(<h\d)(>)(.+?){#([\S\w]+?)}(<\/h\d>)/g,
            match = regex.exec(rawContent.body);
        if(match){
            var yamlString = match[0].replace(/---/g,'');
            var parsedObj = yaml.load(yamlString);
            parsedObj.body = converter.makeHtml(rawContent.body.replace(match[0], '')).replace(idRegex, "$1 id=" + '"' + "$4" + '"' + "$2$3$5");
            callback(null, parsedObj);
        }else{
            callback("Error parsing yaml front matter because of no match in file: ")
        }
    }

    function addExtraMetadata(parsedObj, path, callback){
        var pathArr = path.split('/'),
            cat = '';
        pathArr.pop();
        async.forEachSeries(pathArr, function(item, forCallback){
            cat += (item + '.');
            forCallback(null);
        },function(err){
            if(err){
                callback(err);
            }else{
                parsedObj.docid = path.replace(".markdown","").replace('.md','').replace(/\//g,'-');
                parsedObj.path = path.replace(".markdown","").replace('.md','').replace("/index","");
                parsedObj.category = cat.substring(0, cat.length-1);
                if(!parsedObj.weight){
                    parsedObj.weight = 0;
                }
                if(parsedObj.date){
                    var dateArr = parsedObj.date.split('/');
                    if(dateArr.length < 3){
                        dateArr = parsedObj.date.split('-');
                    }
                    parsedObj.month = dateArr[0];
                    parsedObj.year = dateArr[2];
                    parsedObj.slug = parsedObj.path.split('/').slice(-1);
                    parsedObj.excerpt = _s.prune(_s.stripTags(parsedObj.body), 130, '&hellip;');
                    if(imgRegex.test(parsedObj.body)){
                        parsedObj.img = imgRegex.exec(parsedObj.body)[0];
                    }
                }
                callback(null, parsedObj);
            }
        });
    }

    function getFinishedContentObj(path, conf, callback){
        getContent(path, conf, function(err, rawContent){
            if(err){
                callback('getContent error for path ' + path + ': ' + err);
            }else{
                parseContent(rawContent, function(err, parsedObj){
                    if(err){
                        callback('parseContent error for path ' + path + ': ' + err);
                    }else{
                        addExtraMetadata(parsedObj, path, function(err, finishedObj){
                            if(err){
                                callback('addExtraMetadata error for path ' + path + ': ' + err);
                            }else{
                                callback(null, finishedObj);
                            }
                        });
                    }
                });
            }
        });
    }

    return { parseDir: parseDir
           , getContent: getContent
           , parseContent: parseContent
           , addExtraMetadata: addExtraMetadata
           , getFinishedContentObj: getFinishedContentObj
           , filterFiles: filterFiles
           };
};

var async = require('async'),
    request = require('request'),
    yaml = require('js-yaml'),
    pagedown = require('pagedown'),
    converter = new pagedown.Converter();

module.exports = function(requestParam){
    if(typeof requestParam !== 'undefined'){
        request = requestParam;
    }
    function parseDir(path, conf, fileFunc, callback){
        conf.github.ghrepo.contents(path, function(err, data){
            if(err){
                callback(err);
            }else{
                async.forEach(data, 
                    function(item, forCallback){
                        //ignore dotfiles
                        if(item.path.substring(0, 1)!== '.'){
                            if(item.type === 'file'){
                                //only markdown files
                                if(item.path.substring(item.path.length - 9) === '.markdown' || item.path.substring(item.path.length - 3) === '.md'){
                                    // skip readme
                                    if(item.path.substring(0,6) !== ("README" || "readme")){
                                        fileFunc(item.path, forCallback);
                                    }else{
                                        console.log('skipped readme: ' + item.path);
                                        forCallback(null);
                                    }
                                }else{
                                    console.log('skipped non-markdown file: ' + item.path);
                                    forCallback(null);
                                }
                            }else if(item.type === 'dir'){
                                if(conf.assets && (conf.assets.path === item.path)){
                                    console.log('skipping assets dir: ' + item.path);
                                    forCallback(null);
                                }else if(conf.ignoreDirs){
                                    var ignoreDir = false;
                                    async.forEach(conf.ignoreDirs, function(dir, forCallback2){
                                        if(item.path === dir){
                                            ignoreDir = true;
                                        }
                                        forCallback2(null);
                                    },
                                    function(err){
                                        if(err){
                                            console.log(err);
                                            forCallback(null);
                                        }else{
                                            if(ignoreDir){
                                                console.log("Ignoring directory: " + item.path);
                                                forCallback(null);
                                            }else{
                                                parseDir(item.path, conf, fileFunc, forCallback);
                                            }
                                        }
                                    });
                                }else{
                                    parseDir(item.path, conf, fileFunc, forCallback);
                                }
                            }else{
                                console.log('unkown file type: ' + item.path);
                                forCallback(null);
                            }
                        }else{
                            console.log('skipped dotfile: ' + item.path);
                            forCallback(null);
                        }
                    },
                    function(err){
                        if(err){
                            callback(err);
                        }else{
                            callback(null);
                        }
                    });
            }
        });
    }
        
    function getContent(path, conf, callback){
        conf.github.ghrepo.contents(path, function(err, data){
            if(err){
                callback(err);
            }else{
                if(data.type === 'file'){
                    var rawHeader = {Accept: 'application/vnd.github.beta.raw+json'};
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
                            if(conf.assets.path === path.substring(0, conf.assets.path.length)){
                                rawContent.isAsset = true;
                            }else{
                                rawContent.isAsset = false;
                            }
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
            parsedObj.content = converter.makeHtml(rawContent.body.replace(match[0], '')).replace(idRegex, "$1 id=" + '"' + "$4" + '"' + "$2$3$5");
            callback(null, parsedObj);
        }else{
            callback("Error parsing yaml front matter because of no match in file: ")
        }
    }

    function addExtraMetadata(parsedObj, path, callback){
        if(typeof(path)==='string'){
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
                    parsedObj.path = path.replace(".markdown","").replace('.md','');
                    parsedObj.category = cat.substring(0, cat.length-1);
                    if(!parsedObj.weight){
                        parsedObj.weight = 0;
                    }
                    callback(null, parsedObj);
                }
            });
        }else{
            callback('path not a string');
        }
    }

    function getFinishedContentObj(path, conf, callback){
        getContent(path, conf, function(err, rawContent){
            if(err){
                callback('getContent error for path ' + path + ': ' + err);
            }else{
                if(rawContent.isAsset){
                    callback(null, rawContent);
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
            }
        });
    }

    return {
        parseDir: parseDir,
        getContent: getContent,
        parseContent: parseContent,
        addExtraMetadata: addExtraMetadata,
        getFinishedContentObj: getFinishedContentObj
    };
};

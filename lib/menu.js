var mongoose = require('mongoose')
  , async = require('async')
  , content = require('./content')()
  , models = require('./models')
  ;

module.exports = function(contentParam, fakeFuncs){

    if(contentParam){
        content = contentParam;
    }

    function indexMenu(conf, callback){
        var menuArr = [];
        console.log('menu index request received');
        buildMenu(conf.rootPath, conf, function(err, menuArray){
            if(err){
                callback('error building menu: ' + err);
            }else{
                sortMenu(menuArray, function(err, sortedMenu){
                    if(err){
                        callback('error sorting menu: ' + err);
                    }else{
                        saveMenu(sortedMenu, conf, function(err){
                            if(err){
                                callback('error saving menu: ' + err);
                            }else{
                                callback(null);
                            }
                        });
                    }
                });
            }
        });
    };

    function buildMenu(path, conf, callback){
        var fileFunc = function(item, callback){
            content.getFinishedContentObj(item.path, conf, function(err, finishedObj){
                if(err){
                    callback(err);
                }else{
                    var newMenuObj = {'title': finishedObj.title, 'path': finishedObj.path, 'weight': finishedObj.weight};
                    if(item.path.substring(item.path.length - 14, item.path.length) === 'index.markdown'){
                        newMenuObj.path = newMenuObj.path.replace("index","");
                        newMenuObj.weight = 0;
                    }
                    callback(null, newMenuObj);
                }
            });
        };
        var dirFunc = function(item, conf, options, callback){
            content.getFinishedContentObj(item.path + '/index.markdown', conf, function(err, finishedObj){
                if(err){
                    callback('error menu parsing dir: ' + item.path + err);
                }else{
                    var newMenuObj = {'title': finishedObj.title, 'path': finishedObj.path.replace('/index',''), 'weight': finishedObj.weight, 'children':[]};
                    content.parseDir(item.path, conf, options, function(err, results){
                        newMenuObj.children = results;
                        callback(null, newMenuObj);
                    });
                }
            });
        };
        var options = { fileFunc: fileFunc
                      , dirFunc: dirFunc
                      , filterDirs: { skipBlogDir: true }
                      };
        content.parseDir(path, conf, options, callback);
    };

    function sortMenu(menuArr, callback){
        async.sortBy(menuArr, function(item, sortCallback){
            if(item.children){
                if(item.children.length > 0){
                    sortMenu(item.children, function(err, results){
                        item.children = results;
                        sortCallback(null, item.weight);
                    });
                }else{
                    sortCallback(null, item.weight);
                }
            }else{
                sortCallback(null, item.weight);
            }
        }, callback);
    };

    function saveMenu(menuArr, conf, callback){
        conf.Menu.findOne({'title': 'menu'}, function(err, menu){
            if(err){
                callback(err);
            }else if(menu){
                console.log('updating menu');
                menu.menuArray = menuArr;
            }else{
                console.log('saving new menu');
                var menu = new conf.Menu({
                    title: "menu",
                    menuArray: menuArr
                });
            }

            menu.save(function(err){
                if(err){
                    callback(err);
                }else{
                    console.log('menu saved to mongodb');
                    callback(null);
                }
            });
        });
    };

    //dep inj
    if(fakeFuncs){
        if(fakeFuncs.buildMenu){
            buildMenu = fakeFuncs.buildMenu;
        }
        if(fakeFuncs.sortMenu){
            sortMenu = fakeFuncs.sortMenu;
        }
        if(fakeFuncs.saveMenu){
            saveMenu = fakeFuncs.saveMenu;
        }
    }



    return { indexMenu: indexMenu
           , buildMenu: buildMenu
           , sortMenu: sortMenu
           , saveMenu: saveMenu
           };

};

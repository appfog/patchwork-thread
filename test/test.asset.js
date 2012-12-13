var async = require('async');

// Dep injection
var madeDirs = [],
    writtenFiles = [],
    fs = {
    stat: function(path, callback){
        var goodPaths = ['./fake', './fake/path', './fake/path/three'],
            pathExists = false;
        async.forEach(goodPaths, function(item, callback){
            if(item == path){
                pathExists = true;
            }
            callback(null);
        },
        function(err){
            if(pathExists){
                callback(null);
            }else{
                callback({errno: 2});
            }
        });
    },
    mkdir: function(path, callback){
        madeDirs.push(path);
        callback(null);
    },
    writeFile: function(path, data, encoding, callback){
        writtenFiles.push(path);
        callback(null);
    }
},
    https = {
    get: function(options, callback){
        var response = {
            setEncoding: function(dummy){
                return;
            },
            on: function(param, callback){
                if(param === 'data'){
                    callback('data');
                }else if(param === 'end'){
                    callback();
                }
            }
        };
        callback(response);
    }
};
// Libarary to test
var asset = require('../lib/asset')(fs, https);

// test data
var dir = [
    {
        path: 'asset1.png',
        type: 'file',
    },
    {
        path: 'asset2.png',
        type: 'file',
    },
    {
        path: 'asset3.png',
        type: 'file',
    },
    {
        path: 'assetDir',
        type: 'dir'
    }
],
    dir2 = [
    {
        path: 'assetDir/asset4.png',
        type: 'file'
    }
],
    conf = {
        github: {
            ghrepo: {
                contents: function(path, callback){
                    if(path === 'assetDir'){
                        callback(null, dir2);
                    }else{
                        callback(null, dir);
                    }
                }
            }
        }
    };
exports['test asset.getAssetList'] = function (test) {
    test.expect(5);
    asset.getAssetList('whatever', conf, function(err, assetArray){
        test.equals(assetArray.length, 4);
        test.equals(assetArray[0].path, 'asset1.png');
        test.equals(assetArray[1].path, 'asset2.png');
        test.equals(assetArray[2].path, 'asset3.png');
        test.equals(assetArray[3].path, 'assetDir/asset4.png');
        test.done();
    });
};

exports['test asset.downloadFile'] = {
    'path exists': function(test){
        test.expect(2);
        asset.downloadFile('fake/path/three/something.file', { github: { repoName: 'dummy' } }, function(err){
            test.equal(madeDirs.length, 0);
            test.equal(writtenFiles[0], './fake/path/three/something.file');
            test.done();
        });
    },
    'path does not exist': function(test){
        test.expect(4);
        asset.downloadFile('path/does/not/exist.file', { github: {repoName: 'dummy' } }, function(err){
            test.equal(madeDirs[0], './path');
            test.equal(madeDirs[1], './path/does');
            test.equal(madeDirs[2], './path/does/not');
            test.equal(writtenFiles[1], './path/does/not/exist.file');
            test.done();
        });
    }
};

exports['test asset.handleAssets'] = {
    setUp: function (callback) {
        conf = {
            list: [],
            assets: {
                path: 'dummy'
            },
            assetsArr: [
                { path: "assetPath1" },
                { path: "assetPath2" },
                { path: "assetPath3" },
                { path: "assetPath4" },
                { path: "assetPath5" }
            ]
        };

        // dep injection
        var assetsParam = {
            getAssetList: function(path, conf, callback){
                callback(null, conf.assetsArr);
            },
            updateAsset: function(path, conf, callback){
                conf.list.push(path);
                callback(null);
            }
        };
        asset = require('../lib/asset')(fs, https, assetsParam);
        callback();
    },
    tearDown: function (callback) {
        asset = require('../lib/asset')(fs, https);
        callback();
    },
    'assets dir exists': function(test){
        asset.handleAssets(conf, function(err){
            test.equal(conf.list[0], conf.assetsArr[0].path);
            test.equal(conf.list[1], conf.assetsArr[1].path);
            test.equal(conf.list[2], conf.assetsArr[2].path);
            test.equal(conf.list[3], conf.assetsArr[3].path);
            test.equal(conf.list[4], conf.assetsArr[4].path);
            test.done();
        });
    },
    'assets dir does not exist': function(test){
        conf.assets = null;
        conf.list = [];
        asset.handleAssets(conf, function(err){
            test.equal(conf.list.length, 0);
            test.done();
        });
    }
};

// Libarary to test
var asset = require('../lib/asset');

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

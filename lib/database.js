function addToDB(fileObj, conf, callback){
    removeFromDB(fileObj.path, conf, function(err){
        getModel(fileObj.path, conf, function(err, model){
            var newDoc = new conf[model](fileObj);
            newDoc.save(callback);
        });
    });
};

function getModel(path, conf, callback){
    if(conf.blog && (conf.blog.path + '/' === path.substring(0, conf.blog.path.length + 1))){
        callback(null, 'Blog');
    }else{
        callback(null, 'Doc');
    }
};

function removeFromDB(path, conf, callback){
    getModel(path, conf, function(err, model){
        conf[model].find({'path': path}).remove(callback);
    });
};

exports.addToDB = addToDB;
exports.removeFromDB = removeFromDB;

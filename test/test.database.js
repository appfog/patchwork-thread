var async = require('async');
// Libarary to test
var database = require('../lib/database'),
    fakeConf = (function() {
        var Doc = function(obj){
            this.obj = obj;
            this.save = function(callback){
                fakeDB.doc = obj;
                callback(null);
            };
            return {
                save: this.save
            };
        };
        Doc.find = function(pathObj){
            return {
                remove: function(callback){
                    fakeDB.doc = null;
                    callback(null);
                }
            };
        };
        var Blog = function(obj){
            this.obj = obj;
            this.save = function(callback){
                fakeDB.doc = obj;
                callback(null);
            };
            return {
                save: this.save
            };
        };
        Blog.find = function(pathObj){
            return {
                remove: function(callback){
                    fakeDB.doc = null;
                    callback(null);
                }
            };
        };
        return {
            blog: {
                path: 'blog'
            },
            Doc: Doc,
            Blog: Blog
        };
    })(),

    fakeDB = {
        doc: {
            stuff: "old stuff"
        }
    },
    fakeExistingDoc = {
        path: 'path/to/oldobject',
        title: 'Updated Thing',
        content: 'Hello again, world',
        category: 'cat1'
    },
    fakeExistingPost = {
        path: 'blog/existing/post',
        title: 'Existing Blog Post',
        content: 'This one is updated',
        category: 'blogcat',
        date: 'today',
        year: '2012',
        month: '12',
        slug: 'post',
        excerpt: 'This one...',
        img: 'path/to/img.png'
    },
    fakeNewDoc = {
        path: 'path/to/newobject',
        title: 'New Thing',
        content: 'Hello world',
        category: 'cat2'
    },
    fakeNewPost = {
        path: 'blog/new/post2',
        title: 'New Blog Post',
        content: 'This one is new',
        category: 'blogcat2',
        date: 'today',
        year: '2012',
        month: '12',
        slug: 'post2',
        excerpt: 'This one... new',
        img: 'path/to/img2.png'
    },
    fakeExistingRedirect = {
        path: 'path/to/existing/redirect',
        title: 'Old Redirect',
        content: 'going somewhere else',
        category: 'cat3',
        redirect: 'other/place'
    },
    fakeNewRedirect = {
        path: 'path/to/new/redirect',
        title: 'New Redirect',
        content: 'going somewhere',
        category: 'cat4',
        redirect: 'other/new/place'
    };

exports['test database.addToDb'] = {
    'update existing document': function (test) {
        database.addToDB(fakeExistingDoc, fakeConf, function(err){
            test.equal(fakeDB.doc.path, 'path/to/oldobject');
            test.equal(fakeDB.doc.title, 'Updated Thing');
            test.equal(fakeDB.doc.content, 'Hello again, world');
            test.equal(fakeDB.doc.category, 'cat1');
            test.done();
        });
    }, 
    'create new document': function (test) {
        database.addToDB(fakeNewDoc, fakeConf, function(err){
            test.equal(fakeDB.doc.path, 'path/to/newobject');
            test.equal(fakeDB.doc.title, 'New Thing');
            test.equal(fakeDB.doc.content, 'Hello world');
            test.equal(fakeDB.doc.category, 'cat2');
            test.done();
        });
    }, 
    'update existing blog post': function (test) {
        database.addToDB(fakeExistingPost, fakeConf, function(err){
            test.equal(fakeDB.doc.path, 'blog/existing/post');
            test.equal(fakeDB.doc.title, 'Existing Blog Post');
            test.equal(fakeDB.doc.content, 'This one is updated');
            test.equal(fakeDB.doc.category, 'blogcat');
            test.equal(fakeDB.doc.date, 'today');
            test.equal(fakeDB.doc.year, '2012');
            test.equal(fakeDB.doc.month, '12');
            test.equal(fakeDB.doc.slug, 'post');
            test.equal(fakeDB.doc.excerpt, 'This one...');
            test.equal(fakeDB.doc.img, 'path/to/img.png');
            test.done();
        });
    }, 
    'create new blog post': function (test) {
        database.addToDB(fakeNewPost, fakeConf, function(err){
            test.equal(fakeDB.doc.path, 'blog/new/post2');
            test.equal(fakeDB.doc.title, 'New Blog Post');
            test.equal(fakeDB.doc.content, 'This one is new');
            test.equal(fakeDB.doc.category, 'blogcat2');
            test.equal(fakeDB.doc.date, 'today');
            test.equal(fakeDB.doc.year, '2012');
            test.equal(fakeDB.doc.month, '12');
            test.equal(fakeDB.doc.slug, 'post2');
            test.equal(fakeDB.doc.excerpt, 'This one... new');
            test.equal(fakeDB.doc.img, 'path/to/img2.png');
            test.done();
        });
    },
    'update existing redirect': function(test){
        database.addToDB(fakeExistingRedirect, fakeConf, function(err){
            test.equal(fakeDB.doc.path, 'path/to/existing/redirect');
            test.equal(fakeDB.doc.title, 'Old Redirect');
            test.equal(fakeDB.doc.content, 'going somewhere else');
            test.equal(fakeDB.doc.category, 'cat3');
            test.equal(fakeDB.doc.redirect, 'other/place');
            test.done();
        });
    },
    'create new redirect': function(test){
        database.addToDB(fakeNewRedirect, fakeConf, function(err){
            test.equal(fakeDB.doc.path, 'path/to/new/redirect');
            test.equal(fakeDB.doc.title, 'New Redirect');
            test.equal(fakeDB.doc.content, 'going somewhere');
            test.equal(fakeDB.doc.category, 'cat4');
            test.equal(fakeDB.doc.redirect, 'other/new/place');
            test.done();
        });
    }
};

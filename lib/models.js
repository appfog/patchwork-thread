var mongoose = require('mongoose'),
    docSchema = new mongoose.Schema({
        title: String,
        body: String,
        category: String,
        path: String,
        redirect: String,
        tags:[]
    }),
    menuSchema = new mongoose.Schema({
        menuArray: {},
        title: String
    }),
    blogSchema = new mongoose.Schema({
        title: String,
        body: String,
        date: Date,
        year: Number,
        month: Number,
        slug: String,
        img: String,
        excerpt: String,
        path: String
    });

exports.docSchema = docSchema;
exports.menuSchema = menuSchema;
exports.blogSchema = blogSchema;

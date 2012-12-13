// Test override function
var fakeRequest = function(options, callback){
    callback(null, { body: 'raw content' }, 'body');
};

// Library to test
var content = require('../lib/content')(fakeRequest);

exports['test parseDir'] = function (test) {
    // test data
    var path = '',
        dataArray = [
            { path: '.dotfile',         type: 'file' }
          , { path: 'test1.markdown',   type: 'file' }
          , { path: 'test2.markdown',   type: 'file' }
          , { path: 'test3.md',         type: 'file' }
          , { path: 'READme.md',        type: 'file' }
          , { path: 'testDir',          type: 'dir' }
          , { path: 'assets',           type: 'dir' }
          , { path: 'dir_to_ignore',    type: 'dir' }
          , { path: 'blog',             type: 'dir' }
        ],
        dataArray2 = [
            { path: 'testDir/test4.md',         type: 'file' }
          , { path: 'testDir/.nestedDotfile',   type: 'file' }
          , { path: 'testDir/notFileOrDir',     type: 'fake' }
        ],
        blogDataArray = [
            { path: 'blog/test-blog-post.md',   type: 'file' }
          , { path: 'blog/.nestedDotfile',      type: 'file' }
          , { path: 'blog/notFileOrDir',        type: 'fake' }
        ],
        conf = {
            github: {
                ghrepo: {
                    contents: function(path, callback){
                        if(path === 'testDir'){
                            callback(null, dataArray2);
                        }else if(path === 'blog'){
                            callback(null, blogDataArray);
                        }else{
                            callback(null, dataArray);
                        }
                    }
                }
            },
            assets: {
                path: 'assets'
            },
            ignore: ['dir_to_ignore']
        },
        testContainer = [],
        options = {
            fileFunc: function(p, callback){
                testContainer.push(p);
                callback(null, p);
            }
        };

    test.expect(6);
    content.parseDir(path, conf, options, function(err, rawContent){
        test.equal(testContainer[0].path, 'test1.markdown');
        test.equal(testContainer[1].path, 'test2.markdown');
        test.equal(testContainer[2].path, 'test3.md');
        test.equal(testContainer[3].path, 'testDir/test4.md');
        test.equal(testContainer[4].path, 'blog/test-blog-post.md');
        test.equal(testContainer.length, 5);
        test.done();
    });
};

exports['test getContent'] = function (test) {
    // test data
    var path = '/',
        path2 = 'assets/something.png',
        conf = {
            github: {
                ghrepo: {
                    contents: function(path, callback){
                        var data = {
                            type: 'file'
                        };
                        callback(null, data);
                    }
                }
            },
            assets: {
                path: 'assets'
            }
        };

    test.expect(2);
    content.getContent(path, conf, function(err, rawContent){
        test.equal(rawContent.body, 'raw content');
    });
    content.getContent(path2, conf, function(err2, rawContent2){
        test.equal(rawContent2.body, 'raw content');
        test.done();
    });
};

exports['test parseContent'] = function (test) {
    // test data
    var goodYamlFront = {
            body: '---\ntitle: Test Title 1\nweight: 0\narbitrary: things\n---\n\nHello this is the content.\n\n### Hello\n\nMore content.\n\n### Anchor {#anchor}\n\nFinal.'
        },
        badYamlFront = {
            body: 'things'
        };

    test.expect(6);
    content.parseContent(goodYamlFront, function(err, parsedObj){
        test.equal(parsedObj.title, 'Test Title 1');
        test.equal(parsedObj.weight, 0);
        test.equal(parsedObj.arbitrary, 'things');
        test.equal(parsedObj.body, '<p>Hello this is the content.</p>\n\n<h3>Hello</h3>\n\n<p>More content.</p>\n\n<h3 id="anchor">Anchor </h3>\n\n<p>Final.</p>');
    });
    content.parseContent(badYamlFront, function(err, parsedObj){
        test.equal(typeof parsedObj, 'undefined');
        test.equal(err, "Error parsing yaml front matter because of no match in file: ");
        test.done();
    });
};

exports['test addExtraMetadata'] = function (test) {
    // test data
    var path = 'test/path/to/object.markdown',
        parsedObj = {};

    test.expect(4);
    content.addExtraMetadata(parsedObj, path, function(err, newObj){
        test.equal(newObj.docid, 'test-path-to-object');
        test.equal(newObj.path, 'test/path/to/object');
        test.equal(newObj.category, 'test.path.to');
        test.equal(newObj.weight, 0);
        test.done();
    });
};

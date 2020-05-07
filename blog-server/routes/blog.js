var express = require('express');
var router = express.Router();
let database = require('../dbhelp');
let commonmark = require('commonmark');
let reader = new commonmark.Parser();
let writer = new commonmark.HtmlRenderer();




/* GET home page. */
router.get('/:username/:postid', function(req, res, next) {
	console.log("received username and postid");
	let db = database.get();
	let username = req.params.username;
	let postid = parseInt(req.params.postid,10);
	let created;
	let modified;
	let title;
	let body;
	db.db('BlogServer').collection('Posts').findOne({$and:[{'username':username},{'postid':postid}]},function(err,result){
		if(err){
			console.log("error when extracting the data");
			return;
		}
		else{
			console.log("extracted the data");
			console.log(result);
			if(!result){
				console.log("no such post")
				res.status(404).end();
				return;
			}

			else{
				let parsedTitle = reader.parse(result.title);
				let parsedBody = reader.parse(result.body);
				let title = writer.render(parsedTitle);
				let body = writer.render(parsedBody);
				postid = result.postid;
				username = result.username;
				created = Date(result.created);
				modified = Date(result.modified);

				res.render('post',{postid:postid,username:username,created:created,modified:modified,title:title,body:body})
			}
		}
	})



  

});

router.get('/:username', function(req, res, next) {
  res.render('index', { title: 'Express' });
});


module.exports = router;
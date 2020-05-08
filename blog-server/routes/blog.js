var express = require('express');
var router = express.Router();
let database = require('../dbhelp');
let commonmark = require('commonmark');
let reader = new commonmark.Parser();
let writer = new commonmark.HtmlRenderer();

let isNormalInteger = function(str) {
    return /^\+?(0|[1-9]\d*)$/.test(str);
}


/* GET home page. */
router.get('/:username/:postid', function(req, res, next) {
	console.log("received username and postid");
	let db = database.get();
	let username = req.params.username;
	let postid;
	if(isNormalInteger(req.params.postid)){
		postid = parseInt(req.params.postid,10);
	}
	else{
		console.log("postid is not a positive intger")
		res.status(404).end();
		return;

	}
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
	console.log("received username");
	let db = database.get();
	let username = req.params.username;
	console.log(username);
	let mysort= {postid:1};
	db.db('BlogServer').collection('Posts').find({'username':username}).sort(mysort).toArray(function(err,result){
		if(err){
			console.log("error when extracting the data");
			return;
		}
		else{
			console.log("extracted the data");
			console.log(result);
			let size = result.length
			if(size==0){
				console.log("no post from that username")
				res.status(404).end();
				return;
			}

			else{
				//start is the start postid 
				//i is the start index in the result array
				let start;
				let end;
				let i=0;
				let nextflag=0;
				let nextstart;
				let nexturl = "";
				if(req.query.start){
					let temp = req.query.start;
					if(isNormalInteger(temp)){
						start = parseInt(temp,10);
					}
					else{
						console.log("start not a positive int")
						res.status(404).end();
						return;
					}
				}
				else {
					start=1;
				}

				if(start>result[size-1].postid){
					console.log("no post equal or over the start postid")
					res.status(404).end();
					return;
				}
				while(parseInt(result[i].postid,10)<start) i++;

				if(i+5<size){
					end = i+5;
					nextflag=1;
				}
				else end = size;
				nextstart = parseInt(result[end-1].postid,10)+1;
				let posts = result.slice(i,end);

				for (let post of posts){
					let parsedTitle = reader.parse(post.title);
					let parsedBody = reader.parse(post.body);
					post.title = writer.render(parsedTitle);
					post.body = writer.render(parsedBody);
					post.created = Date(post.created);
					post.modified = Date(post.modified);
				}
				if(nextflag)
					nexturl = "/blog/"+username+"?start="+nextstart.toString();
				
				console.log(nextstart);
				res.render('blog',{posts:posts,nextflag:nextflag,nexturl:nexturl});
			}
		}
	})

});


module.exports = router;
let express = require('express');
let router = express.Router();
let database = require('../dbhelp');
let jwt = require('jsonwebtoken');

const secret_key = 'C-UFRaksvPKhx1txJYFcut3QGxsafPmwCY6SCly3G6c';

let isAuthorize = function(req,res){
	if (req.cookies.jwt == null){
		console.log("Cookie does not exist.");
		res.status(401).end();
		return false;
	}

	try{
		let decoded = jwt.verify(req.cookies.jwt, secret_key);

		if ( decoded.usr != req.params.username || decoded.exp * 1000 <= Date.now()){
			console.log("Cookie is invalid or has expired.");
			res.status(401).end();
			return false;
		}
		else{
			return true;
		}
	}
	catch(error){
		console.log(error);
		res.status(401).end();
		return false;
	}
};

let isJSON = function(req,res){
	try{
		console.log(JSON.stringify(req.body));
		JSON.parse(JSON.stringify(req.body));
	} catch(error){
		return false;
	}

	return true;
}


router.get('/:username',function(req,res,next){
	console.log("Received GET with /:username");
	let username = req.params.username;
	if (username == null){
		console.log("missing parameters");
		res.status(400).end();
		return;
	}

	let isValid = isAuthorize(req,res);
	if(!isValid){
		return;
	}

	let db = database.get();
	db.db('BlogServer').collection('Posts').find({'username':username}).toArray(function(err,results){
		if(err){
			console.log("Error when extracting data.");
			res.status(500).end();
			return;
		}

		console.log(results);

		if (results == null){
			res.status(200).end();
		}
		else{
			for (let result of results){
				if(!("postid" in result) || !("title" in result) || !("body" in result) || !("created" in result) || !("modified" in result)){
					console.log("Invalid blog contents.");
					res.status(401).end();
				}
			}

			res.status(200).json(results);
		}	
	});

});

router.get('/:username/:postid',function(req,res,next){
	console.log("Received GET with /:username/:postid");
	let username = req.params.username;
	let postid = parseInt(req.params.postid,10);
	if (username == null || postid == null){
		console.log("missing parameters");
		res.status(400).end();
		return;
	}

	let isValid = isAuthorize(req,res);
	if(!isValid){
		return;
	}

	let db = database.get();

	db.db('BlogServer').collection('Posts').findOne({$and:[{'username':username},{'postid':postid}]},function(err,result){
		if(err){
			console.log("Error when extracting the data.");
			res.status(500).end();
			return;
		}

		console.log(result);

		if(result == null){
			res.status(404).end();
		}
		else{
			if(!("title" in result) || !("body" in result) || !("created" in result) || !("modified" in result)){
				console.log("Invalid blog content");
				res.status(404).end();
			}
			else{
				res.status(200).json(result);
			}
		}
	});
});

router.post('/:username/:postid',async function(req,res,next){
	console.log("Received POST with /:username/:postid");
	let username = req.params.username;
	let postid = parseInt(req.params.postid,10);
	if (username == null || postid == null){
		console.log("Missing parameters");
		res.status(400).end();
		return;
	}	

	let isValid = isAuthorize(req,res);
	if(!isValid){
		return;
	}

	let db = database.get();
	let result = await db.db('BlogServer').collection('Posts').findOne({$and:[{'username':username},{'postid':postid}]});

	if(result != null){
		console.log("Post already exists.");
		res.status(400).end();
		return;
	}
	else{
		let created = Date.now();
		let modified = created;
		let title = req.body.title;
		let body = req.body.body;

		if (!isJSON(req,res)){
			console.log("Request body is not JSON");
			res.status(400).end();
			return;
		}
		else if (title == null || body == null){
			console.log("Missing body parameters");
			res.status(400).end();
			return;
		}
		else{
			try{
				db.db("BlogServer").collection("Posts").insertOne(
				{
					"postid":postid,
					"username":username,
					"created":created,
					"modified":modified,
					"title":title,
					"body":body
				});
				res.status(201).end();
			}catch(error){
				console.log(error);
				res.status(400).end();
			}
		}
	}

});


router.put('/:username/:postid',async function(req,res,next){
	console.log("Received PUT with /:username/:postid");
	let username = req.params.username;
	let postid = parseInt(req.params.postid,10);
	if (username == null || postid == null){
		console.log("Missing parameters");
		res.status(400).end();
		return;
	}

	let isValid = isAuthorize(req,res);
	if(!isValid){
		return;
	}	

	if (!isJSON(req,res)){
		console.log("Request body is not JSON");
		res.status(400).end();
		return;
	}

	let title = req.body.title;
	let body = req.body.body;
	if (title == null || body == null){
		console.log("Missing body parameters");
		res.status(400).end();
		return;
	}	

	let db = database.get();
	db.db('BlogServer').collection('Posts').findOne({$and:[{'username':username},{'postid':postid}]},function(err,result){
		if(err){
			console.log("Error when extracting the data.");
			res.status(500).end();
			return;
		}

		console.log(result);
		if(result == null){
			console.log("Can't find the document.");
			res.status(400).end();
		}
		else{
			let nowtime = Date.now();
			try{
				db.db('BlogServer').collection('Posts').updateOne(
				{ "username":username, "postid":postid},
				{
					$set: {
						"created":nowtime,
						"modified":nowtime,
						"title":title,
						"body":body
					}
				}
				);		
			}catch(error){
				console.log(error);
				res.status(400).end();
			}
			res.status(200).end();
		}
	});

});


router.delete('/:username/:postid',async function(req,res,next){
	console.log("Received DELETE with /:username/:postid");
	let username = req.params.username;
	let postid = parseInt(req.params.postid,10);
	if (username == null || postid == null){
		console.log("Missing parameters");
		res.status(400).end();
		return;
	}

	let isValid = isAuthorize(req,res);
	if(!isValid){
		return;
	}

	let db = database.get();
	db.db('BlogServer').collection('Posts').findOne({$and:[{'username':username},{'postid':postid}]},function(err,result){
		if(err){
			console.log(err);
			res.status(500).end();
			return;
		}

		console.log(result);

		if(result == null){
			console.log("No such document. Bad Request.");
			res.status(400).end();
			return;
		}
		else{
			try{
				db.db('BlogServer').collection('Posts').deleteOne( {"username":username, "postid":postid});
			}
			catch(error){
				console.log(error);
				res.status(400).end();
			}
			res.status(204).end();
		}
	});	


});



module.exports = router;
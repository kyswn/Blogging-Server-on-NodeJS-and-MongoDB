let express = require('express');
let router = express.Router();
let database = require('../dbhelp');
let bcrypt = require('bcryptjs');
let jwt = require('jsonwebtoken');

const secret_key = 'C-UFRaksvPKhx1txJYFcut3QGxsafPmwCY6SCly3G6c';


router.get('/', function(req,res,next){
	console.log("Received GET request at login.");
	let redirect = req.query.redirect;
	let username = req.query.username;
	let password = req.query.password;
	res.render('login', {redirect: redirect, username: username, password: password, error: false});
});


router.post('/',function(req,res,next){
	console.log("Received POST request at login.");
	let username = req.body.username;
	let password = req.body.password;
	let redirect = req.body.redirect;

	console.log(req.body);
	// when either username or password not provided, return 404
	if (username == null || password == null){
		console.log("Missing parameters.")
		res.status(404).end();
		return;
	}

	// When username and password both provided
	let db = database.get();
	db.db('BlogServer').collection('Users').findOne({'username':username}, function(err,result){
		if(err){
			console.log(err);
			res.status(500).end();
			return;
		}
		// user does not exist
		else if (result == null){
			res.status(401).render('login', {username: username, password: password, redirect: redirect, error: true});
			return;
		}
		else{
			bcrypt.compare(password, result.password, function(err,rs){
				// password incorrect
				if (rs == false){
					res.status(401).render('login', {username: username, password: password, redirect: redirect, error: true});
					return;
				}
				else{
					// find a username/password pair match
					console.log("Authentication success.");
					let expire = Math.floor(Date.now()/1000) + 2 * 60 * 60;
					jwt.sign({"exp": expire, "usr": username}, secret_key, { header: {"alg": "HS256","typ": "JWT"} }, function(err, token){
						if(err){
							res.status(404).end();
							return;
						}
						res.cookie('jwt',token);

						// redirect if url provided
						if(redirect == null || redirect == ""){
							res.status(200).render('login-success');
						}
						else{
							res.status(200).redirect(redirect);
						}
					});

				}
			});
		}
	})
});

module.exports = router;
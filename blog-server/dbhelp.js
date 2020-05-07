let MongoClient = require('mongodb').MongoClient
const url = "mongodb://localhost:27017/BlogServer";
var state = {
  db: null,
}

exports.connect = function(callback) {
  if (state.db) console.log("already opened this connection");

  else MongoClient.connect(url, function(err, db) {
    if (err) {
    	console.log("error connecting to db");
    	return;
    	}
    else {
    	state.db = db;
    	console.log("successfully opened the connection");
    }

  })
  callback();
  
}

exports.get = function() {
  return state.db
}

exports.close = function( ) {
  if (state.db) {
    state.db.close(function(err, result) {
      state.db = null
      state.mode = null
      console.log("closed the connection")
    })
  }
}





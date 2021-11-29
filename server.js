// Requirements
const express = require("express");
const fs = require("fs");
const session = require("express-session");
const Database = require("./backend/database.js");
const User = require("./backend/user.js");

// App
const app = express();

// Objects
const database = new Database({
    host: process.env.IP,
    user: "root",
    password: "",
    database: "FluffleDB"
});
const users = new User(database);

// Server Port
const port = 3000;

//Session
const sessionOptions = {
  secret: "correct horse battery staple",
  resave: false,
  saveUninitialized: false,
  cookie: {maxAge: 600000}
};
app.use(session(sessionOptions));

// Apply App Settings
app.get("/", serveIndex);
app.get("/fetchAnimals", fetchAnimals);
app.get("/fetchWaypoints", fetchWaypoints);
app.get("/login", login);
app.get("/logout", logout);
app.get("/register", register);
app.get("/whoIsLoggedIn", whoIsLoggedIn);
app.listen(port, "localhost", startHandler());
app.use(express.static(__dirname));

/**
 * Start the handler
 ********************************************************************************/
function startHandler() {
  console.log(`Server listening on port ${port}`);
}

/**
 * Serves the webpage to the server.
 ********************************************************************************/
function serveIndex(req, res) {
  res.writeHead(200, {"Content-Type": "text/html"});
  let index = fs.readFileSync("index.html");
  res.end(index);
}

/**
 * Writes the provided data as a json response.
 * req - The request
 * result - The content being written to the response
 ********************************************************************************/
function writeResult(res, result) {
  res.writeHead(200, {"Content-Type": "application/json"});
  res.end(JSON.stringify(result));
}

/**
 * Error Handling
 * res - The response
 * error - The error being handled
 ********************************************************************************/
function writeError(res, error){
  writeResult(res, {'error' : error});
}

/**
 * Fetches the animal types from the database
 * req - The request from the client.
 * res - The response to the client.
 ********************************************************************************/
function fetchAnimals(req, res) {
  database.fetchAnimals()
    .then( result => writeResult(res, result) )
    .catch( error => writeError(res, error) );
}

/**
 * Fetches the animal types from the database
 * Expects the following request parameters:
 *  • latitude
 *  • longitude
 *  • range
 * req - The request from the client.
 * res - The response to the client.
 ********************************************************************************/
function fetchWaypoints(req, res) {
  database.fetchWaypoints(req)
    .then( result => writeResult(res, result) )
    .catch( error => writeError(res, error) );
}

/**
 * Logs a user
 * Expects the following request parameters:
 *  • username
 *  • password
 * req - The request from the client.
 * res - The response to the client.
 ********************************************************************************/
function login(req, res) {
  users.login(req)
    .then( result => writeResult(res, result) )
    .catch( error => writeError(res, error) );
}

/**
 * Ends the current user's session.
 * req - The request from the client.
 * res - The response to the client.
 ********************************************************************************/
function logout(req, res) {
  users.logout(req)
    .then( result => writeResult(res, result) )
    .catch( error => writeError(res, error) );
}

/**
 * Registers a new user to the application.
 * Expects the following request parameters:
 *  • username
 *  • email
 *  • password
 * req - The request from the client.
 * res - The response to the client.
 ********************************************************************************/
function register(req, res) {
  users.register(req)
    .then( result => writeResult(res, result) )
    .catch( error => writeError(res, error) );
}

/**
 * Returns the user that is currently logged in.
 * Subfunction of /register
 * req - The request from the client.
 * res - The response to the client.
 ********************************************************************************/
function whoIsLoggedIn(req, res) {
  writeResult(res, users.getCurrentUser(req));
}

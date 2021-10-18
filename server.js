// Requirements
const bcrypt = require('bcrypt');
const express = require("express");
const fs = require("fs");
const mysql = require('mysql');
const session = require("express-session");

// App
const app = express();

// Database Information
const conInfo =  {
    host: process.env.IP,
    user: "root",
    password: "",
    database: "FluffleDB"
};

// Server Port
const port = 3000;

// Regex
const emailRegEx = /^(([^<>()\[\]\\.,;:\s@"]+(\.[^<>()\[\]\\.,;:\s@"]+)*)|(".+"))@((\[[0-9]{1,3}\.[0-9]{1,3}\.[0-9]{1,3}\.[0-9]{1,3}\])|(([a-zA-Z\-0-9]+\.)+[a-zA-Z]{2,}))$/;
const passwordRegEx = /(?=.*\d)(?=.*[!@#$])(?=.*[A-Z])(?=.{8,})/;

//Session
const sessionOptions = {
  secret: "correct horse battery staple",
  resave: false,
  saveUninitialized: false,
  cookie: {maxAge: 600000}
};
app.use(session(sessionOptions));

// Apply App Settings
app.use(session(sessionOptions));
app.get("/", serveIndex);
app.get("/register", register);
app.get("/login", login);
app.get("/logout", logout);
app.get("/whoIsLoggedIn", whoIsLoggedIn);
app.listen(port, "localhost", startHandler());
app.use(express.static(__dirname));

/**
 * Start the handler
 */
function startHandler() {
  console.log(`Server listening on port ${port}`);
}

/**
 * Serve the index.html page to the server
 */
function serveIndex(req, res) {
  res.writeHead(200, {"Content-Type": "text/html"});

  let index = fs.readFileSync("index.html");
  res.end(index);
}

/**
 * Writes a json response
 * req - The request
 * result - The json content being written to the response
 */
function writeResult(res, result) {
  res.writeHead(200, {"Content-Type": "application/json"});
  res.end(JSON.stringify(result));
}

/**
 * Error Handling
 * e - The error being handled
 */
function handleError(e){
  console.log(e.stack);
  return {error: e.message};
}

/**
 * User Login
 * req - The request
 * res - The response
 */
function login(req, res) {
  try {
    let con = mysql.createConnection(conInfo);

    con.connect(function(err) {
      if (err) { writeResult(res, {'error' : err}); }
      else { dologin(req, res, con); }
    });      
  }
  catch (e) {
    writeResult(res, handleError(e));
  }
}

/**
 * User Logout
 * req - The request
 * res - The response
 */
function logout(req, res) {
  req.session.user = null;
  writeResult(res, {user: req.session.user});
}

/**
 * User Registration
 * req - The request
 * res - The response
 */
function register(req, res) {
  try {
    //Variables
    let username = req.query.username;
    let email = getEmail(req);
    let password = req.query.password;
    let con = mysql.createConnection(conInfo);

    // Check User Name Requirements
    if (!isValidUsername(username)) {
      writeResult(res, { 'error': 'Please specify a valid username' });
      return;
    }

    // Email Requirements
    if (!isValidEmail(email)) {
      writeResult(res, { 'error': 'Please specify a valid email address' });
      return;
    }

    // Check Password requirements
    if (!isValidPassword(password)) {
      writeResult(res, { 'error': 'Password must be at least 8 characters in length and contain at least capital letter, one number and one special character ($#!@&)' });
      return;
    }
    //Generate the password's hash
    let hash = bcrypt.hashSync(password, 12);
    
    // Open a connection to the database
    con.connect(function(err) {
      if (err) { writeResult(res, {'error' : err}); }
      else {

        // Attempt the user to the database
        con.query('INSERT INTO Users (Username, Email, PasswordHash) VALUES (?, ?, ?)', [username, email, hash], function (err, result, fields) {
          if (err)  {
            if (err.code === 'ER_DUP_ENTRY') {
              writeResult(res, { 'error': "An account with this username or email address already exists."});
            }
            else {
              writeResult(res, { 'error': err.message});
            }
          }
          else {
            dologin(req, res, con);
          }
        });
      };
    });
  }
  catch (e) {
    writeResult(res, handleError(e));
  }
}

/**
 * Builds a user object based on the database object provided
 * dbObject - The database object
 */
function buildUser(dbObject) {
  return {
    id: dbObject.Id,
    email: dbObject.Email,
    username: dbObject.Username
  };
}

/**
 * Returns the user that is currently logged in.
 * req - The request
 * res - The response
 */
function whoIsLoggedIn(req, res) {
  if(req.session.user == undefined) { writeResult(res, {user: null}); }
  else {  writeResult(res, {user: req.session.user}); }
}

/**
 * Fetches the email from the request
 * req - The request
 */
function getEmail(req) {
  return String(req.query.email).toLowerCase();
}

/**
 * Returns if the email is considered valid
 * email - The provided email address
 */
function isValidEmail(email) {
  if(!email) { return false; }
  return emailRegEx.test(email.toLowerCase());
}

/**
 * Returns if the password is considered valid
 * password - The provided password
 */
function isValidPassword(password) {
  if(!password) { return false; }
  return passwordRegEx.test(password);
}

/**
 * Returns if the username is considered valid
 * username - The provided username
 */
function isValidUsername(username) {
  if(!username) { return false; }
  return true;
}

/**
 * Attempts to log the user in with query parameters provided.
 * req - The request
 * res - The response
 * con - The database connection
 */
function dologin(req, res, con) {
  let username = req.query.username;
  let password = req.query.password;
  try{

    con.query('SELECT Id, Username, PasswordHash, Email FROM Users WHERE Username = ?', [username], function (err, result, fields) {
      if (err)  { writeResult(res, { 'error': err.message}); }
      else {
        
        if(result.length == 1 && bcrypt.compareSync(password, result[0].PasswordHash)) {
          req.session.user = buildUser(result[0]);
          writeResult(res, {user: req.session.user});
        }
        else  { writeResult(res, {'error': "Invalid Username/password"}); }
      }
    });
  }
  catch (e) {
    throw e;
  }  
}

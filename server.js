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

// Converstions: Latitude and Longitude to mile
const latitudeToMiles = 1.0 / 69.0;
const longitudeToMiles = 1.0 / 54.6;

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
app.get("/register", register);
app.get("/login", login);
app.get("/logout", logout);
app.get("/whoIsLoggedIn", whoIsLoggedIn);
app.get("/fetchAnimals", fetchAnimals);
app.get("/fetchWaypoints", fetchWaypoints);
app.get("/addWaypoint", addWaypoint);
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
 * e - The error being handled
 ********************************************************************************/
function handleError(e){
  console.log(e.stack);
  return {error: e.message};
}

/**
 * User Login
 * Usage: /login?username=""&password=""
 * req - The request
 * res - The response
 ********************************************************************************/
function login(req, res) {
  try {
    let con = mysql.createConnection(conInfo);

    // Connect to the database
    con.connect(function(err) {

      // Attempts to login
      if (!err) { doLogin(req, res, con); }
      else { writeResult(res, {'error' : err}); }
    });      
  }

  // Error Handling
  catch (e) {
    writeResult(res, handleError(e));
  }
}

/**
 * User Logout
 * req - The request
 * res - The response
 ********************************************************************************/
function logout(req, res) {
  req.session.user = null;
  writeResult(res, {user: req.session.user});
}

/**
 * User Registration
 * Usage: /login?username=""&email=""&password=""
 * req - The request
 * res - The response
 ********************************************************************************/
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

    // Query Variables
    let sql = 'INSERT INTO Users (Username, Email, PasswordHash) VALUES (?, ?, ?)';
    let placeholders = [username, email, hash];
    
    // Open a connection to the database
    con.connect(function(err) {
      
      // Attempt to query the database
      if (!err) {
        con.query(sql, placeholders, function (err, result, fields) {
          if (!err)  { doLogin(req, res, con); }
          else {
            if (err.code === 'ER_DUP_ENTRY') { writeResult(res, { 'error': "An account with that email or username already exists."}); }
            else { writeResult(res, { 'error': err.message}); }
          }
        });
      }
      else { writeResult(res, {'error' : err}); };
    });
  }
  catch (e) {
    writeResult(res, handleError(e));
  }
}

/**
 * Fetches the email from the request
 * Subfunction of /register
 * req - The request
 ********************************************************************************/
function getEmail(req) {
  return String(req.query.email).toLowerCase();
}

/**
 * Returns if the email is considered valid
 * Subfunction of /register
 * email - The provided email address
 ********************************************************************************/
function isValidEmail(email) {
  if (!email) { return false; }
  return emailRegEx.test(email.toLowerCase());
}

/**
 * Returns if the password is considered valid
 * Subfunction of /register
 * password - The provided password
 ********************************************************************************/
function isValidPassword(password) {
  if (!password) { return false; }
  return passwordRegEx.test(password);
}

/**
 * Returns if the username is considered valid
 * Subfunction of /register
 * username - The provided username
 ********************************************************************************/
function isValidUsername(username) {
  if (!username) { return false; }
  return true;
}

/**
 * Returns the user that is currently logged in.
 * Subfunction of /register
 * req - The request
 * res - The response
 ********************************************************************************/
function whoIsLoggedIn(req, res) {
  if (req.session.user == undefined) { writeResult(res, {user: null}); }
  else { writeResult(res, {user: req.session.user}); }
}

/**
 * Attempts to log the user in with the provided query parameters.
 * req - The request
 * res - The response
 * con - The database connection
 ********************************************************************************/
function doLogin(req, res, con) {
  
  //Variables
  let username = req.query.username;
  let password = req.query.password;

  //Ensure username is provided
  if (!username || username.length == 0) {
    writeResult(res, {'error' : 'You must provide a username.'});
    return;
  }

  //Ensure password is provided
  if (!password || password.length == 0) {
    writeResult(res, {'error' : 'You must provide a password.'});
    return;
  }

  // Attempt to login
  try {

    // Query Variables
    let sql = `SELECT Id, Username, PasswordHash FROM Users WHERE Username = ?`;
    let placeholders = [username];

    // Query the database
    con.query(sql, placeholders, function (err, result, fields) {
      if (!err) {

        // If the hashes match we have our user
        if(result.length == 1 && bcrypt.compareSync(password, result[0].PasswordHash)) {
          req.session.user = buildUser(result[0]);
          writeResult(res, {user: req.session.user});
        }
        else  { writeResult(res, {'error': "Invalid username or password"}); }
      }
      else { writeResult(res, { 'error': err.message}); }
    });
  }

  // Error Handling
  catch (e) { throw e; }  
}

/**
 * Builds a user object based on the database object provided
 * Subfunction of /doLogin
 * dbObject - The database object
 ********************************************************************************/
function buildUser(dbObject) {
  return {
    id: dbObject.Id,
    email: dbObject.Email,
    username: dbObject.Username
  };
}

/**
 * Fetches the animals within the database
 * Usage: /fetchAnimals
 * req - The request
 * res - The response
 ********************************************************************************/
function fetchAnimals(req, res) {
  try {
    let con = mysql.createConnection(conInfo);
    let sql = `
      SELECT Name, Icon
      FROM Animals
    `;
    let placeholders = [];

    // Connect to the database
    con.connect(function(err) {

      // Queries the database
      if (!err) {
        con.query(sql, placeholders, function (err, result, fields) {
          if (!err)  {
            
            let results = [];
            
            for(let i = 0; i < result.length; i++) {
              results.push({
                "Name" : result[i].Name,
                "Icon" : result[i].Icon
              });
            }

            writeResult(res, { 'animals': results }); 
          }
          else { writeResult(res, { 'error': err.message}); }
        });
      }
      else { writeResult(res, {'error' : err}); }
    });      
  }

  // Error Handling
  catch (e) {
    writeResult(res, handleError(e));
  }
}

/**
 * Fetches the locations within the database
 * Usage: /fetchWaypoints?latitude=0&email=""&longitude=0&range=0
 * req - The request
 * res - The response
 ********************************************************************************/
function fetchWaypoints(req, res) {
  try {
    let con = mysql.createConnection(conInfo);
    let lat = req.query.latitude;
    let lng = req.query.longitude;
    let range = req.query.range;

    // Validity check for latitude
    if (!lat || isNaN(lat)) {
      writeResult(res, {'error' : "You must provide a numeric latitude."});
      return;
    }

    lat = parseFloat(lat);

    // Validity check for longitude
    if (!lng || isNaN(lng)) {
      writeResult(res, {'error' : "You must provide a numeric longitude."});
      return;
    }

    lng = parseFloat(lng);

    // Validity check for longitude
    if (!range || isNaN(range)) {
      writeResult(res, {'error' : "You must provide a search range (miles)."});
      return;
    }

    range = parseFloat(range);

    // Query Variables
    let sql = `
      SELECT
        Users.Username AS 'User',
        Animals.Name AS 'Animal',
        Animals.Icon AS 'Icon',
        ST_X(Coordinate) AS 'Latitude',
        ST_Y(Coordinate) AS 'Longitude',
        Datestamp As 'Date'
      FROM Waypoints
      JOIN Animals ON Animals.Id = Waypoints.AnimalId
      JOIN Users ON Users.Id = Waypoints.UserId
      WHERE ABS(ST_X(Coordinate) - ${lat}) <= ${latitudeToMiles * range}
        AND ABS(ST_Y(Coordinate) - ${lng}) <= ${longitudeToMiles * range}
    `;
    let placeholders = [];

    // Connect to the database
    con.connect(function(err) {

      // Queries the database
      if (!err) {
        con.query(sql, placeholders, function (err, result, fields) {
          if (!err)  {
            
            let results = [];
            
            for(let i = 0; i < result.length; i++) {
              results.push({
                "User" : result[i].User,
                "Animal" : {
                  "Name" : result[i].Animal,
                  "Icon" : result[i].Icon,
                },
                "Location" : {
                  "Latitude" : result[i].Latitude,
                  "Longitude" : result[i].Longitude
                }
              });
            }

            writeResult(res, { 'animals': results }); 
          }
          else { writeResult(res, { 'error': err.message}); }
        });
      }
      else { writeResult(res, {'error' : err}); }
    });      
  }

  // Error Handling
  catch (e) {
    writeResult(res, handleError(e));
  }
}

/**
 * Adds a location to the database
 * Usage: /addWaypoint?latitude=0&longitude=0
 * req - The request
 * res - The response
 ********************************************************************************/
function addWaypoint(req, res) {
  try {
    let con = mysql.createConnection(conInfo);
    let lat = req.query.latitude;
    let lng = req.query.longitude;
    let animal = req.query.animal;

    //Ensure the user is logged in
    if (!req.session.user || !req.session.user.username) {
      writeResult(res, {'error' : "You must be logged in to use this feature."});
      return;
    }

    // Validity check for latitude
    if (!lat || isNaN(lat)) {
      writeResult(res, {'error' : "You must provide a numeric latitude."});
      return;
    }

    lat = parseFloat(lat);

    // Validity check for longitude
    if (!lng || isNaN(lng)) {
      writeResult(res, {'error' : "You must provide a numeric longitude."});
      return;
    }

    lng = parseFloat(lng);

    // Validity check for longitude
    if (!animal || animal.length == 0) {
      writeResult(res, {'error' : "You must provide an animal."});
      return;
    }

    // Query Variables
    let sql = `
      INSERT INTO Waypoints(UserId, AnimalId, Coordinate, Datestamp)
      VALUES (
        (SELECT Id FROM Users WHERE Username = ?),
        (SELECT Id FROM Animals WHERE Name = ?),
        Point(${lat}, ${lng}),
        CURRENT_DATE()
      )
    `;
    let placeholders = [req.session.user.username, animal];

    // Connect to the database
    con.connect(function(err) {

      // Queries the database
      if (!err) {
        con.query(sql, placeholders, function (err, result, fields) {
          if (!err)  {
            writeResult(res, { 'success': "Added waypoint."});
          }
          else { writeResult(res, { 'error': err.message}); }
        });
      }
      else { writeResult(res, {'error' : err}); }
    });      
  }

  // Error Handling
  catch (e) {
    writeResult(res, handleError(e));
  }
}
// Requirements
const express = require("express");
const fs = require("fs");
const mysql = require('mysql');

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

// Apply App Settings
app.get("/", serveIndex);
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
function handleError(e) {
  console.log(e.stack);
  return {error: e.message};
}
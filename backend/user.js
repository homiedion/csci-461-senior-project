const bcrypt = require('bcrypt');

class User {
  /**
   * Constructor
   * database - The database object we're using.
   ********************************************************************************/
  constructor(database) {
    this.database = database;
  }

  /**
   * Returns the current user who is logged in.
   * req - The request from the client.
   ********************************************************************************/
  getCurrentUser(req) {
    if (req.session.user) { return {'user': req.session.user}; }
    return {'user' : null};
  }

  /**
   * Logs a user into the application 
   * Expects the following request parameters:
   *  • username
   *  • password
   * req - The request from the client.
   ********************************************************************************/
  login(req) {
    return new Promise((resolve, reject) => {
      let username = this.getString(req.query.username);
      let password = this.getString(req.query.password);

      //Log the user in
      this.doLogin(req, username, password)
        .then(result => resolve(result))
        .catch(error => reject(error));
    });
  }

  /**
   * Logs a user out of the application
   * req - The request from the client.
   ********************************************************************************/
  logout(req) {
    return new Promise((resolve, reject) => {
      req.session.user = null;
      resolve({'user': null});
    });
  }

  /**
   * Returns if the user is logged into the application
   * Uses == instead of === due to the diference in behavior between the two
   * req - The request from the client.
   ********************************************************************************/
  isLoggedIn(req) {
    return (req.session.user == null);
  }

  /**
   * Registers a new user in the database
   * Expects the following request parameters:
   *  • username
   *  • email
   *  • password
   * req - The request from the client.
   ********************************************************************************/
  register(req) {
    return new Promise((resolve, reject) => {

      // Variables
      let username = this.getString(req.query.username);
      let password = this.getString(req.query.password);
      let email = this.getString(req.query.email);

      // Username Validation
      if (!this.isValidUsername(username)) {
        reject("You must provide a valid user name.");
        return;
      }

      // Email Validation
      if (!this.isValidEmail(email)) {
        reject("You must provide a valid email address.");
        return;
      }

      // Password Validation
      if (!this.isValidPassword(password)) {
        reject("You must provide a valid password.");
        return;
      }

      //Generate the password's hash
      let hash = bcrypt.hashSync(password, 12);

      // Query Variables
      let sql = 'INSERT INTO Users (Username, Email, PasswordHash) VALUES (?, ?, ?)';
      let args = [username, email, hash];

      //Query the database
      this.database.query(sql, args)
        .then(results => {

          //Log the user in
          this.doLogin(req, username, password)
            .then(result => resolve(result))
            .catch(error => reject(error));
        })
        .catch(error => {

          //Duplicate entry error
          if (error.code === 'ER_DUP_ENTRY') {

            // Duplicate username
            if (error.sqlMessage.includes("'Username'")) {
              reject("An account with this username is already registered");
              return;
            }

            // Duplicate email address
            if (error.sqlMessage.includes("'Email'")) {
              reject("An account with this email address is already registered");
              return;
            }
          }

          // Default Error Handling
          reject(error.sqlMessage);
        });
    });
  }

  /**
   * Returns a string from value provided
   * variable - The variable being formatted
   ********************************************************************************/
  getString(variable) {
    if (!variable) { return undefined; }
    return String(variable).trim();
  }

  /**
   * Returns if the email is considered valid
   * email - The provided email address
   ********************************************************************************/
  isValidEmail(email) {
    let regex = /^(([^<>()\[\]\\.,;:\s@"]+(\.[^<>()\[\]\\.,;:\s@"]+)*)|(".+"))@((\[[0-9]{1,3}\.[0-9]{1,3}\.[0-9]{1,3}\.[0-9]{1,3}\])|(([a-zA-Z\-0-9]+\.)+[a-zA-Z]{2,}))$/;
    if (!email || email.length == 0) { return false; }
    return regex.test(email.toLowerCase());
  }

  /**
   * Returns if the password is considered valid
   * password - The provided password
   ********************************************************************************/
  isValidPassword(password) {
    let regex = /(?=.*\d)(?=.*[!@#$])(?=.*[A-Z])(?=.{8,})/;
    if (!password || password.length == 0) { return false; }
    return regex.test(password);
  }

  /**
   * Returns if the username is considered valid
   * username - The provided username
   ********************************************************************************/
  isValidUsername(username) {
    if (!username || username.length == 0) { return false; }
    return true;
  }

  /**
   * Builds and returns a user object
   * dbObject - The database object being parsed out.
   ********************************************************************************/
  buildUser(dbObject) {
    return {
      id: dbObject.Id,
      email: dbObject.Email,
      username: dbObject.Username
    };
  }

  /**
   * Attempts to log the user in with the provided query parameters.
   * username - The username
   * password - The password
   ********************************************************************************/
  doLogin(req, username, password) {

    //SQL Variables
    let sql = `SELECT Id, Username, PasswordHash FROM Users WHERE Username = ?`;
    let args = [username];

    //Query the database
    return new Promise((resolve, reject) => {
      
      //Ensure we've provided a username
      if (!username || username.length === 0) {
        reject("You must provide a username");
        return;
      }

      //Ensure we've provided a password
      if (!password || password.length === 0) {
        reject("You must provide a password");
        return;
      }

      this.database.query(sql, args)
        .then(results => {
          // If the hashes match we have our user
          if(results.length == 1 && bcrypt.compareSync(password, results[0].PasswordHash)) {
            req.session.user = this.buildUser(results[0]);
            resolve(this.getCurrentUser(req));
          }
          else  {
            reject("Invalid username or password");
          }
        })
        .catch(error => reject(error.sqlMessage));
    });
  }
}

module.exports = User;
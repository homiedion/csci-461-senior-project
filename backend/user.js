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
   *  • questions - Use array notation ?questions[]=1&questions[]=2
   *  • answers - Use array notation ?answers[]=Answer One&answers[]=Answer Two
   * req - The request from the client.
   ********************************************************************************/
  register(req) {
    return new Promise((resolve, reject) => {

      // Variables
      let username = this.getString(req.query.username);
      let password = this.getString(req.query.password);
      let email = this.getString(req.query.email);
      let questions = req.query.questions;
      let answers = req.query.answers;

      // Username Validation
      if (!this.isValidUsername(username)) {
        reject("You must provide a valid username.");
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

      //Question validation
      if (!questions || questions.length < 2) {
        reject("You must select two security questions to register an account.");
        return;
      }

      for(let i = 0; i < questions.length; i++) {
        // Cast to integer
        questions[i] = this.getInt(questions[i]);

        // Ensure valid value is provided.
        if (questions[i] <= 0) {
          reject(`Question ${i} must be a positive integer`);
          return;
        }
      }

      if (questions[0] === questions[1]) {
        reject(`You must select two different security questions.`);
        return;
      }

      // Answer validation
      if (!answers || answers.length < 2) {
        reject("You must answer two security questions to register an account.");
        return;
      }

      for(let i = 0; i < answers.length; i++) {
        answers[i] = this.getString(answers[i]);

        // Ensure valid value is provided.
        if (!answers[i] || answers[i].length === 0) {
          reject(`Answer ${i} must be a valid`);
          return;
        }

        //Encrypt
        answers[i] = bcrypt.hashSync(answers[i], 12);
      }

      //Generate the password's hash
      let passwordHash = bcrypt.hashSync(password, 12);

      // Query Variables
      let sql = `
        INSERT INTO Users (Username, Email, PasswordHash, SecurityQuestionOne, SecurityQuestionTwo, SecurityAnswerHashOne, SecurityAnswerHashTwo)
         VALUES (?, ?, ?, ?, ?, ?, ?);
      `;
      let args = [username, email, passwordHash, questions[0], questions[1], answers[0], answers[1]];

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
   * Returns a int from value provided
   * variable - The variable being formatted
   ********************************************************************************/
  getInt(variable) {
    if (!variable) { return 0; }
    if (isNaN(variable)) { return 0; }
    return parseInt(String(variable).trim());
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
   * req - The request
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

  /**
   * Fetches a user's security questions from the database
   * Expects the following request parameters:
   *  • username
   * req - The request from the client.
   ********************************************************************************/
  fetchUserSecurityQuestions(req) {
    return new Promise((resolve, reject) => {

      // Variables
      let username = this.getString(req.query.username);

      // Username Validation
      if (!this.isValidUsername(username)) {
        reject("You must provide a valid username.");
        return;
      }

      // SQL Variables
      let sql = `
        SELECT
          A.Question AS 'QuestionOne',
          B.Question AS 'QuestionTwo'
        FROM Users
        LEFT JOIN SecurityQuestions A ON Users.SecurityQuestionOne = A.Id
        LEFT JOIN SecurityQuestions B ON Users.SecurityQuestionTwo = B.Id
        WHERE username = ?
      `;
      let args = [username];

      this.database.query(sql, args)
        .then(results => {

          // Failed to find match
          if (results.length === 0) {
            reject("Failed to find security questions for this user.");
            return;
          }

          // Success
          resolve({'userQuestions': [results[0].QuestionOne, results[0].QuestionTwo]});
        })
        .catch(error => reject(error.sqlMessage));
    });
  }

  /**
   * Registers a new user in the database
   * Expects the following request parameters:
   *  • username
   *  • password
   *  • answers - Use array notation ?questions[]=1&questions[]=2
   * req - The request from the client.
   ********************************************************************************/
  resetPassword(req) {
    return new Promise((resolve, reject) => {

      // Variables
      let username = this.getString(req.query.username);
      let password = this.getString(req.query.password);
      let answers = req.query.answers;


      // Username Validation
      if (!this.isValidUsername(username)) {
        reject("You must provide a valid username.");
        return;
      }

      // Password Validation
      if (!this.isValidPassword(password)) {
        reject("Your new password must be valid.");
        return;
      }

      // Answer validation
      if (!answers || answers.length < 2) {
        reject("You must answer the two security questions assigned to this account.");
        return;
      }

      for(let i = 0; i < answers.length; i++) {
        answers[i] = this.getString(answers[i]);

        // Ensure valid value is provided.
        if (!answers[i] || answers[i].length === 0) {
          reject(`Answer ${i} must be a valid`);
          return;
        }
      }

      // SQL Variables
      let sql = `
        SELECT
          SecurityAnswerHashOne AS 'AnswerOne',
          SecurityAnswerHashTwo AS 'AnswerTwo'
        FROM Users
        WHERE Username = ?
      `;
      let args = [username];

      // Query the database and validate the questions
      this.database.query(sql, args)
        .then(result => {
          // Ensure valid answers were provided
          if(result.length !== 1 ||
            !bcrypt.compareSync(answers[0], result[0].AnswerOne) ||
            !bcrypt.compareSync(answers[1], result[0].AnswerTwo)) {
            reject("Failed to change the password. Check the username and answers you provided.");
          }
          
          // Update the password
          sql = `UPDATE Users SET PasswordHash = ? WHERE Username = ?`;
          args = [bcrypt.hashSync(password, 12), username];

          // Update the database
          this.database.query(sql, args)
            .then(result => resolve({'success' : "Password successfully changed!"}))
            .catch(error => reject(error));
        })
        .catch(error => reject(error));
    });
  }
}

module.exports = User;
const mysql = require("mysql");

class Database {
  /**
   * Constructor
   * config - The database configuration we're using
   ********************************************************************************/
  constructor(config) {
    this.connection = mysql.createConnection(config);
    this.connection.connect(function(err) {
      if (err) { throw new Error("Error connecting to database: " + err.message); }
    });

    // Converstions: Latitude and Longitude to mile
    this.latitudeToMiles = 1.0 / 69.0;
    this.longitudeToMiles = 1.0 / 54.6;
  }

  /**
   * Queries the database
   * sql - The sql being executed
   * args - The arguments to substitute into the sql statement
   ********************************************************************************/
  query(sql, args) {
    return new Promise((resolve, reject) => {
      this.connection.query(sql, args, function(err, dbResult) {
        if (err) { reject(err); }
        resolve(dbResult);
      });
    });
  }

  /**
   * Fetches the animal types stored within the database.
   ********************************************************************************/
  fetchAnimals() {
    return new Promise((resolve, reject) => {
      
      let sql = `
        SELECT Id, Name, Icon
        FROM Animals
      `;
      let args = [];

      this.query(sql, args)
        .then(results => {

          let animals = [];
            
          for(let i = 0; i < results.length; i++) {
            animals.push({
              "Id" : results[i].Id,
              "Name" : results[i].Name,
              "Icon" : results[i].Icon
            });
          }

          resolve({'animals': animals});
        })
        .catch(error => reject(error.sqlMessage));
    });
  }

  /**
 * Fetches the waypoints from the database
 * Expects the following request parameters:
 *  • latitude
 *  • longitude
 *  • range
 * req - The request from the client.
 ********************************************************************************/
  fetchWaypoints(req) {
    return new Promise((resolve, reject) => {
      
      let lat = req.query.latitude;
      let lng = req.query.longitude;
      let range = req.query.range;

      // Validity check for latitude
      if (!lat || isNaN(lat)) {
        reject("You must provide a numeric latitude.");
        return;
      }
      lat = parseFloat(lat);

      // Validity check for longitude
      if (!lng || isNaN(lng)) {
        reject("You must provide a numeric longitude.");
        return;
      }
      lng = parseFloat(lng);

      // Validity check for longitude
      if (!range || isNaN(range)) {
        reject("You must provide a search range (miles).");
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
        WHERE ABS(ST_X(Coordinate) - ${lat}) <= ${this.latitudeToMiles * range}
          AND ABS(ST_Y(Coordinate) - ${lng}) <= ${this.longitudeToMiles * range}
      `;
      let args = [];

      //Query the database
      this.query(sql, args)
        .then(results => {

          let waypoints = [];
            
          for(let i = 0; i < results.length; i++) {
            waypoints.push({
              "User" : results[i].User,
              "Animal" : {
                "Name" : results[i].Animal,
                "Icon" : results[i].Icon,
              },
              "Location" : {
                "Latitude" : results[i].Latitude,
                "Longitude" : results[i].Longitude
              }
            });
          }

          resolve({'waypoints': waypoints});
        })
        .catch(error => reject(error.sqlMessage));
    });
  }
}

module.exports = Database;
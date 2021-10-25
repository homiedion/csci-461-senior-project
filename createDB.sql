DROP DATABASE IF EXISTS FluffleDB;
CREATE DATABASE FluffleDB;
use FluffleDB;

-- Create the User Table
CREATE TABLE Users (
  Id INT AUTO_INCREMENT PRIMARY KEY,
  Username VARCHAR(50) NOT NULL UNIQUE,
  Email VARCHAR(255) NOT NULL UNIQUE,
  PasswordHash VARCHAR(255) NOT NULL
);

-- TODO: Remove test data one appropriate
-- Users will be able to register their own accounts
INSERT INTO Users(Username, Email, PasswordHash) VALUES
('Test', 'Test@Test.com', 'Placeholder')
;

-- Create the Animal Table
CREATE TABLE Animals (
  Id INT AUTO_INCREMENT PRIMARY KEY,
  Name VARCHAR(50) NOT NULL UNIQUE,
  Icon VARCHAR(255) NOT NULL
);

-- TODO: Remove test data one appropriate
-- Animals will be procedurally generated from the available icons
-- Alternatively they will be manually added by an administrator
/*
  https://cdn-icons-png.flaticon.com/...
  https://cdn-icons-png.flaticon.com/512/1998/1998592.png
*/
INSERT INTO Animals(Name, Icon) VALUES
('Rabbit', 'https://cdn-icons-png.flaticon.com/512/1998/1998765.png'),
('Cat', 'https://cdn-icons-png.flaticon.com/512/1998/1998592.png'),
('Bear', 'https://cdn-icons-png.flaticon.com/512/1998/1998571.png');

-- Create the Location Table
CREATE TABLE Locations (
  Id INT AUTO_INCREMENT PRIMARY KEY,
  UserId INT NOT NULL,
  AnimalId INT NOT NULL,
  Coordinate POINT NOT NULL,
  Datestamp DATE NOT NULL,
  FOREIGN KEY (UserId) REFERENCES Users(Id),
  FOREIGN KEY (AnimalId) REFERENCES Animals(Id)
);

-- TODO: Remove test data one appropriate
-- Users will be able to submit locations
INSERT INTO Locations(UserId, AnimalId, Coordinate, Datestamp) VALUES
(1, 1, Point(42.463451, -73.300125), DATE_SUB(CURRENT_DATE(), INTERVAL 15 DAY)),
(1, 2, Point(42.463617, -73.300807), DATE_SUB(CURRENT_DATE(), INTERVAL 7 DAY)),
(1, 3, Point(42.463455, -72.299476), CURRENT_DATE()),
(1, 3, Point(41.462928, -73.297000), CURRENT_DATE())
;

-- Creates the event to remove old data
-- At the designated interval the database will remove
-- locations that are older than a certain number of days
CREATE EVENT IF NOT EXISTS FluffleLocationCleanse
  ON SCHEDULE EVERY 1 DAY
  DO
    DELETE FROM Locations
    WHERE DATEDIFF(CURRENT_DATE, Datestamp) > 7;

/*
  The following should be removed later in development.
  They are here to provide references for future server sql calls
*/

-- Fetches a collection of data regarding the locations within a certain range
-- One degree of latitude equals approximately 364,000 feet (69 miles) (1/69 mile = Approx 0.0145)
-- One-degree of longitude equals 288,200 feet (54.6 miles) (1/54.6 = Approx 0.0183)
-- Going with a 5 mile radius (0.0915, 0.0725)
SELECT
  Users.Username AS 'User',
  Animals.Name AS 'Animal',
  ST_X(Coordinate) AS 'Latitude',
  ST_Y(Coordinate) AS 'Longitude',
  ABS(ST_X(Coordinate) - 42.463083) As 'Distance (x)',
  ABS(ST_Y(Coordinate) - -73.300193) As 'Distance (y)',
  Datestamp As 'Date'
FROM Locations
JOIN Animals ON Animals.Id = Locations.AnimalId
JOIN Users ON Users.Id = Locations.UserId
WHERE ABS(ST_X(Coordinate) - 42.463083) <= 0.0915
  AND ABS(ST_Y(Coordinate) - -73.300193) <= 0.0725
;
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
  ImgLink VARCHAR(255) NOT NULL
);

-- TODO: Remove test data one appropriate
-- Animals will be procedurally generated from the available icons
-- Alternatively they will be manually added by an administrator
/*
  https://cdn-icons-png.flaticon.com/...
  https://cdn-icons-png.flaticon.com/512/1998/1998592.png
*/
INSERT INTO Animals(Name, ImgLink) VALUES
('Rabbit', 'https://cdn-icons-png.flaticon.com/512/1998/1998765.png'),
('Cat', 'https://cdn-icons-png.flaticon.com/512/1998/1998592.png'),
('Bear', 'https://cdn-icons-png.flaticon.com/512/1998/1998571.png')
;

-- Create the Location Table
-- Hint: MYSQL expects that Point be in the form of Point(Lng, Lat)
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
(1, 1, Point(42.463451, -73.300125), DATE_SUB(CURRENT_DATE(), INTERVAL 7 DAY)),
(1, 1, Point(42.463451, -73.300125), CURRENT_DATE())
;

-- Creates the event to remove old data
-- At the designated interval the database will remove
-- locations that are older than a certain number of days
CREATE EVENT IF NOT EXISTS FluffleLocationCleanse
  ON SCHEDULE EVERY 1 DAY
  DO
    DELETE FROM Locations
    WHERE DATEDIFF(CURRENT_DATE, Datestamp) > 7

/*
  The following should be removed later in development.
  They are here to provide references for future server sql calls
*/

-- Fetches a collection of data regarding the locations within a certain range
-- Hint: We can use the Haversine formula (https://stackoverflow.com/questions/21042418/mysql-select-coordinates-within-range/21043061)
-- $sql = "SELECT *, ( 3959 * acos( cos( radians(" . $lat . ") ) * cos( radians( lat ) ) * cos( radians( lng ) - radians(" . $lng . ") ) + sin( radians(" . $lat . ") ) * sin( radians( lat ) ) ) ) AS distance FROM your_table HAVING distance < 5";
SELECT
  Users.Username AS 'User',
  Animals.Name AS 'Animal',
  ST_X(Coordinate) AS 'Longitude',
  ST_Y(Coordinate) AS 'Latitude',
  Datestamp As 'Date',
FROM Locations
JOIN Animals ON Animals.Id = Locations.AnimalId
JOIN Users ON Users.Id = Locations.UserId 
;
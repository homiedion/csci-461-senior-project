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
('Test', 'Test@Test.com', '$2b$12$ku1PodoIC8U9uAN7cdlFEedAM.4BROp3fLSCgpGS1sllMCLTpppbK')
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

-- Create the Waypoints Table
CREATE TABLE Waypoints (
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
INSERT INTO Waypoints(UserId, AnimalId, Coordinate, Datestamp) VALUES
((SELECT Id FROM Users WHERE Username = "Test"), (SELECT Id FROM Animals WHERE Name = "Bear"), Point(42.661804, -73.152981), DATE_SUB(CURRENT_DATE(), INTERVAL 15 DAY)),
((SELECT Id FROM Users WHERE Username = "Test"), (SELECT Id FROM Animals WHERE Name = "Rabbit"), Point(42.708520, -73.1070), DATE_SUB(CURRENT_DATE(), INTERVAL 7 DAY)),
((SELECT Id FROM Users WHERE Username = "Test"), (SELECT Id FROM Animals WHERE Name = "Cat"), Point(42.691801, -73.106160), CURRENT_DATE()),
((SELECT Id FROM Users WHERE Username = "Test"), (SELECT Id FROM Animals WHERE Name = "Bear"), Point(42.680878, -73.113681), CURRENT_DATE())
;

-- Creates the event to remove old data
-- At the designated interval the database will remove
-- locations that are older than a certain number of days
CREATE EVENT IF NOT EXISTS FluffleWaypointCleanse
  ON SCHEDULE EVERY 1 DAY
  DO
    DELETE FROM Waypoints
    WHERE DATEDIFF(CURRENT_DATE, Datestamp) > 7;

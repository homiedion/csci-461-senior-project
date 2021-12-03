DROP DATABASE IF EXISTS FluffleDB;
CREATE DATABASE IF NOT EXISTS FluffleDB;
use FluffleDB;

/* 
 * Creates the security questions table
 *****************************************************************************/
CREATE TABLE SecurityQuestions (
  Id INT AUTO_INCREMENT PRIMARY KEY,
  Question VARCHAR(255) NOT NULL UNIQUE
);

INSERT INTO SecurityQuestions(Question) VALUES
  ("What city were you born in?"),
  ("What is your oldest sibling's middle name?"),
  ("What was the first concert you attended?"),
  ("What was the make and model of your first car?"),
  ("In what city or two did your parents meet?"),
  ("What was the first exam you failed?"),
  ("What was the name of your first stuffed animal?"),
  ("What is the middle name of your youngest child?"),
  ("Where were you when you had your first kiss?"),
  ("In what city or town did you meet your spouse/significant other?");

/* 
 * Creates the user table
 *****************************************************************************/
CREATE TABLE Users (
  Id INT AUTO_INCREMENT PRIMARY KEY,
  Username VARCHAR(50) NOT NULL UNIQUE,
  Email VARCHAR(255) NOT NULL UNIQUE,
  PasswordHash VARCHAR(255) NOT NULL,
  SecurityQuestionOne INT NOT NULL,
  SecurityQuestionTwo INT NOT NULL,
  SecurityAnswerHashOne VARCHAR(255) NOT NULL,
  SecurityAnswerHashTwo VARCHAR(255) NOT NULL,
  FOREIGN KEY (SecurityQuestionOne) REFERENCES SecurityQuestions(Id),
  FOREIGN KEY (SecurityQuestionTwo) REFERENCES SecurityQuestions(Id)
);

/* 
 * Creates the animal table
 *****************************************************************************/
CREATE TABLE Animals (
  Id INT AUTO_INCREMENT PRIMARY KEY,
  Name VARCHAR(50) NOT NULL UNIQUE,
  Icon VARCHAR(255) NOT NULL UNIQUE
);

INSERT INTO Animals(Name, Icon) VALUES
  ('Ant', './assets/icons/ant.png'),
  ('Bear', './assets/icons/bear.png'),
  ('Beaver', './assets/icons/beaver.png'),
  ('Bee', './assets/icons/bee.png'),
  ('Bird', './assets/icons/bird.png'),
  ('Cat', './assets/icons/cat.png'),
  ('Cow', './assets/icons/cow.png'),
  ('Crab', './assets/icons/crab.png'),
  ('Deer', './assets/icons/deer.png'),
  ('Dog', './assets/icons/dogs.png'),
  ('Dolphin', './assets/icons/dolphin.png'),
  ('Fox', './assets/icons/fox.png'),
  ('Frog', './assets/icons/frog.png'),
  ('Hen', './assets/icons/hen.png'),
  ('Horse', './assets/icons/horse.png'),
  ('Jellyfish', './assets/icons/jellyfish.png'),
  ('Lion', './assets/icons/lion.png'),
  ('Panda', './assets/icons/panda.png'),
  ('Penguin', './assets/icons/penguin.png'),
  ('Rabbit', './assets/icons/rabbit.png'),
  ('Raccoon', './assets/icons/raccoon.png'),
  ('Seagull', './assets/icons/seagull.png'),
  ('Snake', './assets/icons/snake.png'),
  ('Turtle', './assets/icons/turtle.png'),
  ('Wasp', './assets/icons/wasp.png'),
  ('Whale', './assets/icons/whale.png'),
  ('Wolf', './assets/icons/wolf.png');

/* 
 * Creates the waypoints table
 *****************************************************************************/
CREATE TABLE Waypoints (
  Id INT AUTO_INCREMENT PRIMARY KEY,
  UserId INT NOT NULL,
  AnimalId INT NOT NULL,
  Coordinate POINT NOT NULL,
  Datestamp DATE NOT NULL,
  FOREIGN KEY (UserId) REFERENCES Users(Id),
  FOREIGN KEY (AnimalId) REFERENCES Animals(Id)
);

/* 
 * Creates an event that automatically purges waypoints that exceed a certain
 * age.
 *****************************************************************************/
CREATE EVENT IF NOT EXISTS FluffleWaypointCleanse
  ON SCHEDULE EVERY 1 DAY
  DO
    DELETE FROM Waypoints
    WHERE DATEDIFF(CURRENT_DATE, Datestamp) > 7;

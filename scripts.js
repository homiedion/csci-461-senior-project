$(document).ready(function() {

  /*
   * Variables
   ********************************************************************************/
  let model = {};

  /*
   * Initializes the model
   ********************************************************************************/
  function initializeModel() {
    model.error = "";
    model.user = null;
    model.map = null;
    model.results = {};
    model.questionOne = "";
    model.questionTwo = "";
  }

  /*
   * Updates the view based on the data stored on the page.
   ********************************************************************************/
  function updateView() {

    // Display Errors
    $("#error").empty();
    if(model.error) { $("#error").text(model.error); }

    // Alters the display based on if the user is authenticated.
    if(model.user) {
      $(".authenticated-element").show();
      $(".unauthenticated-element").hide();
      $("#nav-welcome").text(`Hello ${model.user.username}`);
    }
    else {
      $(".authenticated-element").hide();
      $(".unauthenticated-element").show();
    }

    if(model.map && model.user)
    {
      $("#createMarker").show();
      model.map.on("singleclick", function(event)
      {
        let coordinate = ol.proj.transform(event.coordinate, "EPSG:3857", "EPSG:4326");
        $("#longitude").val(coordinate[0]);
        $("#latitude").val(coordinate[1]);
      });
    }
    else
      $("#createMarker").hide();

    $("#question-one").empty();
    $("#question-two").empty();
    for (let question in model.securityQuestions)
    {
      let questionOneOption = $("<option></option>");
      let questionTwoOption = $("<option></option>");
      questionOneOption.attr("value", model.securityQuestions[question].Id);
      questionOneOption.text(model.securityQuestions[question].Question);
      questionTwoOption.attr("value", model.securityQuestions[question].Id);
      questionTwoOption.text(model.securityQuestions[question].Question);

      if (question == 0)
      {
        questionOneOption.attr("selected", true);
        questionTwoOption.attr("disabled", true);
      }
      if (question == 1)
      {
        questionOneOption.attr("disabled", true);
        questionTwoOption.attr("selected", true);
      }

      $("#question-one").append(questionOneOption);
      $("#question-two").append(questionTwoOption);
    }

    $("#animals").empty();
    for(let animal in model.results.animals)
    {
      let animalOption = $("<option></option>");
      animalOption.attr("value", model.results.animals[animal].Id);
      animalOption.text(model.results.animals[animal].Name);

      $("#animals").append(animalOption);
    }
  }

  /*
   * Sends an ajax request to the server
   * url - The url the request is being sent to
   * callback - An optional function to call when we"ve finished
   ********************************************************************************/
  function sendRequest(url, callback) {

    //Variables
    let jqxhr = $.get(url);

    //Send the request
    jqxhr.done(function(json) {
      if(json.error !== undefined) {model.error = json.error;} else { model.error = ""; }
      if(json.user !== undefined) {model.user = json.user;}
      if(json.securityQuestions !== undefined) {model.securityQuestions = json.securityQuestions;}
      if(json.userQuestions !== undefined) {model.results.userQuestions = json.userQuestions;}
      if(json.result !== undefined) {model.results = json.result;}
      if(json.waypoints !== undefined) {model.results.waypoints = json.waypoints;}
      if(json.animals !== undefined) {model.results.animals = json.animals;}
      if(callback !== undefined) { callback(); }

      model.questionOne = json.questionOne;
      model.questionTwo = json.questionTwo;
      model.answerOne = json.answerOne;
      model.answerTwo = json.answerTwo;

      updateView();
    });

    jqxhr.fail(function(json) {
      let error = JSON.stringify(json);
      model.error = error;
      updateView();
    });
  }

  /*
   * Register Button Click
   ********************************************************************************/
  $("#register-button").click(function() {
    $("#register-error").empty();
    let email = $("#register-email").val().trim();
    let username = $("#register-username").val().trim();
    let password = $("#register-password").val().trim();
    let questions = [$("#question-one").val(), $("#question-two").val()];
    let answers = [$("#answer-one").val().toLowerCase().trim(), $("#answer-two").val().toLowerCase().trim()];

    let url = `register?email=${email}&username=${username}&password=${password}`;
    for(let i = 0; i < questions.length; i++) { url += `&questions[]=${questions[i]}`; }
    for(let i = 0; i < answers.length; i++) { url += `&answers[]=${answers[i]}`; }
    sendRequest(url);

    $("#register-modal").modal("hide");
  });

  /*
   * Login Button Click
   ********************************************************************************/
  $("#login").click(function() {
    $("#login-error").empty();
    let username = $("#login-username").val().trim();
    let password = $("#login-password").val().trim();

    sendRequest("login?username=" + username + "&password=" + password);
    $(".dropdown").hide();
  });

  /*
   * Logout Button Click
   ********************************************************************************/
  $("#logout").click(function() {
      sendRequest("logout");
  });

  $("#register-button").click(function()
  {
    $("#register-email").val("");
    $("#register-username").val("");
    $("#register-password").val("");
    $("#answer-one").val("");
    $("#answer-two").val("");
    $("#register-error").empty();
    $("#register-modal").modal("show");
  });

  $("#login").click(function()
  {
    $("#login-username").val("");
    $("#login-password").val("");
    $("#login-error").empty();
  });

  $("#forgotPassword").click(function()
  {
    $("#login-error").empty();
    let username = $("#login-username").val().trim();

    sendRequest("fetchUserSecurityQuestions?username=" + username, function ()
    {
      if (model.loginError == undefined || model.loginError == "")
      {
        $("#modal-question-one").text(model.results.userQuestions[0]);
        $("#modal-question-two").text(model.results.userQuestions[1]);
        $("#login-modal").modal("hide");
        $("#security-modal").modal("show");
        model.email = email;
      }
      else
        $("#login-error").text(model.loginError);
    });
  });

  $("#submit-answers-button").click(function()
  {
    $("#security-question-error").empty();
    let username = $("#login-username").val().trim();
    let password = $("#password-text").val().trim();
    let answers = [$("#modal-answer-one").val().toLowerCase().trim(), $("#modal-answer-two").val().toLowerCase().trim()];
    sendRequest("resetPassword?username=" + username + "&password=" + password + "&answers[]=" + answers[0] + "&answers[]=" + answers[1], function ()
    {
      if (model.securityQuestionError == undefined || model.securityQuestionError == "")
      {
        $("#password-text").val("");
        $("#modal-answer-one").val("");
        $("#modal-answer-two").val("");
        $("#security-modal").modal("hide");
      }
      else
        $("#security-question-error").text(model.securityQuestionError);
    });
  });

  /*
   * Map Navigation Button Click
   * TODO: Consider using promises or callbacks when adding markers.
   * TODO: Fetch waypoints from the database and display them.
   *       We might need to use the callback function of sendRequest(url, callback)
   *       to display the map once the request is finished
   *
   * TODO: When the map moves/updates we need to fetch the waypoints again and display them.
   ********************************************************************************/
  $("#map-button").click(function() {
    if (!model.map) { showMap(); }
  });

  /*
   * Initializes the map around the provided coordinates.
   * coords - An array containing the longitude and latitude
   */
  function initMap(coords) {
    model.map = new ol.Map({
      target: "map",
      layers:
      [
        new ol.layer.Tile({
          source: new ol.source.OSM()
        })
      ],
      view: new ol.View({
        center: ol.proj.fromLonLat(coords),
        zoom: 15
      })
    });

    getWayPoints();
  }

  /*
   * Shows the map with the user"s coordinates if possible
   ********************************************************************************/
  function showMap() {
    let defaultCoordinates = [-73.1087, 42.7009]; // North Adams

    if (window.navigator.geolocation) {
      window.navigator.geolocation
        .getCurrentPosition(
          geoPos => {
            initMap([geoPos.coords.longitude, geoPos.coords.latitude]);
          },
          error => {
            model.error = "" + error.message;
            updateView();
            initMap(defaultCoordinates);
          }
        );
    }

    else {
      model.error = "Your browser does not support geolocation services";
      updateView();
      initMap(defaultCoordinates);
    }
  }

  /*
   * Adds a marker to the map
   * coords - An array containing the longitude and latitude
   * SEE: https://openstreetmap.be/en/projects/howto/openlayers.html
   * SEE: https://openlayers.org/en/latest/examples/icon.html
   ********************************************************************************/
  function createMarkers(coordinates)
  {
    for(let i in model.results.waypoints)
    {
      let coords = [model.results.waypoints[i].Location.Longitude, model.results.waypoints[i].Location.Latitude];
      let user = model.results.waypoints[i].User;
      let animal = model.results.waypoints[i].Animal.Name;
      let content = "<b>Seen by User: </b>"+ user + "<br/><b>Animal: </b>" + animal + "<br/><b>Location: </b>"+ coords;
      let layer = new ol.layer.Vector({
        source: new ol.source.Vector({
          features: [
            new ol.Feature({
              desc: content,
              geometry: new ol.geom.Point(ol.proj.fromLonLat(coords))
            })
          ]
        })
      });
      model.map.addLayer(layer);
    }
  }

  // makes popup
  function initilizePopUp()
  {
    let container = document.getElementById("popup");
    let content = document.getElementById("popup-content");
    let closer = document.getElementById("popup-closer");

    let overlay = new ol.Overlay({
      element: container,
      autoPan: true,
      autoPanAnimation: {
        duration: 250
      }
    });

    model.map.addOverlay(overlay);
    closer.onclick = function() {
    overlay.setPosition(undefined);
    closer.blur();
    return false;
   };

   model.map.on("singleclick", function (event)
   {
     let layer;
     let feature = model.map.forEachFeatureAtPixel(event.pixel, function(feature){
       return feature;
     },
     {
       layerFilter: function(candidate){
         layer = candidate;
         return true;
       }
     });
     if(feature)
     {
       let coordinate = event.coordinate;
       content.innerHTML = feature.get("desc");
       overlay.setPosition(coordinate);
     }
     else
     {
       overlay.setPosition(undefined);
       closer.blur();
     }
   });
  }

  function getWayPoints()
  {
    let markers = [];
    model.map.on("moveend", function(events)
    {
      let center = ol.proj.toLonLat(model.map.getView().getCenter());
      let lon = center[0];
      let lat = center[1];
      let range = 50;

      sendRequest("fetchWaypoints?latitude=" + lat + "&longitude=" + lon + "&range=" + range, function()
      {
        for(let i in model.results.waypoints)
        {
          markers.push(model.results.waypoints[i]);
        }
        createMarkers(markers);
      });
    });
    // initialize popup
    initilizePopUp();
  }

  // insert waypoint into database
  $("#createMarkerButton").click(function()
  {
    let animal = $("#animals").val().trim();
    let latitude = $("#latitude").val().trim();
    let longitude = $("#longitude").val().trim();

    sendRequest("insertWaypoint?latitude=" + latitude + "&longitude=" + longitude + "&animalId=" + animal, function()
    {
      $("#latitude").val("");
      $("#longitude").val("");
    });
    getWayPoints();
  });

  /*
   * Once everything is setup initialize the model and update the view
   ********************************************************************************/
  initializeModel();
  sendRequest("whoIsLoggedIn");
  sendRequest("fetchAnimals");
  sendRequest("fetchSecurityQuestions");
});

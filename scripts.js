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
  }

  /* 
   * Updates the view based on the data stored on the page.
   ********************************************************************************/
  function updateView() {

    // Display Errors
    if(model.error) {
      $("#error").text(model.error);
    }

    // Alters the display based on if the user is authenticated.
    if(model.user) {
      $(".authenticated-element").show();
      $(".unauthenticated-element").hide();
    }
    else {
      $(".authenticated-element").hide();
      $(".unauthenticated-element").show();
    }
  }

  /* 
   * Sends an ajax request to the server
   * url - The url the request is being sent to
   * callback - An optional function to call when we've finished
   ********************************************************************************/
  function sendRequest(url, callback) {

    //Variables
    let jqxhr = $.get(url);

    //Send the request
    jqxhr.done(function(json) {
      model.error = "";
      if(json.error != undefined) { model.error = json.error; }
      if(json.user != undefined) { model.user = json.user; }
      if(callback != undefined) { callback(); }
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
  $("#registerButton").click(function() {
    $("#registerError").empty();
    let email = $("#registerEmail").val().trim();
    let username = $("#registerUsername").val().trim();
    let password = $("#registerPassword").val().trim();

    sendRequest("register?email=" + email + "&username=" + username + "&password=" + password);
    $("#registerModal").modal("hide");
  });

  /* 
   * Login Button Click
   ********************************************************************************/
  $("#login").click(function() {
    $("#loginError").empty();
    let username = $("#loginUsername").val().trim();
    let password = $("#loginPassword").val().trim();

    sendRequest("login?username=" + username + "&password=" + password);
    $(".dropdown").hide();
  });

  /* 
   * Logout Button Click
   ********************************************************************************/
  $("#logout").click(function() {
      sendRequest("logout");
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
  $("#mapButton").click(function() {
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

    //Testing
    addMapMaker([-73.1087, 42.7009]);
  }

  /* 
   * Shows the map with the user's coordinates if possible
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
            initMap(defaultCoordinates)
          }
        );
    }

    else {
      model.error = "Your browser does not support geolocation services";
      updateView();
      initMap(defaultCoordinates)
    }
  }

  /* 
   * Adds a marker to the map
   * coords - An array containing the longitude and latitude
   * SEE: https://openstreetmap.be/en/projects/howto/openlayers.html
   * SEE: https://openlayers.org/en/latest/examples/icon.html
   ********************************************************************************/
  function addMapMaker(coords) {
    let layer = new ol.layer.Vector({
      source: new ol.source.Vector({
        features: [
          new ol.Feature({
            geometry: new ol.geom.Point(ol.proj.fromLonLat(coords))
          })
        ]
      })
    });
    model.map.addLayer(layer);
  }

  /* 
   * Once everything is setup initialize the model and update the view
   ********************************************************************************/
  initializeModel();
  sendRequest("whoIsLoggedIn");
});

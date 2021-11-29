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
   * callback - An optional function to call when we"ve finished
   ********************************************************************************/
  function sendRequest(url, callback) {

    //Variables
    let jqxhr = $.get(url);

    //Send the request
    jqxhr.done(function(json) {
      if(json.error !== undefined)
        model.error = json.error;
      if(json.user !== undefined)
        model.user = json.user;
      if(json.result !== undefined)
        model.results = json.result;
      if(json.waypoints !== undefined)
        model.results.waypoints = json.waypoints;
      if(callback !== undefined) { callback(); }
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

    sendRequest("register?email=" + email + "&username=" + username + "&password=" + password);
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

  /*
   * Once everything is setup initialize the model and update the view
   ********************************************************************************/
  initializeModel();
  sendRequest("whoIsLoggedIn");
});

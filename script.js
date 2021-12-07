/*
 * Variables
 *****************************************************************************/
let model = {
  'error' : "",
  'user' : null,
  'map' : null,
  'waypoints' : null,
  'icons' : null,
};

/*
 * Once everything is setup this function is run.
 *****************************************************************************/
function init() {
  sendRequest("whoIsLoggedIn");
  sendRequest("fetchAnimals", updateAnimals);
  sendRequest("fetchSecurityQuestions", updateSecurityQuestions);
  updateView();
}

/*
 * Updates the view based on the data stored within the model.
 *****************************************************************************/
function updateView() {
  if (model.error) { displayError(model.error); }
  displayAuthState();
}

/*
 * Sends an ajax request to the server
 * url - The url the request is being sent to
 * callback - A callback that's passed the json from the server.
 ********************************************************************************/
function sendRequest(url, callback) {
  // Variables
  let jqxhr = $.get(url);

  // Reset error state
  model.error = "";

  // Successful request
  jqxhr.done(json => {

    // Catch any important data
    if (json.error !== undefined) { model.error = json.error; }
    if (json.user !== undefined) { model.user = json.user; }
    if (json.waypoints !== undefined) { model.waypoints = json.waypoints; }

    // Trigger the optional callback
    if (callback) { callback(json); }
  });

  // Failed Request
  jqxhr.fail(error => {
    model.error = JSON.stringify(error);
    updateView();
  });
}

/*
 * Alters the view based on whether or not the user is authenticated.
 *****************************************************************************/
function displayAuthState() {
  if(model.user) {
    $(".authenticated-element").show();
    $(".unauthenticated-element").hide();
    $("#nav-welcome").text(`Hello ${model.user.username}`);
    showMap();
  }
  else {
    $(".authenticated-element").hide();
    $(".unauthenticated-element").show();
    $("#popup").hide();
    hideMap();
  }
}

/*
 * Displays the possible security questions for registering users
 * json - The json provided by sendRequest()'s callback.
 *****************************************************************************/
function updateSecurityQuestions(json) {
  // Exit if no questions provided
  if (!json.securityQuestions) { return; }

  // Clear out the existing questions
  $("#question-one").empty();
  $("#question-two").empty();

  // Build the security questions available for registration.
  for(let i = 0; i < json.securityQuestions.length; i++) {

    let question = json.securityQuestions[i];
    let q1 = $(`<option value=${question.Id}>${question.Question}</option>`);
    let q2 = $(`<option value=${question.Id}>${question.Question}</option>`);

    if (i === 0) {
      q1.attr("selected", true);
      q2.attr("disabled", true);
    }
    else if (i === 1) {
      q1.attr("disabled", true);
      q2.attr("selected", true);
    }

    $("#question-one").append(q1);
    $("#question-two").append(q2);
  }
}

/*
 * Displays the possible security questions for registering users
 * json - The json provided by sendRequest()'s callback.
 *****************************************************************************/
function updateAnimals(json) {
  // Exit if no questions provided
  if (!json.animals) { return; }

  // Build the list of animals
  for(let animal of json.animals) {
    let option = $(`<option value=${animal.Id}>${animal.Name}</option>`);
    $("#animals").append(option);
  }
}

/*
 * Disables matching options between two selectors
 *****************************************************************************/
function disableMatchingOption(source, target) {
  let selected = $(`#${source}`).val();
  $(`#${target} > option`).each(function() {
    if (selected == this.value) { this.disabled = true; }
    else { this.disabled= false; }
  });
}

/*
 * Displays an error on the view
 *****************************************************************************/
function displayError(error) {
  alert(error);
}

/*
 * Initializes the map within the model.
 * coords - An array that represents the coordinates [Lng, Lat]
 *****************************************************************************/
function initMap(coords) {

  // Variables
  let container = document.getElementById("popup");
  let closer = document.getElementById("popup-closer");
  let content = document.getElementById("popup-content");

  // Initialize the map layer
  let mapLayer = new ol.layer.Tile({
    source: new ol.source.OSM(),
  });

  // Initalize the icon layer
  let vectorSource = new ol.source.Vector({});
  let vectorLayer = new ol.layer.Vector({'source': vectorSource});
  icons = vectorSource;

  // Initialize the view
  let view = new ol.View({
    'center': ol.proj.fromLonLat(coords),
    'zoom': 17
  });

  // Initalize the overlay
  let overlay = new ol.Overlay({
    'element': container,
    'autoPan': true,
    'autoPanAnimation': { 'duration': 250 },
  });

  // Initalize the map object
  model.map = new ol.Map({
    'target': "map",
    'layers': [mapLayer, vectorLayer],
    'overlays' : [overlay],
    'view': view
  });

  // Listen for clicks on the map
  model.map.on("singleclick", function(event) {
    let coordinate = ol.proj.transform(event.coordinate, "EPSG:3857", "EPSG:4326");
    $("#longitude").val(coordinate[0]);
    $("#latitude").val(coordinate[1]);
  });

  // Listen for the map moving
  model.map.on("moveend", function(event) {
    getWaypoints();
  });

  // Add on click function to closer
  // BUG: Somewhere the popup is being deleted and causing this to throw an error.
  //      Attempting to readd the popup breaks the onclick, position doesn't reset itself
  if ($("#popup").length === 0) {
    $("body").append(`
      <div id="popup" class="ol-popup">
        <a href="#" id="popup-closer" class="ol-popup-closer"></a>
        <div id="popup-content"></div>
      </div>
    `);
  }
  document.getElementById("popup-closer").onclick = function() {
    overlay.setPosition(undefined);
    return false;
  };

  // Listen for the map being clicked
  model.map.on("singleclick", function (event) {

    // Variables
    let layer;
    let pixel = event.pixel;
    let pixelCallback = function(feature) { return feature; }
    let filterCallback = function(candidate) {
        layer = candidate;
        return true;
      }
    let options = { layerFilter: filterCallback };
    let feature = model.map.forEachFeatureAtPixel(pixel, pixelCallback, options);
    let content = document.getElementById("popup-content");
    let closer = document.getElementById("popup-closer");

    if (feature) {
     let coordinate = event.coordinate;
     content.innerHTML = feature.get("desc");
     overlay.setPosition(coordinate);
    }
    else {
     overlay.setPosition(undefined);
     closer.blur();
    }

    // Show the popup
    $("#popup").show();
  });
}

/*
 * Fetches all waypoints from the database
 *****************************************************************************/
function getWaypoints() {

  //Variables
  let center = ol.proj.toLonLat(model.map.getView().getCenter());
  let lng = center[0];
  let lat = center[1];
  let range = 10;
  let url = `fetchWaypoints?latitude=${lat}&longitude=${lng}&range=${range}`;

  // Send the request to the server and generate the markers
  sendRequest(url, (json) => {
    // Clear the old icons
    icons.clear();

    // Build the icons
    for(let waypoint of json.waypoints) { createWaypoint(waypoint); }
  });
}


/*
 * Creates a marker on the map with the given coordinates
 * waypoint - A waypoint to be displayed
 *****************************************************************************/
function createWaypoint(waypoint) {

  // Variables
  let coords = [waypoint.Location.Longitude, waypoint.Location.Latitude];
  let content = `
    <b>Seen by:</b> ${waypoint.User}<br/>
    <b>Animal:</b> ${waypoint.Animal.Name}<br/>
    `;

  // Create the feature
  let iconFeature = new ol.Feature({
    'desc': content,
    'geometry': new ol.geom.Point(ol.proj.fromLonLat(coords))
  });

  // Create the image
  let iconImage = new ol.style.Icon({
    'anchor': [0.5, 46],
    'anchorXUnits': 'fraction',
    'anchorYUnits': 'pixels',
    'src': waypoint.Animal.Icon,
    'scale': 0.075,
  });

  // Create the feature's style
  let iconStyle = new ol.style.Style({ image: iconImage });
  iconFeature.setStyle(iconStyle);

  // Add to the vector layer
  icons.addFeature(iconFeature);
}

/*
 * Reveals the map to the user.
 *****************************************************************************/
function showMap() {

  // Variables
  let defaultCoordinates = [-73.1087, 42.7009]; // North Adams
  let geo = window.navigator.geolocation;

  // Return the default map if geolocation is not supported
  if (!geo) {
    initMap(defaultCoordinates);
    displayError("This browser does not support Geolocation Services!");
    return;
  }

  // Initialize and display the map
  geo.getCurrentPosition(
    geoPos => { initMap([geoPos.coords.longitude, geoPos.coords.latitude]); },
    error => {
      initMap(defaultCoordinates);
      displayError(error.message);
    }
  );
}

/*
 * Hides and uninitalizes the map
 *****************************************************************************/
function hideMap() {
  model.map = null;
  $("#map").empty();
}

/*
 * Triggers when the document is ready.
 *****************************************************************************/
$(document).ready(function() {

  /*
   * Register User Modal Functionality
   *****************************************************************************/
  // Ensure the modal is clean when displayed
  $('#register-modal').on('show.bs.modal', function () {
    $("#register-email").val("");
    $("#register-username").val("");
    $("#register-password").val("");
    $("#answer-one").val("");
    $("#answer-two").val("");
    $("#question-one :nth-child(1)").prop('selected', true);
    $("#question-two :nth-child(2)").prop('selected', true);
    disableMatchingOption("question-one", "question-two");
    disableMatchingOption("question-two", "question-one");
  })

  // Submits the user registration
  $("#register-submit-button").click(function() {
    // Variables
    let email = $("#register-email").val().trim();
    let username = $("#register-username").val().trim();
    let password = $("#register-password").val().trim();
    let questions = [$("#question-one").val(), $("#question-two").val()];
    let answers = [$("#answer-one").val().toLowerCase().trim(), $("#answer-two").val().toLowerCase().trim()];

    // Generates the url request and sends
    let url = `register?email=${email}&username=${username}&password=${password}`;
    for(let i = 0; i < questions.length; i++) { url += `&questions[]=${questions[i]}`; }
    for(let i = 0; i < answers.length; i++) { url += `&answers[]=${answers[i]}`; }
    sendRequest(url, (json) => {
      if (!json.error) { $("#register-modal").modal("hide"); }
      updateView();
    });
  });

  /*
   * Login Button
   ********************************************************************************/
  $("#login").click(function() {
    // Variables
    let username = $("#login-username").val().trim();
    let password = $("#login-password").val().trim();

    // Send the request
    let url = `login?username=${username}&password=${password}`;
    sendRequest(url, (json) => {
      if (!json.error) {
        $(".dropdown").hide();
        $("#login-username").val("");
        $("#login-password").val("");
      }
      updateView();
    });
  });

  /*
   * Logout Button
   ********************************************************************************/
  $("#logout").click(function() {
      sendRequest("logout", updateView);
  });

  /*
   * Security Question Selectors
   ********************************************************************************/
  // When question one changes prevent question two from selecting the same question.
  $("#question-one").change(function() {
    disableMatchingOption("question-one", "question-two");
  });

  // When question two changes prevent question one from selecting the same question.
  $("#question-two").change(function() {
    disableMatchingOption("question-two", "question-one");
  });

  /*
   * Reset Password
   ********************************************************************************/
  // Triggers when the forgot password is clicked
  $("#forgotPassword").click(function() {
    // Variables
    let username = $("#login-username").val().trim();
    let url = `fetchUserSecurityQuestions?username=${username}`;

    // Send a request to the server
    sendRequest(url, (json) => {

      // Error handling
      if (json.error) {
        displayError(json.error);
        return;
      }

      // Update the questions
      $("#modal-question-one").text(json.userQuestions[0]);
      $("#modal-question-two").text(json.userQuestions[1]);

      // display the security modal
      $("#security-success").text("");
      $("#security-modal").modal("show");
    });
  });

  // Triggers when the user submits their new password
  $("#submit-answers-button").click(function() {
    // Variables
    let username = $("#login-username").val().trim();
    let password = $("#password-text").val().trim();
    let answers = [$("#modal-answer-one").val().toLowerCase().trim(), $("#modal-answer-two").val().toLowerCase().trim()];
    let url = `resetPassword?username=${username}&password=${password}&answers[]=${answers[0]}&answers[]=${answers[1]}`;

    // Send the request
    sendRequest(url, (json) => {

      // Error Handling
      if (json.error) {
        displayError(model.error);
        return;
      }

      // Reset the modal
      $("#login-username").val("");
      $("#password-text").val("");
      $("#modal-answer-one").val("");
      $("#modal-answer-two").val("");
      $("#security-success").text("Successfully Changed Password");
    });
  });

  /*
   * Create new waypoint
   ********************************************************************************/
  $("#createMarkerButton").click(function() {

    // Variables
    let animal = $("#animals").val().trim();
    let lat = $("#latitude").val().trim();
    let lng = $("#longitude").val().trim();
    let url = `insertWaypoint?latitude=${lat}&longitude=${lng}&animalId=${animal}`

    sendRequest(url, function() {
      $("#latitude").val("");
      $("#longitude").val("");
      getWaypoints();
    });
  });

  // Start the web app
  init();
});

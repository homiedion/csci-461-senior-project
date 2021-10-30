$(document).ready(function()
{
  let model = {};

  //Sets the model to its initial state
  function initializeModel()
  {
    model.error = "";
    model.user = {};
  }

  //Updates the view to display json data
  function updateView()
  {
    if(model.error != "")
      $("#response").text(model.error);
    else
    {
      if(model.user.username != undefined)
      {
        $(".dropdown").hide();
        $("#logout").show();
      }
      else
      {
        $(".dropdown").show();
        $("#logout").hide();
      }
    }
  }

  //Sends a ajax request to the server
  function sendRequest(url, callback)
  {
    //Variables
    let jqxhr = $.get(url);

    //Send the request
    jqxhr.done(function(json)
    {
      if(json.error != undefined)
        model.error = json.error;
      if(json.user != undefined)
        model.user = json.user;
      if(callback != undefined)
        callback();
        //Reset Error to ensure error not kept after login
      model.error = "";
      updateView();
    });

    jqxhr.fail(function(json)
    {
      let error = JSON.stringify(json);
      model.error = error;
      updateView();
    });
  }

  $("#registerButton").click(function()
  {
    $("#registerError").empty();
    let email = $("#registerEmail").val().trim();
    let username = $("#registerUsername").val().trim();
    let password = $("#registerPassword").val().trim();

    sendRequest("register?email=" + email + "&username=" + username + "&password=" + password);
    $("#registerModal").modal("hide");
  });

  $("#login").click(function()
  {
    $("#loginError").empty();
    let username = $("#loginUsername").val().trim();
    let password = $("#loginPassword").val().trim();

    sendRequest("login?username=" + username + "&password=" + password);
    $(".dropdown").hide();
  });

  $("#logout").click(function()
  {
      sendRequest("logout");
  });

  $("#mapButton").click(function()
  {
    let map = new ol.Map({
      target: "map",
      layers:
      [
        new ol.layer.Tile({
          source: new ol.source.OSM()
        })
      ],
      view: new ol.View({
        center: ol.proj.fromLonLat([-73.1087, 42.7009]),
        zoom: 15
      })
    });
  });

  //Once everything is done initialize the model
  initializeModel();
  updateView();
});

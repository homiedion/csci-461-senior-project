$(document).ready(function() {
  let model = {};

  //Sets the model to its initial state
  function initializeModel() {
    model.error = "";
    model.user = null;
  }

  //Updates the view to display json data
  function updateView() {
    if (model.error != "") { $("#response").text(model.error); }
  }

  //Sends a ajax request to the server
  function sendRequest(url, callback) {
    
    //Variables
    let jqxhr = $.get(url);

    //Send the request
    jqxhr.done(function(json) {
      if (json.error !== undefined) { model.error = json.error; }

      else {
        if (json.user !== undefined) { model.user = json.user; }
        if (callback !== undefined) { callback(); }
        
        //Reset Error to ensure error not kept after login
        model.error = "";
      }
      updateView();  
    });

    jqxhr.fail(function(json) {
      let error = JSON.stringify(json);
      model.error = error;
      updateView();
    });
  }

  //Once everything is done initialize the model
  initializeModel();
});
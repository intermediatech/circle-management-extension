/**
 * Manages a single instance of the entire application. The design is a bit
 * strange since it handles async
 *
 * @author Mohamed Mansour 2011 (http://mohamedmansour.com)
 * @constructor
 */
ManagementController = function() {
  this.introduction = null;
};

/**
 * Initialize the Management controller by calling couple of services. When
 * they are finsihed, fire the onload handler to inform the listeners.
 */
ManagementController.prototype.init = function() {
  $('#btnReload').click(this.onReload.bind(this));
  this.onLoad();
};

ManagementController.prototype.onReload = function() {
  this.toggleProgress();
  
  var start = new Date().getTime();

  // Preload some stuff.
  var iter = 3;
  var startupCallback = function(a, name) {
    console.log(((new Date().getTime() - start)/ 1000) + 's: Completed ' + name);
    if (--iter == 0) {
      this.toggleProgress();
      this.onLoad();
      console.log(((new Date().getTime() - start)/ 1000) + 's: All Loaded!');
    }
  }.bind(this);
 
  chrome.extension.sendRequest({
      method: 'PlusAPI', data: { service: 'Init' }
  }, function(r) {
    startupCallback(r, 'Init');
  });

  chrome.extension.sendRequest({
      method: 'PlusAPI', data: { service: 'RefreshInfo' }
  }, function(r) {
    startupCallback(r, 'RefreshInfo');
  });

  chrome.extension.sendRequest({
      method: 'PlusAPI', data: { service: 'RefreshCircles' }
  }, function(r) {
    startupCallback(r, 'RefreshCircles');
  });
/*
  chrome.extension.sendRequest({
      method: 'PlusAPI', data: { service: 'RefreshFollowers' }
  }, function(r) {
    startupCallback(r, 'RefreshFollowers');
  });

  chrome.extension.sendRequest({
      method: 'PlusAPI', data: { service: 'RefreshFindPeople' }
  }, startupCallback);
*/
};

/**
 * Toggle the progress for this UI. Basically, whenever a long process happens
 * we should call this at the beginning and end.
 */
ManagementController.prototype.toggleProgress = function() {
  $('#preloader').toggle();
};

ManagementController.prototype.onLoad = function() {
  this.renderFollowers();
};

ManagementController.prototype.getProfile = function() {
  chrome.extension.sendRequest({
      method: 'PlusAPI', data: { service: 'GetInfo' }
  }, function(info) {
    chrome.extension.sendRequest({
        method: 'PlusAPI', data: { service: 'GetProfile', id: info.id }
    }, function(profile) {
      this.introduction = profile.introduction;
    }.bind(this));
  }.bind(this));
};


ManagementController.prototype.renderFollowers = function() {
  chrome.extension.sendRequest({
     method: 'PlusAPI', data: { service: 'GetPeopleInMyCircles' }
  }, function(people) {
    var start = new Date().getTime();
    console.log(((new Date().getTime() - start)/ 1000) + 's: People Received', people);
    var tbody = $('#people > tbody');
    tbody.html('');
    $.each(people.data, function(key, value) {
      var personElement = $('<tr><td>' + value.name + '</td><td>' + value.location + '</td><td>' + value.employment + '</td><td>' + value.occupation + '</td><td>' + value.email + '</td></tr>');
      tbody.append(personElement);
    });
    console.log(((new Date().getTime() - start)/ 1000) + 's: Rendering completed!');
    $("#people").tablesorter(); 
    console.log(((new Date().getTime() - start)/ 1000) + 's: Sorted completed!');
  });
};


ManagementController.prototype.tagProfile = function() {
  this.plus.saveProfile(null, 'HangoutAcademyTempToken' + this.introduction);
};

ManagementController.prototype.revertProfile = function() {
  this.plus.saveProfile(null, this.introduction);
};
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
  this.toggleProgress();
  
  // Preload some stuff.
  var iter = 5;
  var startupCallback = function(a) {
    if (--iter == 0) {
      this.toggleProgress();
      this.onLoad();
    }
  }.bind(this);
 
  chrome.extension.sendRequest({
      method: 'PlusAPI', data: { service: 'Init' }
  }, startupCallback);

  chrome.extension.sendRequest({
      method: 'PlusAPI', data: { service: 'RefreshInfo' }
  }, startupCallback);

  chrome.extension.sendRequest({
      method: 'PlusAPI', data: { service: 'RefreshCircles' }
  }, startupCallback);

  chrome.extension.sendRequest({
      method: 'PlusAPI', data: { service: 'RefreshFollowers' }
  }, startupCallback);

  chrome.extension.sendRequest({
      method: 'PlusAPI', data: { service: 'RefreshFindPeople' }
  }, startupCallback);
};

/**
 * Toggle the progress for this UI. Basically, whenever a long process happens
 * we should call this at the beginning and end.
 */
ManagementController.prototype.toggleProgress = function() {
  $('#preloader').toggle();
};

ManagementController.prototype.onLoad = function() {
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

ManagementController.prototype.tagProfile = function() {
  this.plus.saveProfile(null, 'HangoutAcademyTempToken' + this.introduction);
};

ManagementController.prototype.revertProfile = function() {
  this.plus.saveProfile(null, this.introduction);
};
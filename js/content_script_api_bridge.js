/**
 * Content Script to Background Bridge that delegates asynchronous events
 * to the consumer responsible. This is where all the API hooks should go and
 * only one instence of the GAPI should be present.
 */
ContentScriptAPIBridge = function() {
  this.plus = new GooglePlusAPI();
};

/**
 * Routes messages back to the content script.
 * @param {Function<Object>} callback The listener to call when the service
 *                           has completed successfully.
 * @param {Object} data The data to send to the specified service.
 */
ContentScriptAPIBridge.prototype.routeMessage = function(callback, data) {
  switch (data.service) {
    case 'Init':
      this.plus.init();
      this.fireCallback(callback, true);
      break;
    case 'RefreshCircles':
      this.plus.refreshCircles(callback);
      break;
    case 'RefreshFollowers':
      this.plus.refreshFollowers(callback);
      break;
    case 'RefreshFindPeople':
      this.plus.refreshFindPeople(callback);
      break;
    case 'RefreshInfo':
      this.plus.refreshInfo(callback);
      break;
    case 'GetProfile':
      this.plus.getProfile(callback, data.id);
      break;
    case 'GetInfo':
      this.fireCallback(callback, this.plus.getInfo());
      break;
    case 'GetPeopleInMyCircles':
      this.plus.getPeopleInMyCircles(callback);
      break;
    case 'GetPeopleWhoAddedMe':
      this.plus.getPeopleWhoAddedMe(callback);
      break;
    default:
      this.fireCallback(callback, false);
      break;
  }
};

/**
 * Helper to not fire callback if not called.
 * @see {routeMessage}
 */
ContentScriptAPIBridge.prototype.fireCallback = function(callback, data) {
  if (callback) callback(data);
};

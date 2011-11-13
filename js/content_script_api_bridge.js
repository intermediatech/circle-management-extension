/**
 * Content Script to Background Bridge that delegates asynchronous events
 * to the consumer responsible. This is where all the API hooks should go and
 * only one instence of the GAPI should be present.
 */
ContentScriptAPIBridge = function() {
  this.plus = new GooglePlusAPI();
  this.data = {
    'circle'        : this.plus.getDatabase().getCircleEntity(),
    'person'        : this.plus.getDatabase().getPersonEntity(),
    'person_circle' : this.plus.getDatabase().getPersonCircleEntity()
  }
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
    case 'GetCircles':
      this.plus.getCircles(callback);
      break;
    case 'GetPeopleInMyCircles':
      this.plus.getPeopleInMyCircles(callback);
      break;
    case 'GetPeopleWhoAddedMe':
      this.plus.getPeopleWhoAddedMe(callback);
      break;
    case 'GetPeople':
      this.plus.getPeople(callback);
      break;
    case 'DeleteDatabase':
      this.plus.getDatabase().clearAll(callback);
      break;
    case 'CountMetric':
      var self = this;
      self.plus.getDatabase().getCircleEntity().count({}, function(circleData) {
        self.plus.getDatabase().getPersonEntity().count({}, function(personData) {
          self.plus.getDatabase().getPersonCircleEntity().count({}, function(personCircleData) {
            self.fireCallback(callback, circleData.data + personData.data + personCircleData.data);
          });
        });
      });
      break;
    case 'Database':
      var entity = this.data[data.entity];
      switch (data.method) {
        case 'read':
          data.attributes.id ? store.find(data.attributes, callback) : entity.findAll(callback);
          break;
        case 'create':
          entity.create(data.attributes, callback);
          break;
        case 'update':
          entity.update(data.attributes, callback);
          break;
        case 'delete':
          entity.destroy(data.attributes.id, callback);
          break;
      }
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

ContentScriptAPIBridge = function() {
  this.plus = new GooglePlusAPI();
};

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
    case 'GetPeopleWhoAddedMe':
      this.fireCallback(callback, this.plus.getPeopleWhoAddedMe());
      break;
    default:
      this.fireCallback(callback, false);
      break;
  }
};

ContentScriptAPIBridge.prototype.fireCallback = function(callback, data) {
  if (callback) {
    callback(data);
  }
};

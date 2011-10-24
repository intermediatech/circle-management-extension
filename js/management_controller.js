/**
 * Manages a single instance of the entire application. The design is a bit
 * strange since it handles async
 *
 * @author Mohamed Mansour 2011 (http://mohamedmansour.com)
 * @constructor
 */
ManagementController = function() {
  this.introduction = null;
  this.totalPages = 0;
  this.page = 0;
  this.totalPageItems = 50;
  this.data = null;
};

/**
 * Initialize the Management controller by calling couple of services. When
 * they are finsihed, fire the onload handler to inform the listeners.
 */
ManagementController.prototype.init = function() {
  $('#btnReload').click(this.onReload.bind(this));
  this.fetchAndRenderFollowers();
};

ManagementController.prototype.onReload = function() {
  this.toggleProgress();
  
  var start = new Date().getTime();

  // Preload some stuff.
  var iter = 4;
  var startupCallback = function(a, name) {
    console.log(((new Date().getTime() - start)/ 1000) + 's: Completed ' + name);
    if (--iter == 0) {
      this.toggleProgress();
      this.onReloadComplete(start);
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

  chrome.extension.sendRequest({
      method: 'PlusAPI', data: { service: 'RefreshFollowers' }
  }, function(r) {
    startupCallback(r, 'RefreshFollowers');
  });
/*
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

ManagementController.prototype.onReloadComplete = function(startTime) {
  chrome.extension.sendRequest({
      method: 'PlusAPI', data: { service: 'CountMetric' }
  }, function(r) {
    var endTime = ((new Date().getTime() - startTime) / 1000);
    console.log(endTime + 's: All Loaded! ' + (r / endTime) + 
                ' queries/second for ' + r + ' queries!');
    this.fetchAndRenderFollowers();
  }.bind(this));
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

ManagementController.prototype.fetchAndRenderFollowers = function() {
  var self = this;
  var start = new Date().getTime();
  chrome.extension.sendRequest({
     method: 'PlusAPI', data: { service: 'GetPeople' }
  }, function(request) {
    console.log(((new Date().getTime() - start)/ 1000) + 's: Query completed!');
    self.data = request.data;
    self.totalPages = Math.ceil(self.data.length / self.totalPageItems);
    self.renderFollowers();
  });
};

ManagementController.prototype.onNavigationClick = function(e) {
  if (e.target.webkitMatchesSelector('.pageNavigation button:not([disabled])')) {
    if (e.target.classList.contains('first')) {
      this.page = 0;
    }
    else if (e.target.classList.contains('prev')) {
      this.page--;
    }
    else if (e.target.classList.contains('next')) {
      this.page++;
    }
    else if (e.target.classList.contains('last')) {
      this.page = this.totalPages - 1;
    }
    this.renderFollowers();
  }
};

ManagementController.prototype.onNavigationChange = function(e) {
  if (e.keyCode == 13) {
    var value = parseInt(e.target.value);
    if (isNaN(value) || value < 1 || value > this.totalPages) {
      e.target.value = this.page + 1;
    }
    else {
      this.page = value - 1;
    }
    this.renderFollowers();
  }
};

ManagementController.prototype.renderFollowers = function() {
  var start = new Date().getTime();
  var tbody = $('#data > tbody');
  tbody.html('');
  $('#usersRendered').text(this.data.length + ' users rendered.')
  if (this.data.length == 0) {
    $('#data').hide();
    $('#status').text('No items, please!');
  }
  else {
    $('#data').show();
    var personTemplate = $('#tmpl-person');
    var pageNavTemplate = $('#tmpl-page-nav');

    $('.pageNavigation').html(pageNavTemplate.tmpl({totalPages: this.totalPages, currentPage: this.page + 1}));
    $('.pageNavigation .next').click(this.onNavigationClick.bind(this));
    $('.pageNavigation .prev').click(this.onNavigationClick.bind(this));
    $('.pageNavigation .first').click(this.onNavigationClick.bind(this));
    $('.pageNavigation .last').click(this.onNavigationClick.bind(this));
    $('.pageNavigation .currentPage').keyup(this.onNavigationChange.bind(this));

    if (this.page == 0) {
      $('.prev').attr('disabled', 'disabled');
      $('.first').attr('disabled', 'disabled');
    }
    else if (this.page == this.totalPages - 1) {
      $('.next').attr('disabled', 'disabled');
      $('.last').attr('disabled', 'disabled');
    }
    else {
      $('.first').removeAttr('disabled');
      $('.prev').removeAttr('disabled');
      $('.next').removeAttr('disabled');
      $('.last').removeAttr('disabled');
    }

    var startSlice = this.page * this.totalPageItems
    var endSlice = startSlice + this.totalPageItems;

    this.data.slice(startSlice, endSlice).forEach(function(value, index) {
      var personElement = personTemplate.tmpl(value);
      tbody.append(personElement);
    });
  }
  console.log(((new Date().getTime() - start)/ 1000) + 's: Rendering completed!');
};

ManagementController.prototype.tagProfile = function() {
  this.plus.saveProfile(null, 'HangoutAcademyTempToken' + this.introduction);
};

ManagementController.prototype.revertProfile = function() {
  this.plus.saveProfile(null, this.introduction);
};
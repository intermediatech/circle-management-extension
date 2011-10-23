/**
 * Manages a single instance of the entire application. The design is a bit
 * strange since it handles async
 *
 * @author Mohamed Mansour 2011 (http://mohamedmansour.com)
 * @constructor
 */
ManagementController = function() {
  this.introduction = null;
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
  var iter = 3;
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
    self.renderFollowers();
  });
};

ManagementController.prototype.onNavigationClick = function(e) {
  if (e.target.webkitMatchesSelector('li:not([disabled]):not([class="selected"])')) {
    var contents = e.target.innerText;
    var nextPage = parseInt(contents) - 1;
    if (isNaN(nextPage)) {
      if (contents == 'previous') {
        this.page--;
      }
      else {
        this.page++;
      }
      valid = true;
      this.renderFollowers();
    }
    else {
      this.page = nextPage
      this.renderFollowers();
    }
  }
};
ManagementController.prototype.renderFollowers = function() {
  var start = new Date().getTime();
  var tbody = $('#data > tbody');
  tbody.html('');
  if (this.data.length == 0) {
    $('#data').hide();
    $('#status').text('No items, please!');
  }
  else {
    $('#data').show();
    var personTemplate = $('#tmpl-person');
    var pageNavTemplate = $('#tmpl-page-nav');
    
    var totalPages = Math.ceil(this.data.length / this.totalPageItems);
    var pages = [];
    for (var i = 0; i < totalPages; i++) {
      pages.push(i+1);
    }
    $('.pageNavigation').html(pageNavTemplate.tmpl({pages: pages, currentPage: this.page + 1}));
    $('.pageNavigation li').click(this.onNavigationClick.bind(this));
    
    if (this.page == 0) {
      $('.prev').attr('disabled', 'disabled');
    }
    else if (this.page == totalPages - 1) {
      $('.next').attr('disabled', 'disabled');
    }
    else {
      $('.prev').removeAttr('disabled');
      $('.next').removeAttr('disabled');
    }
    
    var start = this.page * this.totalPageItems
    var end = start + this.totalPageItems;

    this.data.slice(start, end).forEach(function(value, index) {
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
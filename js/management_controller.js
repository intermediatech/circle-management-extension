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
  this.totalItemsPerPage = 0;
  this.data = null;
  this.templates = {};
};

/**
 * Initialize the Management controller by calling couple of services. When
 * they are finsihed, fire the onload handler to inform the listeners.
 */
ManagementController.prototype.init = function() {
  this.intializeTemplates();
  this.initializeListeners();
  this.intializeSettings();
};

ManagementController.prototype.intializeTemplates = function() {
  this.templates['tableHeader'] = $('#tmpl-table-header');
  this.templates['personTemplate'] = $('#tmpl-person');
  this.templates['pageNavTemplate'] = $('#tmpl-page-nav');
  this.templates['addCircleDialog'] = $('#tmpl-add-circle-dialog');
};

ManagementController.prototype.intializeSettings = function() {
  chrome.extension.sendRequest({
      method: 'GetSetting', data: 'totalItemsPerPage'
  }, function(r) {
    this.totalItemsPerPage = parseInt(r.data);
    this.fetchAndRenderFollowers();
  }.bind(this));
};

ManagementController.prototype.initializeListeners = function() {
  if (window != top) {;
    $('#openInNewTab').css('visibility', 'visible');
    $('#openInNewTab').click(this.onOpenNewTab.bind(this));
  }
  $('#btnReload').click(this.onReload.bind(this));
  $('#btnDelete').click(this.onDelete.bind(this));
};

ManagementController.prototype.onOpenNewTab = function(e) {
  chrome.extension.sendRequest({method: 'OpenInNewTab'});
};

/**
 * Deleting the database locally. So we could start fresh.
 */
ManagementController.prototype.onDelete = function() {
  var self = this;
  chrome.extension.sendRequest({
    method: 'PlusAPI', data: { service: 'DeleteDatabase' }
  }, function(r) {
    self.data = [];
    self.renderFollowers();
  });
};

ManagementController.prototype.onReload = function() {
  this.toggleProgress(true);

  var start = new Date().getTime();

  // Preload some stuff.
  var iter = 3;
  var startupCallback = function(a, name) {
    $('#preloadText').text('Fetching ' + name + '.');
    console.log(((new Date().getTime() - start)/ 1000) + 's: Completed ' + name);
    if (--iter == 0) {
      this.onReloadComplete(start);
    }
  }.bind(this);

  chrome.extension.sendRequest({
      method: 'PlusAPI', data: { service: 'Init' }
  }, function(r) {
    startupCallback(r, 'authorization token');
  });

  chrome.extension.sendRequest({
      method: 'PlusAPI', data: { service: 'RefreshInfo' }
  }, function(r) {
    startupCallback(r, 'initial information data');
  });

  chrome.extension.sendRequest({
      method: 'PlusAPI', data: { service: 'RefreshCircles' }
  }, function(r) {
    startupCallback(r, 'circle data');
  });
/*
  chrome.extension.sendRequest({
      method: 'PlusAPI', data: { service: 'RefreshFollowers' }
  }, function(r) {
    startupCallback(r, 'followers data');
  });

  chrome.extension.sendRequest({
      method: 'PlusAPI', data: { service: 'RefreshFindPeople' }
  }, function(r) {
    startupCallback(r, 'people to discover data');
  });
*/
};

/**
 * Toggle the progress for this UI. Basically, whenever a long process happens
 * we should call this at the beginning and end.
 *
 * @param {boolean} state True if visible otherwise not visible.
 */
ManagementController.prototype.toggleProgress = function(state) {
  $('#preloader').toggle(state);
  if ($('#preloader').is(':visible')) {
    //$('#content').hide();
  }
  else {
    //$('#content').show();
  }
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

ManagementController.prototype.fetchAndRenderFollowers = function() {
  var self = this;
  var start = new Date().getTime();
  $('#preloadText').text('Quering database to display data.');
  this.toggleProgress(true);
  chrome.extension.sendRequest({
     method: 'PlusAPI', data: { service: 'GetPeople' }
  }, function(request) {
    console.log(((new Date().getTime() - start)/ 1000) + 's: Query completed!');
    self.data = request.data;

    self.toggleProgress(false);
    self.renderFollowers();
  });
};

ManagementController.prototype.onNavigationClick = function(e) {
  if (e.target.webkitMatchesSelector('.pageNavigation :not([disabled])')) {
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
    else if (e.target.classList.contains('total')) {
      this.totalItemsPerPage = parseInt(e.target.value);
      this.page = 0;
      chrome.extension.sendRequest({method: 'PersistSetting', data: {
        key: 'totalItemsPerPage',
        value: this.totalItemsPerPage
      }});
    }
    this.renderFollowers();
  }
};

ManagementController.prototype.onNavigationChange = function(e) {
  // Enter
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
  var data = $('#data');
  data.html('');
  this.totalPages = Math.ceil(this.data.length / this.totalItemsPerPage);
  $('#usersRendered').text(this.data.length + ' people loaded.')
  if (this.data.length == 0) {
    $('.pageNavigation').hide();
    $('#data').hide();
    $('#status').text('No items, please Refresh the Database!');
  }
  else {
    $('.pageNavigation').show();
    $('#data').show();
    $('#status').hide();

    // Navigation data for paging.
    var navData = {
      totalPages: this.totalPages,
      currentPage: this.page + 1
    };
    $('.pageNavigation').html(this.templates['pageNavTemplate'].tmpl(navData));
    $('.pageNavigation .next').click(this.onNavigationClick.bind(this));
    $('.pageNavigation .prev').click(this.onNavigationClick.bind(this));
    $('.pageNavigation .first').click(this.onNavigationClick.bind(this));
    $('.pageNavigation .last').click(this.onNavigationClick.bind(this));
    $('.pageNavigation .currentPage').keyup(this.onNavigationChange.bind(this));
    $('.pageNavigation .total').change(this.onNavigationClick.bind(this));

    $('.total').val(this.totalItemsPerPage);

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

    var startSlice = this.page * this.totalItemsPerPage
    var endSlice = startSlice + this.totalItemsPerPage;

    // Show the header.
    data.append(this.templates['tableHeader'].tmpl());

    // Show the people.
    this.data.slice(startSlice, endSlice).forEach(function(value, index) {
      var personElement = this.templates['personTemplate'].tmpl(value);
      data.append(personElement);
    }.bind(this));

    // Listeners for data.
    $('.circle-add').click(this.onCircleAddClick.bind(this));
    $('.circle-close').click(this.onCircleRemoveClick.bind(this));
  }

  console.log(((new Date().getTime() - start)/ 1000) + 's: Rendering completed!');
};

ManagementController.prototype.onCircleAddClick = function(e) {
  console.log('Add', e);
};

ManagementController.prototype.onCircleRemoveClick = function(e) {
  console.log('Remove', e);
};

ManagementController.prototype.tagProfile = function() {
  this.plus.saveProfile(null, 'HangoutAcademyTempToken' + this.introduction);
};

ManagementController.prototype.revertProfile = function() {
  this.plus.saveProfile(null, this.introduction);
};

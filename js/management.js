$(document).ready(function() {
  // -[base]---------------
  var inherits = function(childCtor, parentCtor) {
    function tempCtor() {};
    tempCtor.prototype = parentCtor.prototype;
    childCtor.superClass_ = parentCtor.prototype;
    childCtor.prototype = new tempCtor();
    childCtor.prototype.constructor = childCtor;
  };

  // -[entity]-------------
  var App = {
    GlobalState: {},
    Models: {},
    Collections: {},
    Views: {},
    init: function() {
      window.Circles = new App.Collections.Circles;
      window.Contacts = new App.Collections.Contacts;
      window.IndexView = new App.Views.AppIndex();
      App.GlobalState.SidebarView = new App.Views.SidebarIndex();
    }
  };

  // -[backbone]-------------
  App.Models.Circle = Backbone.Model.extend({
  });

  App.Collections.Circles = Backbone.Collection.extend({
    model: App.Models.Circle,
    webStorage: 'circle'
  });

  App.Views.Circle = Backbone.View.extend({
    tagName: 'div',
    className: 'circle-item',
    template: $('#circle-template'),

    initialize: function() {
      this.model.bind('change', this.render, this);
      this.model.bind('destroy', this.remove, this);
    },

    events: {
      'click .circle-remove'       : 'clear',
      'click .circle-link'         : 'loadCircle',
    },

    render: function() {
      $(this.el).attr('id', this.model.id);
      $(this.el).html(this.template.tmpl(this.model.toJSON()));
      return this;
    },

    remove: function() {
      $(this.el).remove();
    },

    clear: function() {
      this.model.destroy();
    },

    loadCircle: function() {
      Contacts.filter({circle_id: this.model.id}, true);
    }
  });

  App.Views.SidebarIndex = Backbone.View.extend({
    el: $('#sidebar'),

    initialize: function() {
      Circles.bind('add',   this.addCircle, this);
      Circles.bind('reset', this.addAllCircles, this);
      Circles.bind('all',   this.render, this);
      Circles.fetch();
    },

    events: {
      'click #all .circle-link': 'loadAllCircles',
    },

    loadAllCircles: function() {
      Contacts.filter({}, true);
    },

    addAllCircles: function() {
      $('#data').html('');
      this.page = 0;
      Circles.each(this.addCircle);
    },

    addCircle: function(circle) {
      var view = new App.Views.Circle({model: circle});
      $('#circles-nav').append(view.render().el);
    },

    renderSelectedCircle: function(name) {
      var obj = App.GlobalState.currentSession || {};
      var currID = '#' + (obj.circle_id || 'all');
      var newID = '#' + (name || 'all');
      $(currID).toggleClass('selected', false);
      obj.circle_id = name;
      App.GlobalState.currentSession = obj;
      $(newID).toggleClass('selected', true);
    }
  });

  App.Models.Contact = Backbone.Model.extend({
  });

  App.Collections.Contacts = Backbone.Collection.extend({
    model: App.Models.Contact,

    webStorage: 'person',

    filter: function(obj, resetPage) {
      obj = obj || App.GlobalState.currentSession;
      if (resetPage) {
        App.GlobalState.page = 0;
      }
      this.fetch({attributes: obj});

      // Set the view for the circles to be selected.
      App.GlobalState.SidebarView.renderSelectedCircle(obj.circle_id);
    }
  });

  App.Views.Contact = Backbone.View.extend({
    tagName: 'div',
    template: $('#person-template'),

    initialize: function() {
      this.model.bind('change', this.render, this);
      this.model.bind('destroy', this.remove, this);
    },

    render: function() {
      $(this.el).html(this.template.tmpl(this.model.toJSON()));
      return this;
    },

    remove: function() {
      $(this.el).remove();
    },

    clear: function() {
      this.model.destroy();
    }
  });

  App.Views.AppIndex = Backbone.View.extend({
    el: $('#wrapper'),

    pageNavigationTemplate: $('#page-navigation-template'),

    events: {
      'click .next'         : 'onNavigationClick',
      'click .prev'         : 'onNavigationClick',
      'click .first'        : 'onNavigationClick',
      'click .last'         : 'onNavigationClick',
      'keyup .currentPage'  : 'onNavigationChange',
      'change .total'       : 'onNavigationClick',
      'click #btnReload'    : 'onReload',
      'click #btnDelete'    : 'onDelete',
      'click #openInNewTab' : 'onOpenInNewTab',
    },

    onOpenInNewTab: function(e) {
      chrome.extension.sendRequest({method: 'OpenInNewTab'});
    },

    initialize: function() {
      App.GlobalState.currentSession = {};
      App.GlobalState.page = 0;
      App.GlobalState.totalItemsPerPage = 25;

      chrome.extension.sendRequest({
          method: 'GetSetting', data: 'totalItemsPerPage'
      }, function(r) {
        App.GlobalState.totalItemsPerPage = parseInt(r.data);
        Contacts.bind('add',   this.addOne, this);
        Contacts.bind('reset', this.addAll, this);
        Contacts.bind('all',   this.render, this);
        Contacts.filter();
      }.bind(this));

      $(window).resize(this.onResize.bind(this));
      this.onResize();
    },

    render: function() {
      $('#usersRendered').html(Contacts.length + ' people loaded.');
      $('.pageNavigation').html(this.pageNavigationTemplate.tmpl({
        totalPages: this.getTotalPages(),
        currentPage: App.GlobalState.page + 1
      }));
      $('.total').val(App.GlobalState.totalItemsPerPage);
      if (App.GlobalState.page == 0) {
        $('.prev').attr('disabled', 'disabled');
        $('.first').attr('disabled', 'disabled');
      }
      else if (App.GlobalState.page == this.getTotalPages() - 1) {
        $('.next').attr('disabled', 'disabled');
        $('.last').attr('disabled', 'disabled');
      }
      else {
        $('.first').removeAttr('disabled');
        $('.prev').removeAttr('disabled');
        $('.next').removeAttr('disabled');
        $('.last').removeAttr('disabled');
      }

      if (window != top) {
        $('#openInNewTab').css('visibility', 'visible');
      }
    },

    addAll: function() {
      $('#data').html('');
      var startSlice = App.GlobalState.page * App.GlobalState.totalItemsPerPage
      var endSlice = startSlice + App.GlobalState.totalItemsPerPage;
      _.each(Contacts.models.slice(startSlice, endSlice), this.addOne);
    },

    addOne: function(contact) {
      var view = new App.Views.Contact({model: contact});
      $('#data').append(view.render().el);
    },

    getTotalPages: function() {
      return Math.ceil(Contacts.length / App.GlobalState.totalItemsPerPage);
    },

    onNavigationClick: function(e) {
      if (e.target.webkitMatchesSelector('.pageNavigation :not([disabled])')) {
        if (e.target.classList.contains('first')) {
          App.GlobalState.page = 0;
        }
        else if (e.target.classList.contains('prev')) {
          App.GlobalState.page--;
        }
        else if (e.target.classList.contains('next')) {
          App.GlobalState.page++;
        }
        else if (e.target.classList.contains('last')) {
          App.GlobalState.page = this.getTotalPages() - 1;
        }
        else if (e.target.classList.contains('total')) {
          App.GlobalState.totalItemsPerPage = parseInt(e.target.value);
          App.GlobalState.page = 0;
          chrome.extension.sendRequest({method: 'PersistSetting', data: {
            key: 'totalItemsPerPage',
            value: App.GlobalState.totalItemsPerPage
          }});
        }
        Contacts.filter();
      }
    },

    onNavigationChange: function(e) {
      if (e.keyCode == 13) {
        var value = parseInt(e.target.value);
        if (isNaN(value) || value < 1 || value > this.getTotalPages()) {
          e.target.value = App.GlobalState.page + 1;
        }
        else {
          App.GlobalState.page = value - 1;
        }
        Contacts.filter();
      }
    },

    /**
     * Toggle the progress for this UI. Basically, whenever a long process happens
     * we should call this at the beginning and end.
     *
     * @param {boolean} state True if visible otherwise not visible.
     */
    toggleProgress: function(state) {
      $('#preloader').toggle(state);
    },

    onReload: function(e) {
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
          method: 'PlusAPI',
          data: { service: 'Plus', method: 'init' }
      }, function(r) {
        startupCallback(r, 'authorization token');
      });

      // Refresh the database.
      chrome.extension.sendRequest({ method: 'PlusAPI', data: { service: 'DeleteDatabase' } }, function(r) {
        chrome.extension.sendRequest({
            method: 'PlusAPI',
            data: { service: 'Plus', method: 'refreshInfo' }
        }, function(r) {
          startupCallback(r, 'initial information data');
        });

        chrome.extension.sendRequest({
            method: 'PlusAPI',
            data: { service: 'Plus', method: 'refreshCircles' }
        }, function(r) {
          startupCallback(r, 'circle data');
        });

        /*
        chrome.extension.sendRequest({
            method: 'PlusAPI',
            data: { service: 'Plus', method: 'refreshFollowers' }
        }, function(r) {
          startupCallback(r, 'followers data');
        });

        chrome.extension.sendRequest({
            method: 'PlusAPI',
            data: { service: 'Plus', method: 'refreshFindPeople' }
        }, function(r) {
          startupCallback(r, 'people to discover data');
        });
        */
      });
    },

    /**
     * Deleting the database locally. So we could start fresh.
     */
    onDelete: function() {
      var self = this;
      chrome.extension.sendRequest({
        method: 'PlusAPI', data: { service: 'DeleteDatabase' }
      }, function(r) {
        Contacts.filter();
      });
    },

    onReloadComplete: function(startTime) {
      var self = this;
      chrome.extension.sendRequest({
          method: 'PlusAPI', data: { service: 'CountMetric' }
      }, function(r) {
        var endTime = ((new Date().getTime() - startTime) / 1000);
        console.log(endTime + 's: All Loaded! ' + (r / endTime) +
                    ' queries/second for ' + r + ' queries!');
        Contacts.filter();
        self.toggleProgress(false);
      });
    },

    onResize: function(e) {
      console.log(e);
      var height = $(window).height();

      // iframe needs to be shorter.
      if (window != top) {
        height = height - 100;
      }

      $('#data').css('height', height - 185);
      $('#circles-nav').css('height', height  - 250);
    }
  });

  App.init();
});

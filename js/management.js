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
      App.GlobalState.Circles = new App.Collections.Circles;
      App.GlobalState.Contacts = new App.Collections.Contacts;
      new App.Views.AppIndex();
      new App.Views.SidebarIndex();
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
      App.GlobalState.Contacts.filter({circle_id: this.model.id}, true);
    }
  });
  
  App.Views.SidebarIndex = Backbone.View.extend({
    el: $('#sidebar'),

    initialize: function() {
      App.GlobalState.Circles.bind('add',   this.addCircle, this);
      App.GlobalState.Circles.bind('reset', this.addAllCircles, this);
      App.GlobalState.Circles.bind('all',   this.render, this);
      App.GlobalState.Circles.fetch();
    },

    events: {
      'click .circle-all': 'loadAllCircles',
    },
    
    render: function() {
    },
    
    loadAllCircles: function() {
      App.GlobalState.Contacts.filter();
    },
    
    addAllCircles: function() {
      $('#data').html('');
      this.page = 0;
      App.GlobalState.Circles.each(this.addCircle);
    },

    addCircle: function(circle) {
      var view = new App.Views.Circle({model: circle});
      $('#circles-nav').append(view.render().el);
    }
  });

  App.Models.Contact = Backbone.Model.extend({
  });

  App.Collections.Contacts = Backbone.Collection.extend({
    model: App.Models.Contact,
    webStorage: 'person',
    filter: function(obj, resetPage) {
      obj = obj || {};
      if (resetPage) {
        App.GlobalState.page = 0;
      }
      this.fetch(obj);
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
      'click #btnReload' : 'onReload',
    },
    
    initialize: function() {
      App.GlobalState.page = 0;
      App.GlobalState.totalItemsPerPage = 25;
      
      chrome.extension.sendRequest({
          method: 'GetSetting', data: 'totalItemsPerPage'
      }, function(r) {
        App.GlobalState.totalItemsPerPage = parseInt(r.data);
        App.GlobalState.Contacts.bind('add',   this.addOne, this);
        App.GlobalState.Contacts.bind('reset', this.addAll, this);
        App.GlobalState.Contacts.bind('all',   this.render, this);
        App.GlobalState.Contacts.filter();
      }.bind(this));
    },

    render: function() {
      $('#usersRendered').html(App.GlobalState.Contacts.length + ' people loaded.');
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
    },

    addAll: function() {
      $('#data').html('');
      var startSlice = App.GlobalState.page * App.GlobalState.totalItemsPerPage
      var endSlice = startSlice + App.GlobalState.totalItemsPerPage;
      _.each(App.GlobalState.Contacts.models.slice(startSlice, endSlice), this.addOne);
    },

    addOne: function(contact) {
      var view = new App.Views.Contact({model: contact});
      $('#data').append(view.render().el);
    },
    
    getTotalPages: function() {
      return Math.ceil(App.GlobalState.Contacts.length / App.GlobalState.totalItemsPerPage);
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
        App.GlobalState.Contacts.filter();
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
        App.GlobalState.Contacts.filter();
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
    },
    
    onReloadComplete: function(startTime) {
      chrome.extension.sendRequest({
          method: 'PlusAPI', data: { service: 'CountMetric' }
      }, function(r) {
        var endTime = ((new Date().getTime() - startTime) / 1000);
        console.log(endTime + 's: All Loaded! ' + (r / endTime) +
                    ' queries/second for ' + r + ' queries!');
        App.GlobalState.Contacts.filter();
      }.bind(this));
    }
  });
  
  App.init();
});
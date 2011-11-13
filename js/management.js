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
  var db_size = 10 * 1024 * 1024;
  var db = openDatabase('Circle Management', '1.0', 'circle-manager', db_size);

  var App = {
    GlobalState: {},
    Entities: {},
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
  
  App.Entities.Person = function(db) {
    AbstractEntity.call(this, db, 'person');
  };
  inherits(App.Entities.Person, AbstractEntity);

  App.Entities.PersonCircle = function(db) {
    AbstractEntity.call(this, db, 'circle_person');
  };
  inherits(App.Entities.PersonCircle, AbstractEntity);

  App.Entities.Circle = function(db) {
    AbstractEntity.call(this, db, 'circle');
  };
  inherits(App.Entities.Circle, AbstractEntity);

  // -[backbone]-------------  
  App.Models.Circle = Backbone.Model.extend({
  });
  
  App.Collections.Circles = Backbone.Collection.extend({
    model: App.Models.Circle,
    webStorage: new App.Entities.Circle(db)
  });
  
  App.Views.Circle = Backbone.View.extend({
    tagName: 'div',
    template: $('#circle-template'),

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
  
  App.Views.SidebarIndex = Backbone.View.extend({
    el: $('#sidebar'),
    
    initialize: function() {
      App.GlobalState.Circles.bind('add',   this.addCircle, this);
      App.GlobalState.Circles.bind('reset', this.addAllCircles, this);
      App.GlobalState.Circles.bind('all',   this.render, this);
      App.GlobalState.Circles.fetch();
    },
    
    render: function() {
    },

    addAllCircles: function() {
      $('#data').html('');
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
    webStorage: new App.Entities.Person(db)
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

    page: 0,
    totalItemsPerPage: 1,
    
    pageNavigationTemplate: $('#page-navigation-template'),

    events: {
      'click .next'         : 'onNavigationClick',
      'click .prev'         : 'onNavigationClick',
      'click .first'        : 'onNavigationClick',
      'click .last'         : 'onNavigationClick',
      'keyup .currentPage'  : 'onNavigationChange',
      'change .total'       : 'onNavigationClick'
    },
    
    initialize: function() {
      chrome.extension.sendRequest({
          method: 'GetSetting', data: 'totalItemsPerPage'
      }, function(r) {
        this.totalItemsPerPage = parseInt(r.data);
        App.GlobalState.Contacts.bind('add',   this.addOne, this);
        App.GlobalState.Contacts.bind('reset', this.addAll, this);
        App.GlobalState.Contacts.bind('all',   this.render, this);
        App.GlobalState.Contacts.fetch();
      }.bind(this));
    },

    render: function() {
      $('#usersRendered').html(App.GlobalState.Contacts.length + ' people loaded.');
      $('.pageNavigation').html(this.pageNavigationTemplate.tmpl({
        totalPages: this.getTotalPages(),
        currentPage: this.page + 1
      }));
      $('.total').val(this.totalItemsPerPage);
      if (this.page == 0) {
        $('.prev').attr('disabled', 'disabled');
        $('.first').attr('disabled', 'disabled');
      }
      else if (this.page == this.getTotalPages() - 1) {
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
      var startSlice = this.page * this.totalItemsPerPage
      var endSlice = startSlice + this.totalItemsPerPage;
      _.each(App.GlobalState.Contacts.models.slice(startSlice, endSlice), this.addOne);
    },

    addOne: function(contact) {
      var view = new App.Views.Contact({model: contact});
      $('#data').append(view.render().el);
    },
    
    getTotalPages: function() {
      return Math.ceil(App.GlobalState.Contacts.length / this.totalItemsPerPage);
    },
    
    onNavigationClick: function(e) {
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
          this.page = this.getTotalPages() - 1;
        }
        else if (e.target.classList.contains('total')) {
          this.totalItemsPerPage = parseInt(e.target.value);
          this.page = 0;
          chrome.extension.sendRequest({method: 'PersistSetting', data: {
            key: 'totalItemsPerPage',
            value: this.totalItemsPerPage
          }});
        }
        App.GlobalState.Contacts.fetch();
      }
    },

    onNavigationChange: function(e) {
      if (e.keyCode == 13) {
        var value = parseInt(e.target.value);
        if (isNaN(value) || value < 1 || value > this.getTotalPages()) {
          e.target.value = this.page + 1;
        }
        else {
          this.page = value - 1;
        }
        App.GlobalState.Contacts.fetch();
      }
    }
  });
  
  App.init();
});
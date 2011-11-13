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

  App.Entities.Person.prototype.eagerFind = function(obj, callback) {
    this.db.readTransaction(function(tx) {
      var keys = [];
      var values = [];
      for (var key in obj) {
        if (obj.hasOwnProperty(key)) {
          keys.push(key + ' = ?');
          values.push(obj[key]);
        }
      }
      if (values.length == 0) {
        keys.push('1 = 1');
      }

      var sql = 'SELECT person.id as id, person.email as email, person.name as name, person.photo as photo, ' +
          'person.location as location, person.employment as employment, person.occupation as occupation, ' +
          'person.score as score, person.in_my_circle as in_my_circle, person.added_me as added_me, ' +
          'circle.id as circle_id, circle.description as circle_description, circle.name as circle_name ' +
          'FROM person LEFT JOIN circle_person ON person.id = circle_person.person_id LEFT JOIN circle ON circle.id = circle_person.circle_id WHERE ' +
          keys.join(' AND ');
      tx.executeSql(sql, values, function (tx, rs) {
          var data = [];
          var prevID = null;
          for (var i = 0; i < rs.rows.length; i++) {
            var item = rs.rows.item(i);
            if (!item.id) {
              continue;
            }
            if (prevID == item.id) {
              data[data.length - 1].circles.push({
                id: item.circle_id,
                name: item.circle_name,
                description: item.circle_description
              });
            }
            else {
              prevID = item.id;
              data.push(item);
              data[data.length - 1].circles = [];
              if (item.circle_id) {
                data[data.length - 1].circles.push({
                  id: item.circle_id,
                  name: item.circle_name,
                  description: item.circle_description
                });
              }
            }
          }
          callback({status: true, data: data});
      }, function(e) {
        console.error('eagerFind', e);
      });
    });
  };

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
    webStorage: new App.Entities.Person(db),
    filter: function(obj, resetPage) {
      obj = obj || {};
      var self = this;
      this.webStorage.eagerFind(obj, function(res) {
          if (resetPage) {
            App.GlobalState.page = 0;
          }
          self.reset(res.data);
      });
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
      'change .total'       : 'onNavigationClick'
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
    }
  });
  
  App.init();
});
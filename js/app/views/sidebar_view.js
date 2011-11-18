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


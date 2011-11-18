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

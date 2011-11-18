window.App = {
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

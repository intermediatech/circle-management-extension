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

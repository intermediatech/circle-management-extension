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

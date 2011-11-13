/**
 * Backbone webStorage Adapter v1.0
 * Override `Backbone.sync` to use delegate to the model or collection's
 * webStorage* property, which should be an instance of `AbstractEntity`.
 *
 * @author Mohamed Mansour http://mohamedmansour.com
 */
Backbone.sync = function(method, model, options, error) {

  // Backwards compatibility with Backbone <= 0.3.3
  if (typeof options == 'function') {
    options = {
      success: options,
      error: error
    };
  }

  // Callback for setting up the options for the requests, backbone requires
  // us to call the options success/error when applicable.
  var resp = function(resp) {
    if (resp.status) {
      options.success(method != 'read' ? model : resp.data);
    }
    else {
      options.error('Record not found ' + resp.data);
    }
  };

  // Our data backend for the models are defined as webStorage.
  var store = model.webStorage || model.collection.webStorage;

  // Use messaging so that we could access our single database instance.
  // We are doing this so we can reuse.
  chrome.extension.sendRequest({
    method: 'PlusAPI',
    data: {
      service: 'Database',
      entity: store,
      method: method,
      attributes: model.attributes
    }
  }, resp);
};
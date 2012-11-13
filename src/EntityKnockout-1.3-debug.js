/**
* EntityKnockout framework
* http://ianyates83.github.com/entity-knockout/
* v1.3.12
**/

// Class to represent a local repository of entities (view models)
// @modelName - The PascalCase name of the model to create a repository for
//              The implementation must be named modelName + 'Model'
// @options:
//     sorted (true)
//     serviceName (modelName) - URL base for remote service calls
//     localOnly (false) - Disable all service calls
function EntityRepository(modelName, options) {
	if (!(modelName + 'Model' in window))
		throw new Error('Failed to locate model definition: ' + modelName + 'Model');
	if (options == undefined)
		options = {};
	if (!('sorted' in options))
		options.sorted = true;
	if (!('serviceName' in options))
		options.serviceName = modelName;
	
	var self = this;
	self.ModelName = function () { return modelName; };
	self.Observable = ko.observableArray();
	self.IsDirty = ko.observable(false);
	self.IsBusy = ko.observable(false);
	var _cache = [];
	
	// Test model structure
	var model = new window[modelName + 'Model']();
	if (!('Keys' in model) || !$.isArray(model.Keys) || model.Keys.length == 0)
		throw new Error('Model ' + modelName + ' has an invalid Keys array');
	if (!('Fields' in model) || !$.isArray(model.Fields))
		throw new Error('Model ' + modelName + ' has an invalid Fields array');
	var modelKeys = model.Keys.slice(0);
	var modelFields = model.Fields.slice(0);
	delete model;

	// Prevent this repository from calling the server
	self.DisableServer = function () { _enabled = false; };
	var _enabled = (options.localOnly !== true);

	// Path all Url* values are appended to
	self.BaseUrl = _RepositoryServerUrl || '/';
	// Partial URI used by Call method, with action appended
	self.UrlCall = options.serviceName + '/';
	// URI used to delete an entity from the server
	// Sends key
	self.UrlDelete = options.serviceName + '/DeleteEntity';
	// URI used to get all entities from the server
	self.UrlGetAll = options.serviceName + '/GetAll';
	// URI used to get an entity from the server
	// Sends key
	self.UrlGetByKey = options.serviceName + '/GetByKey';
	// URI used to save an entity to the server
	// Sends local model
	self.UrlSave = options.serviceName + '/SaveEntity';

	// Prepare model prototype
	window[modelName + 'Model'].prototype = {
		Update: function (data) {
			var self = this;
			self.clearErrors();
			self.IsBusy(true);
			if ($.isFunction(self.BeforeUpdate))
				self.BeforeUpdate();
			
			for (var i in modelFields) {
				var field = modelFields[i];
				if (!(field in data))
					continue;
				if (self[field] && typeof self[field].subscribe == 'function' && typeof self[field].indexOf == 'function') {
					var arr = ($.isFunction(data[field]) ? data[field]() : data[field]);
					_setArray(self, field, arr);
				} else {
					var val = ($.isFunction(data[field]) ? data[field]() : data[field]);
					if ($.isFunction(self[field]))
						self[field](val);
					else
						self[field] = val;
				}
			}
			
			if ($.isFunction(self.AfterUpdate))
				self.AfterUpdate();
			self.IsNew(false);
			self.IsDirty(false);
			self.IsBusy(false);
			return self;
		},
		forJSON: function () {
			var self = this;
			var obj = {};
			for (var i in modelKeys) {
				var key = modelKeys[i];
				obj[key] = ko.utils.unwrapObservable(self[key]);
			}
			for (var i in modelFields) {
				var field = modelFields[i];
				if (!(field in self))
					continue;
				var val = self[field];
				if (val == undefined || val == null)
					continue;
				if (typeof val.subscribe == 'function' && typeof val.indexOf == 'function')
					val = _getArray(self, field);
				else
					val = ko.utils.unwrapObservable(val);
				if (val == undefined || val == null)
					continue;
				if (typeof val.forJSON == 'function')
					val = val.forJSON();
				if (val != undefined && val != null)
					obj[field] = val;
			}
			if (self.IsNew())
				obj.IsNew = true;
			else if (self.IsDirty())
				obj.IsModified = true;
			return obj;
		},
		toJSON: function () {
			return ko.toJSON(this.forJSON());
		},
		Delete: function (options) {
			var self = this;
			if (self.IsBusy())
				return false;
			self.IsBusy(true);
			if ($.isFunction(self.BeforeDelete)) {
				if (self.BeforeDelete()) {
					self.IsBusy(false);
					return false;
				}
			}
			self.repository._deleteFromServer(self, options);
			// AfterDelete(bool) called with success or failure
			return true;
		},
		Edit: function () {
			var self = this;
			if (self.IsBusy())
				return false;
			self.IsBusy(true);
			if ($.isFunction(self.BeforeEdit)) {
				if (self.BeforeEdit()) {
					self.IsBusy(false);
					return false;
				}
			}
			self.IsDirty(true);
			if ($.isFunction(self.AfterEdit))
				self.AfterEdit();
			self.IsBusy(false);
			return true;
		},
		// @options:
		//    async (bool), default true
		Revert: function (options) {
			var self = this;
			options = options || {};
			if (self.IsBusy())
				return false;
			self.IsBusy(true);
			if ($.isFunction(self.BeforeRevert)) {
				if (self.BeforeRevert()) {
					self.IsBusy(false);
					return false;
				}
			}
			if (self.IsNew()) {
				self.repository.Observable.remove(self);
			} else {
				self.repository.GetByKeyFromServer(self.dbKey, {
					async: options.async != false,
					callback: function () {
						self.IsDirty(false);
						if ($.isFunction(self.AfterRevert))
							self.AfterRevert();
						self.IsBusy(false);
					}
				});
			}
			return true;
		},
		// @options - Same as _saveToServer, except:
		//    ignoreLocalErrors (bool) defaults false - if false, will fail to save if this.errors().length > 0
		// BeforeSave can modify options
		Save: function (options) {
			var self = this;
			options = options || {};
			if (self.IsBusy())
				return false;
			self.IsBusy(true);
			self.clearErrors();
			if ($.isFunction(self.BeforeSave)) {
				if (self.BeforeSave(options)) {
					self.IsBusy(false);
					return false;
				}
			}
			if ($.isFunction(self.errors)) {
				if (options.ignoreLocalErrors !== true && self.errors().length > 0) {
					self.errors.showAllMessages();
					if ($.isFunction(self.AfterSave))
						self.AfterSave(false);
					self.IsBusy(false);
					return false;
				}
			}
			self.repository._saveToServer(self, options);
			// AfterSave(bool) called with success or failure
			return true;
		}
	};
	
	// Return size of cache
	self.count = function () { return self.Observable().length; };

	// Clear all values from this repository
	self.Clear = function () {
		var cacheCopy = cloneMap(_cache);
		for (var key in cacheCopy)
			_removeFromCache(key);
		self.Observable.removeAll();
		_cache = [];
	};

	// Attach item/data as though from server
	// @item can be an array of valid models or raw data
	self.Attach = function (item) {
		var wasInAttach = _inAttach;
		if (!_inAttach)
			self.Observable.valueWillMutate();
		_inAttach = true;
		try {
			if (typeof item == 'string') {
				try {
					item = $.parseJSON(item);
				} catch (e) {
					throw new Error('JSON parse failed to ' + modelName + ': ' + item);
				}
			}
			if (typeof item != 'object')
				throw new Error('Cannot attach primitive data');
			
			if ($.isArray(item)) {
				// Array of?
				var items = [];
				for (var i in item)
					items.push(self.Attach(item[i]));
				return items;
			}

			var wasNew = false, key;
			if (!('dbKey' in item)) { // Raw data
				key = 'I' + _getKey(item);
			} else {
				key = 'I' + item.dbKey;
				wasNew = item.IsNew();
			}

			// Single model
			if (!(key in _cache)) {
				if (!('dbKey' in item))
					item = self.CreateNew(item);
				if (!item.dbKey)
					throw new Error('Cannot attach incomplete item to ' + modelName);
				
				// Guess that entity is new
				if (key != 'I' + item.dbKey) {
					key = 'I' + item.dbKey;
					item.IsNew(true);
					item.IsDirty(true);
				}
				_addToCache(item);
			} else {
				_cache[key].Update(item);
				if (wasNew) {
					_cache[key].IsNew(true);
					_cache[key].IsDirty(true);
				}
			}
			return _cache[key];
		} finally {
			if (!wasInAttach) {
				_inAttach = false;
				self.Observable.valueHasMutated();
			}
		}
	};
	var _inAttach = false;

	// Creates a new instance of the model
	// Does not add to repository
	// @data can be used to provide default values
	//   (must have same key-values as model fields)
	self.CreateNew = function (data) {
		var item = new window[modelName + 'Model']();
		_decorateModel(self, item, data);
		if (data != undefined && data != null) {
			item.Update(data);
			if (_getKey(data).match(/^\|*$/)) {
				item.IsNew(true);
				item.IsDirty(true);
			}
		}
		item.applyValidation();
		if ($.isFunction(item.AfterCreate)) // TODO: Is this called again after Attach?
			item.AfterCreate();
		return item;
	};

	self.GetCount = function () {
		return self.Call('Count', { async: false });
	};

	// @options is a dictionary of:
	//    async (bool), defaults true - execute asynchronously
	//    params (dictionary) - key-value pairs to send as GET parameters
	self._deleteFromServer = function (item, options) {
		options = options || {};
		var deleted = function () {
			self.Observable.valueWillMutate();
			_removeFromCache(item.dbKey);
			self.Observable.valueHasMutated();
			if ($.isFunction(item.AfterDelete))
				item.AfterDelete(true);
			item.IsBusy(false);
		};
		if (!_enabled) {
			deleted();
			return;
		}
		var data = (options.data || {});
		data.key = item.dbKey;
		$.ajax({
			url: self.BaseUrl + self.UrlDelete,
			cache: false,
			async: (options.async != false),
			data: data,
			success: deleted,
			error: function (jqXHR) {
				item.handleError(jqXHR);
				if ($.isFunction(item.AfterDelete))
					item.AfterDelete(false);
				item.IsBusy(false);
			}
		});
	};

	// @options is a dictionary of:
	//    async (bool), defaults false - execute asynchronously (return value is useless; set 'callback' if needed)
	//    callback (function) - called with bool of success
	//    params (dictionary) - key-value pairs to send as GET parameters
	self.GetAll = function (options) {
		options = options || {};
		if (!_enabled)
			return self.Observable();
		self.IsBusy(true);
		$.ajax({
			url: self.BaseUrl + self.UrlGetAll,
			cache: false,
			async: (options.async == true),
			data: (options.params || null),
			error: function (jqXHR) {
				// jqXHR.status (e.g., 400)
				// jqXHR.responseText
				if (typeof console != 'undefined')
					console.log('TODO: Load error: ' + jqXHR.responseText);
				throw new Error('TODO Load error: ' + jqXHR.responseText);
				self.IsBusy(false);
				if ($.isFunction(options.callback))
					options.callback(false);
			}
		}).success(function (json) {
			var data = $.parseJSON(json);
			var cacheCopy = cloneMap(_cache);

			self.Observable.valueWillMutate();
			var work = function () {
				var batch = 100;
				while (data.length > 0 && batch-- > 0) {
					var item = data.shift();
					var el = _addOrUpdate(item);
					delete cacheCopy['I' + el.dbKey];
				}

				if (data.length == 0) {
					for (var key in cacheCopy)
						_removeFromCache(key.substring(1));

					if (options.sorted == true)
						self.Observable().sort();
					self.Observable.valueHasMutated();

					if ($.isFunction(options.callback))
						options.callback(true);
					self.IsBusy(false);
				} else {
					if (options.async == true)
						setTimeout(work, 1);
					else
						work();
				}
			};
			if (options.async == true)
				setTimeout(work, 1);
			else
				work();
		});
		return self.Observable();
	};
	// @options same as GetAll, but async is true by default
	self.LoadFromServer = function (options) {
		options = options || {};
		if (options.async != false)
			options.async = true;
		self.GetAll(options);
	};

	// @options is same as GetByKeyFromServer
	self.GetByKey = function (key, options) {
		options = options || {};
		var result = null;
		if (!('I' + key in _cache)) {
			result = self.GetByKeyFromServer(key, options);
		} else {
			result = _cache['I' + key];
			if ($.isFunction(options.callback))
				options.callback(result);
		}
		return result;
	};
	
	// @options is a dictionary of:
	//    async (bool), defaults false - execute asynchronously (return value is useless; set 'callback' if needed)
	//    callback (function) - called with item if successful, or null
	//    params (dictionary) - key-value pairs to send as GET parameters
	self.GetByKeyFromServer = function (key, options) {
		options = options || {};
		if (!_enabled)
			return null;
		if (key == null || key == 'null' || key.length == 0)
			return null;
		// Try to get from server
		var data = (options.params || {});
		data.key = key;
		$.ajax({
			url: self.BaseUrl + self.UrlGetByKey,
			cache: false,
			data: data,
			async: (options.async == true),
			success: function (json, success) {
				if (json == null || json.length == 0 || json == 'null') {
					_removeFromCache(key);
					return null;
				}
				var data = $.parseJSON(json);
				self.Observable.valueWillMutate();
				var result = _addOrUpdate(data);
				self.Observable.valueHasMutated();
				if ($.isFunction(options.callback))
					options.callback(result);
			},
			error: function (jqXHR) {
				// jqXHR.status (e.g., 400)
				// jqXHR.responseText
				if (typeof console != 'undefined')
					console.log('TODO: GetByKey error: ' + jqXHR.responseText);
				throw new Error('TODO: GetByKey error: ' + jqXHR.responseText);
				if ($.isFunction(options.callback))
					options.callback(null);
			}
		});
		if ('I' + key in _cache)
			return _cache['I' + key];
		return null;
	};

	// Call an arbitrary action on the server
	// @options:
	//     async (bool), defaults true - execute asynchronously (returns response data if false)
	//     url (string), defaults UrlCall + action - the URL to use
	//     params (dict) - sent in key-value pairs
	//     callback (function) - called with (response data, bool success)
	self.Call = function (action, options) {
		options = options || {};
		if (!_enabled)
			return;
		// Try to get from server
		var result = null;
		var done = function (data, success) {
			result = data;
			self.IsBusy(false);
			if (typeof options.callback == 'function')
				options.callback(data, success == 'success');
		};
		self.IsBusy(true);
		var url = ('url' in options ? options.url : self.UrlCall + action);
		$.ajax({
			url: self.BaseUrl + url,
			cache: false,
			async: (options.async != false),
			data: options.params || {},
			success: done,
			error: done
			// NOTE: jQuery 1.8 is supposed to use done/fail instead of success/error, but wasn't
		});
		if (options.async == false)
			return result;
	};

	// Register a server call function that will accept arguments
	// If an extra argument is sent, this will be treated as a new set of options for the actual call
	// @name - The call name
	// @args - Array of argument names
	// @options (optional)
	//     async (bool), defaults false - execute asynchronously (returns response data if false)
	//     url (string), defaults UrlCall + name - the URL to use
	//     params (dict) - default values sent as key-value pairs
	// @handler - The response handler, called with (response data, bool success)
	self.RegisterCall = function (name, args, options, handler) {
		if (name in self)
			throw new Error('Attempt to register server call over existing repository member.');
		if (handler == undefined && $.isFunction(options)) {
			handler = options;
			options = {};
		} else {
			options = options || {};
		}
		if ($.isFunction(handler))
			options.callback = handler;
		if (!('async' in options))
			options.async = false;
		self[name] = function () {
			var opts = $.extend({}, options);
			opts.params = opts.params || {};
			for (var i = 0; i < arguments.length && i < args.length; ++i)
				opts.params[args[i]] = arguments[i];
			if (i in arguments) {
				if ('callback' in arguments[i] && 'callback' in opts) {
					var oldCB = opts.callback;
					var newCB = arguments[i].callback;
					arguments[i].callback = function (data, success) { oldCB(data, success); newCB(data, success); };
				}
				$.extend(opts, arguments[i]);
			}
			return self.Call(name, opts);
		};
	};

	// @options same as model.Save
	self.SaveAll = function (options) {
		var items = self.Observable();
		for (var i in items) {
			var item = items[i];
			if (item.IsDirty())
				item.Save();
		}
	};

	// @options is a dictionary of:
	//    async (bool), defaults true - execute asynchronously
	//    params (dictionary) - key-value pairs to send as GET parameters
	//    callback(bool) - given success; called after all other functions
	self._saveToServer = function (item, options) {
		options = options || {};
		var saved = function (response) {
			var data = $.parseJSON(response);
			var newKey = _getKey(data);
			if (item.dbKey != newKey) {
				self.Observable.valueWillMutate();
				_removeFromCache(item.dbKey); // Remove old key
				_fillModelKey(item, data);
				_addToCache(item);
				self.Observable.valueHasMutated();
			}
			item.Update(data);
			if ($.isFunction(item.AfterSave))
				item.AfterSave(true);
			if ('callback' in options && $.isFunction(options.callback))
				options.callback(true);
			item.IsBusy(false);
		};
		if (!_enabled) {
			saved(item.toJSON(), 'success');
			return;
		}
		var data = (options.params || {});
		data.item = item.toJSON();
		$.ajax({
			url: self.BaseUrl + self.UrlSave,
			_cache: false,
			type: 'POST',
			async: (options.async != false),
			data: data,
			//dataType: 'json',
			success: saved,
			error: function (jqXHR) {
				item.handleError(jqXHR);
				if ($.isFunction(item.AfterSave))
					item.AfterSave(false);
				if ('callback' in options && $.isFunction(options.callback))
					options.callback(false);
				item.IsBusy(false);
			}
		});
	};

	self.Sort = function () {
		self.Observable.sort();
	};

	var _addOrUpdate = function (data) {
		var key = 'I' + _getKey(data);
		if (!(key in _cache)) {
			var item = new window[modelName + 'Model']();
			_decorateModel(self, item, data);
			key = 'I' + item.dbKey;
			if (!(key in _cache))
				_addToCache(item);
			else
				item = _cache[key];
			item.Update(data);
			item.applyValidation();
			if ($.isFunction(item.AfterCreate))
				item.AfterCreate();
		} else {
			_cache[key].Update(data);
		}
		return _cache[key];
	};

	var _addToCache = function (item) {
		var key = 'I' + item.dbKey;
		if (key in _cache && _cache[key] != item)
			_removeFromCache(_cache[key]);
		if (!(key in _cache)) {
			_cache[key] = item;
			if (self.Observable.indexOf(item) == -1)
				self.Observable().push(item);
			item.IsDirty.subscribe(_updateIsDirty);
			if (item.IsDirty() || item.IsNew())
				_updateIsDirty();
		}
	};
	var _removeFromCache = function (key) {
		key = 'I' + key;
		if (key in _cache) {
			var items = self.Observable();
			for (var i in items) {
				var item = items[i];
				if (item == _cache[key]) {
					self.Observable().splice(i, 1);
					break;
				}
			}
			delete _cache[key];
		}
	};

	var _updateIsDirty = function (dirty) {
		if (!dirty) {
			var items = self.Observable();
			for (var i in items) {
				if (items[i].IsDirty() || items[i].IsNew()) {
					dirty = true;
					break;
				}
			}
		}
		self.IsDirty(dirty);
	};

	// Get the model key from the raw data or item
	var _getKey = function (data) {
		var str = '', c = 0;
		for (var i in modelKeys) {
			var key = modelKeys[i];
			if (c++ > 0)
				str += '|';
			if (key in data) {
				if ($.isFunction(data[key]))
					str += data[key]();
				else
					str += data[key];
			}
		}
		return str;
	};
	var _fillModelKey = function (item, data) {
		if (data != undefined) {
			for (var i in modelKeys) {
				var key = modelKeys[i];
				if (!(key in data))
					continue;
				var val = data[key];
				if (val == undefined)
					val = null;
				if (!(key in data))
					val = val();
				if (key in item && $.isFunction(item[key]))
					item[key](val);
				else
					item[key] = val;
			}
		}
		item.dbKey = _getKey(item);
	};

	// Decorate basic model for Ecd framework
	var _decorateModel = function (repo, self, data) {
		// Fill model keys
		self.modelName = modelName;
		self.repository = repo;
		_fillModelKey(self, data);

		self.IsNew = ko.observable(true);
		self.IsDirty = ko.observable(true);
		self.IsBusy = ko.observable(false); // Updating, Saving, Deleting
		for (var i in modelFields) {
			var field = modelFields[i];
			if (!(field in self))
				self[field] = ko.observable();
			if ($.isFunction(self[field])) {
				self[field].model = self;
				self[field].fieldName = field;
				self[field].subscribe(function () { self.IsDirty(true); });
			}
		}

		// ko.validation extension
		// Validation must be applied after model is complete
		self.applyValidation = function () {
			self['*'] = ko.observable();
			if (!('errors' in self))
				self.errors = ko.validation.group(self);
		};

		self.hasError = {}; // Map of fields with errors
		self.isValid = function () { return ($.isFunction(self.errors) ? self.errors().length : self.errors.length) == 0; };

		// Fail the validation on a server error
		self.handleError = function (jqXHR) {
			try {
				var err = $.parseJSON(jqXHR.responseText);
				if (err != null && typeof err == 'object') {
					for (var key in err)
						self.setError(key, err[key]);
				}
			} catch (e) {
				// TODO
				if (typeof console != 'undefined')
					console.log('Unhandled error: ' + jqXHR.responseText);
			}
		};
		self.setError = function (field, error) {
			if ($.isFunction(self[field]) && $.isFunction(self[field].rules)) {
				var rules = self[field].rules();
				for (var i in rules) {
					if (rules[i].rule == 'hasError') {
						rules[i].params.message = error;
						self.hasError[field] = true;
						self[field].notifySubscribers(null, null);
						return;
					}
				}
				if (!('model' in self[field]))
					self[field].model = self;
				if (!('fieldName' in self[field]))
					self[field].fieldName = field;
				self[field].extend({
					hasError: {
						me: self[field],
						message: ''
					}
				});
				self.setError(field, error);
			}
		};
		self.clearErrors = function () {
			for (var i in self.hasError)
				self.clearError(i);
		};
		self.clearError = function (field) {
			if (self.hasError[field]) {
				delete self.hasError[field];
				if ($.isFunction(self[field]) && $.isFunction(self[field].notifySubscribers))
					self[field].notifySubscribers(null, null);
			}
		};
	};
	
	var _getArray = function (model, field) {
		var arr;
		if ($.isFunction(model['get' + field]))
			arr = model['get' + field]();
		else if (typeof model[field].forJSON == 'function')
			arr = model[field].forJSON();
		else
			arr = ko.utils.unwrapObservable(model[field]);
		for (var i in arr) {
			if (typeof arr[i] == 'object') {
				if ($.isFunction(arr[i].forJSON))
					arr[i] = arr[i].forJSON();
				else if ($.isFunction(arr[i]))
					arr[i] = arr[i]();
			}
		}
		return arr;
	};
	var _setArray = function (model, field, arr) {
		if (arr == null) {
			var cur = _getArray(model, field);
			if (cur == null || cur.length != 0)
				return;
		}
		if ($.isFunction(model[field].valueHasMutated))
			model[field].valueWillMutate();
		if (arr == null || arr.length == 0) {
			if ($.isFunction(model['set' + field])) {
				model['set' + field](null);
			} else if ($.isFunction(model[field])) {
				model[field](null);
			} else if (arr != null) {
				model[field] = [];
			}
		} else {
			if ($.isFunction(model['set' + field])) {
				model['set' + field](arr);
			} else if ($.isFunction(model[field + '_NewItem'])) {
				model[field]([]);
				for (var i in arr)
					model[field + '_NewItem'](arr[i]);
			} else if ($.isFunction(model[field])) {
				model[field](arr);
			} else {
				model[field] = arr;
			}
		}
		if ($.isFunction(model[field].valueHasMutated))
			model[field].valueHasMutated();
	};
}
if (typeof _RepositoryServerUrl == 'undefined')
	_RepositoryServerUrl = null;

/** Helper functions follow **/

// Return an array with just the relevant JSON data
ko.observableArray['fn']['forJSON'] = function () {
	var items = this();
	if (items == null)
		return null;
	if (items.length == 0)
		return [];
	var result = [];
	for (var i in items) {
		if ($.isFunction(items[i].forJSON))
			result.push(items[i].forJSON());
		else
			result.push($.parseJSON(ko.toJSON(items[i])));
	}
	return result;
};

// The hasError validation rule
// Checks the field model for a hasError[] entry
ko.validation.rules['hasError'] = {
	validator: function (val, params) {
		if (params.me.model.hasError[params.me.fieldName])
			return false;
		return true;
	},
	message: '{message}'
};
ko.validation.registerExtenders();

// Creates a shallow clone of obj's properties
function cloneMap(obj, andFunc) {
	var res = {};
	for (var i in obj) {
		if (obj.hasOwnProperty(i) && (andFunc || typeof obj[i] != 'function'))
			res[i] = obj[i];
	}
	return res;
}
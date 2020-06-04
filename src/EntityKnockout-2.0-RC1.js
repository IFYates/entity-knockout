/**
* EntityKnockout framework
* http://ianyates83.github.com/entity-knockout/
* v2.0-RC1
**/

// TODO
var DefaultOptions = {
	sorted: true, // Sort list received by GetAll/LoadFromServer
	localOnly: false, // Disable all server calls silently
	strictMode: true, // TODO: Require all declared keys and fields to be defined
	includeMissingModels: true, // TODO: If model does not exist, try to include the model file
	modelFilePath: '{0}Model.js', // TODO: If includeMissingModels = true, the relative path of the model file (where {0} is the model name)
	sendAllFields: false // TODO: If true, always sends every field on save, regardless of modified state
};

(function () {
	var eko = this;

	/** Helper functions **/

	var log = (function () {
		function _log(comp, lvl, msg, logfn, data) {
			var message = '[eko:' + comp + '] ' + lvl + ': ' + msg;
			if (logfn) {
				logfn.call(console, message);
			}
			if (is(data) && console && console.debug) {
				console.debug(data);
			}
			if (lvl === 'ERROR') {
				throw new Error(message);
			}
		}
		return {
			TRACE: function (comp, msg, data) {
				_log(comp, 'INFO', msg, console && console.trace, data);
			},
			DEBUG: function (comp, msg, data) {
				_log(comp, 'INFO', msg, console && console.debug, data);
			},
			INFO: function (comp, msg, data) {
				_log(comp, 'INFO', msg, console && console.info, data);
			},
			WARN: function (comp, msg, data) {
				_log(comp, 'INFO', msg, console && console.warn, data);
			},
			ERROR: function (comp, msg, data) {
				_log(comp, 'ERROR', msg, console && console.error, data);
			}
		};
	})();

	function _isArray(obj) {
		// Will match true arrays and ko.observableArray
		return (obj && obj.__proto__ === Array.prototype) || (_isFunc(obj) && _isFunc(obj.splice));
	}
	function _isDate(obj) {
		return obj && obj.__proto__ === Date.prototype;
	}
	function _isObj(obj) {
		return obj && obj.__proto__ === Object.prototype;
	}
	function _isFunc(obj) {
		return obj && typeof obj === 'function';
	}
	function is(val) {
		return val !== null && val !== undefined;
	}

	function _unwrap(val) {
		return (_isFunc(val) ? val() : val);
	}

	// Creates a shallow clone of obj's properties
	function cloneMap(obj, andFunc) {
		var res = {};
		for (var p in obj) {
			if (obj.hasOwnProperty(p) && (andFunc || !_isFunc(obj[p]))) {
				res[p] = obj[p];
			}
		}
		return res;
	}

	/** Main namespace **/
	var eko = {
		options: {
			baseUrl: null,
			actionGet: 'Get',
			actionGetAll: 'GetAll',
			actionSave: 'Save'
		},

		log: log,
		utils: {
			/**
			 * A generic implementation of an Ajax call, allowing Eko functionality to be overridden.
			 * @param {String} options.url
			 * @param {String|Object} options.data
			 * @param {Function(responseText)} options.success
			 * @param {Function(xhr)} options.error
			 * @param {Boolean} [options.async=true]
			 * @param {Boolean} [options.post=false]
			 */
			ajax: function (options) { // Allows for override
				var xhr = new XMLHttpRequest();
				xhr.onreadystatechange = function () {
					if (xhr.readyState === 4) {
						if (xhr.status === 200 || xhr.status === 201) {
							options.success(xhr.responseText);
						} else {
							options.error(xhr);
						}
					}
				}

				options.data = options.data || '';
				if (typeof options.data !== 'string') {
					var d = options.data, data = '';
					for (var p in d) {
						if (d.hasOwnProperty(p)) {
							data += '&' + encodeURIComponent(p) + '=';
							if (typeof d[p] === 'object') {
								data += encodeURIComponent(JSON.stringify(d[p]));
							} else {
								data += encodeURIComponent(d[p]);
							}
						}
					}
					options.data = (data.length > 0 ? data.substring(1) : '');
				}
				
				xhr.open(options.post ? 'POST' : 'GET', options.url, options.async != false);
				xhr.setRequestHeader('X-Requested-With', 'XMLHttpRequest');
				
				if (!options.post) {
					options.data += '&_=' + Date.now(); // Cache-break for GET
				} else {
					xhr.setRequestHeader('Content-Type', 'application/x-www-form-urlencoded');
				}

				xhr.send(options.data);
			},
			isArray: _isArray,
			isDate: _isDate,
			isFunction: _isFunc,
			isset: is,
			unwrap: _unwrap
		},

		/**
		 * @param {Object} [options=null] Options to use when getting the related entity (see Repository.Get)
		 * @param {Boolean} [options.async=false]
		 * @param {Boolean} [options.attach=true]
		 */
		entity: function (keys, repository, options) {
			if (repository === void 0) {
				repository = keys;
				keys = null;
			}

			var _repo = repository;
			if (!repository || (typeof repository !== 'string' && repository.constructor.prototype !== eko.Repository.prototype)) {
				log.ERROR('entityArray', 'Unknown argument value: repository', repository);
			}

			options = options || {};
			options.async = false;
			options.attach = options.attach != false;

			var _value = ko.observable(null);
			var impl = ko.computed({
				deferEvaluation: true,
				read: function () {
					if (_value()) {
						return _value();
					}

					var key = '';
					if (_isArray(keys)) {
						for (var i = 0; i < keys.length; ++i) {
							if (i > 0) {
								key += '|';
							}
							key += _unwrap(keys[i]);
						}
					} else {
						key = _unwrap(keys);
					}

					_value = impl.repository().Get(key, options);
					return _value;
				},

				write: function (value) {
					impl.repository();
					var value = null;
					if (options.attach) {
						value = _repo.Attach(value);
					} else {
						value = _repo.CreateNew(value);
					}
					_value(value);
					impl.notifySubscribers();
				}
			});
			impl.repository = function () {
				if (typeof _repo === 'string') {
					_repo = eko.repositories.get(repository);
					if (!_repo) {
						log.ERROR('entityArray', 'Unknown named repository: ' + repository);
					}
				}
				return _repo;
			};
			return impl;
		},

		/**
		 * @param {String|Repository} repository
		 * @param {Object} [options=null]
		 * @param {Boolean} [options.attach=true]
		 */
		entityArray: function (repository, options) {
			var _repo = repository;
			if (!repository || (typeof repository !== 'string' && repository.constructor.prototype !== eko.Repository.prototype)) {
				log.ERROR('entityArray', 'Unknown argument value: repository', repository);
			}
			options = options || {};
			options.attach = options.attach != false;
			var _array = null;
			var impl = ko.computed({
				deferEvaluation: true,
				read: function () {
					return _array;
				},
				write: function (vals) {
					impl.repository();
					if (options.attach) {
						_array = _repo.Attach(vals);
					} else {
						_array = [];
						for (var i = 0; i < vals.length; ++i) {
							_array.push(_repo.CreateNew(vals[i]));
						}
					}
					impl.notifySubscribers();
				}
			});
			impl.repository = function () {
				if (typeof _repo === 'string') {
					_repo = eko.repositories.get(repository);
					if (!_repo) {
						log.ERROR('entityArray', 'Unknown named repository: ' + repository);
					}
				}
				return _repo;
			};
			return impl;
		}
	};
	window.eko = eko;

	// TODO: Currently for key; does this work for field?
	function _setFieldValue(inst, field, val) {
		// Resolve value
		if (val === undefined) {
			val = null;
		}
		if (_isFunc(val)) {
			val = val();
		}

		// Convert number from string
		var num;
		if (typeof val === 'string' && !isNaN(num = Number(val)) && val === num.toString()) {
			val = num;
		}
		if (_isArray(val)) {
			val = val.slice();
		}

		// Set value
		if (inst[field] && _isFunc(inst[field].valueWillMutate)) {
			inst[field].valueWillMutate();
		}
		if (_isFunc(inst['OnSet' + field])) {
			inst['OnSet' + field](val);
		} else if (_isFunc(inst[field])) {
			inst[field](val);
		} else {
			inst[field] = val;
		}
		if (inst[field] && _isFunc(inst[field].valueHasMutated)) {
			inst[field].valueHasMutated();
		}
	};

	// Decorate basic model with EKO functionality
	// Online called on Create or first Attach
	function _completeModelPrototype(def, constr) {
		if (constr && constr.__eko__) {
			return;
		}

		var proto = constr.prototype;

		// Fixed values
		proto.modelName = def.name;
		proto.repository = null;

		// Overrides
		if (_isFunc(def.overrides.OnCreated)) {
			proto.OnCreated = def.overrides.OnCreated;
		}
		if (_isFunc(def.overrides.OnUpdating)) {
			proto.OnUpdating = def.overrides.OnUpdating;
		}
		if (_isFunc(def.overrides.OnUpdated)) {
			proto.OnUpdated = def.overrides.OnUpdated;
		}
		if (_isFunc(def.overrides.OnSaving)) {
			proto.OnSaving = def.overrides.OnSaving;
		}
		if (_isFunc(def.overrides.OnSaved)) {
			proto.OnSaved = def.overrides.OnSaved;
		}

		proto.clone = function () {
		    return this.repository.CreateNew(this.toPOJO());
		};

		// Default functionality
		proto.Update = function (data) {
			var inst = this;
			////inst.IsBusy(true);
			if (_isFunc(inst.OnUpdating)) {
				inst.OnUpdating(data);
			}

			for (var i = 0; i < def.fields.length; ++i) {
				var field = def.fields[i];
				if (field in data) {
					var val = _unwrap(data[field]);
					_setFieldValue(inst, field, val);
					if (inst[field] && _isFunc(inst[field].IsDirty)) {
						inst[field].IsDirty(false);
					}
				}
			}

			inst.IsNew(false);
			inst.IsDirty(false);
			////inst.IsBusy(false);
			if (_isFunc(inst.OnUpdated)) {
				inst.OnUpdated();
			}
			return inst;
		};
		proto.Save = function (options) {
			this.repository.SaveToServer(this, options);
		};

		proto.toPOJO = function () {
			var obj = {};
			for (var i = 0; i < def.keys.length; ++i) {
				var key = def.keys[i];
				obj[key] = _unwrap(this[key]);
			}
			for (var i = 0; i < def.fields.length; ++i) {
				var field = def.fields[i], val;
				if (field in this) {
					if (_isArray(this[field])) {
						// Can get the value in a number of ways
						if (_isFunc(this['OnGet' + field])) {
							val = this['OnGet' + field]();
						} else if (_isFunc(this[field].toPOJO)) {
							val = this[field].toPOJO();
						} else {
							val = _unwrap(this[field]);
						}

						// Convert to POJO
						for (var j = 0; j < val.length; ++j) {
							if (typeof val[j] === 'object') {
								if (_isFunc(val[j].toPOJO)) {
									val[j] = val[j].toPOJO();
								} else {
									val[j] = _unwrap(val[j]);
								}
							}
						}
					} else {
						val = _unwrap(this[field]);
					}
					if (val && _isFunc(val.toPOJO)) {
						val = val.toPOJO();
					}
					if (_isDate(val)) {
						obj[field] = new Date(Date.UTC(val.getFullYear(), val.getMonth(), val.getDate(), val.getHours(), val.getMinutes(), val.getSeconds(), val.getMilliseconds()))
					} else if (is(val)) {
						obj[field] = val;
					}
				}
			}
			if (_unwrap(this.IsNew)) {
				obj.IsNew = true;
			} else if (_unwrap(this.IsDirty)) {
				obj.IsDirty = true;
			}
			return obj;
		};
		proto.toJSON = function () {
			return JSON.stringify(this.toPOJO());
		};

		// State variables must be set per entity
		window[def.type] = function () {
			var obj = this;
			constr.apply(this, arguments);
			obj.__proto__ = proto;

			obj.IsNew = ko.observable(true);
			obj.IsDirty = ko.observable(true);
			////obj.IsBusy = ko.observable(false); // Updating, Saving, Deleting

			// Create keys
			for (var i = 0; i < def.keys.length; ++i) {
				var key = def.keys[i];
				if (!(key in obj)) {
					obj[key] = null;
				}
			}

			// Create fields (TODO: defaults)
			for (var i = 0; i < def.fields.length; ++i) {
				var field = def.fields[i];
				if (!(field in obj)) {
					obj[field] = ko.observable();
				}
				if (_isFunc(obj[field]) && obj[field].subscribe) {
					obj[field].model = obj;
					obj[field].fieldName = field;
					////obj[field].IsDirty = ko.observable(false); // TODO: review
					obj[field].subscribe(function () {
						obj.IsDirty(true);
						////obj[field].IsDirty(true);
					});
				}
			}
		}
		window[def.type].prototype = proto;
		window[def.type].__eko__ = true;
	};

	/** Repository definition **/
	eko.Repository = function (def, constr) {
		_completeModelPrototype(def, constr);

		var repo = this;
		var _cache = {};

		// TODO: Improve
		repo.action = {
			baseUrl: def.action.baseUrl || eko.options.baseUrl || (function () {
				return location.protocol + '//' + location.hostname
					+ (location.port ? ':' + location.port : '')
					+ ((i = location.pathname.lastIndexOf('/')) >= 0 ? location.pathname.substring(0, i + 1) : '/');
			})(),
			serviceName: def.action.serviceName || def.name,
			Get: def.action.Get || eko.options.actionGet,
			GetAll: def.action.GetAll || eko.options.actionGetAll,
			Save: def.action.Save || eko.options.actionSave
		};

		repo.ModelName = function () { return def.name; };

		repo.Content = ko.observableArray([]);
		repo.Content.toJSON = function () {
			// TODO: test
			return JSON.stringify(this.toPOJO());
		}
		repo.Content.toPOJO = function () {
			// TODO: test
			var arr = repo.Content();
			var pojo = [];
			for (var i = 0; i < arr.length; ++i) {
				pojo.push(arr[i].toPOJO());
			}
			return pojo;
		}

		repo.Count = function () { return repo.Content().length; };

		// Get the model key from the raw data or item
		function _getKey(data) {
			var str = '';
			for (var i = 0; i < def.keys.length; ++i) {
				var key = def.keys[i];
				if (i > 0) {
					str += '|';
				}
				if (key in data) {
					str += _unwrap(data[key]) || '';
				}
			}
			return str;
		};

		// Set the value of the model key, based on data
		function _fillModelKey(item, data) {
			item.repository = repo;
			for (var i = 0; i < def.keys.length; ++i) {
				_setFieldValue(item, def.keys[i], data[def.keys[i]]);
			}
			item.dbKey = _getKey(item);
		};

		function _addToCache(inst) {
			var key = 'I' + inst.dbKey;
			if (key in _cache && _cache[key] !== inst) {
				_removeFromCache(key);
			}
			if (!(key in _cache)) {
				_cache[key] = inst;
				////inst.IsDirty.subscribe(_updateIsDirty);
				if (inst.IsDirty() || inst.IsNew()) {
					////_updateIsDirty();
				}
			}
			if (repo.Content().indexOf(inst) === -1) {
				repo.Content().push(inst);
			}
		}

		/**
		 * Silently removes an item from the cache
		 */
		function _removeFromCache(key) {
			if (('' + key)[0] !== 'I') {
				key = 'I' + key;
			}
			if (key in _cache) {
				var items = repo.Content();
				for (var i = 0; i < items; ++i) {
					if (items[i] === _cache[key]) {
						// TODO: removeSubscriptions(item);
						repo.Content().splice(i, 1);
						break;
					}
					delete items[i];
				}
				// TODO: Announce removal?
				delete _cache[key];
			}
		}

		// Clear all values from this repository
		repo.Clear = function () {
			repo.Content.valueWillMutate();
			var cacheCopy = cloneMap(_cache);
			for (var key in cacheCopy) {
				_removeFromCache(key);
			}
			repo.Content.removeAll();
			repo.Content.valueHasMutated();
			_cache = {};
		};

		/***
		@item: JSON string, POJO, array of POJOs, valid entity, array of valid entities
		***/
		repo.Attach = function (item) {
			var wasInAttach = _inAttach;
			if (!_inAttach) {
				repo.Content.valueWillMutate();
			}
			_inAttach = true;
			try {
				if (typeof item === 'string') {
					try {
						item = JSON.parse(item);
					} catch (e) {
						log.ERROR('Attach', 'JSON parse failed for ' + def.name, e);
					}
				}
				if (_isArray(item)) {
					// Array of?
					var items = [];
					for (var i = 0; i < item.length; ++i) {
						items.push(repo.Attach(item[i]));
					}
					return items;
				}
				if (typeof item !== 'object') {
					log.ERROR('Attach', 'Cannot attach primitive data', item);
				}

				// Must be valid
				var key = 'I' + (item.dbKey || _getKey(item));
				if (key.length === 1) {
					log.ERROR('Attach', 'Cannot attach incomplete item to ' + def.name, item);
				}

				var wasNew = ('IsNew' in item ? !!_unwrap(item.IsNew) : false);

				// If already exists, just an update
				if (key in _cache) {
					_cache[key].Update(item);
				} else {
					// Convert to entity
					if (item.__proto__ !== constr.prototype) { // TODO: Broken?
						item = repo.CreateNew(item);
					}

					// Guess that entity is new
					if (!item.dbKey || key !== 'I' + item.dbKey) {
						key = 'I' + item.dbKey;
						wasNew = true;
					}

					// Attach if missing
					_addToCache(item);
				}

				_cache[key].IsNew(wasNew);
				_cache[key].IsDirty(wasNew);
				return _cache[key];
			} finally {
				if (!wasInAttach) {
					_inAttach = false;
					repo.Content.valueHasMutated();
				}
			}
		};
		var _inAttach = false;

		// Create new instance of model - unattached
		repo.CreateNew = function (data) {
			var inst = new window[def.type]();
			_fillModelKey(inst, data || {});
			if (data) {
				inst.Update(data);
				inst.IsNew(true);
				inst.IsDirty(true);
			}
			if (_isFunc(inst.OnCreated)) {
				inst.OnCreated();
				inst.OnCreated = function () { };
			}
			return inst;
		};

		repo.Detach = function (inst) {
			if (inst && 'I' + inst.dbKey in _cache) {
				repo.Content.valueWillMutate();
				_removeFromCache('I' + inst.dbKey);
				repo.Content.valueHasMutated();
			}
		};

		/**
		 * Checks locally or remotely for a single item matching the given key.
		 * @param {Object} options
		 * @param {Boolean} [options.async=false]
		 * @param {Object} [options.params]
		 * @param {String} [options.from='default'] or 'local' or 'server'
		 * @param {Function(item)} [options.result]
		 */
		repo.Get = function (key, options) {
			if (!key || key.length === 0 || key === 'null') {
				return null;
			}
			options = options || {};
			options.from = options.from || 'default';

			// Check locally
			var item = null;
			if (options.from === 'default' || options.from === 'local') {
				if ('I' + key in _cache) {
					item = _cache['I' + key];
				}
			}
			if (!item && (options.from === 'default' || options.from === 'server')) {
				var params = (options.params || {});
				params.key = key;
				eko.utils.ajax({
					url: '' + repo.action.baseUrl + repo.action.serviceName + '/' + repo.action.Get,
					data: params,
					async: !!options.async,
					success: function (data) {
						if (!data || data.length === 0 || data === 'null') {
							_removeFromCache(key);
							return null;
						}
						if (typeof data === 'string') {
							data = JSON.parse(data);
						}
						if (_isArray(data)) {
							log.ERROR('Get', def.name + '.' + key + ' returned array', data);
						}

						repo.Content.valueWillMutate();
						item = repo.Attach(data);
						repo.Content.valueHasMutated();
						if (_isFunc(options.result)) {
							options.result(item);
						}
					},
					error: function (xhr) {
						log.ERROR('Get', def.name + '.' + key + ' server error: ' + xhr.status, xhr);
						if (_isFunc(options.result)) {
							options.result(null);
						}
					}
				});
			} else if (_isFunc(options.result)) {
				options.result(item);
			}
			return item;
		};
		repo.Get.isCaller = true;

		// @options is a dictionary of:
		//    async (bool), defaults false - execute asynchronously (return value is useless; set 'callback' if needed)
		//    result (function) - called with bool of success
		//    params (dictionary) - key-value pairs to send as GET parameters
		repo.GetAll = function (options) {
			options = options || {};
			////self.IsBusy(true);
			eko.utils.ajax({
				url: '' + repo.action.baseUrl + repo.action.serviceName + '/' + repo.action.GetAll,
				async: !!options.async,
				data: (options.params || {}),
				success: function (data) {
					if (typeof data === 'string') {
						data = JSON.parse(data);
					}
					if (!_isArray(data)) {
						log.ERROR('GetAll', def.name + ' did not return array', data);
					}

					var cacheCopy = cloneMap(_cache);

					repo.Content.valueWillMutate();
					// Load in batches to reduce interface lag
					var work = function () {
						var batch = options.async ? 100 : data.length;
						while (data.length && batch--) {
							var item = data.shift();
							var el = repo.Attach(item);
							delete cacheCopy['I' + el.dbKey];
						}

						// Check if finished, or schedule next batch
						if (!data.length) {
							// Remove unaffected entities
							for (var key in cacheCopy) {
								_removeFromCache(key);
							}

							////if (options.sorted) {
							////	repo.Content().sort();
							////}
							repo.Content.valueHasMutated();

							if (_isFunc(options.result)) {
								options.result(true);
							}
							////repo.IsBusy(false);
						} else {
							setTimeout(work, 0);
						}
					};
					if (options.async) {
						setTimeout(work, 0);
					} else {
						work();
					}
				},
				error: function (xhr) {
					if (_isFunc(options.result)) {
						if (options.result(false) === true) {
							return;
						}
					}
					log.ERROR('GetAll', def.name + ' server error: ' + xhr.status, xhr);
				}
			});
			return repo.Content();
		};
		repo.GetAll.isCaller = true;

		// @options is a dictionary of:
		//    async (bool), defaults true - execute asynchronously
		//    params (dictionary) - key-value pairs to send as GET parameters
		//    result (func(saved)) defaults undefined - called after all other callbacks
		repo.SaveToServer = function (inst, options) {
			if (_isFunc(inst.OnSaving)) {
				if (inst.OnSaving() === false) {
					return;
				}
			}

			////inst.IsBusy(true);
			options = options || {};
			var params = (options.params || {});
			params.item = inst.toJSON();
			eko.utils.ajax({
				url: '' + repo.action.baseUrl + repo.action.serviceName + '/' + repo.action.Save,
				post: true,
				async: !!options.async,
				data: params,
				success: function (data) {
					if (typeof data === 'string') {
						data = JSON.parse(data);
					}
					var newKey = _getKey(data);
					if (!newKey || !newKey.length) {
						log.ERROR('SaveToServer', 'Success response did not provide entity key', data);
					} else if (inst.dbKey !== newKey) {
						// Key has changed, so remove old
						repo.Content.valueWillMutate();
						_removeFromCache(inst.dbKey);
						_fillModelKey(inst, data);
						_addToCache(inst);
						repo.Content.valueHasMutated();
					} else if (!(inst.dbKey in _cache)) {
						repo.Content.valueWillMutate();
						_addToCache(inst);
						repo.Content.valueHasMutated();
					}
					inst.Update(data);
					if (_isFunc(inst.OnSaved)) {
						inst.OnSaved(true);
					}
					if (_isFunc(options.result)) {
						options.result(true);
					}
					////inst.IsBusy(false);
				},
				error: function (xhr) {
					inst.handleError(xhr); // TODO
					if (_isFunc(inst.OnSaved)) {
						inst.OnSaved(false);
					}
					if (_isFunc(options.result)) {
						options.result(false);
					}
					////inst.IsBusy(false);
				}
			});
		};
		repo.SaveToServer.isCaller = true;

		/**
		 * @param {String} action
		 * @param {Object} [data]
		 * @param {Function} handler (success, data)
		 * @param {Object} [options]
		 * @param {Boolean} [options.async=false]
		 * @param {Boolean} [options.post=true]
		 * @param {Boolean} [options.json=true]
		 */
		repo.Call = function (action, data, handler, options) {
			if (!is(options)) { // TODO: test
				if (_isObj(handler)) {
					options = handler;
					handler = null;
				}
				if (!is(handler) && _isFunc(data)) {
					handler = data;
					data = null;
				}
			}
			options = options || {};
			
			eko.utils.ajax.call(this, {
				url: '' + repo.action.baseUrl + repo.action.serviceName + '/' + (options.action || action),
				post: options.post != false,
				async: !!options.async,
				data: data,
				success: function (data) {
					if (options.json != false) {
						data = JSON.parse(data); // TODO: handle bad JSON as error
					}
					if (handler) {
						handler.call(this, true, data);
					}
				},
				error: function (data) {
					if (handler) {
						handler.call(this, false, data);
					}
				}
			});
		};

		/**
		 * @param {String} name
		 * @param {Array} params
		 * @param {Function} [handler=null]
		 * @param {Object} [options]
		 * @param {String} [options.action=@name]
		 * @param {Boolean} [options.async=false]
		 * @param {Boolean} [options.post=true]
		 */
		repo.define = function (name, params, handler, options) {
			if (name in repo && (!_isFunc(repo[name]) || !repo[name].isCaller)) {
				log.ERROR('define', 'Cannot overwrite internal functionality: ' + name);
			}

			options = options || {};
			function caller(cb1, cb2, args) {
				if (args.length !== params.length) {
					log.ERROR(name, 'Number of supplied arguments does not match definition (' + params.length + ')', arguments)
				}
				if (!cb1 && !cb2) {
					log.ERROR(name, 'No callback defined for ' + name);
				}

				var data = {};
				for (var i = 0; i < args.length; ++i) {
					data[params[i]] = args[i];
				}

				eko.utils.ajax.call(this, {
					url: '' + repo.action.baseUrl + repo.action.serviceName + '/' + (options.action || name),
					post: options.post != false,
					async: !!options.async,
					data: data,
					success: function (data) {
						if (cb1) {
							cb1.call(this, true, data);
						}
						if (cb2) {
							cb2.call(this, true, data);
						}
					},
					error: function (data) {
						if (cb1) {
							cb1.call(this, false, data);
						}
						if (cb2) {
							cb2.call(this, false, data);
						}
					}
				});
			}
			repo[name] = function () {
				caller.call(this, handler, null, arguments);
			};
			repo[name].and = function () {
				arguments = Array.prototype.slice.call(arguments);
				var additional = arguments.pop();
				if (typeof additional !== 'function') {
					log.ERROR(name, 'Expected callback function as final argument for ' + name + '.and', additional);
				}
				caller.call(this, handler, additional, arguments);
			};
			repo[name].do = function () {
				arguments = Array.prototype.slice.call(arguments);
				var replacement = arguments.pop();
				if (typeof replacement !== 'function') {
					log.ERROR(name, 'Expected callback function as final argument for ' + name + '.do', replacement);
				}
				caller.call(this, null, replacement, arguments);
			};
			repo[name].isCaller = true;

			return repo;
		};
	};

	/** Repository factory namespace **/
	eko.repositories = new (function () {
		var _cache = {};

		/***
		Clears all cached repositories.
		***/
		this.clear = function () {
			if (arguments.length === 0) {
				_cache = {};
			} else if (typeof arguments[0] === 'string') {
				delete _cache[arguments[0]];
			} else {
				// TODO
			}
		};

		/***
		Create a new repository based on a named model.
		@def: Object with model definition / overrides
			Keys
			Fields
			action
				baseUrl
				serviceName
				Get
				GetAll
			OnCreated
			OnSaving
			OnSaved
			OnUpdating
			OnUpdated
		***/
		this.create = function (modelName, def) {
			if (!modelName) {
				log.ERROR('create', 'No model definition name supplied');
			}
			def = def || {};

			// Ensure model exists correctly
			var modelType = modelName;
			if (modelName.length < 6 || modelName.substring(modelName.length - 5).toLowerCase() !== 'model') {
				modelType += 'Model';
			} else {
				modelName = modelName.substring(0, modelName.length - 5);
			}
			if (!_isFunc(window[modelType])) {
				if (!def) {
					log.ERROR('create', 'Failed to locate model definition: ' + modelName);
				} else {
					window[modelType] = function () { };
				}
			}

			var keys = def.Keys || window[modelType].prototype.Keys;
			var fields = def.Fields || window[modelType].prototype.Fields;
			if (!keys || !fields) {
				// Use instance to get for Keys/Fields
				var item = new window[modelType]();
				keys = keys || item.Keys;
				fields = fields || item.Fields;
			}
			if (!keys || !keys.length) {
				log.ERROR('create', 'Failed to locate model keys: ' + modelName);
			}
			if (!fields || !_isArray(fields)) {
				log.ERROR('create', 'Failed to locate model fields: ' + modelName);
			}

			_cache[modelName] = new eko.Repository({
				name: modelName,
				type: modelType,
				keys: keys,
				fields: fields,
				action: def.action || {},
				overrides: def
			}, window[modelType]);

			eko.repositories[modelName] = _cache[modelName];
			return _cache[modelName];
		};

		this.get = function (modelName) {
			if (modelName in _cache) {
				return _cache[modelName];
			}
			return null;
		};
	})();
	eko.repos = eko.repositories;
})();
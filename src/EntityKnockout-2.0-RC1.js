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
	
	// Will match true arrays and ko.observableArray
	function _isArray(obj) {
		return obj && typeof obj === 'object' && _isFunc(obj.splice);
	}
	function _isDate(obj) {
		return obj && typeof obj === 'function' && obj.constructor.prototype === Date.prototype;
	}
	function _isFunc(obj) {
		return typeof obj === 'function';
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
				xhr.onreadystatechange = function() {
					if (xhr.readyState === 4) {
						if (xhr.status === 200 || xhr.status === 201) {
							options.success(xhr.responseText);
						} else {
							options.error(xhr);
						}
					}
				}
				
				// Cache-break for GET
				if (!options.post) {
					if (typeof options.data === 'string') {
						options.data += '&_=' + Date.now();
					} else {
						options.data = options.data || {};
						options.data._ = Date.now();
					}
				}

				xhr.open(options.post ? 'POST' : 'GET', options.url, options.async != false);
				xhr.setRequestHeader('X-Requested-With', 'XMLHttpRequest');
				xhr.send(options.data);
			},
			isArray: _isArray,
			isDate: _isDate,
			isFunction: _isFunc,
			isset: is,
			unwrap: _unwrap
		},
		
		/**
		 * @param {Object} [options] Options to use when getting the related entity (see Repository.Get)
		 */
		relationship: function (keys, repository, options) {
			var _repo = null;
			options = options || {};
			options.async = false;
			return ko.computed({
				deferEvaluation: true,
				read: function () {
					if (!_repo) {
						if (typeof repository === 'string') {
							_repo = eko.repositories.get(repository);
						} else if (repository.constructor.prototype === eko.Repository.prototype) {
							_repo = repository;
						}
						if (!_repo) {
							log.ERROR('relationship', 'Unknown repository for relationship: ' + repository);
						}
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
					
					return _repo.Get(key, options);
				}
			})
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
	function _completeModelPrototype(def, proto) {
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

		// Set duck type
		proto.IsNew = ko.observable(true);
		proto.IsDirty = ko.observable(true);
		////proto.IsBusy = ko.observable(false); // Updating, Saving, Deleting
		
		// Create keys
		for (var i = 0; i < def.keys.length; ++i) {
			if (!(field in proto)) {
				proto[field] = null;
			}
		}
		
		// Create fields (TODO: defaults)
		for (var i = 0; i < def.fields.length; ++i) {
			var field = def.fields[i];
			if (!(field in proto)) {
				proto[field] = ko.observable();
			}
			if (_isFunc(proto[field])) {
				////item[field].model = item;
				////item[field].fieldName = field;
				////item[field].IsDirty = ko.observable(false); // TODO: review
				////item[field].subscribe(function() {
				////	item.IsDirty(true);
				////	item[field].IsDirty(true);
				////});
			}
		}
		
		// Default functionality
		proto.Delete = function () {
			// TODO?
		};
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
					if (_isArray(inst[field]) && _isArray(val)) {
						_setArray(inst, field, val);
					} else {
						_setFieldValue(inst, field, val);
					}
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
						for (var i = 0; i < val.length; ++i) {
							if (typeof val[i] === 'object') {
								if (_isFunc(val[i].toPOJO)) {
									val[i] = val[i].toPOJO();
								} else {
									val[i] = _unwrap(val[i]);
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
	};
	
	/** Repository definition **/
	eko.Repository = function (def, constr) {
		_completeModelPrototype(def, constr.prototype);
		
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
			if ((''+key)[0] !== 'I') {
				key = 'I' + key;
			}
			if (key in _cache) {
				var items = repo.Content();
				for (var i = 0; i < items; ++i) {
					if (items[i] === _cache[key]) {
						////_explicitlyRemoveSubscribers(item);
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
			self.Content.removeAll();
			repo.Content.valueHasMutated();
			_cache = {};
		};
		
		self.RemoveSubscribers = function (model) {
			////_explicitlyRemoveSubscribers(model);
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
					if (item.prototype !== constr.prototype) {
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
			var inst = new constr();
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
				if ('I'+key in _cache) {
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
					log.ERROR('GetAll', def.name + ' server error: ' + xhr.status, xhr);
					if (_isFunc(options.result)) {
						options.result(false);
					}
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
		 * @param {String} name
		 * @param {Array} args
		 * @param {Function} handler
		 * @param {Object} [options]
		 * @param {String} [options.action]
		 * @param {Boolean} [options.async]
		 * @param {Boolean} [options.post]
		 */
		repo.define = function (name, args, handler, options) {
			if (name in repo && (!_isFunc(repo[name]) || !repo[name].isCaller)) {
				log.ERROR('define', 'Cannot overwrite internal functionality: ' + name);
			}
			
			options = options || {};
			repo[name] = function () {
				if (arguments.length !== args.length) {
					log.ERROR(name, 'Number of supplied arguments does not match definition (' + args.length + ')', arguments)
				}
				
				var params = {};
				for (var i = 0; i < args.length; ++i) {
					params[args[i]] = arguments[i];
				}
				
				eko.utils.ajax({
					url: '' + repo.action.baseUrl + repo.action.serviceName + '/' + (options.action || name),
					post: !!options.post,
					async: !!options.async,
					data: params,
					success: function (data) {
						handler(true, data);
					},
					error: function (data) {
						handler(false, data);
					}
				});
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
			if (!_isFunc(window[modelType])) {
				modelType += 'Model';
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
window.ko = (function () {
	var _capturing = false, _stack = [];
	return {
		computed: function (options) {
			var _value = undefined, _latest = false, _suspend = 0;
			var _subs = [], _subd = [];
			var subr = function () {
				_latest = false;
				valueWillMutate();
				valueHasMutated();
			};
			
			function valueWillMutate() {
				++_suspend;
			};
			function valueHasMutated() {
				if (_suspend > 0 && --_suspend === 0) {
					for (var i = 0; i < _subs.length; ++i) {
						_subs[i](_value);
					}
				}
			};
			
			var api = function () {
				if (_capturing && _stack.indexOf(api) < 0) {
					_stack.push(api);
				}
				if (_value === undefined || !_latest) {
					valueWillMutate();
					for (var i = 0; i < _subd.length; ++i) {
						_subd[i].unsubscribe(subr);
					}
					
					var wasCapturing = _stack;
					_capturing = true;
					_stack = [];
					_value = options.read();
					_latest = true;
					_subd = _stack;
					_stack = wasCapturing;
					_capturing = _stack.length > 0;
					
					for (var i = 0; i < _subd.length; ++i) {
						_subd[i].subscribe(subr);
					}
					valueHasMutated();
				}
				return _value;
			};
			api.peek = function () {
				return _value;
			};
			api.subscribe = function (fn) {
				_subs.push(fn);
			};
			api.unsubscribe = function (fn) {
				if ((i = _subs.indexOf(fn)) >= 0) {
					_subs.splice(i, 1);
				}
			};
			return api;
		},
		observable: function (_value) {
			var _subs = [], _suspend = 0;
			var api = function () {
				if (_capturing && _stack.indexOf(api) < 0) {
					_stack.push(api);
				}
				if (arguments.length > 0) {
					api.valueWillMutate();
					_value = arguments[0];
					api.valueHasMutated();
				}
				return _value;
			};
			
			api.subscribe = function (fn) {
				_subs.push(fn);
			};
			api.unsubscribe = function (fn) {
				if ((i = _subs.indexOf(fn)) >= 0) {
					_subs.splice(i, 1);
				}
			};
			api.valueWillMutate = function () {
				++_suspend;
			};
			api.valueHasMutated = function () {
				if (_suspend > 0 && --_suspend === 0) {
					for (var i = 0; i < _subs.length; ++i) {
						_subs[i](_value);
					}
				}
			};
			return api;
		},
		observableArray: function (_value) {
			var api = ko.observable(_value);
			api.splice = function () {
				// TODO
			};
			api.indexOf = function (val) {
				for (var i = 0; i < _value.length; ++i) {
					if (_value[i] === val) {
						return i;
					}
				}
				return -1;
			};
			return api;
		}
	}
})();
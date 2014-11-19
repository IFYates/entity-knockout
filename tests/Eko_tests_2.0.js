function disableError() {
	spyOn(eko.log, 'ERROR').and.callFake(function (comp, msg) {
		throw new Error(msg);
	});
}
beforeEach(function () {
	eko.utils.ajax = null; // Disable ajax
	// Clear all repository changes
	window.UserModel = undefined;
	eko.repositories.clear();
});

describe('Eko namespace', function () {
	it('provides repos alias of repositories', function () {
		expect(eko.repos).toBeDefined();
		expect(eko.repos).toEqual(eko.repositories);
	});
	
	it('ko.stub works as expected', function () {
		var computed = false;
		var a = ko.observable(1);
		var b = ko.computed({
			read: function () {
				computed = true;
				return a() * 2;
			}
		});
		var c = 0; a.subscribe(function (val) { c = val * 3; });
		var d = ko.computed({
			read: function () {
				return b() * 2;
			}
		});
		
		expect(c).toEqual(0);
		expect(computed).toEqual(false);
		expect(b()).toEqual(2);
		expect(d()).toEqual(4);
		expect(computed).toEqual(true);
		computed = false;
		expect(b()).toEqual(2);
		expect(computed).toEqual(false);
		
		a(2);
		expect(computed).toEqual(false);
		expect(b()).toEqual(4);
		expect(d()).toEqual(8);
		expect(computed).toEqual(true);
		expect(c).toEqual(6);
		computed = false;
		
		a(4);
		expect(computed).toEqual(false);
		expect(d()).toEqual(16);
		expect(computed).toEqual(true);
		expect(b()).toEqual(8);
		computed = false;
	});
});

describe('Repository factory', function () {
	it('returns null before first create', function () {
		var repo = eko.repositories.get('Anon');
		expect(repo).toBeNull();
	});
	
	it('will return the same instance on subsequent calls', function () {
		var repo1 = eko.repositories.create('Anon', { Keys: [ 'id' ], Fields: [] });
		var repo2 = eko.repositories.get('Anon');
		expect(repo1).toEqual(repo2);
	});
	
	it('can be cleared', function () {
		eko.repositories.create('Anon', { Keys: [ 'id' ], Fields: [] });
		eko.repositories.clear();
		var repo = eko.repositories.get('Anon');
		expect(repo).toBeNull();
	});
});

describe('Repository creation options', function () {
	beforeEach(function () {
		window.UserModel = function () {
			var self = this;
			self.Keys = [ 'id' ];
			self.Fields = [ 'name', 'score' ];
		};
	});
	afterEach(function () {
		window.UserModel = undefined;
		eko.repositories.clear();
	});
	
	it('allows for moving data server location for Get', function () {
		var ajaxOptions = null;
		eko.utils.ajax = function (options) {
			ajaxOptions = options;
		};
		
		var repo = eko.repositories.create('User', {
			action: {
				baseUrl: 'http://localhost/'
			}
		});
		repo.Get('1');
		expect(ajaxOptions.url).toEqual('http://localhost/User/Get');
	});
	
	it('allows for renaming data controller for Get', function () {
		var ajaxOptions = null;
		eko.utils.ajax = function (options) {
			ajaxOptions = options;
		};
		
		var repo = eko.repositories.create('User', {
			action: {
				baseUrl: 'http://localhost/',
				serviceName: 'Data'
			}
		});
		repo.Get('1');
		expect(ajaxOptions.url).toEqual('http://localhost/Data/Get');
	});
	
	it('allows for renaming Get action', function () {
		var ajaxOptions = null;
		eko.utils.ajax = function (options) {
			ajaxOptions = options;
		};
		
		var repo = eko.repositories.create('User', {
			action: {
				baseUrl: 'http://localhost/',
				Get: 'Fetch'
			}
		});
		repo.Get('1');
		expect(ajaxOptions.url).toEqual('http://localhost/User/Fetch');
	});
	
	it('allows for moving data server location for GetAll', function () {
		var ajaxOptions = null;
		eko.utils.ajax = function (options) {
			ajaxOptions = options;
		};
		
		var repo = eko.repositories.create('User', {
			action: {
				baseUrl: 'http://localhost/'
			}
		});
		repo.GetAll();
		expect(ajaxOptions.url).toEqual('http://localhost/User/GetAll');
	});
	
	it('allows for renaming data controller for GetAll', function () {
		var ajaxOptions = null;
		eko.utils.ajax = function (options) {
			ajaxOptions = options;
		};
		
		var repo = eko.repositories.create('User', {
			action: {
				baseUrl: 'http://localhost/',
				serviceName: 'Data'
			}
		});
		repo.GetAll();
		expect(ajaxOptions.url).toEqual('http://localhost/Data/GetAll');
	});
	
	it('allows for renaming GetAll action', function () {
		var ajaxOptions = null;
		eko.utils.ajax = function (options) {
			ajaxOptions = options;
		};
		
		var repo = eko.repositories.create('User', {
			action: {
				baseUrl: 'http://localhost/',
				GetAll: 'FetchAll'
			}
		});
		repo.GetAll();
		expect(ajaxOptions.url).toEqual('http://localhost/User/FetchAll');
	});

	it('allows for moving data server location for Save', function () {
		var repo = eko.repositories.create('User', {
			action: {
				baseUrl: 'http://localhost/'
			}
		});
		eko.utils.ajax = function (options) {
			expect(options.url).toEqual('http://localhost/User/Save');
			options.success('{"id":1}');
		};
		var inst = repo.CreateNew({ name: 'test' });
		inst.Save();
	});
	
	it('allows for renaming data controller for Save', function () {
		var repo = eko.repositories.create('User', {
			action: {
				baseUrl: 'http://localhost/',
				serviceName: 'Fake'
			}
		});
		eko.utils.ajax = function (options) {
			expect(options.url).toEqual('http://localhost/Fake/Save');
			options.success('{"id":1}');
		};
		var inst = repo.CreateNew({ name: 'test' });
		inst.Save();
	});
	
	it('allows for renaming Save action', function () {
		var repo = eko.repositories.create('User', {
			action: {
				baseUrl: 'http://localhost/',
				Save: 'Fake'
			}
		});
		eko.utils.ajax = function (options) {
			expect(options.url).toEqual('http://localhost/User/Fake');
			options.success('{"id":1}');
		};
		var inst = repo.CreateNew({ name: 'test' });
		inst.Save();
	});
});

describe('Global options', function () {
	beforeEach(function () {
		window.UserModel = function () {
			var self = this;
			self.Keys = [ 'id' ];
			self.Fields = [ 'name', 'score' ];
		};
	});
	afterEach(function () {
		window.UserModel = undefined;
		eko.repositories.clear();
	});
	
	it('allows for moving data server location for Get', function () {
		var ajaxOptions = null;
		eko.utils.ajax = function (options) {
			ajaxOptions = options;
		};
		
		eko.options.baseUrl = 'http://localhost/';
		var repo = eko.repositories.create('User');
		repo.Get('1');
		expect(ajaxOptions.url).toEqual('http://localhost/User/Get');
	});
	
	it('allows for renaming Get action', function () {
		var ajaxOptions = null;
		eko.utils.ajax = function (options) {
			ajaxOptions = options;
		};
		
		eko.options.baseUrl = 'http://localhost/';
		eko.options.actionGet = 'Fetch';
		var repo = eko.repositories.create('User');
		repo.Get('1');
		expect(ajaxOptions.url).toEqual('http://localhost/User/Fetch');
	});
	
	it('allows for moving data server location for GetAll', function () {
		var ajaxOptions = null;
		eko.utils.ajax = function (options) {
			ajaxOptions = options;
		};
		
		eko.options.baseUrl = 'http://localhost/';
		var repo = eko.repositories.create('User');
		repo.GetAll();
		expect(ajaxOptions.url).toEqual('http://localhost/User/GetAll');
	});
	
	it('allows for renaming GetAll action', function () {
		var ajaxOptions = null;
		eko.utils.ajax = function (options) {
			ajaxOptions = options;
		};
		
		eko.options.baseUrl = 'http://localhost/';
		eko.options.actionGetAll = 'FetchAll';
		var repo = eko.repositories.create('User');
		repo.GetAll();
		expect(ajaxOptions.url).toEqual('http://localhost/User/FetchAll');
	});

	it('allows for moving data server location for Save', function () {
		eko.options.baseUrl = 'http://localhost/';
		var repo = eko.repositories.create('User');
		eko.utils.ajax = function (options) {
			expect(options.url).toEqual('http://localhost/User/Save');
			options.success('{"id":1}');
		};
		var inst = repo.CreateNew({ name: 'test' });
		inst.Save();
	});
	
	it('allows for renaming Save action', function () {
		eko.options.baseUrl = 'http://localhost/';
		eko.options.actionSave = 'Fake';
		var repo = eko.repositories.create('User');
		eko.utils.ajax = function (options) {
			expect(options.url).toEqual('http://localhost/User/Fake');
			options.success('{"id":1}');
		};
		var inst = repo.CreateNew({ name: 'test' });
		inst.Save();
	});
});

describe('Creating repository instance', function () {
	afterEach(function () {
		eko.repositories.clear();
	});
	
	it('fails without model name', function () {
		disableError();
		expect(function () {
			eko.repositories.create();
		}).toThrow();
		expect(function () {
			eko.repositories.create(null);
		}).toThrow();
		expect(function () {
			eko.repositories.create('');
		}).toThrow();
	});
	
	it('fails without model and definition', function () {
		disableError();
		expect(function () {
			eko.repositories.create('UnknownModel');
		}).toThrow();
	});
	
	it('succeeds without model but with definition', function () {
		var repo = eko.repositories.create('Anon', {
			Keys: [ 'id' ],
			Fields: [ 'name', 'score' ]
		});
		expect(repo).toBeTruthy();
		expect(repo.ModelName()).toBe('Anon');
		window.AnonModel = undefined;
	});
	
	it('exposes instance', function () {
		var repo = eko.repositories.create('Anon', {
			Keys: [ 'id' ],
			Fields: [ 'name', 'score' ]
		});
		expect(eko.repositories.Anon).toBeTruthy();
		expect(eko.repositories.Anon).toEqual(repo);
		window.AnonModel = undefined;
	});
});

describe('Creating a blank entity', function () {
	beforeEach(function () {
		window.UserModel = function () {
			var self = this;
			self.Keys = [ 'id' ];
			self.Fields = [ 'name', 'score' ];
		};
	});
	afterEach(function () {
		window.UserModel = undefined;
		eko.repositories.clear();
	});
	
	it('from nothing is blank', function () {
		var repo = eko.repositories.create('User');
		var model = repo.CreateNew();
		expect(model).toBeTruthy();
	});
	
	it('creates missing keys as primitive', function () {
		var repo = eko.repositories.create('User');
		var model = repo.CreateNew();
		expect(model.id).toBeDefined();
		expect(model.id).toBeNull();
	});
	
	it('creates missing fields as observable', function () {
		var repo = eko.repositories.create('User');
		var model = repo.CreateNew();
		expect(model.name).toBeDefined();
		expect(typeof model.name).toBe('function');
		expect(typeof model.name.subscribe).toBe('function');
		expect(model.score).toBeDefined();
		expect(typeof model.score).toBe('function');
		expect(typeof model.score.subscribe).toBe('function');
	});
	
	it('matches expected duck type', function () {
		var repo = eko.repositories.create('User');
		var model = repo.CreateNew();
		expect(model.dbKey).toBeDefined();
		expect(model.modelName).toBeDefined();
		expect(model.repository).toBeDefined();
		expect(model.IsNew).toBeDefined();
		expect(typeof model.IsNew).toBe('function');
		expect(model.IsDirty).toBeDefined();
		expect(typeof model.IsDirty).toBe('function');
	});
	
	it('sets it to new', function () {
		var repo = eko.repositories.create('User');
		var model = repo.CreateNew();
		expect(model.IsNew()).toBeTruthy();
	});
	
	it('sets it to dirty', function () {
		var repo = eko.repositories.create('User');
		var model = repo.CreateNew();
		expect(model.IsDirty()).toBeTruthy();
	});
	
	it('creates default functionality', function () {
		var repo = eko.repositories.create('User');
		var model = repo.CreateNew();
		expect(model.Update).toBeDefined();
		expect(typeof model.Update).toBe('function');
	});
	
	it('from a javascript object populates values', function () {
		var repo = eko.repositories.create('User');
		var model = repo.CreateNew({ id: 1, name: 'test', score: 0.25 });
		expect(model).toBeTruthy();
		expect(model.id).toBe(1);
		expect(model.name()).toBe('test');
		expect(model.score()).toBe(0.25);
	});
	
	it('does not get added to repository', function () {
		var repo = eko.repositories.create('User');
		var model = repo.CreateNew({ id: 1, name: 'test', score: 0.25 });
		expect(repo.Content().length).toBe(0);
	});
	
	it('fires model OnCreated function on instance', function () {
		var calledInstance = null;
		window.UserModel.prototype.OnCreated = function () {
			calledInstance = this;
		};
		var repo = eko.repositories.create('User');
		
		var model = repo.CreateNew();
		expect(calledInstance).toBeTruthy();
		expect(calledInstance).toBe(model);
	});
	
	it('fires definition override OnCreated function on instance', function () {
		var calledInstance = null;
		var repo = eko.repositories.create('User', {
			OnCreated: function () {
				calledInstance = this;
			}
		});
		
		var model = repo.CreateNew();
		expect(calledInstance).toBeTruthy();
		expect(calledInstance).toBe(model);
	});
	
	it('fires definition override OnCreated instead of model on instance', function () {
		var calledOnModel = null, calledOnOverride = null;
		window.UserModel.prototype.OnCreated = function () {
			calledOnModel = this;
		};
		var repo = eko.repositories.create('User', {
			OnCreated: function () {
				calledOnOverride = this;
			}
		});
		
		var model = repo.CreateNew();
		expect(calledOnModel).toBeNull();
		expect(calledOnOverride).toBeTruthy();
		expect(calledOnOverride).toBe(model);
	});
	
	it('prevents further calls to OnCreated', function () {
		var callCount = 0;
		var repo = eko.repositories.create('User', {
			OnCreated: function () {
				++callCount;
			}
		});
		
		var model = repo.CreateNew();
		model.OnCreated();
		expect(callCount).toBe(1);
	});
	
	it('does not alter prototype', function () {
		var callCount = 0;
		var repo = eko.repositories.create('User', {
			OnCreated: function () {
				++callCount;
			}
		});
		
		var def = UserModel.prototype.OnCreated.toString();
		var model = repo.CreateNew();
		model.OnCreated();
		expect(UserModel.prototype.OnCreated.toString()).toBe(def);
		expect(model.OnCreated.toString()).not.toBe(def);
	});
});

describe('Creating an entity with keys', function () {
	beforeEach(function () {
		window.UserModel = function () {
			var self = this;
			self.Keys = [ 'id' ];
			self.Fields = [ 'name', 'score' ];
		};
	});
	afterEach(function () {
		window.UserModel = undefined;
		eko.repositories.clear();
	});
	
	it('leaves it as new', function () {
		var repo = eko.repositories.create('User');
		var model = repo.CreateNew({ id: 1 });
		expect(model.IsNew()).toBeTruthy();
	});
	
	it('leaves it as dirty', function () {
		var repo = eko.repositories.create('User');
		var model = repo.CreateNew({ id: 1 });
		expect(model.IsDirty()).toBeTruthy();
	});
});

describe('Entities definitions', function () {
	it('require a key field', function () {
		disableError();
		expect(function () {
			eko.repositories.create('UnknownModel', { Keys: [], Fields: ['one'] });
		}).toThrow();
	});
	
	it('do not require fields', function () {
		var repo = eko.repositories.create('UnknownModel', { Keys: ['one'], Fields: [] });
		expect(repo).toBeTruthy();
	});
	
	xit('can specify call function', function () {
		var repo = eko.repositories.create('UnknownModel', { Keys: ['id'], Fields: ['name'],
			Call: {
				'GetByName': function (name) { }
			}
		});
		var model = repo.CreateNew();
		expect(model.GetByName).toBeTruthy();
	});
	
	xit('can include event functionality', function () {
		var repo = eko.repositories.create('User');
		var model = repo.CreateNew();
		expect(model.OnCreated).toBeDefined();
		expect(typeof model.OnCreated).toBe('function');
		expect(model.OnUpdating).toBeDefined();
		expect(typeof model.OnUpdating).toBe('function');
		expect(model.OnUpdated).toBeDefined();
		expect(typeof model.OnUpdated).toBe('function');
		expect(model.OnSaving).toBeDefined();
		expect(typeof model.OnSaving).toBe('function');
		expect(model.OnSaved).toBeDefined();
		expect(typeof model.OnSaved).toBe('function');
	});
});

describe('Attaching entity', function () {
	beforeEach(function () {
		window.UserModel = function () {
			var self = this;
			self.Keys = ['id'];
			self.Fields = ['name', 'score'];
		};
	});
	afterEach(function () {
		eko.repositories.clear();
		window.UserModel = undefined;
	});
	
	it('requires key to be defined', function () {
		disableError();
		var repo = eko.repositories.create('User');
		expect(function () {
			repo.Attach({});
		}).toThrow();
	});
	
	it('returns model instance', function () {
		var repo = eko.repositories.create('User');
		var inst = repo.Attach({ id: 1 });
		expect(inst).toBeTruthy();
	});
	
	it('adds it to repository content', function () {
		var repo = eko.repositories.create('User');
		var inst = repo.Attach({ id: 1 });
		expect(repo.Content().length).toBe(1);
	});
	
	it('can be from JSON', function () {
		var repo = eko.repositories.create('User');
		var inst = repo.Attach('{ "id": 1 }');
		expect(repo.Content().length).toBe(1);
		expect(inst).toBeTruthy();
		expect(inst.id).toBe(1);
	});
	
	it('can be from POJO', function () {
		var repo = eko.repositories.create('User');
		var inst = repo.Attach({ "id": 1 });
		expect(repo.Content().length).toBe(1);
		expect(inst).toBeTruthy();
		expect(inst.id).toBe(1);
	});
	
	it('can be from JSON array', function () {
		var repo = eko.repositories.create('User');
		var inst = repo.Attach('[ { "id": 1 }, { "id": 2 } ]');
		expect(repo.Content().length).toBe(2);
		expect(inst).toBeTruthy();
		expect(typeof inst).toBe('object');
		expect(inst.length).toBe(2);
		expect(inst[0].id).toBe(1);
		expect(inst[1].id).toBe(2);
	});
	
	it('can be from array of POJOs', function () {
		var repo = eko.repositories.create('User');
		var inst = repo.Attach([ { "id": 1 }, { "id": 2 } ]);
		expect(repo.Content().length).toBe(2);
		expect(inst).toBeTruthy();
		expect(typeof inst).toBe('object');
		expect(inst.length).toBe(2);
		expect(inst[0].id).toBe(1);
		expect(inst[1].id).toBe(2);
	});
	
	it('can be from existing entity', function () {
		var repo = eko.repositories.create('User');
		var inst1 = repo.CreateNew({ id: 1 });
		var inst2 = repo.Attach(inst1);
		expect(repo.Content().length).toBe(1);
		expect(inst1).toEqual(inst2);
	});
	
	it('can be from array of existing entities', function () {
		var repo = eko.repositories.create('User');
		var instA = repo.CreateNew({ id: 1 });
		var instB = repo.CreateNew({ id: 2 });
		var models = repo.Attach([ instA, instB ]);
		expect(repo.Content().length).toBe(2);
		expect(models).toBeTruthy();
		expect(typeof models).toBe('object');
		expect(models.length).toBe(2);
		expect(models[0].id).toBe(1);
		expect(models[1].id).toBe(2);
	});
	
	it('will update existing if keys match', function () {
		var repo = eko.repositories.create('User');
		var inst1 = repo.CreateNew({ id: 1 });
		var inst2 = repo.Attach({ id: 1, name: 'Test' });
		expect(inst2.name()).toEqual('Test');
	});
});

describe('OnUpdating', function () {
	beforeEach(function () {
		window.UserModel = function () {
			var self = this;
			self.Keys = ['id'];
			self.Fields = ['name', 'score'];
		};
	});
	afterEach(function () {
		eko.repositories.clear();
		window.UserModel = undefined;
	});
	
	it('invoked by entity update', function () {
		var updating = 0;
		var repo = eko.repositories.create('User', {
			OnUpdating: function (data) {
				++updating;
			}
		});
		var inst = repo.CreateNew({ id: 1 });
		updating = 0;
		inst.Update({ name: 'Test' });
		expect(updating).toEqual(1);
	});
	
	it('allows for data to be modified', function () {
		var repo = eko.repositories.create('User', {
			OnUpdating: function (data) {
				data.name = 'Test2';
			}
		});
		var inst = repo.CreateNew({ id: 1 });
		inst.Update({ name: 'Test' });
		expect(inst.name()).toEqual('Test2');
	});
});

describe('OnUpdated', function () {
	beforeEach(function () {
		window.UserModel = function () {
			var self = this;
			self.Keys = ['id'];
			self.Fields = ['name', 'score'];
		};
	});
	afterEach(function () {
		eko.repositories.clear();
		window.UserModel = undefined;
	});
	
	it('invoked by entity update', function () {
		var updated = 0;
		var repo = eko.repositories.create('User', {
			OnUpdated: function () {
				++updated;
			}
		});
		var inst = repo.CreateNew({ id: 1 });
		updated = 0;
		inst.Update({ name: 'Test' });
		expect(updated).toEqual(1);
	});
});

describe('Update entity', function () {
	beforeEach(function () {
		window.UserModel = function () {
			var self = this;
			self.Keys = ['id'];
			self.Fields = ['name', 'score'];
		};
	});
	afterEach(function () {
		eko.repositories.clear();
		window.UserModel = undefined;
	});
	
	it('means it can no longer be new', function () {
		var repo = eko.repositories.create('User');
		var inst = repo.CreateNew({ id: 1 });
		inst.Update({ name: 'Test' });
		expect(inst.IsNew()).toEqual(false);
	});
	
	it('means it can no longer be dirty', function () {
		var repo = eko.repositories.create('User');
		var inst = repo.CreateNew({ id: 1 });
		inst.Update({ name: 'Test' });
		expect(inst.IsDirty()).toEqual(false);
	});
	
	it('changes fields', function () {
		var repo = eko.repositories.create('User');
		var inst = repo.CreateNew({ id: 1 });
		inst.Update({ name: 'Test' });
		expect(inst.name()).toEqual('Test');
	});
	
	it('cannot modify key', function () {
		var repo = eko.repositories.create('User');
		var inst = repo.CreateNew({ id: 1 });
		inst.Update({ id: 2, name: 'Test' });
		expect(inst.id).toEqual(1);
	});
	
	it('pauses updates and resumes for any field', function () {
		var pause = false, resume = false;
		var repo = eko.repositories.create('User');
		window.UserModel.prototype.name.valueWillMutate = function () {
			pause = true;
		};
		window.UserModel.prototype.name.valueHasMutated = function () {
			resume = true;
		};
		var inst = repo.CreateNew({ id: 1, name: 'green' });
		expect(pause).toBeTruthy();
		expect(resume).toBeTruthy();
		expect(inst.name()).toBe('green');
	});
});

describe('Fetch an entity', function () {
	beforeEach(function () {
		window.UserModel = function () {
			var self = this;
			self.Keys = ['id'];
			self.Fields = ['name', 'score'];
		};
	});
	afterEach(function () {
		eko.repositories.clear();
		window.UserModel = undefined;
	});
	
	it('using their unique key', function () {
		var repo = eko.repositories.create('User');
		var inst1 = repo.Attach({ id: 1 });
		expect(inst1.dbKey).toEqual('1');
		var inst2 = repo.Get('1');
		expect(inst2).toEqual(inst1);
	});
	
	it('will return null for invalid keys', function () {
		var repo = eko.repositories.create('User');
		var inst = repo.Get();
		expect(inst).toBeNull();
		inst = repo.Get(null);
		expect(inst).toBeNull();
		inst = repo.Get(undefined);
		expect(inst).toBeNull();
		inst = repo.Get('');
		expect(inst).toBeNull();
	});
	
	it('will be null if unknown locally and no server', function () {
		var repo = eko.repositories.create('User');
		var inst = repo.Get('1', { from: 'local' });
		expect(inst).toBeNull();
	});
	
	it('will not check server by default if known locally', function () {
		var checked = false;
		eko.utils.ajax = function () {
			checked = true;
		};
		var repo = eko.repositories.create('User');
		repo.Attach({ id: 1 });
		repo.Get('1');
		expect(checked).toEqual(false);
	});
	
	it('will not check server if forced local, even if unknown', function () {
		var checked = false;
		eko.utils.ajax = function () {
			checked = true;
		};
		var repo = eko.repositories.create('User');
		repo.Get('1', { from: 'local' });
		expect(checked).toEqual(false);
	});
	
	it('will check compiled server URL', function () {
		var ajaxOptions = null;
		eko.utils.ajax = function (options) {
			ajaxOptions = options;
		};
		var repo = eko.repositories.create('User');
		repo.Get('1');
		expect(ajaxOptions.url).toEqual(repo.action.baseUrl + repo.action.serviceName + '/' + repo.action.Get);
	});
	
	it('will check server if unknown locally and from is default', function () {
		var checked = false;
		eko.utils.ajax = function () {
			checked = true;
		};
		var repo = eko.repositories.create('User');
		repo.Get('1');
		expect(checked).toEqual(true);
	});
	
	it('will check server if from is server', function () {
		var checked = false;
		eko.utils.ajax = function () {
			checked = true;
		};
		var repo = eko.repositories.create('User');
		repo.Get('1', { from: 'server' });
		expect(checked).toEqual(true);
	});
	
	it('will check server if exists locally but from is server', function () {
		var checked = false;
		eko.utils.ajax = function () {
			checked = true;
		};
		var repo = eko.repositories.create('User');
		repo.Attach({ id: 1 });
		repo.Get('1', { from: 'server' });
		expect(checked).toEqual(true);
	});
	
	it('checks server with async:false by default', function () {
		var ajaxOptions = null;
		eko.utils.ajax = function (options) {
			ajaxOptions = options;
		};
		var repo = eko.repositories.create('User');
		repo.Attach({ id: 1 });
		repo.Get('1', { from: 'server' });
		expect(ajaxOptions).toBeTruthy();
		expect(ajaxOptions.async).toEqual(false);
	});
	
	it('can force async:true for server check', function () {
		var ajaxOptions = null;
		eko.utils.ajax = function (options) {
			ajaxOptions = options;
		};
		var repo = eko.repositories.create('User');
		repo.Attach({ id: 1 });
		repo.Get('1', { from: 'server', async: true });
		expect(ajaxOptions).toBeTruthy();
		expect(ajaxOptions.async).toEqual(true);
	});
	
	it('will be null if unknown both locally and on server', function () {
		eko.utils.ajax = function (options) {
			options.success('null');
		};
		var repo = eko.repositories.create('User');
		var inst = repo.Get('1');
		expect(inst).toBeNull();
	});
	
	it('will be null if unknown on server and forced to server', function () {
		eko.utils.ajax = function (options) {
			options.success('null');
		};
		var repo = eko.repositories.create('User');
		repo.Attach({ id: 1 });
		var inst = repo.Get('1', { from: 'server' });
		expect(inst).toBeNull();
	});
	
	it('will attach instance if unknown locally and found on server', function () {
		eko.utils.ajax = function (options) {
			options.success('{"id":1}');
		};
		var repo = eko.repositories.create('User');
		var inst = repo.Get('1');
		expect(inst).toBeTruthy();
		expect(inst.id).toEqual(1);
	});
	
	it('will update instance if forced to find on server', function () {
		eko.utils.ajax = function (options) {
			options.success('{"id":1,"name":"Bob"}');
		};
		var repo = eko.repositories.create('User');
		repo.Attach({ id: 1 });
		var inst = repo.Get('1', { from: 'server' });
		expect(inst).toBeTruthy();
		expect(inst.id).toEqual(1);
		expect(inst.name()).toEqual('Bob');
	});
	
	it('does not accept arrays', function () {
		disableError();
		eko.utils.ajax = function (options) {
			options.success('[{"id":1}]');
		};
		var repo = eko.repositories.create('User');
		var inst = null;
		expect(function () {
			inst = repo.Get('1');
		}).toThrow();
		expect(inst).toBeNull();
	});
	
	it('with async:true will return null if not found locally', function () {
		eko.utils.ajax = function () { };
		var repo = eko.repositories.create('User');
		var inst = repo.Get('1', { async: true });
		expect(inst).toBeNull();
	});
	
	it('with async:true will always return null if not checked locally', function () {
		eko.utils.ajax = function () { };
		var repo = eko.repositories.create('User');
		repo.Attach({ id: 1 });
		var inst = repo.Get('1', { async: true, from: 'server' });
		expect(inst).toBeNull();
	});
	
	it('with async:true will still return local result', function () {
		var repo = eko.repositories.create('User');
		repo.Attach({ id: 1 });
		var inst = repo.Get('1', { async: true });
		expect(inst.dbKey).toEqual('1');
	});
	
	it('can always return value through callback', function () {
		var repo = eko.repositories.create('User');
		repo.Attach({ id: 1 });
		var inst2 = null;
		var inst1 = repo.Get('1', {
			result: function (inst) {
				inst2 = inst;
			}
		});
		expect(inst2).toBeTruthy();
		expect(inst2).toEqual(inst1);
	});
	
	it('with async:true will return null but attach instance if loaded from server', function (done) {
		eko.utils.ajax = function (options) {
			expect(options.async).toEqual(true);
			setTimeout(function () { options.success('{"id":1}'); }, 0);
		};
		var repo = eko.repositories.create('User');
		var inst1 = repo.Get('1', {
			async: true,
			result: function (inst2) {
				expect(inst2).toBeTruthy();
				expect(inst2.id).toEqual(1);
				done();
			}
		});
		expect(inst1).toBeNull();
	});

	it('handles 418 errors');
});

describe('Fetch all entities', function () {
	beforeEach(function () {
		window.UserModel = function () {
			var self = this;
			self.Keys = ['id'];
			self.Fields = ['name', 'score'];
		};
	});
	afterEach(function () {
		eko.repositories.clear();
		window.UserModel = undefined;
	});
	
	it('always hits server', function () {
		var checked = false;
		eko.utils.ajax = function () {
			checked = true;
		};
		var repo = eko.repositories.create('User');
		repo.GetAll();
		expect(checked).toEqual(true);
	});
	
	it('is not async by default', function () {
		var ajaxOptions = null;
		eko.utils.ajax = function (options) {
			ajaxOptions = options;
		};
		var repo = eko.repositories.create('User');
		repo.GetAll();
		expect(ajaxOptions.async).toEqual(false);
	});
	
	it('can be async', function () {
		var ajaxOptions = null;
		eko.utils.ajax = function (options) {
			ajaxOptions = options;
		};
		var repo = eko.repositories.create('User');
		repo.GetAll({ async: true });
		expect(ajaxOptions.async).toEqual(true);
	});
	
	it('will attach many entities', function () {
		eko.utils.ajax = function (options) {
			options.success('[{"id":1},{"id":2}]');
		};
		var repo = eko.repositories.create('User');
		var result = repo.GetAll();
		expect(result).toEqual(repo.Content());
		expect(result.length).toEqual(2);
	});
	
	it('can always use callback', function () {
		eko.utils.ajax = function (options) {
			options.success('[{"id":1},{"id":2}]');
		};
		var repo = eko.repositories.create('User');
		var result = repo.GetAll({
			result: function (success) {
				expect(success).toEqual(true);
				expect(result).not.toBeTruthy(); // Not yet defined
				expect(repo.Content().length).toEqual(2);
			}
		});
		expect(result.length).toEqual(2);
	});
	
	xit('is busy until ended', function () {
		eko.utils.ajax = function (options) {
			options.success('[{"id":1},{"id":2}]');
		};
		var repo = eko.repositories.create('User');
		repo.GetAll({
			result: function (success) {
				expect(success).toEqual(true);
				expect(repo.IsBusy()).toEqual(true);
			}
		});
		expect(repo.IsBusy()).toEqual(false);
	});
	
	it('can function asynchronously', function (done) {
		eko.utils.ajax = function (options) {
			expect(options.async).toEqual(true);
			options.success('[{"id":1},{"id":2}]');
		};
		var repo = eko.repositories.create('User');
		var ranThrough = false;
		repo.GetAll({
			async: true,
			result: function (success) {
				expect(success).toEqual(true);
				expect(ranThrough).toEqual(true);
				expect(repo.Content().length).toEqual(2);
				done();
			}
		});
		ranThrough = true;
	});
	
	it('when asynchronous, result is reference to final data', function (done) {
		eko.utils.ajax = function (options) {
			expect(options.async).toEqual(true);
			options.success('[{"id":1},{"id":2}]');
		};
		var repo = eko.repositories.create('User');
		var result = repo.GetAll({
			async: true,
			result: function (success) {
				expect(success).toEqual(true);
				expect(result).toEqual(repo.Content());
				expect(result.length).toEqual(2);
				done();
			}
		});
		expect(result.length).toEqual(0);
	});
	
	it('must receive an array', function () {
		disableError();
		eko.utils.ajax = function (options) {
			options.success('{"id":1}');
		};
		var repo = eko.repositories.create('User');
		expect(function () {
			repo.GetAll();
		}).toThrow();
	});
	
	it('handles 418 errors');
});

describe('Saving entity', function () {
	beforeEach(function () {
		window.UserModel = function () {
			var self = this;
			self.Keys = ['id'];
			self.Fields = ['name', 'score'];
		};
	});
	afterEach(function () {
		eko.repositories.clear();
		window.UserModel = undefined;
	});
	
	it('is synchronous by default', function () {
		var saved = false;
		eko.utils.ajax = function (options) {
			expect(options.async).toEqual(false);
			saved = true;
		};
		var repo = eko.repositories.create('User');
		var inst = repo.Attach({ id: 1 });
		inst.Save();
		expect(saved).toEqual(true);
	});
	
	it('can be asynchronous', function (done) {
		var saved = false;
		eko.utils.ajax = function (options) {
			expect(options.async).toEqual(true);
			setTimeout(function () {
				saved = true;
				done();
			}, 0);
		};
		var repo = eko.repositories.create('User');
		var inst = repo.Attach({ id: 1 });
		inst.Save({ async: true });
		expect(saved).toEqual(false);
	});
	
	it('is sent by post', function () {
		eko.utils.ajax = function (options) {
			expect(options.post).toEqual(true);
		};
		var repo = eko.repositories.create('User');
		var inst = repo.Attach({ id: 1 });
		inst.Save();
	});
	
	it('sends instance JSON to server', function () {
		var repo = eko.repositories.create('User');
		var inst = repo.Attach({ id: 1, name: 'test' });
		eko.utils.ajax = function (options) {
			expect(options.data).toEqual({ item: inst.toJSON() });
		};
		inst.Save();
	});
	
	it('does not require full key on save', function () {
		var repo = eko.repositories.create('User');
		var inst = repo.CreateNew({ name: 'test' });
		eko.utils.ajax = function (options) {
			expect(options.data).toEqual({ item: inst.toJSON() });
			options.success('{"id":1}');
		};
		inst.Save();
		expect(inst.id).toEqual(1);
	});
	
	it('requires full key after save', function () {
		disableError();
		eko.utils.ajax = function (options) {
			options.success('{}');
		};
		var repo = eko.repositories.create('User');
		var inst = repo.CreateNew({ name: 'test' });
		expect(function () {
			inst.Save();
		}).toThrow();
		expect(inst.IsDirty()).toEqual(true);
	});
	
	it('will remove new mark', function () {
		eko.utils.ajax = function (options) {
			options.success('{"id":1}');
		};
		var repo = eko.repositories.create('User');
		var inst = repo.CreateNew({ name: 'test' });
		expect(inst.IsNew()).toEqual(true);
		inst.Save();
		expect(inst.IsNew()).toEqual(false);
	});
	
	it('will remove dirty mark', function () {
		eko.utils.ajax = function (options) {
			options.success('{"id":1}');
		};
		var repo = eko.repositories.create('User');
		var inst = repo.CreateNew({ name: 'test' });
		expect(inst.IsDirty()).toEqual(true);
		inst.Save();
		expect(inst.IsDirty()).toEqual(false);
	});
	
	it('invokes OnSaving event before', function () {
		var saving = false;
		eko.utils.ajax = function (options) {
			expect(saving).toEqual(true);
			options.success('{"id":1}');
		};
		var repo = eko.repositories.create('User', {
			OnSaving: function () {
				saving = true;
			}
		});
		var inst = repo.CreateNew({ id: 1 });
		inst.Save();
	});
	
	it('returning false from OnSaving will prevent save', function () {
		eko.utils.ajax = function (options) {
			expect(false).toEqual(true); // Should not hit
		};
		var repo = eko.repositories.create('User', {
			OnSaving: function () {
				return false;
			}
		});
		var inst = repo.CreateNew({ id: 1 });
		inst.Save();
		expect(inst.IsDirty()).toEqual(true);
	});
	
	it('invokes OnSaved event after, with success', function () {
		var saved = false;
		eko.utils.ajax = function (options) {
			options.success('{"id":1}');
		};
		var repo = eko.repositories.create('User', {
			OnSaved: function (success) {
				expect(success).toEqual(true);
				saved = true;
			}
		});
		var inst = repo.CreateNew({ id: 1 });
		inst.Save();
		expect(saved).toEqual(true);
	});
	
	it('can save if unattached', function () {
		var saved = false;
		eko.utils.ajax = function (options) {
			saved = true;
		};
		var repo = eko.repositories.create('User');
		var inst = repo.CreateNew({ id: 1 });
		inst.Save();
		expect(saved).toEqual(true);
	});
	
	it('will attach to repository if unattached', function () {
		eko.utils.ajax = function (options) {
			options.success('{"id":1}');
		};
		var repo = eko.repositories.create('User');
		var inst = repo.CreateNew({ id: 1 });
		inst.Save();
		expect(repo.Content().length).toEqual(1);
	});
	
	it('will replace instance if key changed by save', function () {
		eko.utils.ajax = function (options) {
			options.success('{"id":2}');
		};
		var repo = eko.repositories.create('User');
		var inst = repo.Attach({ id: 1 });
		inst.Save();
		expect(repo.Content().length).toEqual(1);
		expect(inst.id).toEqual(2);
		expect(inst.dbKey).toEqual('2');
		
		var oldId = repo.Get('1', { from: 'local' });
		expect(oldId).toBeNull();
		var newId = repo.Get('2', { from: 'local' });
		expect(newId).toEqual(inst);
	});
	
	it('handles 418 errors');
});

describe('Entities with composite key', function () {
	beforeEach(function () {
		window.MembershipModel = function () {
			var self = this;
			self.Keys = [ 'UserId', 'ClubId' ];
			self.Fields = [ 'Name' ];
		};
	});
	afterEach(function () {
		eko.repositories.clear();
		window.MembershipModel = undefined;
	});
	
	it('have correct structure', function () {
		var repo = eko.repositories.create('Membership');
		var inst = repo.CreateNew();
		expect(inst).toBeTruthy();
		expect(inst.UserId).toBeDefined();
		expect(inst.ClubId).toBeDefined();
		expect(inst.UserId).toBeNull();
		expect(inst.ClubId).toBeNull();
	});
	
	it('can still be created', function () {
		var repo = eko.repositories.create('Membership');
		var inst = repo.CreateNew({ UserId: 1, ClubId: 2 });
		expect(inst.UserId).toEqual(1);
		expect(inst.ClubId).toEqual(2);
	});
	
	it('have composite dbKey', function () {
		var repo = eko.repositories.create('Membership');
		var inst = repo.CreateNew({ UserId: 1, ClubId: 2 });
		expect(inst.dbKey).toEqual('1|2');
	});
	
	it('can still be attached', function () {
		var repo = eko.repositories.create('Membership');
		var inst = repo.Attach({ UserId: 1, ClubId: 2 });
		expect(repo.Count()).toEqual(1);
	});
	
	it('update the correct instance on attach', function () {
		var repo = eko.repositories.create('Membership');
		var inst = repo.Attach({ UserId: 1, ClubId: 2, Name: 'First' });
		expect(inst.Name()).toEqual('First');
		var inst = repo.Attach({ UserId: 1, ClubId: 2, Name: 'Second' });
		expect(inst.Name()).toEqual('Second');
	});
	
	it('can still be fetched uniquely', function () {
		var repo = eko.repositories.create('Membership');
		var inst1 = repo.Attach({ UserId: 1, ClubId: 2, Name: 'First' });
		var inst2 = repo.Get('1|2', {from:'local'});
		expect(inst2).toEqual(inst1);
		expect(inst2.Name()).toEqual('First');
	});
	
	it('return valid forJSON', function () {
		var repo = eko.repositories.create('Membership');
		var inst = repo.CreateNew({ UserId: 1, ClubId: 2 });
		inst.IsNew(false);
		inst.IsDirty(false);
		expect(inst.toJSON()).toEqual('{"UserId":1,"ClubId":2}');
	});
});

describe('Array fields', function () {
	beforeEach(function () {
		window.UserModel = function () {
			var self = this;
			self.Keys = [ 'id' ];
			self.Fields = [ 'name', 'colours' ];
		};
	});
	afterEach(function () {
		window.UserModel = undefined;
		eko.repositories.clear();
	});
	
	it('can be set as normal', function () {
		var repo = eko.repositories.create('User');
		var inst = repo.CreateNew({ id: 1, colours: [ 'red', 'blue', 'green' ] });
		expect(inst.colours()).toBeTruthy();
		expect(inst.colours().length).toBe(3);
	});
	
	it('can be handled differently', function () {
		var calledOnSet = false;
		var repo = eko.repositories.create('User');
		window.UserModel.prototype.OnSetcolours = function (arr) {
			this.colours(arr);
			calledOnSet = true;
		};
		var inst = repo.CreateNew({ id: 1, colours: [ 'red', 'blue', 'green' ] });
		expect(calledOnSet).toBeTruthy();
		expect(inst.colours()).toBeTruthy();
		expect(inst.colours().length).toBe(3);
	});
	
	it('on set will pause array updates and resume', function () {
		var pause = false, resume = false;
		var repo = eko.repositories.create('User');
		window.UserModel.prototype.colours.valueWillMutate = function () {
			pause = true;
		};
		window.UserModel.prototype.colours.valueHasMutated = function () {
			resume = true;
		};
		var inst = repo.CreateNew({ id: 1, colours: [ 'red', 'blue', 'green' ] });
		expect(pause).toBeTruthy();
		expect(resume).toBeTruthy();
		expect(inst.colours()).toBeTruthy();
		expect(inst.colours().length).toBe(3);
	});
});

describe('Entities instances produce JSON', function () {
	beforeEach(function () {
		window.UserModel = function () {
			var self = this;
			self.Keys = [ 'id' ];
			self.Fields = [ 'name', 'score' ];
		};
	});
	afterEach(function () {
		window.UserModel = undefined;
		eko.repositories.clear();
	});
	
	it('of all defined fields', function () {
		var repo = eko.repositories.create('User');
		var inst = repo.CreateNew({ id: 1, name: 'Test', score: 0.5 });
		inst.IsNew(false);
		inst.IsDirty(false);
		expect(inst.toJSON()).toBe('{"id":1,"name":"Test","score":0.5}');
	});
	
	it('with IsNew if true', function () {
		var repo = eko.repositories.create('User');
		var inst = repo.CreateNew({ id: 1, name: 'Test', score: 0.5 });
		inst.IsNew(true);
		expect(inst.toJSON()).toBe('{"id":1,"name":"Test","score":0.5,"IsNew":true}');
	});
	
	it('without IsDirty if IsNew is true', function () {
		var repo = eko.repositories.create('User');
		var inst = repo.CreateNew({ id: 1, name: 'Test', score: 0.5 });
		inst.IsNew(true);
		inst.IsDirty(true);
		expect(inst.toJSON()).toBe('{"id":1,"name":"Test","score":0.5,"IsNew":true}');
	});
	
	it('with IsDirty if true and IsNew is false', function () {
		var repo = eko.repositories.create('User');
		var inst = repo.CreateNew({ id: 1, name: 'Test', score: 0.5 });
		inst.IsNew(false);
		inst.IsDirty(true);
		expect(inst.toJSON()).toBe('{"id":1,"name":"Test","score":0.5,"IsDirty":true}');
	});
	
	it('without fields set to null', function () {
		var repo = eko.repositories.create('User');
		var inst = repo.CreateNew({ id: 1, name: 'Test', score: 0.5 });
		inst.name(null);
		expect(inst.toJSON()).toBe('{"id":1,"score":0.5,"IsNew":true}');
	});
	
	it('without fields set to undefined', function () {
		var repo = eko.repositories.create('User');
		var inst = repo.CreateNew({ id: 1, name: 'Test', score: 0.5 });
		inst.name(undefined);
		expect(inst.toJSON()).toBe('{"id":1,"score":0.5,"IsNew":true}');
	});
	
	it('without fields that have been physically removed', function () {
		var repo = eko.repositories.create('User');
		var inst = repo.CreateNew({ id: 1, name: 'Test', score: 0.5 });
		delete inst.constructor.prototype.name;
		expect(inst.toJSON()).toBe('{"id":1,"score":0.5,"IsNew":true}');
	});
	
	it('including fields removed from definition after creation', function () {
		var repo = eko.repositories.create('User');
		var inst = repo.CreateNew({ id: 1, name: 'Test', score: 0.5 });
		inst.Fields = ['score'];
		expect(inst.toJSON()).toBe('{"id":1,"name":"Test","score":0.5,"IsNew":true}');
	});
});

describe('Related entities', function () {
	beforeEach(function () {
		window.UserModel = function () {
			var self = this;
			self.Keys = [ 'id' ];
			self.Fields = [ 'name', 'parentId' ];
			
			self.parent = eko.relationship(self.parentId, 'User');
		};
	});
	
	it('can be defined using observable field and model name', function () {
		var repo = eko.repositories.create('User');
		var inst = repo.CreateNew({ id: 1, name: 'Child' });
		expect(typeof inst.parentId).toEqual('function');
		expect(typeof inst.parent).toEqual('function');
	});
	
	it('can be defined using target repository', function () {
		var repo = eko.repositories.create('User');
		var inst = repo.CreateNew({ id: 1, name: 'Child' });
		inst.parent = eko.relationship(inst.parentId, repo);
		expect(typeof inst.parentId).toEqual('function');
		expect(typeof inst.parent).toEqual('function');
	});
	
	it('can be defined using static field', function () {
		var repo = eko.repositories.create('User');
		window.UserModel.prototype.parentId = null;
		var inst = repo.CreateNew({ id: 1, name: 'Child' });
		expect(typeof inst.parentId).not.toEqual('function');
		expect(typeof inst.parent).toEqual('function');
	});
	
	it('returns null if no value', function () {
		var repo = eko.repositories.create('User');
		var inst = repo.CreateNew({ id: 1, name: 'Child' });
		expect(inst.parent()).toBeNull();
	});
	
	it('returns null if no matching entity', function () {
		var repo = eko.repositories.create('User');
		var inst = repo.CreateNew({ id: 1, name: 'Child', parent: 2 });
		expect(inst.parent()).toBeNull();
	});
	
	it('will return matching entity', function () {
		var repo = eko.repositories.create('User');
		var parent = repo.Attach({ id: 2, name: 'Parent' });
		var inst = repo.CreateNew({ id: 1, name: 'Child', parentId: 2 });
		expect(inst.parent()).toBeTruthy();
		expect(inst.parent()).toEqual(parent);
	});
	
	it('will not work if static key used on definition', function () {
		var repo = eko.repositories.create('User');
		window.UserModel.prototype.parentId = null;
		var parent = repo.Attach({ id: 2, name: 'Parent' });
		var inst = repo.CreateNew({ id: 1, name: 'Child', parentId: 2 });
		expect(inst.parent()).toBeNull();
	});
	
	it('will work if static key used after definition', function () {
		var repo = eko.repositories.create('User');
		window.UserModel.prototype.parentId = null;
		var parent = repo.Attach({ id: 2, name: 'Parent' });
		var inst = repo.CreateNew({ id: 1, name: 'Child', parentId: 2 });
		inst.parent = eko.relationship(inst.parentId, 'User');
		expect(inst.parent()).toEqual(parent);
	});
	
	it('will update when observable value changes', function () {
		var repo = eko.repositories.create('User');
		var parent1 = repo.Attach({ id: 2, name: 'Parent 1' });
		var parent2 = repo.Attach({ id: 3, name: 'Parent 2' });
		var inst = repo.CreateNew({ id: 1, name: 'Child', parentId: 2 });
		inst.parentId(3);
		expect(inst.parent()).toEqual(parent2);
	});
	
	it('will not update when static value changes', function () {
		var repo = eko.repositories.create('User');
		window.UserModel.prototype.parentId = null;
		var parent1 = repo.Attach({ id: 2, name: 'Parent 1' });
		var parent2 = repo.Attach({ id: 3, name: 'Parent 2' });
		var inst = repo.CreateNew({ id: 1, name: 'Child', parentId: 2 });
		inst.parent = eko.relationship(inst.parentId, 'User');
		inst.parentId = 3;
		expect(inst.parent()).toEqual(parent1);
	});
	
	it('can be updated to no value', function () {
		var repo = eko.repositories.create('User');
		var parent = repo.Attach({ id: 2, name: 'Parent' });
		var inst = repo.CreateNew({ id: 1, name: 'Child', parentId: 2 });
		inst.parentId(null);
		expect(inst.parent()).not.toBeTruthy();
	});
	
	it('can be updated to missed entity; will check server by default', function () {
		var checked = false;
		eko.utils.ajax = function (options) {
			checked = true;
		};
		var repo = eko.repositories.create('User');
		var parent = repo.Attach({ id: 2, name: 'Parent' });
		var inst = repo.CreateNew({ id: 1, name: 'Child', parentId: 2 });
		inst.parentId(3);
		expect(inst.parent()).not.toBeTruthy();
		expect(checked).toEqual(true);
	});
	
	it('can not be told to check asynchronously', function () {
		eko.utils.ajax = function (options) {
			expect(options.async).toEqual(false);
		};
		var repo = eko.repositories.create('User');
		var parent = repo.Attach({ id: 2, name: 'Parent' });
		var inst = repo.CreateNew({ id: 1, name: 'Child', parentId: 2 });
		inst.parent = eko.relationship(inst.parentId, 'User', { async: true });
		inst.parentId(3);
		expect(inst.parent()).not.toBeTruthy();
	});
	
	it('can be told not to check server on missed entity', function () {
		var checked = false;
		eko.utils.ajax = function (options) {
			checked = true;
		};
		var repo = eko.repositories.create('User');
		var parent = repo.Attach({ id: 2, name: 'Parent' });
		var inst = repo.CreateNew({ id: 1, name: 'Child', parentId: 2 });
		inst.parent = eko.relationship(inst.parentId, 'User', { from: 'local' });
		inst.parentId(3);
		expect(inst.parent()).not.toBeTruthy();
		expect(checked).toEqual(false);
	});
	
	it('can be accessed by complex key', function () {
		window.MembershipModel = function () {
			var self = this;
			self.Keys = [ 'userId', 'order' ];
			self.Fields = [ 'title' ];
			
			self.parent = eko.relationship(self.parentId, 'User');
		};
		window.UserModel = function () {
			var self = this;
			self.Keys = [ 'id' ];
			self.Fields = [ 'name' ];
			
			self.id = ko.observable();
			self.membership = eko.relationship([ self.id, 1 ], 'Membership');
		};
		
		var repo1 = eko.repositories.create('Membership');
		var membship = repo1.Attach({ userId: 1, order: 1, title: 'Success' });
		
		var repo2 = eko.repositories.create('User');
		var inst = repo2.CreateNew({ id: 1, name: 'Child' });
		
		expect(inst.membership()).toBeTruthy();
		expect(inst.membership()).toEqual(membship);
		
		window.MembershipModel = undefined;
	});
});
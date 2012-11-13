test('Synchronous GetAll', function () {
	TestsRepository.Clear();
	equal(TestsRepository.count(), 0);
	TestsRepository.GetAll();
	while (TestsRepository.IsBusy())
		;
	equal(lastAjaxCall.action, 'GetAll');
	ok(!lastAjaxCall.params.async, "Should not be asynchronous");
	equal(TestsRepository.count(), server_data.length);
	ok(!TestsRepository.IsBusy(), "Repository no longer busy");
});

test('Duplicate GetAll only refreshes data', function () {
	TestsRepository.Clear();
	equal(TestsRepository.count(), 0);
	TestsRepository.GetAll();
	while (TestsRepository.IsBusy())
		;
	equal(TestsRepository.count(), server_data.length);
	TestsRepository.GetAll();
	while (TestsRepository.IsBusy())
		;
	equal(TestsRepository.count(), server_data.length);
	ok(!TestsRepository.IsBusy());
});

test('Synchronous GetAll skip start', function () {
	TestsRepository.Clear();
	equal(TestsRepository.count(), 0);
	var arr = TestsRepository.GetAll({ params: { 'start': 2 } });
	while (TestsRepository.IsBusy())
		;
	var max = server_data.length - 2;
	equal(TestsRepository.count(), max, 'Incorrect number of items');
	ok(!TestsRepository.IsBusy());
	equal(arr[0].ID, server_data[2].ID, 'Unexpected item ID');
});

test('Synchronous GetAll subset', function () {
	TestsRepository.Clear();
	equal(TestsRepository.count(), 0);
	var arr = TestsRepository.GetAll({ params: { 'count': 2 } });
	while (TestsRepository.IsBusy())
		;
	equal(TestsRepository.count(), 2, 'Incorrect number of items');
	ok(!TestsRepository.IsBusy());
	equal(arr.length, 2, 'Unexpected item ID');
});

test('GetAll updates Observable efficiently', function () {
	TestsRepository.Clear();
	equal(TestsRepository.count(), 0);
	var updates = 0;
	TestsRepository.Observable.subscribe(function () { ++updates; });
	TestsRepository.GetAll();
	while (TestsRepository.IsBusy())
		;
	equal(updates, 1);
});

test('GetAll callback', function () {
	TestsRepository.Clear();
	var done = false;
	TestsRepository.GetAll({ callback: function (success) { done = success; } });
	ok(done);
});

test('Can disable GetAll', function () {
	TestsRepository.Clear();
	TestsRepository.DisableServer();
	lastAjaxCall.action = '';
	TestsRepository.GetAll();
	notEqual(lastAjaxCall.action, 'GetAll', 'Last action was ' + lastAjaxCall.action);
	equal(TestsRepository.count(), 0);
});

test('Asynchronous LoadFromServer', function () {
	TestsRepository.Clear();
	equal(TestsRepository.count(), 0);
	TestsRepository.LoadFromServer();
	equal(lastAjaxCall.action, 'GetAll', 'Last action was ' + lastAjaxCall.action);
	ok(lastAjaxCall.params.async, "Should be asynchronous");
	ok(TestsRepository.IsBusy(), "Repository busy");
});

test('GetByKey does not hit server for known ID', function () {
	var el = TestsRepository.GetByKey('1');
	notEqual(lastAjaxCall.action, 'GetByKey', 'Last action was ' + lastAjaxCall.action);
	equal(el.Name(), 'Apple');
	ok(!el.IsBusy(), 'Item still busy');
});

test('GetByKey hits server for unknown ID', function () {
	var el = TestsRepository.GetByKey('999');
	equal(lastAjaxCall.action, 'GetByKey', 'Last action was ' + lastAjaxCall.action);
	ok(!lastAjaxCall.params.async);
	equal(lastAjaxCall.params.data.key, 999);
});

test('GetAll will remove old data efficiently', function () {
	TestsRepository.Clear();
	TestsRepository.GetAll();
	equal(server_data.length, TestsRepository.count(), 'server_data.length');
	server_data.splice(1, 2); // Remove 2
	equal(server_data.length, TestsRepository.count() - 2, 'server_data.length - 2');
	var updates = 0;
	TestsRepository.Observable.subscribe(function () { ++updates; });
	TestsRepository.GetAll();
	equal(TestsRepository.count(), server_data.length, 'Unexpected item count');
	equal(updates, 1);
});

test('GetByKeyFromServer', function () {
	var el1 = TestsRepository.GetByKey('1');
	notEqual(lastAjaxCall.action, 'GetByKey', 'Last action was ' + lastAjaxCall.action);
	var el2 = TestsRepository.GetByKeyFromServer('1');
	equal(lastAjaxCall.action, 'GetByKey', 'Last action was ' + lastAjaxCall.action);
	ok(!lastAjaxCall.params.async);
	equal(lastAjaxCall.params.data.key, 1);
	equal(el2 || 'null', el1);
	equal(el2.Name(), 'Apple');
	ok(!el2.IsBusy());
});

test('Can disable GetByKeyFromServer', function () {
	TestsRepository.Clear();
	TestsRepository.DisableServer();
	var el = TestsRepository.GetByKeyFromServer('1');
	notEqual(lastAjaxCall.action, 'GetByKey', 'Last action was ' + lastAjaxCall.action);
	equal(el, null, 'Should not retrieve an entity');
});

test('Item Get fires AfterCreate for new get', function () {
	var invokes = 0;
	TestModel.prototype.AfterCreate = function () {
		++invokes;
	};
	TestsRepository.Clear();
	TestsRepository.GetByKeyFromServer('1');
	equal(invokes, 1, 'AfterCreate fired ' + invokes + ' times');
	TestModel.prototype.AfterCreate = null;
});

test('Item Get does not fire AfterCreate for existing', function () {
	var invokes = 0;
	TestModel.prototype.AfterCreate = function () {
		++invokes;
	};
	TestsRepository.GetByKeyFromServer('1');
	equal(invokes, 0, 'AfterCreate fired ' + invokes + ' times');
	TestModel.prototype.AfterCreate = null;
});

test('Item Get always fires BeforeUpdate', function () {
	var invokes = 0;
	TestModel.prototype.BeforeUpdate = function () {
		++invokes;
	};
	TestsRepository.GetByKeyFromServer('1');
	equal(invokes, 1, 'AfterCreate fired ' + invokes + ' times');
	TestsRepository.Clear();
	TestsRepository.GetByKeyFromServer('1');
	equal(invokes, 2, 'AfterCreate fired ' + invokes + ' times');
	TestModel.prototype.BeforeUpdate = null;
});

test('Item Get always fires AfterUpdate', function () {
	var invokes = 0;
	TestModel.prototype.AfterUpdate = function () {
		++invokes;
	};
	TestsRepository.GetByKeyFromServer('1');
	equal(invokes, 1, 'AfterCreate fired ' + invokes + ' times');
	TestsRepository.Clear();
	TestsRepository.GetByKeyFromServer('1');
	equal(invokes, 2, 'AfterCreate fired ' + invokes + ' times');
	TestModel.prototype.AfterUpdate = null;
});

test('Item Get always fires events in correct order', function () {
	var state = 0;
	TestModel.prototype.BeforeUpdate = function () {
		equal(state++, 0);
	};
	TestModel.prototype.AfterUpdate = function () {
		equal(state++, 1);
	};
	TestModel.prototype.AfterCreate = function () {
		equal(state++, 2);
	};
	TestsRepository.Clear();
	TestsRepository.GetByKeyFromServer('1');
	equal(state, 3);
	TestModel.prototype.BeforeUpdate = null;
	TestModel.prototype.AfterUpdate = null;
	TestModel.prototype.AfterCreate = null;
});

test('Entity decoration works', function () {
	var data = { 'ID': 1, 'Name': 'Apple', 'Colours': null };
	var el = TestsRepository.CreateNew(data);
	equal(el.name, 'Test');
	equal(el.repository, TestsRepository);
	equal(el.dbKey, '1');
	ok(ko.isObservable(el.IsNew));
	ok(ko.isObservable(el.IsDirty));
	ok(ko.isObservable(el.IsBusy));
	ok($.isFunction(el.isValid));
	for (var f in el.Fields) {
		var fld = el.Fields[f];
		if (ko.isObservable(el[fld])) {
			equal(el, el[fld].model);
			equal(fld, el[fld].field);
		}
	}
});

test('Entity toJSON', function () {
	var data = { 'ID': 1, 'Name': 'Apple', 'Colours': null };
	var el = TestsRepository.CreateNew(data);
	equal(el.toJSON(), '{"ID":1,"Name":"Apple"}');
});

test('Entity complex toJSON', function () {
	var el = ComplexRepository.CreateNew();
	var str = '[';
	for (var i = 1; i <= 5; ++i) {
		el.Children().push(TestsRepository.CreateNew({ 'ID': i, 'Name': 'Child ' + i }));
		if (i > 1)
			str += ',';
		str += '{"ID":' + i + ',"Name":"Child ' + i + '"}';
	}
	el.Sibling(TestsRepository.CreateNew({ 'ID': i, 'Name': 'Child ' + i }));
	str += '],"Sibling":{"ID":' + i + ',"Name":"Child ' + i + '"}';
	
	equal(el.toJSON(), '{"ID":0,"Children":' + str + ',"IsNew":true}');
});

test('Edit causes IsDirty', function () {
	var el = TestsRepository.GetByKey('3');
	ok(!el.IsDirty());
	el.Edit();
	ok(el.IsDirty());
	ok(!el.IsBusy());
});

test('Change causes IsDirty', function () {
	var el = TestsRepository.GetByKey('1');
	ok(!el.IsDirty());
	el.Name('Avocado');
	equal(el.Name(), 'Avocado');
	ok(el.IsDirty());
	ok(!el.IsBusy());
});

test('Revert is asychronous by default', function () {
	var el = TestsRepository.GetByKey('1');
	var nameWas = el.Name();
	el.Name('Avocado');
	ok(el.Revert());
	equal(lastAjaxCall.action, 'GetByKey');
	ok(lastAjaxCall.params.async, 'Revert was synchronous');
	equal(lastAjaxCall.params.data.key, 1);
	ok(!el.IsDirty(), 'Should not be dirty after revert');
	ok(!el.IsBusy(), 'Should not be busy after revert');
	equal(el.Name(), nameWas, 'Was not reverted');
});

test('Revert can be sychronous', function () {
	var el = TestsRepository.GetByKey('1');
	var nameWas = el.Name();
	el.Name('Avocado');
	ok(el.Revert({ async: false }));
	ok(!lastAjaxCall.params.async, 'Revert was asynchronous');
	equal(el.Name(), nameWas, 'Was not reverted');
});

test('CreateNew has model defaults', function () {
	var el = TestsRepository.CreateNew();
	ok(el.IsNew(), 'Entity should be IsNew');
	ok(el.IsDirty(), 'Entity should be IsDirty');
	equal(el.ID, '0', 'Entity ID should default to 0');
	equal(el.Name(), "none", 'Entity Name should default to "none"');
});

test('CreateNew with data', function () {
	var el = TestsRepository.CreateNew({ 'ID': 6, 'Name': 'Flower' });
	ok(!el.IsNew(), '!el.IsNew()');
	ok(!el.IsDirty(), '!el.IsDirty()');
	equal(el.ID, 6, 'el.ID == 6');
	equal(el.Name(), 'Flower', 'el.Name() == Flower');
});

test('Attach empty has model defaults', function () {
	var el = TestsRepository.Attach({});
	ok(el.IsNew(), 'Entity should be IsNew');
	ok(el.IsDirty(), 'Entity should be IsDirty');
	equal(el.ID, '0', 'Entity ID should default to 0');
	equal(el.repository, TestsRepository, 'Entity should be attached to repository');
	equal(el.Name(), "none", 'Entity Name should default to "none"');
});

test('Save existing', function () {
	var el = TestsRepository.GetByKey('1');
	if (!el.IsDirty()) {
		el.Name('Avocado');
		el.Edit();
	}
	ok(el.IsDirty());
	var json = el.toJSON();
	el.Save();
	equal(lastAjaxCall.action, 'SaveEntity');
	ok(lastAjaxCall.params.async);
	equal(lastAjaxCall.params.data.item, json);
	ok(!el.IsDirty());
	ok(!el.IsBusy());
	
	el = TestsRepository.GetByKeyFromServer('1');
	equal(el.Name(), 'Avocado');
});

test('BeforeSave can cancel save', function () {
	var el = TestsRepository.GetByKey('1');
	if (!el.IsDirty()) {
		el.Name('Avocado');
		el.Edit();
	}
	ok(el.IsDirty());
	
	el.BeforeSave = function () {
		return true;
	};
	
	ok(el.IsDirty());
	ok(!el.Save(), 'Save should fail');
	ok(el.IsDirty(), 'Item should still be dirty');
	ok(!el.IsBusy(), 'Item should not be busy');
});

test('Save new', function () {
	var was = TestsRepository.count();
	var el = TestsRepository.CreateNew();
	var id = el.ID;
	el.Name('Plum');
	var json = el.toJSON();
	equal(TestsRepository.count(), was, 'Repository size should not increase before save');
	el.Save();
	equal(lastAjaxCall.action, 'SaveEntity');
	ok(lastAjaxCall.params.async);
	equal(lastAjaxCall.params.data.item, json);
	equal(TestsRepository.count(), was + 1, 'Repository size did not increase after save');
	notEqual(el.ID, id, 'ID should have changed on save');
	ok(!el.IsDirty());
	ok(!el.IsBusy());
	
	el = TestsRepository.GetByKeyFromServer(el.ID);
	equal(el.Name(), 'Plum');
});

test('IsNew flag on saved JSON', function () {
	var json = TestsRepository.CreateNew().toJSON();
	contains(json, '"IsNew":true');
});

test('IsModified flag on saved JSON', function () {
	var el = TestsRepository.GetByKey('1');
	if (!el.IsDirty())
		el.Edit();
	ok(!el.IsNew());
	ok(el.IsDirty());
	var json = el.toJSON();
	contains(json, '"IsModified":true');
});

test('Delete from server', function () {
	var el = TestsRepository.GetByKey('1');
	var was = TestsRepository.count();
	ok(el.Delete(), 'Delete returned false');
	ok(!el.IsBusy());
	equal(lastAjaxCall.action, 'DeleteEntity');
	ok(lastAjaxCall.params.async);
	equal(lastAjaxCall.params.data.key, el.ID);
	equal(TestsRepository.count(), was - 1);
	el = TestsRepository.GetByKey(el.dbKey);
	equal(el, null);
});

test('Delete from server events', function () {
	var el = TestsRepository.GetByKey('1');
	var events = 0;
	el.BeforeDelete = function () {
		if (events == 0 && el.IsBusy())
			++events;
	};
	el.AfterDelete = function (success) {
		if (success && events == 1 && el.IsBusy())
			++events;
	};
	el.Delete();
	equal(events||'0', 2, 'BeforeDelete/AfterDelete events did not fire correctly');
});

test('Can cancel delete', function () {
	var el = TestsRepository.GetByKey('1');
	var was = TestsRepository.count();
	el.BeforeDelete = function () {
		return true;
	};
	ok(!el.Delete(), 'Delete should have cancelled');
	ok(!el.IsBusy(), 'Item should not be busy');
	notEqual(lastAjaxCall.action, 'DeleteEntity', 'AJAX call should not have occurred');
	equal(TestsRepository.count(), was, 'Item should not be removed locally');
	TestModel.prototype.BeforeDelete = null;
});

test('Can disable delete from server', function () {
	var el = TestsRepository.GetByKey('1');
	var was = TestsRepository.count();
	TestsRepository.DisableServer();
	ok(el.Delete(), 'Delete returned false');
	notEqual(lastAjaxCall.action, 'DeleteEntity', 'AJAX call should not have occurred');
	equal(TestsRepository.count(), was - 1, 'Item should still be removed locally');
	el = TestsRepository.GetByKey(el.dbKey);
	equal(el, null, 'Item should still be removed locally');
	equal(server_data.length, was, 'Server data should be unaffected');
});

test('Delete from server affects repository once', function () {
	var el = TestsRepository.GetByKey('1');
	var updates = 0;
	TestsRepository.Observable.subscribe(function () { ++updates; });
	el.Delete();
	equal(updates||'0', 1, 'Delete was expected to inform subscribers once');
});

test('AfterDelete informs of success', function () {
	var el = TestsRepository.GetByKey('1');
	TestModel.prototype.AfterDelete = function (deleted) {
		ok(deleted, 'Delete failed');
	};
	el.Delete();
	TestModel.prototype.AfterDelete = null;
}); // TODO: Failing delete

test('Attach new empty', function () {
	var el = TestsRepository.CreateNew();
	var was = TestsRepository.count();
	TestsRepository.Attach(el);
	equal(TestsRepository.count(), was + 1);
});

test('Attach existing does an update', function () {
	var was = TestsRepository.count();
	var el = TestsRepository.GetByKey('1');
	var oldName = el.Name();
	var updates = 0;
	el.Name.subscribe(function () { ++updates; });
	
	TestsRepository.Attach({ ID: 1, Name: 'edited' });
	equal(TestsRepository.count(), was, 'Should not create new entity');
	equal(updates||'0', 1, 'Should have done an update');
	notEqual(el.Name(), oldName, 'Name must change');
	equal(el.Name(), 'edited', 'Name must be attached value');
	equal(TestsRepository.GetByKey('1').Name(), 'edited');
});

test('Attach new pre-built', function () {
	var el = TestsRepository.CreateNew({ 'ID': 6, 'Name': 'Flower' });
	var was = TestsRepository.count();
	TestsRepository.Attach(el);
	equal(TestsRepository.count(), was + 1);
	equal(TestsRepository.GetByKey(el.ID), el);
});

test('Attach existing pre-built does update', function () {
	var was = TestsRepository.count();
	var el = TestsRepository.GetByKey('1');
	var el2 = TestsRepository.CreateNew({ 'ID': 1, 'Name': el.Name() + ' TEST' });
	var updates = 0;
	el.Name.subscribe(function () { ++updates; });
	TestsRepository.Attach(el2);
	equal(TestsRepository.count(), was);
	equal(updates||'0', 1);
	equal(el.Name(), el2.Name());
	equal(TestsRepository.GetByKey(el2.ID).Name(), el2.Name());
});

test('Attach 1 new from POJO', function () {
	var was = TestsRepository.count();
	var el = TestsRepository.Attach({ ID: 11, Name: 'Mango' });
	equal(TestsRepository.count(), was + 1);
	equal(TestsRepository.GetByKey(el.ID), el);
});

test('Attach 1 new from JSON', function () {
	var was = TestsRepository.count();
	var el = TestsRepository.Attach('{ "ID": 11, "Name": "Mango" }');
	equal(TestsRepository.count(), was + 1);
	equal(TestsRepository.GetByKey(el.ID), el);
});

test('Attach JSON array', function () {
	var was = TestsRepository.count();
	var el = TestsRepository.Attach('[ { "ID": 11, "Name": "Mango" }, { "ID": 12, "Name": "Chutney" } ]');
	equal(TestsRepository.count(), was + 2);
	equal(TestsRepository.GetByKey(el[0].ID), el[0]);
});

test('Attach string must be valid JSON', function () {
	var was = TestsRepository.count();
	try {
		var el = TestsRepository.Attach('fail');
		ok(false);
	} catch (e) {
		contains(e, 'JSON parse failed');
	}
});

test('Cannot attach other data types', function () {
	var was = TestsRepository.count();
	try {
		var el = TestsRepository.Attach(123);
		ok(false);
	} catch (e) {
		contains(e, 'Cannot attach primitive data');
	}
	try {
		var el = TestsRepository.Attach(true);
		ok(false);
	} catch (e) {
		contains(e, 'Cannot attach primitive data');
	}
});

test('Can attach many', function () {
	var was = TestsRepository.count();
	data = [
		{ 'ID': 90, 'Name': 'Lemon' },
		{ 'ID': 91, 'Name': 'Lime' },
		{ 'ID': 92, 'Name': 'Orange' }
	];
	TestsRepository.Attach(data);
	equal(TestsRepository.count(), was + data.length);
});

test('Attach many is efficient', function () {
	var was = TestsRepository.count();
	data = [
		{ 'ID': 90, 'Name': 'Lemon' },
		{ 'ID': 91, 'Name': 'Lime' },
		{ 'ID': 92, 'Name': 'Orange' }
	];
	var updates = 0;
	TestsRepository.Observable.subscribe(function () { ++updates; });
	TestsRepository.Attach(data);
	equal(TestsRepository.count(), was + data.length);
	equal(updates, 1, 'Too many update events');
});

// // TODO: Disabled functionality
// test('Repository IsDirty by entities\' IsDirty', function () {
	// ok(!TestsRepository.IsDirty(), 'Not dirty');
	// var el = TestsRepository.GetByKey('1');
	// ok(!TestsRepository.IsDirty(), 'Still not dirty');
	// el.Edit();
	// ok(TestsRepository.IsDirty(), 'Repository should be dirty');
	// el.Revert();
	// ok(!TestsRepository.IsDirty(), 'No longer dirty');
// });

// // Disabled
// test('Repository IsDirty on new entity added', function () {
	// ok(!TestsRepository.IsDirty());
	// var el = TestsRepository.Attach(TestsRepository.CreateNew());
	// ok(el.IsDirty(), 'Element must be dirty');
	// ok(TestsRepository.IsDirty(), 'Repository should be dirty');
// });

test('Repository not IsDirty on existing entity added', function () {
	ok(!TestsRepository.IsDirty());
	TestsRepository.Attach(TestsRepository.CreateNew({ 'ID': 7, 'Name': 'Gooseberry' }));
	ok(!TestsRepository.IsDirty());
});

test('Repository not IsDirty on entity removed', function () {
	ok(!TestsRepository.IsDirty());
	TestsRepository.GetByKey('5').Delete();
	ok(!TestsRepository.IsDirty());
});

test('Synchronous Call without callback returns data', function () {
	var res2 = TestsRepository.Call('CallTest', { params: { id: 9 }, async: false });
	equal(lastAjaxCall.action, 'CallTest');
	ok(!lastAjaxCall.params.async);
	equal(lastAjaxCall.params.data.id, 9);
	notEqual(res2, null);
});

test('Synchronous Call callback returns jqXHR', function () {
	var res1, success;
	var res2 = TestsRepository.Call('CallTest', { params: { id: 9 }, callback: function (res, good) { res1 = res; success = good; }, async: false });
	equal(lastAjaxCall.action, 'CallTest');
	ok(!lastAjaxCall.params.async);
	ok(success);
	equal(lastAjaxCall.params.data.id, 9);
	notEqual(res1, null);
	notEqual(res2, null);
});

test('Asynchronous service call does not return a value', function () {
	var res1, success;
	var res2 = TestsRepository.Call('CallTest', { params: { id: 9 }, callback: function (res, good) { res1 = res; success = good; } });
	equal(lastAjaxCall.action, 'CallTest');
	ok(lastAjaxCall.params.async);
	ok(success);
	equal(lastAjaxCall.params.data.id, 9);
	notEqual(res1, null);
	equal(res2 === undefined ? null : res2, null);
});

test('Bad service calls are still handled', function () {
	var res1, success;
	var res2 = TestsRepository.Call('BadCallTest', { params: { id: 9 }, callback: function (res, good) { res1 = res; success = good; } });
	equal(lastAjaxCall.action, 'BadCallTest');
	ok(lastAjaxCall.params.async);
	ok(!success);
	equal(lastAjaxCall.params.data.id, 9);
	notEqual(res1, null);
	equal(res2 === undefined ? null : res2, null);
});

test('Can move service calls', function () {
	var el = TestsRepository.GetByKey('4');
	
	TestsRepository.UrlSave = 'Test/XSaveEntity';
	try { el.Save(); } catch (e) { }
	el.IsBusy(false);
	equal(lastAjaxCall.action, 'XSaveEntity');
	TestsRepository.UrlSave = 'Test/SaveEntity';
	
	TestsRepository.UrlGetAll = 'Test/XGetAll';
	try { TestsRepository.GetAll(); } catch (e) { }
	el.IsBusy(false);
	equal(lastAjaxCall.action, 'XGetAll');
	TestsRepository.UrlGetAll = 'Test/GetAll';
	
	TestsRepository.UrlGetByKey = 'Test/XGetByKey';
	TestsRepository.GetByKeyFromServer('1');
	el.IsBusy(false);
	equal(lastAjaxCall.action, 'XGetByKey');
	TestsRepository.UrlGetByKey = 'Test/GetByKey';
	
	TestsRepository.UrlDelete = 'Test/XDeleteEntity';
	try { el.Delete(); } catch (e) { }
	el.IsBusy(false);
	equal(lastAjaxCall.action, 'XDeleteEntity');
	TestsRepository.UrlDelete = 'Test/DeleteEntity';
});

test('Can fill array using NewItem (deprecated)', function () {
	var cols = [ 'Red', 'Green', 'Blue' ];
	var el = TestsRepository.CreateNew({ Colours: cols});
	equal(el.Colours().length, 3);
	equal(el.Colours()[0], 'X ' + cols[0]);
	equal(el.Colours()[1], 'X ' + cols[1]);
	equal(el.Colours()[2], 'X ' + cols[2]);
});

test('Can fill array directly', function () {
	var cols = [ 'Red', 'Green', 'Blue' ];
	var el = ArrayTest1Repository.CreateNew({ Colours: cols});
	equal(el.Colours().length, 3);
	equal(el.Colours()[0], cols[0]);
	equal(el.Colours()[1], cols[1]);
	equal(el.Colours()[2], cols[2]);
});

test('Can fill and modify array using Get/Set', function () {
	var cols = [ 'Red', 'Green', 'Blue' ];
	var el = ArrayTest2Repository.CreateNew({ Colours: cols});
	equal(el.Colours().length, 3);
	equal(el.Colours()[0], 'X ' + cols[0]);
	equal(el.Colours()[1], 'X ' + cols[1]);
	equal(el.Colours()[2], 'X ' + cols[2]);
});

test('Server sends empty array; KO does not return it', function () {
	TestsRepository.Clear();
	var item = { 'ID': 1, 'Name': 'Apple', 'Colours': [] };
	server_data = [ item ];
	var models = TestsRepository.GetAll();
	var model = models[0];
	model.Save();
	delete item.Colours;
	equal(lastAjaxCall.params.data.item, ko.toJSON(item));
	equal(model.Colours(), null, 'model.Colours() should return null');
	equal(model.Colours.forJSON(), null);
});

test('Server sends null array; KO does not return it', function () {
	TestsRepository.Clear();
	var item = { 'ID': 1, 'Name': 'Apple', 'Colours': null };
	server_data = [ item ];
	var models = TestsRepository.GetAll();
	var model = models[0];
	model.Save();
	delete item.Colours;
	equal(lastAjaxCall.params.data.item, ko.toJSON(item));
	equal(model.Colours(), null, 'model.Colours() should return null');
	equal(model.Colours.forJSON(), null);
});

// TODO: Send back nulls
test('Server null array does not replace local value', function () {
	TestsRepository.Clear();
	var item = { 'ID': 1, 'Name': 'Apple', 'Colours': [ 'Red' ] };
	TestsRepository.Attach(item);
	server_data = [ { 'ID': 1, 'Name': 'Apple', 'Colours': null } ];
	var models = TestsRepository.GetAll();
	var model = models[0];
	notEqual(model.Colours(), null, 'model.Colours() should not return null');
	equal(model.Colours().length, 1, 'model.Colours() should not be empty');
});

test('Received but unmapped fields are not sent back', function () {
	TestsRepository.Clear();
	server_data = [{ 'ID': 1, 'Name': 'Apple', 'Colours': null, 'ExtraField': 'test' }];
	var models = TestsRepository.GetAll();
	var model = models[0];
	model.Save();
	var item = { 'ID': 1, 'Name': 'Apple' };
	equal(lastAjaxCall.params.data.item, ko.toJSON(item));
});

test('Client-side validation errors cause Save to fail', function () {
	var el = TestsRepository.GetByKey('1');
	//el.errors = ko.validation.group(el);
	el.Name.extend({ required: true });
	equal(el.errors().length, 0);
	el.Name('');
	equal(el.errors().length, 1);
	ok(!el.Save());
});

test('Can assign errors to fields', function () {
	var el = TestsRepository.GetByKey('1');
	el.errors = ko.validation.group(el);
	equal(el.errors().length, 0);
	
	el.setError('Name', 'ERR1');
	el.setError('FakeField', 'ERR2');
	el.errors = ko.validation.group(el);
	equal(el.errors().length, 2);
});

test('Assigned errors do not interrupt save', function () {
	var el = TestsRepository.GetByKey('1');
	//el.errors = ko.validation.group(el);
	
	el.setError('Name', 'ERR1');
	equal(el.errors().length, 1);
	ok(el.Save());
	// Reason: The recalc of errors on save wipes assigned ones
});

test('Can clear a field error', function () {
	var el = TestsRepository.GetByKey('1');
	//el.errors = ko.validation.group(el);
	el.setError('Name', 'ERR1');
	el.setError('FakeField', 'ERR2');
	equal(el.errors().length, 2, 'Errors didn\'t apply');
	
	el.clearError('Name');
	equal(el.errors().length, 1, 'Should be able to clear an error');
});

test('Can clear all field errors', function () {
	var el = TestsRepository.GetByKey('1');
	//el.errors = ko.validation.group(el);
	el.setError('Name', 'ERR1');
	el.setError('FakeField', 'ERR2');
	equal(el.errors().length, 2, 'Errors didn\'t apply');
	
	el.clearErrors();
	equal(el.errors().length, 0, 'Should be able to clear all errors');
});

test('Server can assign errors to fields', function () {
	var el = TestsRepository.GetByKey('1');
	//el.errors = ko.validation.group(el);
	el.Name('');
	ok(el.Save(), 'Save should still work');
	equal(el.errors().length, 1, 'Server error should have applied');
});

test('Server errors fail save', function () {
	var el = TestsRepository.GetByKey('1');
	//el.errors = ko.validation.group(el);
	var updates = 0, fails = 0;
	el.AfterSave = function (saved) {
		++updates;
		if (!saved)
			++fails;
	};
	el.Name('');
	el.Save();
	equal(updates, 1, 'Should receive 1 update');
	equal(fails, 1, 'Should receive 1 fail to save');
});

test('NOTE: Setting error makes dirty', function () {
	var el = TestsRepository.GetByKey('1');
	//el.errors = ko.validation.group(el);
	ok(!el.IsDirty());
	el.setError('Name', 'ERR1');
	ok(el.IsDirty());
});

test('BeforeSave can set errors, preventing save', function () {
	var el = TestsRepository.GetByKey('1');
	//el.errors = ko.validation.group(el);
	
	el.BeforeSave = function () {
		el.setError('Name', 'ERR1');
	};
	
	el.Edit();
	ok(el.IsDirty());
	ok(!el.Save(), 'Save should fail');
	ok(el.IsDirty(), 'Item should still be dirty');
});

// TODO
test('Support entity modifying key on load', function () {
	expect(0);
});

test('Cannot create repository for unknown model', function () {
	try {
		var er = new EntityRepository('fail');
		ok(false);
	} catch (e) {
		contains(e, 'Failed to locate model definition', 'Incorrect error message');
	}
});

function InvalidModel() { }
test('Cannot create repository for invalid model', function () {
	try {
		var er = new EntityRepository('InvalidModel');
		ok(false, 'Should fail');
	} catch (e) {
		ok(true, e.message);
	}
});

test('Check Attach efficiency', function () {
	var data = [];
	for (i = 0; i < 100; ++i)
		data.push({ 'ID': i, 'Name': 'Item ' + i });
	TestsRepository.Clear();
	var start = new Date().getTime();
	TestsRepository.Attach(data);
	var dur = new Date().getTime() - start;
	ok(true, 'Attach ' + TestsRepository.count() + ' took ' + dur + 'ms');
});

test('Check GetAll efficiency', function () {
	server_data = [];
	for (i = 0; i < 100; ++i)
		server_data.push({ 'ID': i, 'Name': 'Item ' + i });
	TestsRepository.Clear();
	var start = new Date().getTime();
	TestsRepository.GetAll();
	var dur = new Date().getTime() - start;
	ok(true, 'GetAll ' + TestsRepository.count() + ' took ' + dur + 'ms');
});

test('Can sort ascending by observable', function () {
	var arr = TestsRepository.Observable();
	var names = [];
	for (var i = 0; i < arr.length; ++i)
		names.push(arr[i].Name());
	names.sort();
	
	TestsRepository.Observable.Sort('Name()');
	
	for (var i = 0; i < arr.length; ++i)
		equal(arr[i].Name(), names.shift());
});

test('Can sort descending by observable', function () {
	var arr = TestsRepository.Observable();
	var names = [];
	for (var i = 0; i < arr.length; ++i)
		names.push(arr[i].Name());
	names.sort();
	names.reverse();
	
	TestsRepository.Observable.Sort(false, 'Name()');
	
	for (var i = 0; i < arr.length; ++i)
		equal(arr[i].Name(), names.shift());
});

test('Can sort ascending by field', function () {
	var arr = TestsRepository.Observable();
	var ids = [];
	for (var i = 0; i < arr.length; ++i)
		ids.push(arr[i].ID);
	ids.sort();
	
	TestsRepository.Observable.Sort('ID');
	
	for (var i = 0; i < arr.length; ++i)
		equal(arr[i].ID, ids.shift());
});

test('Can sort ascending by function', function () {
	var arr = TestsRepository.Observable();
	var strs = [];
	for (var i = 0; i < arr.length; ++i)
		strs.push(arr[i].toString());
	strs.sort();
	
	TestsRepository.Observable.Sort('toString()');
	
	for (var i = 0; i < arr.length; ++i)
		equal(arr[i].toString(), strs.shift());
});

test('Can sort ascending by deep property', function () {
	ComplexRepository.Attach([
		{ ID: 1, Sibling: { Name: 'One' } },
		{ ID: 2, Sibling: { Name: 'Two' } },
		{ ID: 3, Sibling: { Name: 'Three' } }
	]);
	ComplexRepository.Observable.Sort('Sibling()', 'Name');
	
	var vals = ComplexRepository.Observable();
	equal(vals[0].ID, 1);
	equal(vals[1].ID, 3);
	equal(vals[2].ID, 2);
});

test('Sort by deep property with intermediate null does not error', function () {
	ComplexRepository.Attach([
		{ ID: 1, Sibling: { Name: 'One' } },
		{ ID: 2, Sibling: { Name: 'Two' } },
		{ ID: 3, Sibling: null },
		{ ID: 4, Sibling: { Name: 'Three' } }
	]);
	ComplexRepository.Observable.Sort('Sibling()', 'Name');
	
	var vals = ComplexRepository.Observable();
	
	// nulls always first
	equal(vals[0].ID, 3);
	equal(vals[1].ID, 1);
	equal(vals[2].ID, 4);
	equal(vals[3].ID, 2);
});

// Check minimised ko-validation is correct
test('Validation works with non-string fields', function () {
	var el = TestsRepository.CreateNew();
	el.Name.extend({ pattern: '^\\d+$' });
	ko.validation.group(el);
	el.Update({ Name: 123456 });
	ok(el.isValid());
});

test('Can register server call function', function () {
	TestsRepository.RegisterCall('CallTest', [ 'id' ], function (response) { });
	equal(typeof TestsRepository.CallTest, 'function');
});

test('Can register server call function with options', function () {
	TestsRepository.RegisterCall('CallTest', [ 'id' ], { async: true }, function (response) { });
	equal(typeof TestsRepository.CallTest, 'function');
});

test('Cannot register server call over existing functionality', function () {
	try {
		TestsRepository.RegisterCall('GetByKey', [ 'id' ], { async: true }, function (response) { });
		ok(false, 'Should not reach this assertion');
	} catch (e) {
		ok(true);
	}
});

test('Registered server call defaults to synchronous, with return', function () {
	var res1 = null;
	TestsRepository.RegisterCall('CallTest', [ 'id', 'two' ], function (response) { res1 = response; });
	var res2 = TestsRepository.CallTest(9, 'test');
	equal(lastAjaxCall.action, 'CallTest');
	ok(!lastAjaxCall.params.async);
	equal(lastAjaxCall.params.data.id, 9);
	equal(lastAjaxCall.params.data.two, 'test');
	notEqual(res1, null);
	notEqual(res2, null);
	equal(res2, res1);
});

test('Registered server call can be asynchronous, no return', function () {
	var res1 = null;
	TestsRepository.RegisterCall('CallTest', [ 'id', 'two' ], { async: true }, function (response) { res1 = response; });
	var res2 = TestsRepository.CallTest(10, 'test2');
	equal(lastAjaxCall.action, 'CallTest');
	ok(lastAjaxCall.params.async);
	equal(lastAjaxCall.params.data.id, 10);
	equal(lastAjaxCall.params.data.two, 'test2');
	notEqual(res1, null);
	equal(res2, null);
});

test('Can override options on registered server call', function () {
	var res1 = null;
	TestsRepository.RegisterCall('CallTest', [ 'id', 'two' ], { async: true }, function (response) { res1 = response; });
	var res2 = TestsRepository.CallTest(11, 'test3', { async: false });
	ok(!lastAjaxCall.params.async);
	equal(lastAjaxCall.params.data.id, 11);
	equal(lastAjaxCall.params.data.two, 'test3');
	notEqual(res1, null);
	notEqual(res2, null);
	equal(res2, res1);
});

test('Can specify default parameter value on registered server call', function () {
	var res1 = null;
	TestsRepository.RegisterCall('CallTest', [ 'id', 'two' ], { params: { two: 'default' } }, function (response) { res1 = response; });
	TestsRepository.CallTest(12);
	equal(lastAjaxCall.params.data.id, 12);
	equal(lastAjaxCall.params.data.two, 'default');
});

test('Can override default parameter value on registered server call', function () {
	var res1 = null;
	TestsRepository.RegisterCall('CallTest', [ 'id', 'two' ], { params: { two: 'default' } }, function (response) { res1 = response; });
	TestsRepository.CallTest(13, 'override');
	equal(lastAjaxCall.params.data.id, 13);
	equal(lastAjaxCall.params.data.two, 'override');
});

test('Can use default parameter value with options on registered server call', function () {
	var res1 = null;
	TestsRepository.RegisterCall('CallTest', [ 'id', 'two' ], { async: true, params: { two: 'default' } }, function (response) { res1 = response; });
	TestsRepository.CallTest(14, undefined, { async: false });
	ok(!lastAjaxCall.params.async);
	equal(lastAjaxCall.params.data.id, 14);
	equal(lastAjaxCall.params.data.two, 'default');
});

test('Support server change of entity key on save and IsNew', function () {
	TestsRepository.Clear();
	var el = TestsRepository.CreateNew();
	equal(el.dbKey, '0');
	ok(el.IsNew());
	el.Save();
	notEqual(el.ID, 0);
	equal(el.dbKey, el.ID.toString());
	equal(TestsRepository.GetByKey('0'), null);
	
	// Only way to know it worked
	notEqual(el.Name(), 'A');
	TestsRepository.Attach({ ID: el.ID, Name: 'A' });
	equal(el.Name(), 'A');
	TestsRepository.Attach({ ID: 0, Name: 'B' });
	notEqual(el.Name(), 'B', 'Name should not update based on old ID');
});

test('Support server change of entity key on save when not IsNew', function () {
	var oldSave = window.AJAX_SaveEntity;
	window.AJAX_SaveEntity = function (model, args) {
		var item = JSON.parse(args.item);
		item.ID = 2;
		return [true, ko.toJSON(item)];
	};
	
	server_data = [];
	TestsRepository.Clear();
	var el = TestsRepository.Attach({ ID: 1, Name: 'A' });
	ok(!el.IsNew());
	el.Save();
	equal(el.ID, 2, 'ID should change');
	equal(el.dbKey, '2', 'dbKey should change');
	ok(TestsRepository.GetByKey('1') == null, 'Original should be removed');
	
	// Only way to know it worked
	notEqual(el.Name(), 'B');
	TestsRepository.Attach({ ID: 2, Name: 'B' });
	equal(el.Name(), 'B', 'Name should update based on new ID');
	TestsRepository.Attach({ ID: 1, Name: 'C' });
	notEqual(el.Name(), 'C', 'Name should not update based on old ID');
	
	window.AJAX_SaveEntity = oldSave;
});
/**/
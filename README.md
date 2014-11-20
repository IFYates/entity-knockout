# EntityKnockout (Eko)
v2.0-RC1

## Changelog
- Added Detach method to repo
- Standardised coding style
- Improved some errors
- Repo ModelName now field not method
- Changed order of code to improve encapsulation
- BeforeUpdate receives a copy of the new data

## What is Eko?
EntityKnockout provides a quick way to use RESTful web services behind Knockout models.
By default, repositories assume that they are being fed by a web service that can provide a collection of entities of the same type, with the ability to get and save each entity. This functionality is completely adjustable per repository.

## How does Eko work?
Eko provides a simple framework for creating a client-side repository of entities (ViewModels) representing server-side data (Models). Entities are recognised as unique by the key data (including composites) within them; if two entities with the same key attempt to co-exist, the first will be updated by the second.

Following a standard lifecycle, the repository will perform a GetAll request to the web service in order to download that latest set of entity data. This data will be converted to observable Knockout objects and attached to the repository, using the entity keys as the unique identifiers. If the server sent two items of data with the same key, the second instance would be used to update the fields of the first.
Subsequent calls to GetAll would update all existing entities and create new instances of any items with new keys.

Alternatively, the repository can be used just to track items on an individual basis using the GetByKey method, without having to call GetAll first.

Every entity received through a repository will support standard Knockout events as new server data is received for that entity.

## Getting Started
...

### Defining a Model
By default, all models are expected to be named after the entity with "Model" appended. i.e., A Person entity model would be called PersonModel.
Each Eko model is expected to define at minimum public Keys and Fields arrays, with the Keys array being extremely important in defining how entities are uniquely addressed.

### Keys
The Keys array must list the required data fields that uniquely identify one instance against all others. This must contain at least one field. If the underlying model fields are not declared publicly, they will be created as static fields when a new model instance is created.

It is important to note that creating these key fields as observable does not enable the entity key to be changed dynamically; if the key of an attached entity changes, the entity must be detached and reattached from its repository.

### Fields
The Fields array can be empty and specifies the expected (but not required) data fields being received from the server. Fields not listed here will not be mapped to or from source data. If the underlying model fields are not declared publicly, they will be created as standard ko.observable fields. Model fields can be static or observable.

*Tip:* Because if the way Eko checks for static or observable fields, if a function is defined with the name of a Fields element, it will be called with the data passed in.

### When to Attach
Repositories provide two methods for turning raw JSON data in to a valid KO entity: Attach and CreateNew. The important difference is in what they do with the entity once it has been created.

It's best to think of CreateNew as the actual conversion mechanism, and Attach as a method that utilises it while adding further logic. Attach works by adding the created entity to the repository by its key value, or updating the existing matching entity already in the repository.
Under the hood, all entities received from GetAll, GetByKey, GetByKeyFromServer, and LoadFromServer will have been through the Attach method.

Entities returned by CreateNew are not stored in the repository, so it is possible through this method to have two entities existing client-side with the same key, but only one being updated from the server. The advantage being, server data can be processed in to KO entities, queried like any other entity, and then either attached or discarded.

## API :: Repository
Each repository exposes the following fields and methods:

	string	BaseUrl
	string	UrlCall
	string	UrlDelete
	string	UrlGetAll
	string	UrlGetByKey
	string	UrlSave
	observable bool	IsBusy
	observable bool	IsDirty
	string	ModelName
	observableArray entity	Observable

	entity	Attach(string data)
		@data - A raw JSON string of an entity or array of entities matching the repository model.
		Returns an attached entity or array of entities, depending on @data.
	entity	Attach(object data)
		@data - A Javascript object of an entity or array of entities matching the repository model.
		Returns an attached entity or array of entities, depending on @data.
	entity	Attach(entity data)
		@data - An entity or array of entities matching the repository model.
		Returns an attached entity or array of entities, depending on @data.
	data	Call(action, options, errorObj)
	void	Clear()
		Detaches all local entities.
	entity	CreateNew(string data)
		@data - A raw JSON string of an entity or array of entities matching the repository model.
		Returns an entity or array of entities, depending on @data.
	entity	CreateNew(object data)
		@data - A Javascript object of an entity or array of entities matching the repository model.
		Returns an entity or array of entities, depending on @data.
	entity	CreateNew(entity data)
		@data - An entity or array of entities matching the repository model.
		Returns an entity or array of entities, depending on @data.
	int 	count()
	void	Detach(entity)
		Detaches a local entity.
	void	DisableServer()
	observableArray entity 	GetAll(options)
		object @options:
			bool async (default: false)
				Whether to wait for the data to be returned and processed before continuing execution.
			function callback(bool success)
				Invoked after the server call has completed, with the success of the call.
			dictionary params (default: null)
				Key-value pairs to be sent as GET parameters in request.
	entity	GetByKey(options)
	entity	GetByKeyFromServer(options)
	int 	GetCount()
	void	LoadFromServer(options)
		object @options
			Same as @options in GetAll
	void	RegisterCall(name, args, options, handler)
	void	RemoveSubscribers()
	void	SaveAll(options)
	void	Sort()

## API :: Entity
Eko models are decorated when created by or attached to a repository. The additional fields and methods are:

	string dbKey
	string	modelName
	repository	repository
	observable bool IsBusy
		A server call is active on this entity; no further server calls are possible until this one completes.
	observable bool IsDirty
		The value of this entity has changed since the last server load.
	observable bool IsNew
		This entity was created locally and has not yet been sent to the server.

	bool	Delete(options)
		Override is discouraged. Use BeforeDelete and AfterDelete instead.
	bool	Edit()
		Override is discouraged. Use BeforeEdit and AfterEdit instead.
	bool	Revert(options)
		Override is discouraged. Use BeforeRevert and AfterRevert instead.
	bool	Save(options)
		Override is discouraged. Use BeforeSave and AfterSave instead.
	entity	Update(data)
		Override is discouraged. Use BeforeUpdate and AfterUpdate instead.

	void	applyValidation()*
	void	clearError(fieldName)*
	void	clearErrors()*
	void	handleError(jqXHR)*
	object	hasError
	bool	isValid()
	void	setError(fieldName, error)*

	object	forJSON()
		Can be overridden to produce custom JSON for sending to the server.
	string	toJSON()
		Can be overridden to produce custom JSON for sending to the server. Normally better to override forJSON for this purpose.

Within the entity, all observable model fields specified in the Fields array will be decorated with:

	entity	model
	string	fieldName

## API :: Events
If specified, Eko will automatically invoke certain model methods at specified events:

	void	AfterCreate()
		When first created by Attach or CreateNew
	void	AfterDelete(success)
	void	AfterEdit()
	void	AfterRevert()
	void	AfterSave(success)
	void	AfterUpdate()
	bool	BeforeDelete(options)
	bool	BeforeEdit()
	bool	BeforeRevert(options)
	bool	BeforeSave(options)
	void	BeforeUpdate(data)

## Complex Arrays
In order to fully support JSON arrays of complex types (i.e., arrays of entities), there are some methods that each model array field must override:

	array(object)	OnGet{fieldName}()
		Expected to return array of objects to serialise. If the items have a forJSON method, this will be used to flattern the array further.
		Note that any functions included as items in the array will be resolved, including observables.
		In general, this method isn't needed as observableArrays support direct forJSON calls.
	
	void	OnSet{fieldName}(object_array)
		Expects the model to handle any deserialisation of the raw, deserialised JSON array.
		
		Example:
		If a Parent entity had an array of Child entities (called Children) that needed to be held in a ChildRepository, we could do something like this:
		self.setChildren = function (arr) {
			self.Children(ChildRepository.Attach(arr));
		};
		This will process the deserialised JSON array, assuming that it contains valid Child entities, and attach them to the ChildRepository as well as the observableArray of this Parent entity.
	
## Repository Configuration
	bool localOnly (default: false)
	string serviceName (default: modelName)
	bool sorted (default: true)

## Relationships
Eko natively supports defining entity relationships.

ko.computed eko.relationship(key, repository, options)
	@key - Field or observable of a scalar key value, or array of key fields/observables (in same order as entity Keys definition)
	@repository - The repository to use for locating the related entity
	@options
		bool async = true
		bool localOnly = false
		function(entity) callback

## IsNew, IsModified, IsDeleted

## Validation

## Examples

### University
```
function UniversityModel() {
	var self = this;
	
	self.UniversityId = 0;
	self.Courses = ko.observableArray([]);
	
	self.OnCreated = function () {
		self.Courses.valueWillMutate();
		
		eko.repos.get('Course').GetAll({ callback: function () {
			self.Courses(ko.arrayFilter(CourseRepository.Observable(), function (el, i) {
				return (el.UniversityId() == self.UniversityId);
			}));
			self.Courses.valueHasMutated();
		});
	}:
}

eko.repos.create('University', {
	baseUrl: '/',
	serviceName: 'Universities',
	Keys: [ 'UniversityId' ],
	Fields: [ 'Name', 'Location' ]
}).define('Enroll', [ 'studentId', 'date' ], function (success, data) {
	// TODO
});

function CourseModel() {
	var self = this;
	
	self.UniversityId = ko.observable(0);
	self.University = eko.relationship(self.UniversityId, eko.factory('University'));
}
var CourseRepository = new eko.repos.create('Course', {
	Keys: [ 'CourseId' ],
	Fields: [ 'UniversityId', 'Title' ]
}).define('Start', [ 'date' ], function (success, data) {
	// TODO
}).define('Finish', [ 'date' ], function (data, succes, errors) {
	// TODO
});

function StudentModel() {
	var self = this;
	self.Keys = [ 'StudentId' ];
	self.Fields = [ 'FirstName', 'LastName' ];
	
	self.FullName = ko.computed({
		read: function () {
			return self.FirstName() + ' ' + self.LastName();
		}, deferEvaluation: true
	});
}

function EnrollmentModel() {
	var self = this;
	self.Keys = [ 'CourseId', 'StudentId' ];
	self.Fields = [ ];
	
	self.Course = eko.relationship(self.CourseId, CourseRepository);
}
```

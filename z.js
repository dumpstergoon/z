// @ts-nocheck
const z = (_global => {
	/*
		Constants and Symbols for days...
	*/
	const NAME = Symbol("type name");
	const TYPE = Symbol("type template");
	const SATISFIES = Symbol("type compare");

	const STATIC = Symbol("static meta type");
	const MODEL = Symbol("model meta type");
	const ELEMENT = Symbol("element meta type");

	const PROPERTY = Symbol("property meta type");
	const ATTRIBUTE = Symbol("dom attribute meta type");
	const CSS_VAR = Symbol("css variable meta type");
	const QUERY = Symbol("dom query meta tye");
	const LISTENER = Symbol("dom listener meta type");
	const TEMPLATE = Symbol("html template meta type");

	const DO_NOTHING = (x => x);
	const ALWAYS_TRUE = (() => true);
	const RETURN_EMPTY_LIST = (() => []);

	const CONNECTED = Symbol("connected");
	const CHANGESET = Symbol("changeset");
	const LISTENERS = Symbol("listeners");

	const EVENT = {
		CONNECTED: "connected",
		DISCONNECTED: "disconnected",
		RENDER: "render",
		READY: "ready"
	};

	const CHANGESET_HANDLER = {
		set(store, name, change) {
			return Reflect.set(store, name, Reflect.has(store, name) ? concat(Reflect.get(store, name), {
				to: change.to
			}) : change);
		}
	};

	const DEFAULT_PROTOTYPE = {
		[SATISFIES](template) {
			return satisfies(this[TYPE], template);
		},
		define(...definitions) {
			return define_properties(this, concat(...definitions));
		},
		super(type) {
			return extend((...args) => {
				return type.prototype.constructor.call(this, ...args);
			}, proxy_map(type.prototype, ƒ => ƒ.bind(this)));
		},
		keys() {
			return keys(this);
		},
		entries() {
			return rows(this);
		},
		values() {
			return Object.values(this);
		},
		map(mapper) {
			return map(this, mapper);
		},
		forEach(iterator) {
			return rows(this).forEach(iterator) || this;
		},
		filter(_filter) {
			return filter(this, _filter);
		},
		proxy(handler) {
			return proxy(this, handler);
		},
		toString() {
			return `[OBJECT] ${this[NAME] || "anonymous"}`;
		}
	};


	/*

		Core utility functions for manipulating objects.
		Some of these shall be added to object prototypes.

	*/
	const keys = obj => Object.keys(obj);
	const rows = obj => Object.entries(obj).
		concat(Object.getOwnPropertySymbols(obj).map(symbol => [symbol, obj[symbol]]));
	const object = rows => rows.reduce((obj, [key, value]) => {
		obj[key] = value;
		return obj;
	}, {});
	const extend = (...objects) => Object.assign(...objects);
	const concat = (...objects) => extend({}, ...objects);
	const apply = (obj = {}, properties = {}) => rows(properties).forEach(([key, value]) => obj[key] = value) || obj;
	const copy = extend(
		value => Type.object(value) ?
			(Type.array(value) ?
				copy.array(value) : copy.object(value)) : value,
		{
			object: obj => object(rows(obj).map(([key, value]) => [key, copy(value)])),
			array: array => array.map(value => copy(value))
		}
	);
	const filter = (obj, filter) => object(rows(obj).filter(filter));
	const map = (obj, mapper) => object(rows(obj).map(mapper));
	const tag_to_name = tag_name => {
		return tag_name.split('-').map(word => word[0].toUpperCase() + word.substr(1)).join('');
	};
	const satisfies = (a, b) => a === b || a.parents.some(c => satisfies(c, b));

	const create = (properties = {}, prototype = {}) => Object.create(concat(DEFAULT_PROTOTYPE, prototype), properties);
	const define_properties = (obj, definition) => Object.defineProperties(obj, object(rows(definition).map(([name, value]) => {
		return [
			name,
			Type.meta.property(value) ? value : {
				value: value
			}
		];
	})));
	// ***this could be a great abstraction for plugins/extensions....
	const define_accessors = (accessors, get = DO_NOTHING, set = DO_NOTHING) => {
		return map(accessors, ([name, accessor]) => {
			return [
				name,
				concat(getset(
					element => get(element, accessor, name),
					(element, value) => set(element, accessor, name, value)
				), {
					enumerable: true,
					configurable: false
				})
			];
		});
	};
	const define_attributes = attributes => {
		return define_accessors(
			attributes,
			(element, attribute) => attribute.property.get.call(element),
			(element, attribute, name, value) => {
				let from = attribute.get(element.getAttribute(name));
				if (from !== value) {
					element[CHANGESET][name] = {
						from: from,
						to: value
					};
					element.setAttribute(
						name,
						attribute.set(attribute.property.set.call(element, value))
					);

					if (!element[CONNECTED])
						element.render();

					return value;
				}
			}
		);
	};
	const define_variables = variables => {
		return define_accessors(
			variables,
			(element, variable) => variable.property.get.call(element),
			(element, variable, name, value) => {
				name = '--' + name;
				let style = getComputedStyle(element);
				let from = style.getPropertyValue(name);
				if (from !== value) {
					element.style.setProperty(
						name,
						variable.set(variable.property.set.call(element, value))
					);
				}
				return value;
			}
		);
	};
	const define_queries = queries =>
		define_accessors(
			queries,
			(element, query) =>
				Array.from(element.querySelectorAll(query.query))
					.filter(node => query.recursive || node.parentNode === element)
		);


	const namespace = (spaces = [], target = _global) => spaces.length === 0 ? target : namespace(spaces.slice(1), target[spaces[0]]);
	const proxy = (object, handler) => new Proxy(object, handler);
	const proxy_map = (object, get = DO_NOTHING, set = DO_NOTHING) => proxy(object, {
		get(object, key) {
			return get(Reflect.get(object, key));
		},
		set(object, key, value) {
			return Reflect.set(object, key, set(value));
		}
	});
	const enumm = list => object(list.map(item => [item, Symbol(item)]));
	const getset = (get, set) => {
		return {
			get() {
				return get(this, ...arguments);
			},
			set() {
				return set(this, ...arguments);
			}
		};
	};
	const changeset = () => proxy({}, CHANGESET_HANDLER);
	const event = (name, data = {}, bubbles = true, cancelable = true) => extend(new Event(name, {
		bubbles: bubbles,
		cancelable: cancelable
	}), data);
	
	extend(Array.prototype, {
		to_object() {
			return object(this);
		}
	});
	// TODO: This is a temporary fix. Need something better.
	extend(Function.prototype, {
		toStr: Function.prototype.toString,
		toString() {
			let original = this.toStr();
			return `[FUNCTION] ${original.substring(
				original.indexOf("function") === 0 ? 8 : 0,
				original.indexOf('{')).trim()}`;
		}
	});
	// TODO: Same here...
	extend(Symbol.prototype, {
		toStr: Symbol.prototype.toString,
		toString(description = this.toStr()) {
			return description.substring(7, description.length - 1);
		}
	});


	/*

		Next we got ourselves our functions for creating templates and their instances.

	*/
	const slots = (slots, filler = RETURN_EMPTY_LIST) => (new Array(slots)).fill(filler());
	const sort = (list, sorter, num_of_slots) => (list.constructor === Array ? list : rows(list)).reduce((store, item, index, list) => {
		return store[sorter(item, index, list)].push(item) && store;
	}, slots(num_of_slots));
	const sort_definition = definition => sort(definition, ([key, value]) => Type.meta.property(value) ? 1 : 0, 2).map(object);


	const define = (ƒmodels, _target = {}, _models = ƒmodels(_target)) => {
		rows(_models).forEach(([name, model]) => {
			if (Type.meta.model(model) || Type.meta.element(model)) {
				let temp = template(
					name,
					model[TYPE],
					model.self,
					model.definition,
					...model.parents.map(parent => {
						return Type.string(parent) ? _target[parent] : parent;
					}),
				);
				_target[temp.type] = temp;
			} else
				_target[name] = model;
		});
		return _target;
	};

	const template = (name, type, static, definition, ...templates) => {
		// Should we map plain values in the definition as static properties?
		// definition = map(definition, ([key, value]) =>
		// 	[key, !Type.function(value) && !Type.raw(value) ? property.value(value) : value]
		// );
		let template;
		let prototype = filter(definition, ([key, value]) => Type.function(value));
		let properties = filter(definition, ([key, value]) => Type.raw(value));

		if (type === ELEMENT) {
			name = name.toLowerCase();
			template = values => apply(document.createElement(name), values);
		} else {
			template = (...arguments) => {
				let object = create(concat(template.prototype, {
					constructor: template,
				}), template.properties);
				if (template.prototype.constructor)
					return template.prototype.constructor.apply(object, arguments) || Object.seal(object);
				return Object.seal(apply(object, arguments[0] || {}));
			};
		}

		extend(template, static, {
			type: name,
			parents: templates,
			properties: concat(...templates.map(template => template.properties), properties, {
				[NAME]: property.value(name),
				[TYPE]: property.value(template)
			}),
			prototype: concat(...templates.map(template => template.prototype), prototype),
			[TYPE]: type,
			toString() {
				return `[TEMPLATE - ${type.toString()}] ${this.type}`;
			}
		});

		if (type === ELEMENT)
			customElements.define(template.type, generate_element_class(template));
			
		if (type === STATIC)
			return template();
		return template;
	};

	const model = (definition, ...parents) => {
		return {
			definition: definition,
			parents: parents,
			self: {
				empty() {
					return this();
				}
			},
			[TYPE]: MODEL,
			static(definition) {
				// TODO: Need to test if this actually works...
				let [prototype, properties] = sort_definition(definition);
				return extend(this.self, create(properties), prototype) && this;
			}
		};
	};

	const static = (definition, ...parents) => {
		return extend(model(definition, ...parents), {
			[TYPE]: STATIC
		})(/* No defaults... */);
	};

	const element = (definition, ...parents) => {
		return extend(model(definition, ...parents), {
			[TYPE]: ELEMENT
		});
	};

	// Need to rethink our property system such that attributes and css variables
	// access the appropriate methods of elements from here instead.
	const property = extend((descriptor, enumerable = true, configurable = false) => {
		return concat({
			enumerable: enumerable,
			configurable: configurable,
			[TYPE]: PROPERTY,
			private() {
				this.enumerable = false;
				delete this.private;
				return this;
			}
		}, descriptor);
	}, {
		value(value = null, writable = false, private = false) {
			return property({
				value: value,
				writable: writable
			}, !private)
		},
		variable(value = null, private = false) {
			return property.value(value, true, private);
		},
		getset(getter = DO_NOTHING, setter = DO_NOTHING, private = false) {
			return extend(property(getset(getter, setter), private), {
				handler(intercept) {
					return extend(this, {
						get() {
							return intercept.get ? intercept.get(getter(this)) : getter(this);
						},
						set(value) {
							return intercept.set(setter(this, intercept.set ? intercept.set(value) : value));
						}
					});
				}
			});
		},
		getter(get = DO_NOTHING, private = false) {
			return property.getset(
				get,
				DO_NOTHING,
				private
			);
		},
		validated(validator = ALWAYS_TRUE, get = DO_NOTHING, set = DO_NOTHING, error = DO_NOTHING, private = false) {
			return property.getset(get, (object, value) => {
				return (validator(value) ? set(object, value) : error(object, value)) || value;
			}, private);
		},
		type: extend((initial = null, validator = ALWAYS_TRUE, render = DO_NOTHING, _pointer = Symbol()) => {
			let resolve_value = (object, _value = object[_pointer]) =>
				Type.undefined(_value) ? object[_pointer] = initial : _value;

			return property.validated(
				validator,
				resolve_value,
				(object, value) => {
					render(object, resolve_value(object), object[_pointer] = value);
					return value;
				},
				(object, value) => Error.type(value), // TODO: pass object
			);
		}, {
			any: (value, render) => property.type(value || null, ALWAYS_TRUE, render),
			boolean: (value, render) => property.type(value || false, Type.boolean, render),
			string: (value, render) => property.type(value || "", Type.string, render),
			number: (value, render) => property.type(value || 0, Type.number, render),
			integer: (value, render) => property.type(value || 0, Type.integer, render),
			float: (value, render) => property.type(value || 0.0, Type.float, render),
			list: (value, render) => property.type(value || [], Type.array, render),
			date: (value, render) => property.type(value || new Date(), Type.date, render),
			object: (value, render) => property.type(value || {}, Type.object, render),
		}),
		object: (type, value) => property.type(value || type.empty ? type.empty() : type(), value => Type.has_interface(value, type)),
		// TODO: implement type checking...
		options: (options, render) => property.type(options[0], value => options.includes(value), render),
	});

	const attribute = extend((property, get = DO_NOTHING, set = DO_NOTHING, render = DO_NOTHING) => {
		return {
			property: property,
			get: get,
			set: set,
			render: render,
			[TYPE]: ATTRIBUTE,
			required() {
				this.required = true;
				return this;
			},
			nullable() {
				this.nullable = true;
				return this;
			}
		};
	}, {
		boolean: (value, render) => attribute(
			property.type.boolean(value),
			IO.parse.boolean,
			IO.serialize.boolean,
			render
		),
		string: (value, render) => attribute(
			property.type.string(value),
			DO_NOTHING,
			DO_NOTHING,
			render
		),
		integer: (value, render) => attribute(
			property.type.integer(value),
			IO.parse.integer,
			DO_NOTHING,
			render
		),
		float: (value, places, render) => attribute(
			property.type.float(value),
			IO.parse.float,
			IO.serialize.float(places),
			render
		),
		number: (value, render) => attribute(
			property.type.number(value),
			IO.parse.float,
			DO_NOTHING,
			render
		),
		list: (value, render, delimeter = ',') => attribute(
			property.type.array(value),
			IO.parse.list(delimeter),
			IO.serialize.list(delimeter),
			render
		),
		date: (value, render) => attribute(
			property.type.date(value),
			string => new Date(string || Date.now()),
			date => new Date(date.getTime() - (date.getTimezoneOffset() * 60000)).toJSON(),
			render
		),
		time: (value, render) => attribute.list(value, render, ':'),
		set: (value, render) => attribute.list(value, render, ' '),
		hset: (value, render) => attribute(
			property.type.object(value),
			string => string ? string.trim().split(';').map(pair => pair.trim().split(':')) : {},
			object => rows(object).map(([key, value]) => `${key.trim()}:${value.trim()}`).join(';'),
			render
		),
		options: (values, render) => attribute(
			property.options(values),
			DO_NOTHING,
			DO_NOTHING,
			render
		)
	});

	const css = extend((property, get = DO_NOTHING, set = DO_NOTHING) => {
		return {
			property: property,
			get: get,
			set: set,
			[TYPE]: CSS_VAR
		}
	}, {
		string: value => css(property.type.string(value)),
		integer: value => css(
			property.type.integer(value),
			IO.parse.integer,
			DO_NOTHING
		),
		float: (places, value) => css(
			property.type.float(places, value),
			IO.parse.float,
			IO.serialize.float(places),
		),
		number: value => css(
			property.type.number(value),
			IO.parse.number,
			DO_NOTHING
		),
		options: values => css(property.options(values)),
	});

	const query = (query, recursive = true) => {
		return {
			query: query,
			recursive: recursive,
			shallow() {
				this.recursive = false;
				delete this.shallow;
				return this;
			},
			[TYPE]: QUERY
		}
	};

	const listener = callback => {
		return extend(callback, {
			[TYPE]: LISTENER
		})
	};

	const operation = (target, source, operation) => rows(source).forEach(x => operation(target, x));
	const do_listeners = (target, source, callback) => operation(target, source, (target, [event_name, listener]) => {
		let chunks = event_name.split('.');
		event_name = chunks.pop();
		callback(chunks.length > 0 ? namespace(...chunks) : target, event_name, listener);
	});
	const append_listeners = (target, source) => do_listeners(target, source, (target, event_name, listener) => {
		target.addEventListener(event_name, listener, false);
	});
	const remove_listeners = (target, source) => do_listeners(target, source, (target, event_name, listener) => {
		target.removeEventListener(event_name, listener, false);
	});

	const generate_element_class = template => {
		// TODO: Open-up the sorting of properties so we can easily extend it.
		// TODO: abstract these into single function.
		let _properties = filter(
			template.properties,
			([key, value]) => value[TYPE] !== ATTRIBUTE);
		let _attributes = filter(
			template.properties,
			([key, value]) => value[TYPE] === ATTRIBUTE);
		let _variables = filter(
			template.properties,
			([key, value]) => value[TYPE] === CSS_VAR);
		let _queries = filter(
			template.properties,
			([key, value]) => value[TYPE] === QUERY);
		let _listeners = filter(
			template.prototype,
			([key, value]) => value[TYPE] === LISTENER);
		let _prototype = filter(
			template.prototype,
			([key, value]) => value[TYPE] !== LISTENER);

		let element = class extends HTMLElement {
			constructor() {
				super();

				this[CONNECTED] = false;
				this[CHANGESET] = changeset();
				this[LISTENERS] = object(rows(_listeners).map(([event_name, listener]) => {
					let element = this;
					return [
						event_name,
						extend(event => {
							listener(element, event);
						}, listener)
					];
				}));

				Object.defineProperties(this, concat(
					_properties,
					define_attributes(_attributes),
					define_variables(_variables),
					define_queries(_queries)
				));

				if (template.prototype.constructor)
					template.prototype.constructor.call(this);
			}
			connectedCallback() {
				this[CONNECTED] = true;

				rows(_attributes).forEach(([name, attribute]) => {
					let string = this.getAttribute(name);

					if (Type.string(string))
						attribute.property.set.call(this, attribute.get(string));
					else {
						if (attribute.required === true)
							return Error.required(this, name);

						this.setAttribute(name, attribute.set(
							attribute.property.get.call(this)
						));
					}
				});

				append_listeners(this, this[LISTENERS]);
				this.render();
				this.dispatchEvent(event(EVENT.CONNECTED, {}, false, false));
			}
			disconnectedCallback() {
				this[CONNECTED] = false;
				remove_listeners(this, this[LISTENERS]);
				this.dispatchEvent(event(EVENT.DISCONNECTED, {}, false, false));
			}
			render(ts = -1) {
				this.dispatchEvent(event(EVENT.RENDER, {}, false, false));

				rows(_attributes).forEach(([name, attribute]) => {
					let previous = attribute.property.get.call(this);
					let value = attribute.get(this.getAttribute(name));

					if (value !== previous) {
						attribute.property.set.call(this, value);
						this[CHANGESET][name] = {
							from: previous,
							to: value
						};
					}
					
					let change = this[CHANGESET][name];
					change && attribute.render(this, change.from, change.to)
				});

				this[CHANGESET] = changeset();
				
				if (!this[CONNECTED])
					return;
				
				requestAnimationFrame(ts => this.render.call(this, ts));
			}
		};
		return extend(element.prototype, DEFAULT_PROTOTYPE, _prototype, {
			toString() {
				return `[ELEMENT] ${this[NAME]}`;
			}
		}) && element;
	};

	const Type = extend(
		object([
			"undefined",
			"boolean",
			"function",
			"object",
			"number",
			"bigint",
			"string",
			"symbol",
		].map(type_name => [type_name, value => typeof value === type_name])),
		{
			integer: x => Number.isInteger(x),
			float: x => Type.number(x) && !Type.integer(x),

			constructor: (x, X) => x.constructor === X,
			raw: x => Type.constructor(x, Object),
			array: x => Type.constructor(x, Array),
			date: x => Type.constructor(x, Date),

			meta: extend((x, types) => Type.raw(x) && types.includes(x[TYPE]), {
				any: x => Type.meta([PROPERTY, ATTRIBUTE, LISTENER, MODEL, ELEMENT]),
				property: x => Type.meta(x, [PROPERTY, ATTRIBUTE]),
				attribute: x => Type.meta(x, [ATTRIBUTE]),
				listener: x => Type.meta(x, [LISTENER]),
				model: x => Type.meta(x, [MODEL, STATIC]),
				element: x => Type.meta(x, [ELEMENT]),
			}),

			has_interface: (x, X) => x[SATISFIES](X),
			get: value => (value).constructor,
			guess: value => {
				if (value instanceof HTMLElement)
					return value.toString();
				if (value[TYPE])
					return value[TYPE].toString();
				if (Type.number(value))
					return Type.integer(value) ? "integer" : Type.float(value) ? "float" : "number";
				if (Type.object(value))
					return value.constructor ? value.constructor.name.toLowerCase() : "object"
				return typeof value;
			},
		});
	
	const IO = {
		parse: {
			boolean: string => Type.undefined(string) ? undefined : string === 'true' ? true : false,
			number: string => isNaN(string) ? undefined : parseFloat(string),
			integer: string => isNaN(string) ? undefined : parseInt(string),
			float: string => number(string),
			list: delimeter => string => string ? string.split(delimeter) : undefined,
			string: DO_NOTHING, // TODO: functions for creating string structures
		},
		serialize: {
			boolean: bool => Type.undefined(bool) ? undefined : bool ? 'true' : 'false',
			number: DO_NOTHING,
			integer: DO_NOTHING,
			float: places => float => float.toFixed(places),
			list: delimeter => list => list.join(delimeter),
			string: DO_NOTHING
		}
	};

	const Error = extend(message => {
		throw message;
	}, {
		type: value => Error(`Incorrect type. Cannot assign ${Type.guess(value)}.`),
		forbidden: message => Error("Forbidden operation.", message),
		required: (object, attribute) => Error(`${Type.guess(object)}\nValue for attribute "${attribute.toString()}" REQUIRED.`)
	});

	// Double-check our export.
	return define(lib => {
		return {
			extend: extend,
			concat: concat,
			copy: copy,
			apply: apply,

			define: define,
			define_properties: define_properties,
			define_attributes: define_attributes,
			property: property,
			attribute: attribute,
			css: css,
			query: query,
			listener: listener,

			enum: enumm,
			static: static,
			model: model,
			element: element,

			type: Type,
			error: Error,
			app: proxy({}, {
				set(apps, name, app) {
					if (Reflect.has(apps, name))
						return Error(`Web App "${name}" has already been registered.`);
					return Reflect.set(apps, name, app);
				}
			}),
		};
	});
})(this);

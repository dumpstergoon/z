// @ts-nocheck
z.elements = z.define(elements => {
	const LOADING = 'LOADING';
	const READY = 'READY';
	const NODE = {
		TEXT: 3
	};

	const match = (screens, path) => screens[path];
	const toggle_screen = (screen, show = false) => screen && (screen.active = show);
	
	return {
		"z-element": z.element({
			children: z.property.getter(element => {
				return Array.from(element.childNodes)
					.filter(child => child.nodeType !== NODE.TEXT)
			}),
		}),
		"z-list": z.element({
			index: z.css.integer(0),
			// items: z.property.getter(element => {
				
			// }),
			constructor() {},
			add(element) {
				if (z.type.has_interface(element, elements["z-item"]))
					return element.parentNode !== this ? this.appendChild(element) : console.log("Just register don't append?");
			},
			remove(element) {
				return element.parentNode.removeChild(element);
			},
			iterate(iterator) {
				return [...this].forEach(iterator);
			},
			// Quoi d;autre là?
			*[Symbol.iterator]() {
				for (let item in this.items)
					yield item;
			}
		}, "z-element"),

		"z-item": z.element({
			
		}, "z-list"),

		"web-app": z.element({
			name: z.attribute.string().required(),
			root_url: z.property.value(window.location.pathname),
			screens: z.property.value({}),
			location: z.attribute.string("", (app, from, to) => {
				app.hide(from);
				app.show(to);
			}),
			connected: z.listener((app, event) => {
				z.app[app.name] = app;
			}),
			"document.body.load": z.listener((app, event) => {
				if (!app.location)
					app.location = app.root_url;
			}),
			toggle(screen, show) {
				return toggle_screen(screen, show);
			},
			show(path) {
				let screen = match(this.screens, path);
				history.pushState({}, screen.title || "", path);
				document.title = screen.title;
				return this.toggle(screen, true);
			},
			hide(path) {
				return this.toggle(match(this.screens, path), false);
			},
			register(screen) {
				if (z.type.has_interface(screen, elements["app-screen"]))
					this.screens[screen.path] = screen;
				else
					Error.type(screen);
			},
		}),

		"app-screen": z.element({
			title: z.attribute.string().required(),
			active: z.attribute.boolean(false, (screen, from, to) => {
				if (to)
					screen.parentNode.location = screen.path;
			}),
			path: z.attribute.string().required(),
			connected: z.listener((screen, event) => {
				screen.parentNode.register(screen);
			}),
		}),
	};	
});

# z
Multiple Inheritance and state management framework. The philosophy and goal is to flatten the software development stack as
much as humanly possible.

## Get Started

In the repository at the moment, you'll find a `z.js` file and a `definitions.js` file. The former implements our framework
whilst the latter creates definitions for dom elements that can be used in the page's HTML markup. Add these to the `<head>` of
your document as `<script>` elements.

Next, assuming you want your page to _look_ like something, include the `layout.css` and `theme.css` files in the `<head>` of
your document as well.

Note that both `definitions.js` and the css files are customisable/replaceable as you see fit.

For this to work best, have a webserver such as NGINX route all your localhost traffic to the index.html file. Mine is setup
like so just for now:

```ini
location / {
	# First attempt to serve request as file then fall back to displaying the index.html page...
	try_files $uri /index.html;
}
```

## Customising

We probably want to do some exciting things like create our own dom elements and controls. You can either completely replace
`definitions.js` or add to it with another javascript file. Call it whatever you want and include it after `z.js`.

### Overview
Let's define some new elements! We call `z.define` and pass to it an anonymous function. The first parameter of the function
you pass to `z.define` is a reference to the target object that is returned by `z.define`.
```js
const lib = z.define(lib => {
	// The function we pass to `z.define` must return an object. This object is where the magic happens.
	return {
		
		// Here we are defining an element whose tag is `text-label`.
		"text-label": z.element({
			
			// This will increments each time the attribute `text` is assigned a new value.
			// That way, we can reflect this in our css using `var(--counter)`
			counter: z.css.integer(0),
			
			// A get-set property called "text" that, when assigned, alters the textContent.
			text: z.attribute.string("", (text_label, from, to) => {
				text_label.counter++;
				text_label.textContent = to;
			})
		}),
		
		// Sometimes I don't want to make an element, but I want to define some functionality
		// that might be used by many different types of elements. This is where `abstracts`
		// and `models` come in handy!
		Robot: z.abstract({
			speak() {
				return "10010101001";
			}
		}),
		Dog: z.model({
			bark() {
				return "woof";
			}
		}),
		"robo-dog": z.element({
			click: z.listener((robo_dog, event) => {
				this.text = robo_dog.speak() + robo_dog.bark();
			}),
		}, "Robot", "Dog", "text-label");
	};
});
```

`z.abstract` and `z.model` are pretty much the same thing except `z.model` returns a function. This function is the _constructor_
for our __type__. There is also `z.static` which is a one-off model that is constructed upon definition.

```js
let dog = lib.Dog();
dog.bark();
// yields: "woof"
```

Next, to use our element, add the markup inside the `<body>` like so:

```html
<robo-dog text="Click Me"></robo-dog>
```

Give that a bash! Fun right? Let's move on to the rest of the documentation...


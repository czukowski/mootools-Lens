/*
---
description: Experinental Lens Effect for MooTools
license: MIT-style
authors:
 - Korney Czukowski
requires:
 - core/1.3: *
provides:
 - Element.Pane
 - Element.Pane.Transform
 - Element.Pane.Transform.Lens
 - Element.Pane.Transform.Lens.Equidistant
 - Element.Pane.Transform.Lens.Orthographic
 - Element.Pane.Transform.Lens.Equisolid
 - Element.Pane.Transform.Lens.Conform
...
*/

/**
 * Element pane class
 */
Element.Pane = new Class({
	Implements: [Options],

	/**
	 * Class options
	 */
	options: {
		offset: {x: 0, y: 0, z: 0},
		filter: null,
		scale: {x: 1, y: 1, z: 1}
	},

	/**
	 * Adds object to the pane
	 */
	add: function(object, coordinates) {
		if (typeOf(coordinates) == 'array') {
			coordinates = {
				x: coordinates[0] || 0,
				y: coordinates[1] || 0,
				z: coordinates[2] || 0
			};
		}
		if (typeOf(object) == 'string') {
			object = new Element(object);
		}
		object.addEvents({
			'load': this.loadHandler.bind(this),
			'update': this.updateHandler.bind(this)
		});
		object.set('coordinates', coordinates)
			.setStyle('position', 'absolute')
			.inject(this.element);
		this.objects.push(object);
		return this;
	},

	/**
	 * Class initializing
	 */
	initialize: function(element, options) {
		// Initialize pane objects array
		this.objects = [];
		// Set pane element
		this.element = document.id(element)
			.setStyles({
				'overflow': 'hidden',
				'position': 'relative'
			});
		// Set class options
		this.setOptions(options);
		// Set "identical" pane transformation if none specified
		if ( ! this.options.filter) {
			this.options.filter = new Element.Pane.Transform();
		}
	},

	/**
	 * Event handler for element 'load' event
	 */
	loadHandler: function(e) {
		if (typeOf(e.target) == 'element') {
			this.updateHandler(e.target);
		}
	},

	/**
	 * Render a single object or all objects
	 */
	render: function(object) {
		var objects = object ? [object] : this.objects;
		objects.each(function(object) {
			object.rendering = true;
			var coordinates = this.transformToPane(this.options.filter.transform(object.get('coordinates')));
			object.setStyles({
				'top': coordinates.y - object.offsetHeight / 2,
				'left': coordinates.x - object.offsetWidth / 2,
				'z-index': coordinates.z
			});
			object.rendering = false;
		}, this);
	},

	/**
	 * Transforms point coordinates to pane coordinates
	 */
	transformToPane: function(point) {
		return {
			x: point.x * this.options.scale.x + this.options.offset.x,
			y: point.y * this.options.scale.y + this.options.offset.y,
			z: point.z * this.options.scale.z + this.options.offset.z
		}
	},

	/**
	 * Event handler for 'update' event
	 */
	updateHandler: function(target) {
		if ( ! target.rendering) this.render(target);
	}
});

Element.Pane.Transform = new Class({
	transform: function(point) {
		return point;
	}
});
Element.Pane.Transform.Lens = new Class({
	Extends: Element.Pane.Transform,
	initialize: function(f, d) {
		this.f = f || 1;
		this.d = d || 1.5 * this.f;
	},
	toPlane: function(polar) {
		return {
			x: polar.r * Math.cos(polar.f),
			y: polar.r * Math.sin(polar.f),
			z: polar.z
		};
	},
	toPolar: function(point) {
		if (point.x > 0) {
			f = Math.atan(point.y / point.x);
		}
		else if (point.x < 0 && point.y >= 0) {
			f = Math.atan(point.y / point.x) + Math.PI;
		}
		else if (point.x < 0 && point.y < 0) {
			f = Math.atan(point.y / point.x) - Math.PI;
		}
		else if (point.x == 0 && point.y > 0) {
			f = Math.PI / 2;	
		}
		else if (point.x == 0 && point.y < 0) {
			f = -Math.PI / 2;	
		}
		else {
			f = 0;
		}
		return {r: Math.sqrt(point.x * point.x + point.y * point.y), f: f, z: point.z};
	},
	transform: function(point) {
		return this.toPlane(this.transformFunction(this.toPolar(point)));
	},
	transformFunction: function(polar) {
		// r = f * tan(t)
		polar.r = this.f * (polar.r / (polar.z + this.d - this.f));
		return polar;
	}
});
Element.Pane.Transform.Lens.Equidistant = new Class({
	Extends: Element.Pane.Transform.Lens,
	transformFunction: function(polar) {
		// r = f * t
		polar.r = this.f * Math.atan(polar.r / (polar.z + this.d - this.f));
		return polar;
	}
});
Element.Pane.Transform.Lens.Orthographic = new Class({
	Extends: Element.Pane.Transform.Lens,
	transformFunction: function(polar) {
		// r = f * sin(t)
		var d = polar.z + this.d - this.f;
		polar.r = this.f * polar.r / Math.sqrt(polar.r * polar.r + d * d);
		return polar;
	}
});
Element.Pane.Transform.Lens.Equisolid = new Class({
	Extends: Element.Pane.Transform.Lens,
	transformFunction: function(polar) {
		// r = 2 * f * sin(t / 2)
		var d = polar.z + this.d - this.f;
		polar.r = 2 * this.f * Math.sin(Math.asin(polar.r / Math.sqrt(polar.r * polar.r + d * d)) / 2);
		return polar;
	}
});
Element.Pane.Transform.Lens.Conform = new Class({
	Extends: Element.Pane.Transform.Lens,
	transformFunction: function(polar) {
		// r = 2 * f * tan(t / 2)
		polar.r = 2 * this.f * Math.tan(Math.atan(polar.r / (polar.z + this.d - this.f)) / 2);
		return polar;
	}
});

/**
 * Implement Element extensions
 */
(function() {

	var originalMembers = {}, extendedMembers = {};
	// Replace the following methods with functions, that call the original method and fire 'update' event afterwards
	['addClass', 'removeClass', 'toggleClass', 'setStyle', 'setStyles'].each(function(member) {
		originalMembers[member] = Element.prototype[member];
		extendedMembers[member] = function() {
			originalMembers[member].apply(this, arguments);
			if ( ! this.rendering) this.fireEvent('update', this);
			return this;
		}
	});
	Element.implement(extendedMembers);
	// Implement properties
	Element.Properties.coordinates = {
		get: function() {
			return this._coordinates;
		},
		set: function(coordinates) {
			this._coordinates = coordinates;
		}
	};

})();
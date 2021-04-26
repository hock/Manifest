/*!
Waypoints - 4.0.1
Copyright © 2011-2016 Caleb Troughton
Licensed under the MIT license.
https://github.com/imakewebthings/waypoints/blob/master/licenses.txt
*/
(function() {
  'use strict'

  var keyCounter = 0
  var allWaypoints = {}

  /* http://imakewebthings.com/waypoints/api/waypoint */
  function Waypoint(options) {
    if (!options) {
      throw new Error('No options passed to Waypoint constructor')
    }
    if (!options.element) {
      throw new Error('No element option passed to Waypoint constructor')
    }
    if (!options.handler) {
      throw new Error('No handler option passed to Waypoint constructor')
    }

    this.key = 'waypoint-' + keyCounter
    this.options = Waypoint.Adapter.extend({}, Waypoint.defaults, options)
    this.element = this.options.element
    this.adapter = new Waypoint.Adapter(this.element)
    this.callback = options.handler
    this.axis = this.options.horizontal ? 'horizontal' : 'vertical'
    this.enabled = this.options.enabled
    this.triggerPoint = null
    this.group = Waypoint.Group.findOrCreate({
      name: this.options.group,
      axis: this.axis
    })
    this.context = Waypoint.Context.findOrCreateByElement(this.options.context)

    if (Waypoint.offsetAliases[this.options.offset]) {
      this.options.offset = Waypoint.offsetAliases[this.options.offset]
    }
    this.group.add(this)
    this.context.add(this)
    allWaypoints[this.key] = this
    keyCounter += 1
  }

  /* Private */
  Waypoint.prototype.queueTrigger = function(direction) {
    this.group.queueTrigger(this, direction)
  }

  /* Private */
  Waypoint.prototype.trigger = function(args) {
    if (!this.enabled) {
      return
    }
    if (this.callback) {
      this.callback.apply(this, args)
    }
  }

  /* Public */
  /* http://imakewebthings.com/waypoints/api/destroy */
  Waypoint.prototype.destroy = function() {
    this.context.remove(this)
    this.group.remove(this)
    delete allWaypoints[this.key]
  }

  /* Public */
  /* http://imakewebthings.com/waypoints/api/disable */
  Waypoint.prototype.disable = function() {
    this.enabled = false
    return this
  }

  /* Public */
  /* http://imakewebthings.com/waypoints/api/enable */
  Waypoint.prototype.enable = function() {
    this.context.refresh()
    this.enabled = true
    return this
  }

  /* Public */
  /* http://imakewebthings.com/waypoints/api/next */
  Waypoint.prototype.next = function() {
    return this.group.next(this)
  }

  /* Public */
  /* http://imakewebthings.com/waypoints/api/previous */
  Waypoint.prototype.previous = function() {
    return this.group.previous(this)
  }

  /* Private */
  Waypoint.invokeAll = function(method) {
    var allWaypointsArray = []
    for (var waypointKey in allWaypoints) {
      allWaypointsArray.push(allWaypoints[waypointKey])
    }
    for (var i = 0, end = allWaypointsArray.length; i < end; i++) {
      allWaypointsArray[i][method]()
    }
  }

  /* Public */
  /* http://imakewebthings.com/waypoints/api/destroy-all */
  Waypoint.destroyAll = function() {
    Waypoint.invokeAll('destroy')
  }

  /* Public */
  /* http://imakewebthings.com/waypoints/api/disable-all */
  Waypoint.disableAll = function() {
    Waypoint.invokeAll('disable')
  }

  /* Public */
  /* http://imakewebthings.com/waypoints/api/enable-all */
  Waypoint.enableAll = function() {
    Waypoint.Context.refreshAll()
    for (var waypointKey in allWaypoints) {
      allWaypoints[waypointKey].enabled = true
    }
    return this
  }

  /* Public */
  /* http://imakewebthings.com/waypoints/api/refresh-all */
  Waypoint.refreshAll = function() {
    Waypoint.Context.refreshAll()
  }

  /* Public */
  /* http://imakewebthings.com/waypoints/api/viewport-height */
  Waypoint.viewportHeight = function() {
    return window.innerHeight || document.documentElement.clientHeight
  }

  /* Public */
  /* http://imakewebthings.com/waypoints/api/viewport-width */
  Waypoint.viewportWidth = function() {
    return document.documentElement.clientWidth
  }

  Waypoint.adapters = []

  Waypoint.defaults = {
    context: window,
    continuous: true,
    enabled: true,
    group: 'default',
    horizontal: false,
    offset: 0
  }

  Waypoint.offsetAliases = {
    'bottom-in-view': function() {
      return this.context.innerHeight() - this.adapter.outerHeight()
    },
    'right-in-view': function() {
      return this.context.innerWidth() - this.adapter.outerWidth()
    }
  }

  window.Waypoint = Waypoint
}())
;(function() {
  'use strict'

  function requestAnimationFrameShim(callback) {
    window.setTimeout(callback, 1000 / 60)
  }

  var keyCounter = 0
  var contexts = {}
  var Waypoint = window.Waypoint
  var oldWindowLoad = window.onload

  /* http://imakewebthings.com/waypoints/api/context */
  function Context(element) {
    this.element = element
    this.Adapter = Waypoint.Adapter
    this.adapter = new this.Adapter(element)
    this.key = 'waypoint-context-' + keyCounter
    this.didScroll = false
    this.didResize = false
    this.oldScroll = {
      x: this.adapter.scrollLeft(),
      y: this.adapter.scrollTop()
    }
    this.waypoints = {
      vertical: {},
      horizontal: {}
    }

    element.waypointContextKey = this.key
    contexts[element.waypointContextKey] = this
    keyCounter += 1
    if (!Waypoint.windowContext) {
      Waypoint.windowContext = true
      Waypoint.windowContext = new Context(window)
    }

    this.createThrottledScrollHandler()
    this.createThrottledResizeHandler()
  }

  /* Private */
  Context.prototype.add = function(waypoint) {
    var axis = waypoint.options.horizontal ? 'horizontal' : 'vertical'
    this.waypoints[axis][waypoint.key] = waypoint
    this.refresh()
  }

  /* Private */
  Context.prototype.checkEmpty = function() {
    var horizontalEmpty = this.Adapter.isEmptyObject(this.waypoints.horizontal)
    var verticalEmpty = this.Adapter.isEmptyObject(this.waypoints.vertical)
    var isWindow = this.element == this.element.window
    if (horizontalEmpty && verticalEmpty && !isWindow) {
      this.adapter.off('.waypoints')
      delete contexts[this.key]
    }
  }

  /* Private */
  Context.prototype.createThrottledResizeHandler = function() {
    var self = this

    function resizeHandler() {
      self.handleResize()
      self.didResize = false
    }

    this.adapter.on('resize.waypoints', function() {
      if (!self.didResize) {
        self.didResize = true
        Waypoint.requestAnimationFrame(resizeHandler)
      }
    })
  }

  /* Private */
  Context.prototype.createThrottledScrollHandler = function() {
    var self = this
    function scrollHandler() {
      self.handleScroll()
      self.didScroll = false
    }

    this.adapter.on('scroll.waypoints', function() {
      if (!self.didScroll || Waypoint.isTouch) {
        self.didScroll = true
        Waypoint.requestAnimationFrame(scrollHandler)
      }
    })
  }

  /* Private */
  Context.prototype.handleResize = function() {
    Waypoint.Context.refreshAll()
  }

  /* Private */
  Context.prototype.handleScroll = function() {
    var triggeredGroups = {}
    var axes = {
      horizontal: {
        newScroll: this.adapter.scrollLeft(),
        oldScroll: this.oldScroll.x,
        forward: 'right',
        backward: 'left'
      },
      vertical: {
        newScroll: this.adapter.scrollTop(),
        oldScroll: this.oldScroll.y,
        forward: 'down',
        backward: 'up'
      }
    }

    for (var axisKey in axes) {
      var axis = axes[axisKey]
      var isForward = axis.newScroll > axis.oldScroll
      var direction = isForward ? axis.forward : axis.backward

      for (var waypointKey in this.waypoints[axisKey]) {
        var waypoint = this.waypoints[axisKey][waypointKey]
        if (waypoint.triggerPoint === null) {
          continue
        }
        var wasBeforeTriggerPoint = axis.oldScroll < waypoint.triggerPoint
        var nowAfterTriggerPoint = axis.newScroll >= waypoint.triggerPoint
        var crossedForward = wasBeforeTriggerPoint && nowAfterTriggerPoint
        var crossedBackward = !wasBeforeTriggerPoint && !nowAfterTriggerPoint
        if (crossedForward || crossedBackward) {
          waypoint.queueTrigger(direction)
          triggeredGroups[waypoint.group.id] = waypoint.group
        }
      }
    }

    for (var groupKey in triggeredGroups) {
      triggeredGroups[groupKey].flushTriggers()
    }

    this.oldScroll = {
      x: axes.horizontal.newScroll,
      y: axes.vertical.newScroll
    }
  }

  /* Private */
  Context.prototype.innerHeight = function() {
    /*eslint-disable eqeqeq */
    if (this.element == this.element.window) {
      return Waypoint.viewportHeight()
    }
    /*eslint-enable eqeqeq */
    return this.adapter.innerHeight()
  }

  /* Private */
  Context.prototype.remove = function(waypoint) {
    delete this.waypoints[waypoint.axis][waypoint.key]
    this.checkEmpty()
  }

  /* Private */
  Context.prototype.innerWidth = function() {
    /*eslint-disable eqeqeq */
    if (this.element == this.element.window) {
      return Waypoint.viewportWidth()
    }
    /*eslint-enable eqeqeq */
    return this.adapter.innerWidth()
  }

  /* Public */
  /* http://imakewebthings.com/waypoints/api/context-destroy */
  Context.prototype.destroy = function() {
    var allWaypoints = []
    for (var axis in this.waypoints) {
      for (var waypointKey in this.waypoints[axis]) {
        allWaypoints.push(this.waypoints[axis][waypointKey])
      }
    }
    for (var i = 0, end = allWaypoints.length; i < end; i++) {
      allWaypoints[i].destroy()
    }
  }

  /* Public */
  /* http://imakewebthings.com/waypoints/api/context-refresh */
  Context.prototype.refresh = function() {
    /*eslint-disable eqeqeq */
    var isWindow = this.element == this.element.window
    /*eslint-enable eqeqeq */
    var contextOffset = isWindow ? undefined : this.adapter.offset()
    var triggeredGroups = {}
    var axes

    this.handleScroll()
    axes = {
      horizontal: {
        contextOffset: isWindow ? 0 : contextOffset.left,
        contextScroll: isWindow ? 0 : this.oldScroll.x,
        contextDimension: this.innerWidth(),
        oldScroll: this.oldScroll.x,
        forward: 'right',
        backward: 'left',
        offsetProp: 'left'
      },
      vertical: {
        contextOffset: isWindow ? 0 : contextOffset.top,
        contextScroll: isWindow ? 0 : this.oldScroll.y,
        contextDimension: this.innerHeight(),
        oldScroll: this.oldScroll.y,
        forward: 'down',
        backward: 'up',
        offsetProp: 'top'
      }
    }

    for (var axisKey in axes) {
      var axis = axes[axisKey]
      for (var waypointKey in this.waypoints[axisKey]) {
        var waypoint = this.waypoints[axisKey][waypointKey]
        var adjustment = waypoint.options.offset
        var oldTriggerPoint = waypoint.triggerPoint
        var elementOffset = 0
        var freshWaypoint = oldTriggerPoint == null
        var contextModifier, wasBeforeScroll, nowAfterScroll
        var triggeredBackward, triggeredForward

        if (waypoint.element !== waypoint.element.window) {
          elementOffset = waypoint.adapter.offset()[axis.offsetProp]
        }

        if (typeof adjustment === 'function') {
          adjustment = adjustment.apply(waypoint)
        }
        else if (typeof adjustment === 'string') {
          adjustment = parseFloat(adjustment)
          if (waypoint.options.offset.indexOf('%') > - 1) {
            adjustment = Math.ceil(axis.contextDimension * adjustment / 100)
          }
        }

        contextModifier = axis.contextScroll - axis.contextOffset
        waypoint.triggerPoint = Math.floor(elementOffset + contextModifier - adjustment)
        wasBeforeScroll = oldTriggerPoint < axis.oldScroll
        nowAfterScroll = waypoint.triggerPoint >= axis.oldScroll
        triggeredBackward = wasBeforeScroll && nowAfterScroll
        triggeredForward = !wasBeforeScroll && !nowAfterScroll

        if (!freshWaypoint && triggeredBackward) {
          waypoint.queueTrigger(axis.backward)
          triggeredGroups[waypoint.group.id] = waypoint.group
        }
        else if (!freshWaypoint && triggeredForward) {
          waypoint.queueTrigger(axis.forward)
          triggeredGroups[waypoint.group.id] = waypoint.group
        }
        else if (freshWaypoint && axis.oldScroll >= waypoint.triggerPoint) {
          waypoint.queueTrigger(axis.forward)
          triggeredGroups[waypoint.group.id] = waypoint.group
        }
      }
    }

    Waypoint.requestAnimationFrame(function() {
      for (var groupKey in triggeredGroups) {
        triggeredGroups[groupKey].flushTriggers()
      }
    })

    return this
  }

  /* Private */
  Context.findOrCreateByElement = function(element) {
    return Context.findByElement(element) || new Context(element)
  }

  /* Private */
  Context.refreshAll = function() {
    for (var contextId in contexts) {
      contexts[contextId].refresh()
    }
  }

  /* Public */
  /* http://imakewebthings.com/waypoints/api/context-find-by-element */
  Context.findByElement = function(element) {
    return contexts[element.waypointContextKey]
  }

  window.onload = function() {
    if (oldWindowLoad) {
      oldWindowLoad()
    }
    Context.refreshAll()
  }


  Waypoint.requestAnimationFrame = function(callback) {
    var requestFn = window.requestAnimationFrame ||
      window.mozRequestAnimationFrame ||
      window.webkitRequestAnimationFrame ||
      requestAnimationFrameShim
    requestFn.call(window, callback)
  }
  Waypoint.Context = Context
}())
;(function() {
  'use strict'

  function byTriggerPoint(a, b) {
    return a.triggerPoint - b.triggerPoint
  }

  function byReverseTriggerPoint(a, b) {
    return b.triggerPoint - a.triggerPoint
  }

  var groups = {
    vertical: {},
    horizontal: {}
  }
  var Waypoint = window.Waypoint

  /* http://imakewebthings.com/waypoints/api/group */
  function Group(options) {
    this.name = options.name
    this.axis = options.axis
    this.id = this.name + '-' + this.axis
    this.waypoints = []
    this.clearTriggerQueues()
    groups[this.axis][this.name] = this
  }

  /* Private */
  Group.prototype.add = function(waypoint) {
    this.waypoints.push(waypoint)
  }

  /* Private */
  Group.prototype.clearTriggerQueues = function() {
    this.triggerQueues = {
      up: [],
      down: [],
      left: [],
      right: []
    }
  }

  /* Private */
  Group.prototype.flushTriggers = function() {
    for (var direction in this.triggerQueues) {
      var waypoints = this.triggerQueues[direction]
      var reverse = direction === 'up' || direction === 'left'
      waypoints.sort(reverse ? byReverseTriggerPoint : byTriggerPoint)
      for (var i = 0, end = waypoints.length; i < end; i += 1) {
        var waypoint = waypoints[i]
        if (waypoint.options.continuous || i === waypoints.length - 1) {
          waypoint.trigger([direction])
        }
      }
    }
    this.clearTriggerQueues()
  }

  /* Private */
  Group.prototype.next = function(waypoint) {
    this.waypoints.sort(byTriggerPoint)
    var index = Waypoint.Adapter.inArray(waypoint, this.waypoints)
    var isLast = index === this.waypoints.length - 1
    return isLast ? null : this.waypoints[index + 1]
  }

  /* Private */
  Group.prototype.previous = function(waypoint) {
    this.waypoints.sort(byTriggerPoint)
    var index = Waypoint.Adapter.inArray(waypoint, this.waypoints)
    return index ? this.waypoints[index - 1] : null
  }

  /* Private */
  Group.prototype.queueTrigger = function(waypoint, direction) {
    this.triggerQueues[direction].push(waypoint)
  }

  /* Private */
  Group.prototype.remove = function(waypoint) {
    var index = Waypoint.Adapter.inArray(waypoint, this.waypoints)
    if (index > -1) {
      this.waypoints.splice(index, 1)
    }
  }

  /* Public */
  /* http://imakewebthings.com/waypoints/api/first */
  Group.prototype.first = function() {
    return this.waypoints[0]
  }

  /* Public */
  /* http://imakewebthings.com/waypoints/api/last */
  Group.prototype.last = function() {
    return this.waypoints[this.waypoints.length - 1]
  }

  /* Private */
  Group.findOrCreate = function(options) {
    return groups[options.axis][options.name] || new Group(options)
  }

  Waypoint.Group = Group
}())
;(function() {
  'use strict'

  var $ = window.jQuery
  var Waypoint = window.Waypoint

  function JQueryAdapter(element) {
    this.$element = $(element)
  }

  $.each([
    'innerHeight',
    'innerWidth',
    'off',
    'offset',
    'on',
    'outerHeight',
    'outerWidth',
    'scrollLeft',
    'scrollTop'
  ], function(i, method) {
    JQueryAdapter.prototype[method] = function() {
      var args = Array.prototype.slice.call(arguments)
      return this.$element[method].apply(this.$element, args)
    }
  })

  $.each([
    'extend',
    'inArray',
    'isEmptyObject'
  ], function(i, method) {
    JQueryAdapter[method] = $[method]
  })

  Waypoint.adapters.push({
    name: 'jquery',
    Adapter: JQueryAdapter
  })
  Waypoint.Adapter = JQueryAdapter
}())
;(function() {
  'use strict'

  var Waypoint = window.Waypoint

  function createExtension(framework) {
    return function() {
      var waypoints = []
      var overrides = arguments[0]

      if (framework.isFunction(arguments[0])) {
        overrides = framework.extend({}, arguments[1])
        overrides.handler = arguments[0]
      }

      this.each(function() {
        var options = framework.extend({}, overrides, {
          element: this
        })
        if (typeof options.context === 'string') {
          options.context = framework(this).closest(options.context)[0]
        }
        waypoints.push(new Waypoint(options))
      })

      return waypoints
    }
  }

  if (window.jQuery) {
    window.jQuery.fn.waypoint = createExtension(window.jQuery)
  }
  if (window.Zepto) {
    window.Zepto.fn.waypoint = createExtension(window.Zepto)
  }
}())
; /*!
 * jQuery.ScrollTo
 * Copyright (c) 2007-2012 Ariel Flesler - aflesler(at)gmail(dot)com | http://flesler.blogspot.com
 * Dual licensed under MIT and GPL.
 * Date: 4/09/2012
 *
 * @projectDescription Easy element scrolling using jQuery.
 * http://flesler.blogspot.com/2007/10/jqueryscrollto.html
 * @author Ariel Flesler
 * @version 1.4.3.1
 *
 * @id jQuery.scrollTo
 * @id jQuery.fn.scrollTo
 * @param {String, Number, DOMElement, jQuery, Object} target Where to scroll the matched elements.
 *	  The different options for target are:
 *		- A number position (will be applied to all axes).
 *		- A string position ('44', '100px', '+=90', etc ) will be applied to all axes
 *		- A jQuery/DOM element ( logically, child of the element to scroll )
 *		- A string selector, that will be relative to the element to scroll ( 'li:eq(2)', etc )
 *		- A hash { top:x, left:y }, x and y can be any kind of number/string like above.
 *		- A percentage of the container's dimension/s, for example: 50% to go to the middle.
 *		- The string 'max' for go-to-end. 
 * @param {Number, Function} duration The OVERALL length of the animation, this argument can be the settings object instead.
 * @param {Object,Function} settings Optional set of settings or the onAfter callback.
 *	 @option {String} axis Which axis must be scrolled, use 'x', 'y', 'xy' or 'yx'.
 *	 @option {Number, Function} duration The OVERALL length of the animation.
 *	 @option {String} easing The easing method for the animation.
 *	 @option {Boolean} margin If true, the margin of the target element will be deducted from the final position.
 *	 @option {Object, Number} offset Add/deduct from the end position. One number for both axes or { top:x, left:y }.
 *	 @option {Object, Number} over Add/deduct the height/width multiplied by 'over', can be { top:x, left:y } when using both axes.
 *	 @option {Boolean} queue If true, and both axis are given, the 2nd axis will only be animated after the first one ends.
 *	 @option {Function} onAfter Function to be called after the scrolling ends. 
 *	 @option {Function} onAfterFirst If queuing is activated, this function will be called after the first scrolling ends.
 * @return {jQuery} Returns the same jQuery object, for chaining.
 *
 * @desc Scroll to a fixed position
 * @example $('div').scrollTo( 340 );
 *
 * @desc Scroll relatively to the actual position
 * @example $('div').scrollTo( '+=340px', { axis:'y' } );
 *
 * @desc Scroll using a selector (relative to the scrolled element)
 * @example $('div').scrollTo( 'p.paragraph:eq(2)', 500, { easing:'swing', queue:true, axis:'xy' } );
 *
 * @desc Scroll to a DOM element (same for jQuery object)
 * @example var second_child = document.getElementById('container').firstChild.nextSibling;
 *			$('#container').scrollTo( second_child, { duration:500, axis:'x', onAfter:function(){
 *				alert('scrolled!!');																   
 *			}});
 *
 * @desc Scroll on both axes, to different values
 * @example $('div').scrollTo( { top: 300, left:'+=200' }, { axis:'xy', offset:-20 } );
 */

;(function( $ ){
	
	var $scrollTo = $.scrollTo = function( target, duration, settings ){
		$(window).scrollTo( target, duration, settings );
	};

	$scrollTo.defaults = {
		axis:'xy',
		duration: parseFloat($.fn.jquery) >= 1.3 ? 0 : 1,
		limit:true
	};

	// Returns the element that needs to be animated to scroll the window.
	// Kept for backwards compatibility (specially for localScroll & serialScroll)
	$scrollTo.window = function( scope ){
		return $(window)._scrollable();
	};

	// Hack, hack, hack :)
	// Returns the real elements to scroll (supports window/iframes, documents and regular nodes)
	$.fn._scrollable = function(){
		return this.map(function(){
			var elem = this,
				isWin = !elem.nodeName || $.inArray( elem.nodeName.toLowerCase(), ['iframe','#document','html','body'] ) != -1;

				if( !isWin )
					return elem;

			var doc = (elem.contentWindow || elem).document || elem.ownerDocument || elem;
			
			return /webkit/i.test(navigator.userAgent) || doc.compatMode == 'BackCompat' ?
				doc.body : 
				doc.documentElement;
		});
	};

	$.fn.scrollTo = function( target, duration, settings ){
		if( typeof duration == 'object' ){
			settings = duration;
			duration = 0;
		}
		if( typeof settings == 'function' )
			settings = { onAfter:settings };
			
		if( target == 'max' )
			target = 9e9;
			
		settings = $.extend( {}, $scrollTo.defaults, settings );
		// Speed is still recognized for backwards compatibility
		duration = duration || settings.duration;
		// Make sure the settings are given right
		settings.queue = settings.queue && settings.axis.length > 1;
		
		if( settings.queue )
			// Let's keep the overall duration
			duration /= 2;
		settings.offset = both( settings.offset );
		settings.over = both( settings.over );

		return this._scrollable().each(function(){
			// Null target yields nothing, just like jQuery does
			if (target == null) return;

			var elem = this,
				$elem = $(elem),
				targ = target, toff, attr = {},
				win = $elem.is('html,body');

			switch( typeof targ ){
				// A number will pass the regex
				case 'number':
				case 'string':
					if( /^([+-]=)?\d+(\.\d+)?(px|%)?$/.test(targ) ){
						targ = both( targ );
						// We are done
						break;
					}
					// Relative selector, no break!
					targ = $(targ,this);
					if (!targ.length) return;
				case 'object':
					// DOMElement / jQuery
					if( targ.is || targ.style )
						// Get the real position of the target 
						toff = (targ = $(targ)).offset();
			}
			$.each( settings.axis.split(''), function( i, axis ){
				var Pos	= axis == 'x' ? 'Left' : 'Top',
					pos = Pos.toLowerCase(),
					key = 'scroll' + Pos,
					old = elem[key],
					max = $scrollTo.max(elem, axis);

				if( toff ){// jQuery / DOMElement
					attr[key] = toff[pos] + ( win ? 0 : old - $elem.offset()[pos] );

					// If it's a dom element, reduce the margin
					if( settings.margin ){
						attr[key] -= parseInt(targ.css('margin'+Pos)) || 0;
						attr[key] -= parseInt(targ.css('border'+Pos+'Width')) || 0;
					}
					
					attr[key] += settings.offset[pos] || 0;
					
					if( settings.over[pos] )
						// Scroll to a fraction of its width/height
						attr[key] += targ[axis=='x'?'width':'height']() * settings.over[pos];
				}else{ 
					var val = targ[pos];
					// Handle percentage values
					attr[key] = val.slice && val.slice(-1) == '%' ? 
						parseFloat(val) / 100 * max
						: val;
				}

				// Number or 'number'
				if( settings.limit && /^\d+$/.test(attr[key]) )
					// Check the limits
					attr[key] = attr[key] <= 0 ? 0 : Math.min( attr[key], max );

				// Queueing axes
				if( !i && settings.queue ){
					// Don't waste time animating, if there's no need.
					if( old != attr[key] )
						// Intermediate animation
						animate( settings.onAfterFirst );
					// Don't animate this axis again in the next iteration.
					delete attr[key];
				}
			});

			animate( settings.onAfter );			

			function animate( callback ){
				$elem.animate( attr, duration, settings.easing, callback && function(){
					callback.call(this, target, settings);
				});
			};

		}).end();
	};
	
	// Max scrolling position, works on quirks mode
	// It only fails (not too badly) on IE, quirks mode.
	$scrollTo.max = function( elem, axis ){
		var Dim = axis == 'x' ? 'Width' : 'Height',
			scroll = 'scroll'+Dim;
		
		if( !$(elem).is('html,body') )
			return elem[scroll] - $(elem)[Dim.toLowerCase()]();
		
		var size = 'client' + Dim,
			html = elem.ownerDocument.documentElement,
			body = elem.ownerDocument.body;

		return Math.max( html[scroll], body[scroll] ) 
			 - Math.min( html[size]  , body[size]   );
	};

	function both( val ){
		return typeof val == 'object' ? val : { top:val, left:val };
	};

})( jQuery ); /*!
 * Autolinker.js
 * 3.14.1
 *
 * Copyright(c) 2020 Gregory Jacobs <greg@greg-jacobs.com>
 * MIT License
 *
 * https://github.com/gregjacobs/Autolinker.js
 */
(function (global, factory) {
    typeof exports === 'object' && typeof module !== 'undefined' ? module.exports = factory() :
    typeof define === 'function' && define.amd ? define(factory) :
    (global = global || self, global.Autolinker = factory());
}(this, function () { 'use strict';

    /**
     * Assigns (shallow copies) the properties of `src` onto `dest`, if the
     * corresponding property on `dest` === `undefined`.
     *
     * @param {Object} dest The destination object.
     * @param {Object} src The source object.
     * @return {Object} The destination object (`dest`)
     */
    function defaults(dest, src) {
        for (var prop in src) {
            if (src.hasOwnProperty(prop) && dest[prop] === undefined) {
                dest[prop] = src[prop];
            }
        }
        return dest;
    }
    /**
     * Truncates the `str` at `len - ellipsisChars.length`, and adds the `ellipsisChars` to the
     * end of the string (by default, two periods: '..'). If the `str` length does not exceed
     * `len`, the string will be returned unchanged.
     *
     * @param {String} str The string to truncate and add an ellipsis to.
     * @param {Number} truncateLen The length to truncate the string at.
     * @param {String} [ellipsisChars=...] The ellipsis character(s) to add to the end of `str`
     *   when truncated. Defaults to '...'
     */
    function ellipsis(str, truncateLen, ellipsisChars) {
        var ellipsisLength;
        if (str.length > truncateLen) {
            if (ellipsisChars == null) {
                ellipsisChars = '&hellip;';
                ellipsisLength = 3;
            }
            else {
                ellipsisLength = ellipsisChars.length;
            }
            str = str.substring(0, truncateLen - ellipsisLength) + ellipsisChars;
        }
        return str;
    }
    /**
     * Supports `Array.prototype.indexOf()` functionality for old IE (IE8 and below).
     *
     * @param {Array} arr The array to find an element of.
     * @param {*} element The element to find in the array, and return the index of.
     * @return {Number} The index of the `element`, or -1 if it was not found.
     */
    function indexOf(arr, element) {
        if (Array.prototype.indexOf) {
            return arr.indexOf(element);
        }
        else {
            for (var i = 0, len = arr.length; i < len; i++) {
                if (arr[i] === element)
                    return i;
            }
            return -1;
        }
    }
    /**
     * Removes array elements based on a filtering function. Mutates the input
     * array.
     *
     * Using this instead of the ES5 Array.prototype.filter() function, to allow
     * Autolinker compatibility with IE8, and also to prevent creating many new
     * arrays in memory for filtering.
     *
     * @param {Array} arr The array to remove elements from. This array is
     *   mutated.
     * @param {Function} fn A function which should return `true` to
     *   remove an element.
     * @return {Array} The mutated input `arr`.
     */
    function remove(arr, fn) {
        for (var i = arr.length - 1; i >= 0; i--) {
            if (fn(arr[i]) === true) {
                arr.splice(i, 1);
            }
        }
    }
    /**
     * Performs the functionality of what modern browsers do when `String.prototype.split()` is called
     * with a regular expression that contains capturing parenthesis.
     *
     * For example:
     *
     *     // Modern browsers:
     *     "a,b,c".split( /(,)/ );  // --> [ 'a', ',', 'b', ',', 'c' ]
     *
     *     // Old IE (including IE8):
     *     "a,b,c".split( /(,)/ );  // --> [ 'a', 'b', 'c' ]
     *
     * This method emulates the functionality of modern browsers for the old IE case.
     *
     * @param {String} str The string to split.
     * @param {RegExp} splitRegex The regular expression to split the input `str` on. The splitting
     *   character(s) will be spliced into the array, as in the "modern browsers" example in the
     *   description of this method.
     *   Note #1: the supplied regular expression **must** have the 'g' flag specified.
     *   Note #2: for simplicity's sake, the regular expression does not need
     *   to contain capturing parenthesis - it will be assumed that any match has them.
     * @return {String[]} The split array of strings, with the splitting character(s) included.
     */
    function splitAndCapture(str, splitRegex) {
        if (!splitRegex.global)
            throw new Error("`splitRegex` must have the 'g' flag set");
        var result = [], lastIdx = 0, match;
        while (match = splitRegex.exec(str)) {
            result.push(str.substring(lastIdx, match.index));
            result.push(match[0]); // push the splitting char(s)
            lastIdx = match.index + match[0].length;
        }
        result.push(str.substring(lastIdx));
        return result;
    }
    /**
     * Function that should never be called but is used to check that every
     * enum value is handled using TypeScript's 'never' type.
     */
    function throwUnhandledCaseError(theValue) {
        throw new Error("Unhandled case for value: '" + theValue + "'");
    }

    /**
     * @class Autolinker.HtmlTag
     * @extends Object
     *
     * Represents an HTML tag, which can be used to easily build/modify HTML tags programmatically.
     *
     * Autolinker uses this abstraction to create HTML tags, and then write them out as strings. You may also use
     * this class in your code, especially within a {@link Autolinker#replaceFn replaceFn}.
     *
     * ## Examples
     *
     * Example instantiation:
     *
     *     var tag = new Autolinker.HtmlTag( {
     *         tagName : 'a',
     *         attrs   : { 'href': 'http://google.com', 'class': 'external-link' },
     *         innerHtml : 'Google'
     *     } );
     *
     *     tag.toAnchorString();  // <a href="http://google.com" class="external-link">Google</a>
     *
     *     // Individual accessor methods
     *     tag.getTagName();                 // 'a'
     *     tag.getAttr( 'href' );            // 'http://google.com'
     *     tag.hasClass( 'external-link' );  // true
     *
     *
     * Using mutator methods (which may be used in combination with instantiation config properties):
     *
     *     var tag = new Autolinker.HtmlTag();
     *     tag.setTagName( 'a' );
     *     tag.setAttr( 'href', 'http://google.com' );
     *     tag.addClass( 'external-link' );
     *     tag.setInnerHtml( 'Google' );
     *
     *     tag.getTagName();                 // 'a'
     *     tag.getAttr( 'href' );            // 'http://google.com'
     *     tag.hasClass( 'external-link' );  // true
     *
     *     tag.toAnchorString();  // <a href="http://google.com" class="external-link">Google</a>
     *
     *
     * ## Example use within a {@link Autolinker#replaceFn replaceFn}
     *
     *     var html = Autolinker.link( "Test google.com", {
     *         replaceFn : function( match ) {
     *             var tag = match.buildTag();  // returns an {@link Autolinker.HtmlTag} instance, configured with the Match's href and anchor text
     *             tag.setAttr( 'rel', 'nofollow' );
     *
     *             return tag;
     *         }
     *     } );
     *
     *     // generated html:
     *     //   Test <a href="http://google.com" target="_blank" rel="nofollow">google.com</a>
     *
     *
     * ## Example use with a new tag for the replacement
     *
     *     var html = Autolinker.link( "Test google.com", {
     *         replaceFn : function( match ) {
     *             var tag = new Autolinker.HtmlTag( {
     *                 tagName : 'button',
     *                 attrs   : { 'title': 'Load URL: ' + match.getAnchorHref() },
     *                 innerHtml : 'Load URL: ' + match.getAnchorText()
     *             } );
     *
     *             return tag;
     *         }
     *     } );
     *
     *     // generated html:
     *     //   Test <button title="Load URL: http://google.com">Load URL: google.com</button>
     */
    var HtmlTag = /** @class */ (function () {
        /**
         * @method constructor
         * @param {Object} [cfg] The configuration properties for this class, in an Object (map)
         */
        function HtmlTag(cfg) {
            if (cfg === void 0) { cfg = {}; }
            /**
             * @cfg {String} tagName
             *
             * The tag name. Ex: 'a', 'button', etc.
             *
             * Not required at instantiation time, but should be set using {@link #setTagName} before {@link #toAnchorString}
             * is executed.
             */
            this.tagName = ''; // default value just to get the above doc comment in the ES5 output and documentation generator
            /**
             * @cfg {Object.<String, String>} attrs
             *
             * An key/value Object (map) of attributes to create the tag with. The keys are the attribute names, and the
             * values are the attribute values.
             */
            this.attrs = {}; // default value just to get the above doc comment in the ES5 output and documentation generator
            /**
             * @cfg {String} innerHTML
             *
             * The inner HTML for the tag.
             */
            this.innerHTML = ''; // default value just to get the above doc comment in the ES5 output and documentation generator
            /**
             * @protected
             * @property {RegExp} whitespaceRegex
             *
             * Regular expression used to match whitespace in a string of CSS classes.
             */
            this.whitespaceRegex = /\s+/; // default value just to get the above doc comment in the ES5 output and documentation generator
            this.tagName = cfg.tagName || '';
            this.attrs = cfg.attrs || {};
            this.innerHTML = cfg.innerHtml || cfg.innerHTML || ''; // accept either the camelCased form or the fully capitalized acronym as in the DOM
        }
        /**
         * Sets the tag name that will be used to generate the tag with.
         *
         * @param {String} tagName
         * @return {Autolinker.HtmlTag} This HtmlTag instance, so that method calls may be chained.
         */
        HtmlTag.prototype.setTagName = function (tagName) {
            this.tagName = tagName;
            return this;
        };
        /**
         * Retrieves the tag name.
         *
         * @return {String}
         */
        HtmlTag.prototype.getTagName = function () {
            return this.tagName || '';
        };
        /**
         * Sets an attribute on the HtmlTag.
         *
         * @param {String} attrName The attribute name to set.
         * @param {String} attrValue The attribute value to set.
         * @return {Autolinker.HtmlTag} This HtmlTag instance, so that method calls may be chained.
         */
        HtmlTag.prototype.setAttr = function (attrName, attrValue) {
            var tagAttrs = this.getAttrs();
            tagAttrs[attrName] = attrValue;
            return this;
        };
        /**
         * Retrieves an attribute from the HtmlTag. If the attribute does not exist, returns `undefined`.
         *
         * @param {String} attrName The attribute name to retrieve.
         * @return {String} The attribute's value, or `undefined` if it does not exist on the HtmlTag.
         */
        HtmlTag.prototype.getAttr = function (attrName) {
            return this.getAttrs()[attrName];
        };
        /**
         * Sets one or more attributes on the HtmlTag.
         *
         * @param {Object.<String, String>} attrs A key/value Object (map) of the attributes to set.
         * @return {Autolinker.HtmlTag} This HtmlTag instance, so that method calls may be chained.
         */
        HtmlTag.prototype.setAttrs = function (attrs) {
            Object.assign(this.getAttrs(), attrs);
            return this;
        };
        /**
         * Retrieves the attributes Object (map) for the HtmlTag.
         *
         * @return {Object.<String, String>} A key/value object of the attributes for the HtmlTag.
         */
        HtmlTag.prototype.getAttrs = function () {
            return this.attrs || (this.attrs = {});
        };
        /**
         * Sets the provided `cssClass`, overwriting any current CSS classes on the HtmlTag.
         *
         * @param {String} cssClass One or more space-separated CSS classes to set (overwrite).
         * @return {Autolinker.HtmlTag} This HtmlTag instance, so that method calls may be chained.
         */
        HtmlTag.prototype.setClass = function (cssClass) {
            return this.setAttr('class', cssClass);
        };
        /**
         * Convenience method to add one or more CSS classes to the HtmlTag. Will not add duplicate CSS classes.
         *
         * @param {String} cssClass One or more space-separated CSS classes to add.
         * @return {Autolinker.HtmlTag} This HtmlTag instance, so that method calls may be chained.
         */
        HtmlTag.prototype.addClass = function (cssClass) {
            var classAttr = this.getClass(), whitespaceRegex = this.whitespaceRegex, classes = (!classAttr) ? [] : classAttr.split(whitespaceRegex), newClasses = cssClass.split(whitespaceRegex), newClass;
            while (newClass = newClasses.shift()) {
                if (indexOf(classes, newClass) === -1) {
                    classes.push(newClass);
                }
            }
            this.getAttrs()['class'] = classes.join(" ");
            return this;
        };
        /**
         * Convenience method to remove one or more CSS classes from the HtmlTag.
         *
         * @param {String} cssClass One or more space-separated CSS classes to remove.
         * @return {Autolinker.HtmlTag} This HtmlTag instance, so that method calls may be chained.
         */
        HtmlTag.prototype.removeClass = function (cssClass) {
            var classAttr = this.getClass(), whitespaceRegex = this.whitespaceRegex, classes = (!classAttr) ? [] : classAttr.split(whitespaceRegex), removeClasses = cssClass.split(whitespaceRegex), removeClass;
            while (classes.length && (removeClass = removeClasses.shift())) {
                var idx = indexOf(classes, removeClass);
                if (idx !== -1) {
                    classes.splice(idx, 1);
                }
            }
            this.getAttrs()['class'] = classes.join(" ");
            return this;
        };
        /**
         * Convenience method to retrieve the CSS class(es) for the HtmlTag, which will each be separated by spaces when
         * there are multiple.
         *
         * @return {String}
         */
        HtmlTag.prototype.getClass = function () {
            return this.getAttrs()['class'] || "";
        };
        /**
         * Convenience method to check if the tag has a CSS class or not.
         *
         * @param {String} cssClass The CSS class to check for.
         * @return {Boolean} `true` if the HtmlTag has the CSS class, `false` otherwise.
         */
        HtmlTag.prototype.hasClass = function (cssClass) {
            return (' ' + this.getClass() + ' ').indexOf(' ' + cssClass + ' ') !== -1;
        };
        /**
         * Sets the inner HTML for the tag.
         *
         * @param {String} html The inner HTML to set.
         * @return {Autolinker.HtmlTag} This HtmlTag instance, so that method calls may be chained.
         */
        HtmlTag.prototype.setInnerHTML = function (html) {
            this.innerHTML = html;
            return this;
        };
        /**
         * Backwards compatibility method name.
         *
         * @param {String} html The inner HTML to set.
         * @return {Autolinker.HtmlTag} This HtmlTag instance, so that method calls may be chained.
         */
        HtmlTag.prototype.setInnerHtml = function (html) {
            return this.setInnerHTML(html);
        };
        /**
         * Retrieves the inner HTML for the tag.
         *
         * @return {String}
         */
        HtmlTag.prototype.getInnerHTML = function () {
            return this.innerHTML || "";
        };
        /**
         * Backward compatibility method name.
         *
         * @return {String}
         */
        HtmlTag.prototype.getInnerHtml = function () {
            return this.getInnerHTML();
        };
        /**
         * Override of superclass method used to generate the HTML string for the tag.
         *
         * @return {String}
         */
        HtmlTag.prototype.toAnchorString = function () {
            var tagName = this.getTagName(), attrsStr = this.buildAttrsStr();
            attrsStr = (attrsStr) ? ' ' + attrsStr : ''; // prepend a space if there are actually attributes
            return ['<', tagName, attrsStr, '>', this.getInnerHtml(), '</', tagName, '>'].join("");
        };
        /**
         * Support method for {@link #toAnchorString}, returns the string space-separated key="value" pairs, used to populate
         * the stringified HtmlTag.
         *
         * @protected
         * @return {String} Example return: `attr1="value1" attr2="value2"`
         */
        HtmlTag.prototype.buildAttrsStr = function () {
            if (!this.attrs)
                return ""; // no `attrs` Object (map) has been set, return empty string
            var attrs = this.getAttrs(), attrsArr = [];
            for (var prop in attrs) {
                if (attrs.hasOwnProperty(prop)) {
                    attrsArr.push(prop + '="' + attrs[prop] + '"');
                }
            }
            return attrsArr.join(" ");
        };
        return HtmlTag;
    }());

    /**
     * Date: 2015-10-05
     * Author: Kasper Søfren <soefritz@gmail.com> (https://github.com/kafoso)
     *
     * A truncation feature, where the ellipsis will be placed at a section within
     * the URL making it still somewhat human readable.
     *
     * @param {String} url						 A URL.
     * @param {Number} truncateLen		 The maximum length of the truncated output URL string.
     * @param {String} ellipsisChars	 The characters to place within the url, e.g. "...".
     * @return {String} The truncated URL.
     */
    function truncateSmart(url, truncateLen, ellipsisChars) {
        var ellipsisLengthBeforeParsing;
        var ellipsisLength;
        if (ellipsisChars == null) {
            ellipsisChars = '&hellip;';
            ellipsisLength = 3;
            ellipsisLengthBeforeParsing = 8;
        }
        else {
            ellipsisLength = ellipsisChars.length;
            ellipsisLengthBeforeParsing = ellipsisChars.length;
        }
        var parse_url = function (url) {
            var urlObj = {};
            var urlSub = url;
            var match = urlSub.match(/^([a-z]+):\/\//i);
            if (match) {
                urlObj.scheme = match[1];
                urlSub = urlSub.substr(match[0].length);
            }
            match = urlSub.match(/^(.*?)(?=(\?|#|\/|$))/i);
            if (match) {
                urlObj.host = match[1];
                urlSub = urlSub.substr(match[0].length);
            }
            match = urlSub.match(/^\/(.*?)(?=(\?|#|$))/i);
            if (match) {
                urlObj.path = match[1];
                urlSub = urlSub.substr(match[0].length);
            }
            match = urlSub.match(/^\?(.*?)(?=(#|$))/i);
            if (match) {
                urlObj.query = match[1];
                urlSub = urlSub.substr(match[0].length);
            }
            match = urlSub.match(/^#(.*?)$/i);
            if (match) {
                urlObj.fragment = match[1];
                //urlSub = urlSub.substr(match[0].length);  -- not used. Uncomment if adding another block.
            }
            return urlObj;
        };
        var buildUrl = function (urlObj) {
            var url = "";
            if (urlObj.scheme && urlObj.host) {
                url += urlObj.scheme + "://";
            }
            if (urlObj.host) {
                url += urlObj.host;
            }
            if (urlObj.path) {
                url += "/" + urlObj.path;
            }
            if (urlObj.query) {
                url += "?" + urlObj.query;
            }
            if (urlObj.fragment) {
                url += "#" + urlObj.fragment;
            }
            return url;
        };
        var buildSegment = function (segment, remainingAvailableLength) {
            var remainingAvailableLengthHalf = remainingAvailableLength / 2, startOffset = Math.ceil(remainingAvailableLengthHalf), endOffset = (-1) * Math.floor(remainingAvailableLengthHalf), end = "";
            if (endOffset < 0) {
                end = segment.substr(endOffset);
            }
            return segment.substr(0, startOffset) + ellipsisChars + end;
        };
        if (url.length <= truncateLen) {
            return url;
        }
        var availableLength = truncateLen - ellipsisLength;
        var urlObj = parse_url(url);
        // Clean up the URL
        if (urlObj.query) {
            var matchQuery = urlObj.query.match(/^(.*?)(?=(\?|\#))(.*?)$/i);
            if (matchQuery) {
                // Malformed URL; two or more "?". Removed any content behind the 2nd.
                urlObj.query = urlObj.query.substr(0, matchQuery[1].length);
                url = buildUrl(urlObj);
            }
        }
        if (url.length <= truncateLen) {
            return url;
        }
        if (urlObj.host) {
            urlObj.host = urlObj.host.replace(/^www\./, "");
            url = buildUrl(urlObj);
        }
        if (url.length <= truncateLen) {
            return url;
        }
        // Process and build the URL
        var str = "";
        if (urlObj.host) {
            str += urlObj.host;
        }
        if (str.length >= availableLength) {
            if (urlObj.host.length == truncateLen) {
                return (urlObj.host.substr(0, (truncateLen - ellipsisLength)) + ellipsisChars).substr(0, availableLength + ellipsisLengthBeforeParsing);
            }
            return buildSegment(str, availableLength).substr(0, availableLength + ellipsisLengthBeforeParsing);
        }
        var pathAndQuery = "";
        if (urlObj.path) {
            pathAndQuery += "/" + urlObj.path;
        }
        if (urlObj.query) {
            pathAndQuery += "?" + urlObj.query;
        }
        if (pathAndQuery) {
            if ((str + pathAndQuery).length >= availableLength) {
                if ((str + pathAndQuery).length == truncateLen) {
                    return (str + pathAndQuery).substr(0, truncateLen);
                }
                var remainingAvailableLength = availableLength - str.length;
                return (str + buildSegment(pathAndQuery, remainingAvailableLength)).substr(0, availableLength + ellipsisLengthBeforeParsing);
            }
            else {
                str += pathAndQuery;
            }
        }
        if (urlObj.fragment) {
            var fragment = "#" + urlObj.fragment;
            if ((str + fragment).length >= availableLength) {
                if ((str + fragment).length == truncateLen) {
                    return (str + fragment).substr(0, truncateLen);
                }
                var remainingAvailableLength2 = availableLength - str.length;
                return (str + buildSegment(fragment, remainingAvailableLength2)).substr(0, availableLength + ellipsisLengthBeforeParsing);
            }
            else {
                str += fragment;
            }
        }
        if (urlObj.scheme && urlObj.host) {
            var scheme = urlObj.scheme + "://";
            if ((str + scheme).length < availableLength) {
                return (scheme + str).substr(0, truncateLen);
            }
        }
        if (str.length <= truncateLen) {
            return str;
        }
        var end = "";
        if (availableLength > 0) {
            end = str.substr((-1) * Math.floor(availableLength / 2));
        }
        return (str.substr(0, Math.ceil(availableLength / 2)) + ellipsisChars + end).substr(0, availableLength + ellipsisLengthBeforeParsing);
    }

    /**
     * Date: 2015-10-05
     * Author: Kasper Søfren <soefritz@gmail.com> (https://github.com/kafoso)
     *
     * A truncation feature, where the ellipsis will be placed in the dead-center of the URL.
     *
     * @param {String} url             A URL.
     * @param {Number} truncateLen     The maximum length of the truncated output URL string.
     * @param {String} ellipsisChars   The characters to place within the url, e.g. "..".
     * @return {String} The truncated URL.
     */
    function truncateMiddle(url, truncateLen, ellipsisChars) {
        if (url.length <= truncateLen) {
            return url;
        }
        var ellipsisLengthBeforeParsing;
        var ellipsisLength;
        if (ellipsisChars == null) {
            ellipsisChars = '&hellip;';
            ellipsisLengthBeforeParsing = 8;
            ellipsisLength = 3;
        }
        else {
            ellipsisLengthBeforeParsing = ellipsisChars.length;
            ellipsisLength = ellipsisChars.length;
        }
        var availableLength = truncateLen - ellipsisLength;
        var end = "";
        if (availableLength > 0) {
            end = url.substr((-1) * Math.floor(availableLength / 2));
        }
        return (url.substr(0, Math.ceil(availableLength / 2)) + ellipsisChars + end).substr(0, availableLength + ellipsisLengthBeforeParsing);
    }

    /**
     * A truncation feature where the ellipsis will be placed at the end of the URL.
     *
     * @param {String} anchorText
     * @param {Number} truncateLen The maximum length of the truncated output URL string.
     * @param {String} ellipsisChars The characters to place within the url, e.g. "..".
     * @return {String} The truncated URL.
     */
    function truncateEnd(anchorText, truncateLen, ellipsisChars) {
        return ellipsis(anchorText, truncateLen, ellipsisChars);
    }

    /**
     * @protected
     * @class Autolinker.AnchorTagBuilder
     * @extends Object
     *
     * Builds anchor (&lt;a&gt;) tags for the Autolinker utility when a match is
     * found.
     *
     * Normally this class is instantiated, configured, and used internally by an
     * {@link Autolinker} instance, but may actually be used indirectly in a
     * {@link Autolinker#replaceFn replaceFn} to create {@link Autolinker.HtmlTag HtmlTag}
     * instances which may be modified before returning from the
     * {@link Autolinker#replaceFn replaceFn}. For example:
     *
     *     var html = Autolinker.link( "Test google.com", {
     *         replaceFn : function( match ) {
     *             var tag = match.buildTag();  // returns an {@link Autolinker.HtmlTag} instance
     *             tag.setAttr( 'rel', 'nofollow' );
     *
     *             return tag;
     *         }
     *     } );
     *
     *     // generated html:
     *     //   Test <a href="http://google.com" target="_blank" rel="nofollow">google.com</a>
     */
    var AnchorTagBuilder = /** @class */ (function () {
        /**
         * @method constructor
         * @param {Object} [cfg] The configuration options for the AnchorTagBuilder instance, specified in an Object (map).
         */
        function AnchorTagBuilder(cfg) {
            if (cfg === void 0) { cfg = {}; }
            /**
             * @cfg {Boolean} newWindow
             * @inheritdoc Autolinker#newWindow
             */
            this.newWindow = false; // default value just to get the above doc comment in the ES5 output and documentation generator
            /**
             * @cfg {Object} truncate
             * @inheritdoc Autolinker#truncate
             */
            this.truncate = {}; // default value just to get the above doc comment in the ES5 output and documentation generator
            /**
             * @cfg {String} className
             * @inheritdoc Autolinker#className
             */
            this.className = ''; // default value just to get the above doc comment in the ES5 output and documentation generator
            this.newWindow = cfg.newWindow || false;
            this.truncate = cfg.truncate || {};
            this.className = cfg.className || '';
        }
        /**
         * Generates the actual anchor (&lt;a&gt;) tag to use in place of the
         * matched text, via its `match` object.
         *
         * @param {Autolinker.match.Match} match The Match instance to generate an
         *   anchor tag from.
         * @return {Autolinker.HtmlTag} The HtmlTag instance for the anchor tag.
         */
        AnchorTagBuilder.prototype.build = function (match) {
            return new HtmlTag({
                tagName: 'a',
                attrs: this.createAttrs(match),
                innerHtml: this.processAnchorText(match.getAnchorText())
            });
        };
        /**
         * Creates the Object (map) of the HTML attributes for the anchor (&lt;a&gt;)
         *   tag being generated.
         *
         * @protected
         * @param {Autolinker.match.Match} match The Match instance to generate an
         *   anchor tag from.
         * @return {Object} A key/value Object (map) of the anchor tag's attributes.
         */
        AnchorTagBuilder.prototype.createAttrs = function (match) {
            var attrs = {
                'href': match.getAnchorHref() // we'll always have the `href` attribute
            };
            var cssClass = this.createCssClass(match);
            if (cssClass) {
                attrs['class'] = cssClass;
            }
            if (this.newWindow) {
                attrs['target'] = "_blank";
                attrs['rel'] = "noopener noreferrer"; // Issue #149. See https://mathiasbynens.github.io/rel-noopener/
            }
            if (this.truncate) {
                if (this.truncate.length && this.truncate.length < match.getAnchorText().length) {
                    attrs['title'] = match.getAnchorHref();
                }
            }
            return attrs;
        };
        /**
         * Creates the CSS class that will be used for a given anchor tag, based on
         * the `matchType` and the {@link #className} config.
         *
         * Example returns:
         *
         * - ""                                      // no {@link #className}
         * - "myLink myLink-url"                     // url match
         * - "myLink myLink-email"                   // email match
         * - "myLink myLink-phone"                   // phone match
         * - "myLink myLink-hashtag"                 // hashtag match
         * - "myLink myLink-mention myLink-twitter"  // mention match with Twitter service
         *
         * @protected
         * @param {Autolinker.match.Match} match The Match instance to generate an
         *   anchor tag from.
         * @return {String} The CSS class string for the link. Example return:
         *   "myLink myLink-url". If no {@link #className} was configured, returns
         *   an empty string.
         */
        AnchorTagBuilder.prototype.createCssClass = function (match) {
            var className = this.className;
            if (!className) {
                return "";
            }
            else {
                var returnClasses = [className], cssClassSuffixes = match.getCssClassSuffixes();
                for (var i = 0, len = cssClassSuffixes.length; i < len; i++) {
                    returnClasses.push(className + '-' + cssClassSuffixes[i]);
                }
                return returnClasses.join(' ');
            }
        };
        /**
         * Processes the `anchorText` by truncating the text according to the
         * {@link #truncate} config.
         *
         * @private
         * @param {String} anchorText The anchor tag's text (i.e. what will be
         *   displayed).
         * @return {String} The processed `anchorText`.
         */
        AnchorTagBuilder.prototype.processAnchorText = function (anchorText) {
            anchorText = this.doTruncate(anchorText);
            return anchorText;
        };
        /**
         * Performs the truncation of the `anchorText` based on the {@link #truncate}
         * option. If the `anchorText` is longer than the length specified by the
         * {@link #truncate} option, the truncation is performed based on the
         * `location` property. See {@link #truncate} for details.
         *
         * @private
         * @param {String} anchorText The anchor tag's text (i.e. what will be
         *   displayed).
         * @return {String} The truncated anchor text.
         */
        AnchorTagBuilder.prototype.doTruncate = function (anchorText) {
            var truncate = this.truncate;
            if (!truncate || !truncate.length)
                return anchorText;
            var truncateLength = truncate.length, truncateLocation = truncate.location;
            if (truncateLocation === 'smart') {
                return truncateSmart(anchorText, truncateLength);
            }
            else if (truncateLocation === 'middle') {
                return truncateMiddle(anchorText, truncateLength);
            }
            else {
                return truncateEnd(anchorText, truncateLength);
            }
        };
        return AnchorTagBuilder;
    }());

    /**
     * @abstract
     * @class Autolinker.match.Match
     *
     * Represents a match found in an input string which should be Autolinked. A Match object is what is provided in a
     * {@link Autolinker#replaceFn replaceFn}, and may be used to query for details about the match.
     *
     * For example:
     *
     *     var input = "...";  // string with URLs, Email Addresses, and Mentions (Twitter, Instagram, Soundcloud)
     *
     *     var linkedText = Autolinker.link( input, {
     *         replaceFn : function( match ) {
     *             console.log( "href = ", match.getAnchorHref() );
     *             console.log( "text = ", match.getAnchorText() );
     *
     *             switch( match.getType() ) {
     *                 case 'url' :
     *                     console.log( "url: ", match.getUrl() );
     *
     *                 case 'email' :
     *                     console.log( "email: ", match.getEmail() );
     *
     *                 case 'mention' :
     *                     console.log( "mention: ", match.getMention() );
     *             }
     *         }
     *     } );
     *
     * See the {@link Autolinker} class for more details on using the {@link Autolinker#replaceFn replaceFn}.
     */
    var Match = /** @class */ (function () {
        /**
         * @member Autolinker.match.Match
         * @method constructor
         * @param {Object} cfg The configuration properties for the Match
         *   instance, specified in an Object (map).
         */
        function Match(cfg) {
            /**
             * @cfg {Autolinker.AnchorTagBuilder} tagBuilder (required)
             *
             * Reference to the AnchorTagBuilder instance to use to generate an anchor
             * tag for the Match.
             */
            this.__jsduckDummyDocProp = null; // property used just to get the above doc comment into the ES5 output and documentation generator
            /**
             * @cfg {String} matchedText (required)
             *
             * The original text that was matched by the {@link Autolinker.matcher.Matcher}.
             */
            this.matchedText = ''; // default value just to get the above doc comment in the ES5 output and documentation generator
            /**
             * @cfg {Number} offset (required)
             *
             * The offset of where the match was made in the input string.
             */
            this.offset = 0; // default value just to get the above doc comment in the ES5 output and documentation generator
            this.tagBuilder = cfg.tagBuilder;
            this.matchedText = cfg.matchedText;
            this.offset = cfg.offset;
        }
        /**
         * Returns the original text that was matched.
         *
         * @return {String}
         */
        Match.prototype.getMatchedText = function () {
            return this.matchedText;
        };
        /**
         * Sets the {@link #offset} of where the match was made in the input string.
         *
         * A {@link Autolinker.matcher.Matcher} will be fed only HTML text nodes,
         * and will therefore set an original offset that is relative to the HTML
         * text node itself. However, we want this offset to be relative to the full
         * HTML input string, and thus if using {@link Autolinker#parse} (rather
         * than calling a {@link Autolinker.matcher.Matcher} directly), then this
         * offset is corrected after the Matcher itself has done its job.
         *
         * @param {Number} offset
         */
        Match.prototype.setOffset = function (offset) {
            this.offset = offset;
        };
        /**
         * Returns the offset of where the match was made in the input string. This
         * is the 0-based index of the match.
         *
         * @return {Number}
         */
        Match.prototype.getOffset = function () {
            return this.offset;
        };
        /**
         * Returns the CSS class suffix(es) for this match.
         *
         * A CSS class suffix is appended to the {@link Autolinker#className} in
         * the {@link Autolinker.AnchorTagBuilder} when a match is translated into
         * an anchor tag.
         *
         * For example, if {@link Autolinker#className} was configured as 'myLink',
         * and this method returns `[ 'url' ]`, the final class name of the element
         * will become: 'myLink myLink-url'.
         *
         * The match may provide multiple CSS class suffixes to be appended to the
         * {@link Autolinker#className} in order to facilitate better styling
         * options for different match criteria. See {@link Autolinker.match.Mention}
         * for an example.
         *
         * By default, this method returns a single array with the match's
         * {@link #getType type} name, but may be overridden by subclasses.
         *
         * @return {String[]}
         */
        Match.prototype.getCssClassSuffixes = function () {
            return [this.getType()];
        };
        /**
         * Builds and returns an {@link Autolinker.HtmlTag} instance based on the
         * Match.
         *
         * This can be used to easily generate anchor tags from matches, and either
         * return their HTML string, or modify them before doing so.
         *
         * Example Usage:
         *
         *     var tag = match.buildTag();
         *     tag.addClass( 'cordova-link' );
         *     tag.setAttr( 'target', '_system' );
         *
         *     tag.toAnchorString();  // <a href="http://google.com" class="cordova-link" target="_system">Google</a>
         *
         * Example Usage in {@link Autolinker#replaceFn}:
         *
         *     var html = Autolinker.link( "Test google.com", {
         *         replaceFn : function( match ) {
         *             var tag = match.buildTag();  // returns an {@link Autolinker.HtmlTag} instance
         *             tag.setAttr( 'rel', 'nofollow' );
         *
         *             return tag;
         *         }
         *     } );
         *
         *     // generated html:
         *     //   Test <a href="http://google.com" target="_blank" rel="nofollow">google.com</a>
         */
        Match.prototype.buildTag = function () {
            return this.tagBuilder.build(this);
        };
        return Match;
    }());

    /*! *****************************************************************************
    Copyright (c) Microsoft Corporation. All rights reserved.
    Licensed under the Apache License, Version 2.0 (the "License"); you may not use
    this file except in compliance with the License. You may obtain a copy of the
    License at http://www.apache.org/licenses/LICENSE-2.0

    THIS CODE IS PROVIDED ON AN *AS IS* BASIS, WITHOUT WARRANTIES OR CONDITIONS OF ANY
    KIND, EITHER EXPRESS OR IMPLIED, INCLUDING WITHOUT LIMITATION ANY IMPLIED
    WARRANTIES OR CONDITIONS OF TITLE, FITNESS FOR A PARTICULAR PURPOSE,
    MERCHANTABLITY OR NON-INFRINGEMENT.

    See the Apache Version 2.0 License for specific language governing permissions
    and limitations under the License.
    ***************************************************************************** */
    /* global Reflect, Promise */

    var extendStatics = function(d, b) {
        extendStatics = Object.setPrototypeOf ||
            ({ __proto__: [] } instanceof Array && function (d, b) { d.__proto__ = b; }) ||
            function (d, b) { for (var p in b) if (b.hasOwnProperty(p)) d[p] = b[p]; };
        return extendStatics(d, b);
    };

    function __extends(d, b) {
        extendStatics(d, b);
        function __() { this.constructor = d; }
        d.prototype = b === null ? Object.create(b) : (__.prototype = b.prototype, new __());
    }

    var __assign = function() {
        __assign = Object.assign || function __assign(t) {
            for (var s, i = 1, n = arguments.length; i < n; i++) {
                s = arguments[i];
                for (var p in s) if (Object.prototype.hasOwnProperty.call(s, p)) t[p] = s[p];
            }
            return t;
        };
        return __assign.apply(this, arguments);
    };

    /**
     * @class Autolinker.match.Email
     * @extends Autolinker.match.Match
     *
     * Represents a Email match found in an input string which should be Autolinked.
     *
     * See this class's superclass ({@link Autolinker.match.Match}) for more details.
     */
    var EmailMatch = /** @class */ (function (_super) {
        __extends(EmailMatch, _super);
        /**
         * @method constructor
         * @param {Object} cfg The configuration properties for the Match
         *   instance, specified in an Object (map).
         */
        function EmailMatch(cfg) {
            var _this = _super.call(this, cfg) || this;
            /**
             * @cfg {String} email (required)
             *
             * The email address that was matched.
             */
            _this.email = ''; // default value just to get the above doc comment in the ES5 output and documentation generator
            _this.email = cfg.email;
            return _this;
        }
        /**
         * Returns a string name for the type of match that this class represents.
         * For the case of EmailMatch, returns 'email'.
         *
         * @return {String}
         */
        EmailMatch.prototype.getType = function () {
            return 'email';
        };
        /**
         * Returns the email address that was matched.
         *
         * @return {String}
         */
        EmailMatch.prototype.getEmail = function () {
            return this.email;
        };
        /**
         * Returns the anchor href that should be generated for the match.
         *
         * @return {String}
         */
        EmailMatch.prototype.getAnchorHref = function () {
            return 'mailto:' + this.email;
        };
        /**
         * Returns the anchor text that should be generated for the match.
         *
         * @return {String}
         */
        EmailMatch.prototype.getAnchorText = function () {
            return this.email;
        };
        return EmailMatch;
    }(Match));

    /**
     * @class Autolinker.match.Hashtag
     * @extends Autolinker.match.Match
     *
     * Represents a Hashtag match found in an input string which should be
     * Autolinked.
     *
     * See this class's superclass ({@link Autolinker.match.Match}) for more
     * details.
     */
    var HashtagMatch = /** @class */ (function (_super) {
        __extends(HashtagMatch, _super);
        /**
         * @method constructor
         * @param {Object} cfg The configuration properties for the Match
         *   instance, specified in an Object (map).
         */
        function HashtagMatch(cfg) {
            var _this = _super.call(this, cfg) || this;
            /**
             * @cfg {String} serviceName
             *
             * The service to point hashtag matches to. See {@link Autolinker#hashtag}
             * for available values.
             */
            _this.serviceName = ''; // default value just to get the above doc comment in the ES5 output and documentation generator
            /**
             * @cfg {String} hashtag (required)
             *
             * The HashtagMatch that was matched, without the '#'.
             */
            _this.hashtag = ''; // default value just to get the above doc comment in the ES5 output and documentation generator
            _this.serviceName = cfg.serviceName;
            _this.hashtag = cfg.hashtag;
            return _this;
        }
        /**
         * Returns a string name for the type of match that this class represents.
         * For the case of HashtagMatch, returns 'hashtag'.
         *
         * @return {String}
         */
        HashtagMatch.prototype.getType = function () {
            return 'hashtag';
        };
        /**
         * Returns the configured {@link #serviceName} to point the HashtagMatch to.
         * Ex: 'facebook', 'twitter'.
         *
         * @return {String}
         */
        HashtagMatch.prototype.getServiceName = function () {
            return this.serviceName;
        };
        /**
         * Returns the matched hashtag, without the '#' character.
         *
         * @return {String}
         */
        HashtagMatch.prototype.getHashtag = function () {
            return this.hashtag;
        };
        /**
         * Returns the anchor href that should be generated for the match.
         *
         * @return {String}
         */
        HashtagMatch.prototype.getAnchorHref = function () {
            var serviceName = this.serviceName, hashtag = this.hashtag;
            switch (serviceName) {
                case 'twitter':
                    return 'https://twitter.com/hashtag/' + hashtag;
                case 'facebook':
                    return 'https://www.facebook.com/hashtag/' + hashtag;
                case 'instagram':
                    return 'https://instagram.com/explore/tags/' + hashtag;
                default: // Shouldn't happen because Autolinker's constructor should block any invalid values, but just in case.
                    throw new Error('Unknown service name to point hashtag to: ' + serviceName);
            }
        };
        /**
         * Returns the anchor text that should be generated for the match.
         *
         * @return {String}
         */
        HashtagMatch.prototype.getAnchorText = function () {
            return '#' + this.hashtag;
        };
        return HashtagMatch;
    }(Match));

    /**
     * @class Autolinker.match.Mention
     * @extends Autolinker.match.Match
     *
     * Represents a Mention match found in an input string which should be Autolinked.
     *
     * See this class's superclass ({@link Autolinker.match.Match}) for more details.
     */
    var MentionMatch = /** @class */ (function (_super) {
        __extends(MentionMatch, _super);
        /**
         * @method constructor
         * @param {Object} cfg The configuration properties for the Match
         *   instance, specified in an Object (map).
         */
        function MentionMatch(cfg) {
            var _this = _super.call(this, cfg) || this;
            /**
             * @cfg {String} serviceName
             *
             * The service to point mention matches to. See {@link Autolinker#mention}
             * for available values.
             */
            _this.serviceName = 'twitter'; // default value just to get the above doc comment in the ES5 output and documentation generator
            /**
             * @cfg {String} mention (required)
             *
             * The Mention that was matched, without the '@' character.
             */
            _this.mention = ''; // default value just to get the above doc comment in the ES5 output and documentation generator
            _this.mention = cfg.mention;
            _this.serviceName = cfg.serviceName;
            return _this;
        }
        /**
         * Returns a string name for the type of match that this class represents.
         * For the case of MentionMatch, returns 'mention'.
         *
         * @return {String}
         */
        MentionMatch.prototype.getType = function () {
            return 'mention';
        };
        /**
         * Returns the mention, without the '@' character.
         *
         * @return {String}
         */
        MentionMatch.prototype.getMention = function () {
            return this.mention;
        };
        /**
         * Returns the configured {@link #serviceName} to point the mention to.
         * Ex: 'instagram', 'twitter', 'soundcloud'.
         *
         * @return {String}
         */
        MentionMatch.prototype.getServiceName = function () {
            return this.serviceName;
        };
        /**
         * Returns the anchor href that should be generated for the match.
         *
         * @return {String}
         */
        MentionMatch.prototype.getAnchorHref = function () {
            switch (this.serviceName) {
                case 'twitter':
                    return 'https://twitter.com/' + this.mention;
                case 'instagram':
                    return 'https://instagram.com/' + this.mention;
                case 'soundcloud':
                    return 'https://soundcloud.com/' + this.mention;
                default: // Shouldn't happen because Autolinker's constructor should block any invalid values, but just in case.
                    throw new Error('Unknown service name to point mention to: ' + this.serviceName);
            }
        };
        /**
         * Returns the anchor text that should be generated for the match.
         *
         * @return {String}
         */
        MentionMatch.prototype.getAnchorText = function () {
            return '@' + this.mention;
        };
        /**
         * Returns the CSS class suffixes that should be used on a tag built with
         * the match. See {@link Autolinker.match.Match#getCssClassSuffixes} for
         * details.
         *
         * @return {String[]}
         */
        MentionMatch.prototype.getCssClassSuffixes = function () {
            var cssClassSuffixes = _super.prototype.getCssClassSuffixes.call(this), serviceName = this.getServiceName();
            if (serviceName) {
                cssClassSuffixes.push(serviceName);
            }
            return cssClassSuffixes;
        };
        return MentionMatch;
    }(Match));

    /**
     * @class Autolinker.match.Phone
     * @extends Autolinker.match.Match
     *
     * Represents a Phone number match found in an input string which should be
     * Autolinked.
     *
     * See this class's superclass ({@link Autolinker.match.Match}) for more
     * details.
     */
    var PhoneMatch = /** @class */ (function (_super) {
        __extends(PhoneMatch, _super);
        /**
         * @method constructor
         * @param {Object} cfg The configuration properties for the Match
         *   instance, specified in an Object (map).
         */
        function PhoneMatch(cfg) {
            var _this = _super.call(this, cfg) || this;
            /**
             * @protected
             * @property {String} number (required)
             *
             * The phone number that was matched, without any delimiter characters.
             *
             * Note: This is a string to allow for prefixed 0's.
             */
            _this.number = ''; // default value just to get the above doc comment in the ES5 output and documentation generator
            /**
             * @protected
             * @property  {Boolean} plusSign (required)
             *
             * `true` if the matched phone number started with a '+' sign. We'll include
             * it in the `tel:` URL if so, as this is needed for international numbers.
             *
             * Ex: '+1 (123) 456 7879'
             */
            _this.plusSign = false; // default value just to get the above doc comment in the ES5 output and documentation generator
            _this.number = cfg.number;
            _this.plusSign = cfg.plusSign;
            return _this;
        }
        /**
         * Returns a string name for the type of match that this class represents.
         * For the case of PhoneMatch, returns 'phone'.
         *
         * @return {String}
         */
        PhoneMatch.prototype.getType = function () {
            return 'phone';
        };
        /**
         * Returns the phone number that was matched as a string, without any
         * delimiter characters.
         *
         * Note: This is a string to allow for prefixed 0's.
         *
         * @return {String}
         */
        PhoneMatch.prototype.getPhoneNumber = function () {
            return this.number;
        };
        /**
         * Alias of {@link #getPhoneNumber}, returns the phone number that was
         * matched as a string, without any delimiter characters.
         *
         * Note: This is a string to allow for prefixed 0's.
         *
         * @return {String}
         */
        PhoneMatch.prototype.getNumber = function () {
            return this.getPhoneNumber();
        };
        /**
         * Returns the anchor href that should be generated for the match.
         *
         * @return {String}
         */
        PhoneMatch.prototype.getAnchorHref = function () {
            return 'tel:' + (this.plusSign ? '+' : '') + this.number;
        };
        /**
         * Returns the anchor text that should be generated for the match.
         *
         * @return {String}
         */
        PhoneMatch.prototype.getAnchorText = function () {
            return this.matchedText;
        };
        return PhoneMatch;
    }(Match));

    /**
     * @class Autolinker.match.Url
     * @extends Autolinker.match.Match
     *
     * Represents a Url match found in an input string which should be Autolinked.
     *
     * See this class's superclass ({@link Autolinker.match.Match}) for more details.
     */
    var UrlMatch = /** @class */ (function (_super) {
        __extends(UrlMatch, _super);
        /**
         * @method constructor
         * @param {Object} cfg The configuration properties for the Match
         *   instance, specified in an Object (map).
         */
        function UrlMatch(cfg) {
            var _this = _super.call(this, cfg) || this;
            /**
             * @cfg {String} url (required)
             *
             * The url that was matched.
             */
            _this.url = ''; // default value just to get the above doc comment in the ES5 output and documentation generator
            /**
             * @cfg {"scheme"/"www"/"tld"} urlMatchType (required)
             *
             * The type of URL match that this class represents. This helps to determine
             * if the match was made in the original text with a prefixed scheme (ex:
             * 'http://www.google.com'), a prefixed 'www' (ex: 'www.google.com'), or
             * was matched by a known top-level domain (ex: 'google.com').
             */
            _this.urlMatchType = 'scheme'; // default value just to get the above doc comment in the ES5 output and documentation generator
            /**
             * @cfg {Boolean} protocolUrlMatch (required)
             *
             * `true` if the URL is a match which already has a protocol (i.e.
             * 'http://'), `false` if the match was from a 'www' or known TLD match.
             */
            _this.protocolUrlMatch = false; // default value just to get the above doc comment in the ES5 output and documentation generator
            /**
             * @cfg {Boolean} protocolRelativeMatch (required)
             *
             * `true` if the URL is a protocol-relative match. A protocol-relative match
             * is a URL that starts with '//', and will be either http:// or https://
             * based on the protocol that the site is loaded under.
             */
            _this.protocolRelativeMatch = false; // default value just to get the above doc comment in the ES5 output and documentation generator
            /**
             * @cfg {Object} stripPrefix (required)
             *
             * The Object form of {@link Autolinker#cfg-stripPrefix}.
             */
            _this.stripPrefix = { scheme: true, www: true }; // default value just to get the above doc comment in the ES5 output and documentation generator
            /**
             * @cfg {Boolean} stripTrailingSlash (required)
             * @inheritdoc Autolinker#cfg-stripTrailingSlash
             */
            _this.stripTrailingSlash = true; // default value just to get the above doc comment in the ES5 output and documentation generator
            /**
             * @cfg {Boolean} decodePercentEncoding (required)
             * @inheritdoc Autolinker#cfg-decodePercentEncoding
             */
            _this.decodePercentEncoding = true; // default value just to get the above doc comment in the ES5 output and documentation generator
            /**
             * @private
             * @property {RegExp} schemePrefixRegex
             *
             * A regular expression used to remove the 'http://' or 'https://' from
             * URLs.
             */
            _this.schemePrefixRegex = /^(https?:\/\/)?/i;
            /**
             * @private
             * @property {RegExp} wwwPrefixRegex
             *
             * A regular expression used to remove the 'www.' from URLs.
             */
            _this.wwwPrefixRegex = /^(https?:\/\/)?(www\.)?/i;
            /**
             * @private
             * @property {RegExp} protocolRelativeRegex
             *
             * The regular expression used to remove the protocol-relative '//' from the {@link #url} string, for purposes
             * of {@link #getAnchorText}. A protocol-relative URL is, for example, "//yahoo.com"
             */
            _this.protocolRelativeRegex = /^\/\//;
            /**
             * @private
             * @property {Boolean} protocolPrepended
             *
             * Will be set to `true` if the 'http://' protocol has been prepended to the {@link #url} (because the
             * {@link #url} did not have a protocol)
             */
            _this.protocolPrepended = false;
            _this.urlMatchType = cfg.urlMatchType;
            _this.url = cfg.url;
            _this.protocolUrlMatch = cfg.protocolUrlMatch;
            _this.protocolRelativeMatch = cfg.protocolRelativeMatch;
            _this.stripPrefix = cfg.stripPrefix;
            _this.stripTrailingSlash = cfg.stripTrailingSlash;
            _this.decodePercentEncoding = cfg.decodePercentEncoding;
            return _this;
        }
        /**
         * Returns a string name for the type of match that this class represents.
         * For the case of UrlMatch, returns 'url'.
         *
         * @return {String}
         */
        UrlMatch.prototype.getType = function () {
            return 'url';
        };
        /**
         * Returns a string name for the type of URL match that this class
         * represents.
         *
         * This helps to determine if the match was made in the original text with a
         * prefixed scheme (ex: 'http://www.google.com'), a prefixed 'www' (ex:
         * 'www.google.com'), or was matched by a known top-level domain (ex:
         * 'google.com').
         *
         * @return {"scheme"/"www"/"tld"}
         */
        UrlMatch.prototype.getUrlMatchType = function () {
            return this.urlMatchType;
        };
        /**
         * Returns the url that was matched, assuming the protocol to be 'http://' if the original
         * match was missing a protocol.
         *
         * @return {String}
         */
        UrlMatch.prototype.getUrl = function () {
            var url = this.url;
            // if the url string doesn't begin with a protocol, assume 'http://'
            if (!this.protocolRelativeMatch && !this.protocolUrlMatch && !this.protocolPrepended) {
                url = this.url = 'http://' + url;
                this.protocolPrepended = true;
            }
            return url;
        };
        /**
         * Returns the anchor href that should be generated for the match.
         *
         * @return {String}
         */
        UrlMatch.prototype.getAnchorHref = function () {
            var url = this.getUrl();
            return url.replace(/&amp;/g, '&'); // any &amp;'s in the URL should be converted back to '&' if they were displayed as &amp; in the source html
        };
        /**
         * Returns the anchor text that should be generated for the match.
         *
         * @return {String}
         */
        UrlMatch.prototype.getAnchorText = function () {
            var anchorText = this.getMatchedText();
            if (this.protocolRelativeMatch) {
                // Strip off any protocol-relative '//' from the anchor text
                anchorText = this.stripProtocolRelativePrefix(anchorText);
            }
            if (this.stripPrefix.scheme) {
                anchorText = this.stripSchemePrefix(anchorText);
            }
            if (this.stripPrefix.www) {
                anchorText = this.stripWwwPrefix(anchorText);
            }
            if (this.stripTrailingSlash) {
                anchorText = this.removeTrailingSlash(anchorText); // remove trailing slash, if there is one
            }
            if (this.decodePercentEncoding) {
                anchorText = this.removePercentEncoding(anchorText);
            }
            return anchorText;
        };
        // ---------------------------------------
        // Utility Functionality
        /**
         * Strips the scheme prefix (such as "http://" or "https://") from the given
         * `url`.
         *
         * @private
         * @param {String} url The text of the anchor that is being generated, for
         *   which to strip off the url scheme.
         * @return {String} The `url`, with the scheme stripped.
         */
        UrlMatch.prototype.stripSchemePrefix = function (url) {
            return url.replace(this.schemePrefixRegex, '');
        };
        /**
         * Strips the 'www' prefix from the given `url`.
         *
         * @private
         * @param {String} url The text of the anchor that is being generated, for
         *   which to strip off the 'www' if it exists.
         * @return {String} The `url`, with the 'www' stripped.
         */
        UrlMatch.prototype.stripWwwPrefix = function (url) {
            return url.replace(this.wwwPrefixRegex, '$1'); // leave any scheme ($1), it one exists
        };
        /**
         * Strips any protocol-relative '//' from the anchor text.
         *
         * @private
         * @param {String} text The text of the anchor that is being generated, for which to strip off the
         *   protocol-relative prefix (such as stripping off "//")
         * @return {String} The `anchorText`, with the protocol-relative prefix stripped.
         */
        UrlMatch.prototype.stripProtocolRelativePrefix = function (text) {
            return text.replace(this.protocolRelativeRegex, '');
        };
        /**
         * Removes any trailing slash from the given `anchorText`, in preparation for the text to be displayed.
         *
         * @private
         * @param {String} anchorText The text of the anchor that is being generated, for which to remove any trailing
         *   slash ('/') that may exist.
         * @return {String} The `anchorText`, with the trailing slash removed.
         */
        UrlMatch.prototype.removeTrailingSlash = function (anchorText) {
            if (anchorText.charAt(anchorText.length - 1) === '/') {
                anchorText = anchorText.slice(0, -1);
            }
            return anchorText;
        };
        /**
         * Decodes percent-encoded characters from the given `anchorText`, in
         * preparation for the text to be displayed.
         *
         * @private
         * @param {String} anchorText The text of the anchor that is being
         *   generated, for which to decode any percent-encoded characters.
         * @return {String} The `anchorText`, with the percent-encoded characters
         *   decoded.
         */
        UrlMatch.prototype.removePercentEncoding = function (anchorText) {
            // First, convert a few of the known % encodings to the corresponding
            // HTML entities that could accidentally be interpretted as special
            // HTML characters
            var preProcessedEntityAnchorText = anchorText
                .replace(/%22/gi, '&quot;') // " char
                .replace(/%26/gi, '&amp;') // & char
                .replace(/%27/gi, '&#39;') // ' char
                .replace(/%3C/gi, '&lt;') // < char
                .replace(/%3E/gi, '&gt;'); // > char
            try {
                // Now attempt to decode the rest of the anchor text
                return decodeURIComponent(preProcessedEntityAnchorText);
            }
            catch (e) { // Invalid % escape sequence in the anchor text
                return preProcessedEntityAnchorText;
            }
        };
        return UrlMatch;
    }(Match));

    /**
     * @abstract
     * @class Autolinker.matcher.Matcher
     *
     * An abstract class and interface for individual matchers to find matches in
     * an input string with linkified versions of them.
     *
     * Note that Matchers do not take HTML into account - they must be fed the text
     * nodes of any HTML string, which is handled by {@link Autolinker#parse}.
     */
    var Matcher = /** @class */ (function () {
        /**
         * @method constructor
         * @param {Object} cfg The configuration properties for the Matcher
         *   instance, specified in an Object (map).
         */
        function Matcher(cfg) {
            /**
             * @cfg {Autolinker.AnchorTagBuilder} tagBuilder (required)
             *
             * Reference to the AnchorTagBuilder instance to use to generate HTML tags
             * for {@link Autolinker.match.Match Matches}.
             */
            this.__jsduckDummyDocProp = null; // property used just to get the above doc comment into the ES5 output and documentation generator
            this.tagBuilder = cfg.tagBuilder;
        }
        return Matcher;
    }());

    /*
     * This file builds and stores a library of the common regular expressions used
     * by the Autolinker utility.
     *
     * Other regular expressions may exist ad-hoc, but these are generally the
     * regular expressions that are shared between source files.
     */
    /**
     * Regular expression to match upper and lowercase ASCII letters
     */
    var letterRe = /[A-Za-z]/;
    /**
     * Regular expression to match ASCII digits
     */
    var digitRe = /[\d]/;
    /**
     * Regular expression to match everything *except* ASCII digits
     */
    var nonDigitRe = /[\D]/;
    /**
     * Regular expression to match whitespace
     */
    var whitespaceRe = /\s/;
    /**
     * Regular expression to match quote characters
     */
    var quoteRe = /['"]/;
    /**
     * Regular expression to match the range of ASCII control characters (0-31), and
     * the backspace char (127)
     */
    var controlCharsRe = /[\x00-\x1F\x7F]/;
    /**
     * The string form of a regular expression that would match all of the
     * alphabetic ("letter") chars in the unicode character set when placed in a
     * RegExp character class (`[]`). This includes all international alphabetic
     * characters.
     *
     * These would be the characters matched by unicode regex engines `\p{L}`
     * escape ("all letters").
     *
     * Taken from the XRegExp library: http://xregexp.com/ (thanks @https://github.com/slevithan)
     * Specifically: http://xregexp.com/v/3.2.0/xregexp-all.js, the 'Letter'
     *   regex's bmp
     *
     * VERY IMPORTANT: This set of characters is defined inside of a Regular
     *   Expression literal rather than a string literal to prevent UglifyJS from
     *   compressing the unicode escape sequences into their actual unicode
     *   characters. If Uglify compresses these into the unicode characters
     *   themselves, this results in the error "Range out of order in character
     *   class" when these characters are used inside of a Regular Expression
     *   character class (`[]`). See usages of this const. Alternatively, we can set
     *   the UglifyJS option `ascii_only` to true for the build, but that doesn't
     *   help others who are pulling in Autolinker into their own build and running
     *   UglifyJS themselves.
     */
    var alphaCharsStr = /A-Za-z\xAA\xB5\xBA\xC0-\xD6\xD8-\xF6\xF8-\u02C1\u02C6-\u02D1\u02E0-\u02E4\u02EC\u02EE\u0370-\u0374\u0376\u0377\u037A-\u037D\u037F\u0386\u0388-\u038A\u038C\u038E-\u03A1\u03A3-\u03F5\u03F7-\u0481\u048A-\u052F\u0531-\u0556\u0559\u0561-\u0587\u05D0-\u05EA\u05F0-\u05F2\u0620-\u064A\u066E\u066F\u0671-\u06D3\u06D5\u06E5\u06E6\u06EE\u06EF\u06FA-\u06FC\u06FF\u0710\u0712-\u072F\u074D-\u07A5\u07B1\u07CA-\u07EA\u07F4\u07F5\u07FA\u0800-\u0815\u081A\u0824\u0828\u0840-\u0858\u08A0-\u08B4\u08B6-\u08BD\u0904-\u0939\u093D\u0950\u0958-\u0961\u0971-\u0980\u0985-\u098C\u098F\u0990\u0993-\u09A8\u09AA-\u09B0\u09B2\u09B6-\u09B9\u09BD\u09CE\u09DC\u09DD\u09DF-\u09E1\u09F0\u09F1\u0A05-\u0A0A\u0A0F\u0A10\u0A13-\u0A28\u0A2A-\u0A30\u0A32\u0A33\u0A35\u0A36\u0A38\u0A39\u0A59-\u0A5C\u0A5E\u0A72-\u0A74\u0A85-\u0A8D\u0A8F-\u0A91\u0A93-\u0AA8\u0AAA-\u0AB0\u0AB2\u0AB3\u0AB5-\u0AB9\u0ABD\u0AD0\u0AE0\u0AE1\u0AF9\u0B05-\u0B0C\u0B0F\u0B10\u0B13-\u0B28\u0B2A-\u0B30\u0B32\u0B33\u0B35-\u0B39\u0B3D\u0B5C\u0B5D\u0B5F-\u0B61\u0B71\u0B83\u0B85-\u0B8A\u0B8E-\u0B90\u0B92-\u0B95\u0B99\u0B9A\u0B9C\u0B9E\u0B9F\u0BA3\u0BA4\u0BA8-\u0BAA\u0BAE-\u0BB9\u0BD0\u0C05-\u0C0C\u0C0E-\u0C10\u0C12-\u0C28\u0C2A-\u0C39\u0C3D\u0C58-\u0C5A\u0C60\u0C61\u0C80\u0C85-\u0C8C\u0C8E-\u0C90\u0C92-\u0CA8\u0CAA-\u0CB3\u0CB5-\u0CB9\u0CBD\u0CDE\u0CE0\u0CE1\u0CF1\u0CF2\u0D05-\u0D0C\u0D0E-\u0D10\u0D12-\u0D3A\u0D3D\u0D4E\u0D54-\u0D56\u0D5F-\u0D61\u0D7A-\u0D7F\u0D85-\u0D96\u0D9A-\u0DB1\u0DB3-\u0DBB\u0DBD\u0DC0-\u0DC6\u0E01-\u0E30\u0E32\u0E33\u0E40-\u0E46\u0E81\u0E82\u0E84\u0E87\u0E88\u0E8A\u0E8D\u0E94-\u0E97\u0E99-\u0E9F\u0EA1-\u0EA3\u0EA5\u0EA7\u0EAA\u0EAB\u0EAD-\u0EB0\u0EB2\u0EB3\u0EBD\u0EC0-\u0EC4\u0EC6\u0EDC-\u0EDF\u0F00\u0F40-\u0F47\u0F49-\u0F6C\u0F88-\u0F8C\u1000-\u102A\u103F\u1050-\u1055\u105A-\u105D\u1061\u1065\u1066\u106E-\u1070\u1075-\u1081\u108E\u10A0-\u10C5\u10C7\u10CD\u10D0-\u10FA\u10FC-\u1248\u124A-\u124D\u1250-\u1256\u1258\u125A-\u125D\u1260-\u1288\u128A-\u128D\u1290-\u12B0\u12B2-\u12B5\u12B8-\u12BE\u12C0\u12C2-\u12C5\u12C8-\u12D6\u12D8-\u1310\u1312-\u1315\u1318-\u135A\u1380-\u138F\u13A0-\u13F5\u13F8-\u13FD\u1401-\u166C\u166F-\u167F\u1681-\u169A\u16A0-\u16EA\u16F1-\u16F8\u1700-\u170C\u170E-\u1711\u1720-\u1731\u1740-\u1751\u1760-\u176C\u176E-\u1770\u1780-\u17B3\u17D7\u17DC\u1820-\u1877\u1880-\u1884\u1887-\u18A8\u18AA\u18B0-\u18F5\u1900-\u191E\u1950-\u196D\u1970-\u1974\u1980-\u19AB\u19B0-\u19C9\u1A00-\u1A16\u1A20-\u1A54\u1AA7\u1B05-\u1B33\u1B45-\u1B4B\u1B83-\u1BA0\u1BAE\u1BAF\u1BBA-\u1BE5\u1C00-\u1C23\u1C4D-\u1C4F\u1C5A-\u1C7D\u1C80-\u1C88\u1CE9-\u1CEC\u1CEE-\u1CF1\u1CF5\u1CF6\u1D00-\u1DBF\u1E00-\u1F15\u1F18-\u1F1D\u1F20-\u1F45\u1F48-\u1F4D\u1F50-\u1F57\u1F59\u1F5B\u1F5D\u1F5F-\u1F7D\u1F80-\u1FB4\u1FB6-\u1FBC\u1FBE\u1FC2-\u1FC4\u1FC6-\u1FCC\u1FD0-\u1FD3\u1FD6-\u1FDB\u1FE0-\u1FEC\u1FF2-\u1FF4\u1FF6-\u1FFC\u2071\u207F\u2090-\u209C\u2102\u2107\u210A-\u2113\u2115\u2119-\u211D\u2124\u2126\u2128\u212A-\u212D\u212F-\u2139\u213C-\u213F\u2145-\u2149\u214E\u2183\u2184\u2C00-\u2C2E\u2C30-\u2C5E\u2C60-\u2CE4\u2CEB-\u2CEE\u2CF2\u2CF3\u2D00-\u2D25\u2D27\u2D2D\u2D30-\u2D67\u2D6F\u2D80-\u2D96\u2DA0-\u2DA6\u2DA8-\u2DAE\u2DB0-\u2DB6\u2DB8-\u2DBE\u2DC0-\u2DC6\u2DC8-\u2DCE\u2DD0-\u2DD6\u2DD8-\u2DDE\u2E2F\u3005\u3006\u3031-\u3035\u303B\u303C\u3041-\u3096\u309D-\u309F\u30A1-\u30FA\u30FC-\u30FF\u3105-\u312D\u3131-\u318E\u31A0-\u31BA\u31F0-\u31FF\u3400-\u4DB5\u4E00-\u9FD5\uA000-\uA48C\uA4D0-\uA4FD\uA500-\uA60C\uA610-\uA61F\uA62A\uA62B\uA640-\uA66E\uA67F-\uA69D\uA6A0-\uA6E5\uA717-\uA71F\uA722-\uA788\uA78B-\uA7AE\uA7B0-\uA7B7\uA7F7-\uA801\uA803-\uA805\uA807-\uA80A\uA80C-\uA822\uA840-\uA873\uA882-\uA8B3\uA8F2-\uA8F7\uA8FB\uA8FD\uA90A-\uA925\uA930-\uA946\uA960-\uA97C\uA984-\uA9B2\uA9CF\uA9E0-\uA9E4\uA9E6-\uA9EF\uA9FA-\uA9FE\uAA00-\uAA28\uAA40-\uAA42\uAA44-\uAA4B\uAA60-\uAA76\uAA7A\uAA7E-\uAAAF\uAAB1\uAAB5\uAAB6\uAAB9-\uAABD\uAAC0\uAAC2\uAADB-\uAADD\uAAE0-\uAAEA\uAAF2-\uAAF4\uAB01-\uAB06\uAB09-\uAB0E\uAB11-\uAB16\uAB20-\uAB26\uAB28-\uAB2E\uAB30-\uAB5A\uAB5C-\uAB65\uAB70-\uABE2\uAC00-\uD7A3\uD7B0-\uD7C6\uD7CB-\uD7FB\uF900-\uFA6D\uFA70-\uFAD9\uFB00-\uFB06\uFB13-\uFB17\uFB1D\uFB1F-\uFB28\uFB2A-\uFB36\uFB38-\uFB3C\uFB3E\uFB40\uFB41\uFB43\uFB44\uFB46-\uFBB1\uFBD3-\uFD3D\uFD50-\uFD8F\uFD92-\uFDC7\uFDF0-\uFDFB\uFE70-\uFE74\uFE76-\uFEFC\uFF21-\uFF3A\uFF41-\uFF5A\uFF66-\uFFBE\uFFC2-\uFFC7\uFFCA-\uFFCF\uFFD2-\uFFD7\uFFDA-\uFFDC/
        .source; // see note in above variable description
    /**
     * The string form of a regular expression that would match all emoji characters
     * Based on the emoji regex defined in this article: https://thekevinscott.com/emojis-in-javascript/
     */
    var emojiStr = /\u2700-\u27bf\udde6-\uddff\ud800-\udbff\udc00-\udfff\ufe0e\ufe0f\u0300-\u036f\ufe20-\ufe23\u20d0-\u20f0\ud83c\udffb-\udfff\u200d\u3299\u3297\u303d\u3030\u24c2\ud83c\udd70-\udd71\udd7e-\udd7f\udd8e\udd91-\udd9a\udde6-\uddff\ude01-\ude02\ude1a\ude2f\ude32-\ude3a\ude50-\ude51\u203c\u2049\u25aa-\u25ab\u25b6\u25c0\u25fb-\u25fe\u00a9\u00ae\u2122\u2139\udc04\u2600-\u26FF\u2b05\u2b06\u2b07\u2b1b\u2b1c\u2b50\u2b55\u231a\u231b\u2328\u23cf\u23e9-\u23f3\u23f8-\u23fa\udccf\u2935\u2934\u2190-\u21ff/
        .source;
    /**
     * The string form of a regular expression that would match all of the
     * combining mark characters in the unicode character set when placed in a
     * RegExp character class (`[]`).
     *
     * These would be the characters matched by unicode regex engines `\p{M}`
     * escape ("all marks").
     *
     * Taken from the XRegExp library: http://xregexp.com/ (thanks @https://github.com/slevithan)
     * Specifically: http://xregexp.com/v/3.2.0/xregexp-all.js, the 'Mark'
     *   regex's bmp
     *
     * VERY IMPORTANT: This set of characters is defined inside of a Regular
     *   Expression literal rather than a string literal to prevent UglifyJS from
     *   compressing the unicode escape sequences into their actual unicode
     *   characters. If Uglify compresses these into the unicode characters
     *   themselves, this results in the error "Range out of order in character
     *   class" when these characters are used inside of a Regular Expression
     *   character class (`[]`). See usages of this const. Alternatively, we can set
     *   the UglifyJS option `ascii_only` to true for the build, but that doesn't
     *   help others who are pulling in Autolinker into their own build and running
     *   UglifyJS themselves.
     */
    var marksStr = /\u0300-\u036F\u0483-\u0489\u0591-\u05BD\u05BF\u05C1\u05C2\u05C4\u05C5\u05C7\u0610-\u061A\u064B-\u065F\u0670\u06D6-\u06DC\u06DF-\u06E4\u06E7\u06E8\u06EA-\u06ED\u0711\u0730-\u074A\u07A6-\u07B0\u07EB-\u07F3\u0816-\u0819\u081B-\u0823\u0825-\u0827\u0829-\u082D\u0859-\u085B\u08D4-\u08E1\u08E3-\u0903\u093A-\u093C\u093E-\u094F\u0951-\u0957\u0962\u0963\u0981-\u0983\u09BC\u09BE-\u09C4\u09C7\u09C8\u09CB-\u09CD\u09D7\u09E2\u09E3\u0A01-\u0A03\u0A3C\u0A3E-\u0A42\u0A47\u0A48\u0A4B-\u0A4D\u0A51\u0A70\u0A71\u0A75\u0A81-\u0A83\u0ABC\u0ABE-\u0AC5\u0AC7-\u0AC9\u0ACB-\u0ACD\u0AE2\u0AE3\u0B01-\u0B03\u0B3C\u0B3E-\u0B44\u0B47\u0B48\u0B4B-\u0B4D\u0B56\u0B57\u0B62\u0B63\u0B82\u0BBE-\u0BC2\u0BC6-\u0BC8\u0BCA-\u0BCD\u0BD7\u0C00-\u0C03\u0C3E-\u0C44\u0C46-\u0C48\u0C4A-\u0C4D\u0C55\u0C56\u0C62\u0C63\u0C81-\u0C83\u0CBC\u0CBE-\u0CC4\u0CC6-\u0CC8\u0CCA-\u0CCD\u0CD5\u0CD6\u0CE2\u0CE3\u0D01-\u0D03\u0D3E-\u0D44\u0D46-\u0D48\u0D4A-\u0D4D\u0D57\u0D62\u0D63\u0D82\u0D83\u0DCA\u0DCF-\u0DD4\u0DD6\u0DD8-\u0DDF\u0DF2\u0DF3\u0E31\u0E34-\u0E3A\u0E47-\u0E4E\u0EB1\u0EB4-\u0EB9\u0EBB\u0EBC\u0EC8-\u0ECD\u0F18\u0F19\u0F35\u0F37\u0F39\u0F3E\u0F3F\u0F71-\u0F84\u0F86\u0F87\u0F8D-\u0F97\u0F99-\u0FBC\u0FC6\u102B-\u103E\u1056-\u1059\u105E-\u1060\u1062-\u1064\u1067-\u106D\u1071-\u1074\u1082-\u108D\u108F\u109A-\u109D\u135D-\u135F\u1712-\u1714\u1732-\u1734\u1752\u1753\u1772\u1773\u17B4-\u17D3\u17DD\u180B-\u180D\u1885\u1886\u18A9\u1920-\u192B\u1930-\u193B\u1A17-\u1A1B\u1A55-\u1A5E\u1A60-\u1A7C\u1A7F\u1AB0-\u1ABE\u1B00-\u1B04\u1B34-\u1B44\u1B6B-\u1B73\u1B80-\u1B82\u1BA1-\u1BAD\u1BE6-\u1BF3\u1C24-\u1C37\u1CD0-\u1CD2\u1CD4-\u1CE8\u1CED\u1CF2-\u1CF4\u1CF8\u1CF9\u1DC0-\u1DF5\u1DFB-\u1DFF\u20D0-\u20F0\u2CEF-\u2CF1\u2D7F\u2DE0-\u2DFF\u302A-\u302F\u3099\u309A\uA66F-\uA672\uA674-\uA67D\uA69E\uA69F\uA6F0\uA6F1\uA802\uA806\uA80B\uA823-\uA827\uA880\uA881\uA8B4-\uA8C5\uA8E0-\uA8F1\uA926-\uA92D\uA947-\uA953\uA980-\uA983\uA9B3-\uA9C0\uA9E5\uAA29-\uAA36\uAA43\uAA4C\uAA4D\uAA7B-\uAA7D\uAAB0\uAAB2-\uAAB4\uAAB7\uAAB8\uAABE\uAABF\uAAC1\uAAEB-\uAAEF\uAAF5\uAAF6\uABE3-\uABEA\uABEC\uABED\uFB1E\uFE00-\uFE0F\uFE20-\uFE2F/
        .source; // see note in above variable description
    /**
     * The string form of a regular expression that would match all of the
     * alphabetic ("letter") chars, emoji, and combining marks in the unicode character set
     * when placed in a RegExp character class (`[]`). This includes all
     * international alphabetic characters.
     *
     * These would be the characters matched by unicode regex engines `\p{L}\p{M}`
     * escapes and emoji characters.
     */
    var alphaCharsAndMarksStr = alphaCharsStr + emojiStr + marksStr;
    /**
     * The string form of a regular expression that would match all of the
     * decimal number chars in the unicode character set when placed in a RegExp
     * character class (`[]`).
     *
     * These would be the characters matched by unicode regex engines `\p{Nd}`
     * escape ("all decimal numbers")
     *
     * Taken from the XRegExp library: http://xregexp.com/ (thanks @https://github.com/slevithan)
     * Specifically: http://xregexp.com/v/3.2.0/xregexp-all.js, the 'Decimal_Number'
     *   regex's bmp
     *
     * VERY IMPORTANT: This set of characters is defined inside of a Regular
     *   Expression literal rather than a string literal to prevent UglifyJS from
     *   compressing the unicode escape sequences into their actual unicode
     *   characters. If Uglify compresses these into the unicode characters
     *   themselves, this results in the error "Range out of order in character
     *   class" when these characters are used inside of a Regular Expression
     *   character class (`[]`). See usages of this const. Alternatively, we can set
     *   the UglifyJS option `ascii_only` to true for the build, but that doesn't
     *   help others who are pulling in Autolinker into their own build and running
     *   UglifyJS themselves.
     */
    var decimalNumbersStr = /0-9\u0660-\u0669\u06F0-\u06F9\u07C0-\u07C9\u0966-\u096F\u09E6-\u09EF\u0A66-\u0A6F\u0AE6-\u0AEF\u0B66-\u0B6F\u0BE6-\u0BEF\u0C66-\u0C6F\u0CE6-\u0CEF\u0D66-\u0D6F\u0DE6-\u0DEF\u0E50-\u0E59\u0ED0-\u0ED9\u0F20-\u0F29\u1040-\u1049\u1090-\u1099\u17E0-\u17E9\u1810-\u1819\u1946-\u194F\u19D0-\u19D9\u1A80-\u1A89\u1A90-\u1A99\u1B50-\u1B59\u1BB0-\u1BB9\u1C40-\u1C49\u1C50-\u1C59\uA620-\uA629\uA8D0-\uA8D9\uA900-\uA909\uA9D0-\uA9D9\uA9F0-\uA9F9\uAA50-\uAA59\uABF0-\uABF9\uFF10-\uFF19/
        .source; // see note in above variable description
    /**
     * The string form of a regular expression that would match all of the
     * letters and decimal number chars in the unicode character set when placed in
     * a RegExp character class (`[]`).
     *
     * These would be the characters matched by unicode regex engines
     * `[\p{L}\p{Nd}]` escape ("all letters and decimal numbers")
     */
    var alphaNumericCharsStr = alphaCharsAndMarksStr + decimalNumbersStr;
    /**
     * The string form of a regular expression that would match all of the
     * letters, combining marks, and decimal number chars in the unicode character
     * set when placed in a RegExp character class (`[]`).
     *
     * These would be the characters matched by unicode regex engines
     * `[\p{L}\p{M}\p{Nd}]` escape ("all letters, combining marks, and decimal
     * numbers")
     */
    var alphaNumericAndMarksCharsStr = alphaCharsAndMarksStr + decimalNumbersStr;
    // Simplified IP regular expression
    var ipStr = '(?:[' + decimalNumbersStr + ']{1,3}\\.){3}[' + decimalNumbersStr + ']{1,3}';
    // Protected domain label which do not allow "-" character on the beginning and the end of a single label
    var domainLabelStr = '[' + alphaNumericAndMarksCharsStr + '](?:[' + alphaNumericAndMarksCharsStr + '\\-]{0,61}[' + alphaNumericAndMarksCharsStr + '])?';
    var getDomainLabelStr = function (group) {
        return '(?=(' + domainLabelStr + '))\\' + group;
    };
    /**
     * A function to match domain names of a URL or email address.
     * Ex: 'google', 'yahoo', 'some-other-company', etc.
     */
    var getDomainNameStr = function (group) {
        return '(?:' + getDomainLabelStr(group) + '(?:\\.' + getDomainLabelStr(group + 1) + '){0,126}|' + ipStr + ')';
    };
    /**
     * A regular expression that is simply the character class of the characters
     * that may be used in a domain name, minus the '-' or '.'
     */
    var domainNameCharRegex = new RegExp("[" + alphaNumericAndMarksCharsStr + "]");

    // NOTE: THIS IS A GENERATED FILE
    // To update with the latest TLD list, run `npm run update-tld-regex` or `yarn update-tld-regex` (depending on which you have installed)
    var tldRegex = /(?:xn--vermgensberatung-pwb|xn--vermgensberater-ctb|xn--clchc0ea0b2g2a9gcd|xn--w4r85el8fhu5dnra|northwesternmutual|travelersinsurance|vermögensberatung|xn--3oq18vl8pn36a|xn--5su34j936bgsg|xn--bck1b9a5dre4c|xn--mgbai9azgqp6j|xn--mgberp4a5d4ar|xn--xkc2dl3a5ee0h|vermögensberater|xn--fzys8d69uvgm|xn--mgba7c0bbn0a|xn--xkc2al3hye2a|americanexpress|kerryproperties|sandvikcoromant|xn--i1b6b1a6a2e|xn--kcrx77d1x4a|xn--lgbbat1ad8j|xn--mgba3a4f16a|xn--mgbaakc7dvf|xn--mgbc0a9azcg|xn--nqv7fs00ema|afamilycompany|americanfamily|bananarepublic|cancerresearch|cookingchannel|kerrylogistics|weatherchannel|xn--54b7fta0cc|xn--6qq986b3xl|xn--80aqecdr1a|xn--b4w605ferd|xn--fiq228c5hs|xn--h2breg3eve|xn--jlq61u9w7b|xn--mgba3a3ejt|xn--mgbaam7a8h|xn--mgbayh7gpa|xn--mgbb9fbpob|xn--mgbbh1a71e|xn--mgbca7dzdo|xn--mgbi4ecexp|xn--mgbx4cd0ab|xn--rvc1e0am3e|international|lifeinsurance|spreadbetting|travelchannel|wolterskluwer|xn--eckvdtc9d|xn--fpcrj9c3d|xn--fzc2c9e2c|xn--h2brj9c8c|xn--tiq49xqyj|xn--yfro4i67o|xn--ygbi2ammx|construction|lplfinancial|scholarships|versicherung|xn--3e0b707e|xn--45br5cyl|xn--80adxhks|xn--80asehdb|xn--8y0a063a|xn--gckr3f0f|xn--mgb9awbf|xn--mgbab2bd|xn--mgbgu82a|xn--mgbpl2fh|xn--mgbt3dhd|xn--mk1bu44c|xn--ngbc5azd|xn--ngbe9e0a|xn--ogbpf8fl|xn--qcka1pmc|accountants|barclaycard|blackfriday|blockbuster|bridgestone|calvinklein|contractors|creditunion|engineering|enterprises|foodnetwork|investments|kerryhotels|lamborghini|motorcycles|olayangroup|photography|playstation|productions|progressive|redumbrella|rightathome|williamhill|xn--11b4c3d|xn--1ck2e1b|xn--1qqw23a|xn--2scrj9c|xn--3bst00m|xn--3ds443g|xn--3hcrj9c|xn--42c2d9a|xn--45brj9c|xn--55qw42g|xn--6frz82g|xn--80ao21a|xn--9krt00a|xn--cck2b3b|xn--czr694b|xn--d1acj3b|xn--efvy88h|xn--estv75g|xn--fct429k|xn--fjq720a|xn--flw351e|xn--g2xx48c|xn--gecrj9c|xn--gk3at1e|xn--h2brj9c|xn--hxt814e|xn--imr513n|xn--j6w193g|xn--jvr189m|xn--kprw13d|xn--kpry57d|xn--kpu716f|xn--mgbbh1a|xn--mgbtx2b|xn--mix891f|xn--nyqy26a|xn--otu796d|xn--pbt977c|xn--pgbs0dh|xn--q9jyb4c|xn--rhqv96g|xn--rovu88b|xn--s9brj9c|xn--ses554g|xn--t60b56a|xn--vuq861b|xn--w4rs40l|xn--xhq521b|xn--zfr164b|சிங்கப்பூர்|accountant|apartments|associates|basketball|bnpparibas|boehringer|capitalone|consulting|creditcard|cuisinella|eurovision|extraspace|foundation|healthcare|immobilien|industries|management|mitsubishi|nationwide|newholland|nextdirect|onyourside|properties|protection|prudential|realestate|republican|restaurant|schaeffler|swiftcover|tatamotors|technology|telefonica|university|vistaprint|vlaanderen|volkswagen|xn--30rr7y|xn--3pxu8k|xn--45q11c|xn--4gbrim|xn--55qx5d|xn--5tzm5g|xn--80aswg|xn--90a3ac|xn--9dbq2a|xn--9et52u|xn--c2br7g|xn--cg4bki|xn--czrs0t|xn--czru2d|xn--fiq64b|xn--fiqs8s|xn--fiqz9s|xn--io0a7i|xn--kput3i|xn--mxtq1m|xn--o3cw4h|xn--pssy2u|xn--unup4y|xn--wgbh1c|xn--wgbl6a|xn--y9a3aq|accenture|alfaromeo|allfinanz|amsterdam|analytics|aquarelle|barcelona|bloomberg|christmas|community|directory|education|equipment|fairwinds|financial|firestone|fresenius|frontdoor|fujixerox|furniture|goldpoint|hisamitsu|homedepot|homegoods|homesense|honeywell|institute|insurance|kuokgroup|ladbrokes|lancaster|landrover|lifestyle|marketing|marshalls|melbourne|microsoft|panasonic|passagens|pramerica|richardli|scjohnson|shangrila|solutions|statebank|statefarm|stockholm|travelers|vacations|xn--90ais|xn--c1avg|xn--d1alf|xn--e1a4c|xn--fhbei|xn--j1aef|xn--j1amh|xn--l1acc|xn--ngbrx|xn--nqv7f|xn--p1acf|xn--tckwe|xn--vhquv|yodobashi|abudhabi|airforce|allstate|attorney|barclays|barefoot|bargains|baseball|boutique|bradesco|broadway|brussels|budapest|builders|business|capetown|catering|catholic|chrysler|cipriani|cityeats|cleaning|clinique|clothing|commbank|computer|delivery|deloitte|democrat|diamonds|discount|discover|download|engineer|ericsson|esurance|etisalat|everbank|exchange|feedback|fidelity|firmdale|football|frontier|goodyear|grainger|graphics|guardian|hdfcbank|helsinki|holdings|hospital|infiniti|ipiranga|istanbul|jpmorgan|lighting|lundbeck|marriott|maserati|mckinsey|memorial|merckmsd|mortgage|movistar|observer|partners|pharmacy|pictures|plumbing|property|redstone|reliance|saarland|samsclub|security|services|shopping|showtime|softbank|software|stcgroup|supplies|symantec|training|uconnect|vanguard|ventures|verisign|woodside|xn--90ae|xn--node|xn--p1ai|xn--qxam|yokohama|السعودية|abogado|academy|agakhan|alibaba|android|athleta|auction|audible|auspost|avianca|banamex|bauhaus|bentley|bestbuy|booking|brother|bugatti|capital|caravan|careers|cartier|channel|charity|chintai|citadel|clubmed|college|cologne|comcast|company|compare|contact|cooking|corsica|country|coupons|courses|cricket|cruises|dentist|digital|domains|exposed|express|farmers|fashion|ferrari|ferrero|finance|fishing|fitness|flights|florist|flowers|forsale|frogans|fujitsu|gallery|genting|godaddy|grocery|guitars|hamburg|hangout|hitachi|holiday|hosting|hoteles|hotmail|hyundai|iselect|ismaili|jewelry|juniper|kitchen|komatsu|lacaixa|lancome|lanxess|lasalle|latrobe|leclerc|liaison|limited|lincoln|markets|metlife|monster|netbank|netflix|network|neustar|okinawa|oldnavy|organic|origins|philips|pioneer|politie|realtor|recipes|rentals|reviews|rexroth|samsung|sandvik|schmidt|schwarz|science|shiksha|shriram|singles|staples|starhub|storage|support|surgery|systems|temasek|theater|theatre|tickets|tiffany|toshiba|trading|walmart|wanggou|watches|weather|website|wedding|whoswho|windows|winners|xfinity|yamaxun|youtube|zuerich|католик|اتصالات|الجزائر|العليان|پاکستان|كاثوليك|موبايلي|இந்தியா|abarth|abbott|abbvie|active|africa|agency|airbus|airtel|alipay|alsace|alstom|anquan|aramco|author|bayern|beauty|berlin|bharti|blanco|bostik|boston|broker|camera|career|caseih|casino|center|chanel|chrome|church|circle|claims|clinic|coffee|comsec|condos|coupon|credit|cruise|dating|datsun|dealer|degree|dental|design|direct|doctor|dunlop|dupont|durban|emerck|energy|estate|events|expert|family|flickr|futbol|gallup|garden|george|giving|global|google|gratis|health|hermes|hiphop|hockey|hotels|hughes|imamat|insure|intuit|jaguar|joburg|juegos|kaufen|kinder|kindle|kosher|lancia|latino|lawyer|lefrak|living|locker|london|luxury|madrid|maison|makeup|market|mattel|mobile|mobily|monash|mormon|moscow|museum|mutual|nagoya|natura|nissan|nissay|norton|nowruz|office|olayan|online|oracle|orange|otsuka|pfizer|photos|physio|piaget|pictet|quebec|racing|realty|reisen|repair|report|review|rocher|rogers|ryukyu|safety|sakura|sanofi|school|schule|search|secure|select|shouji|soccer|social|stream|studio|supply|suzuki|swatch|sydney|taipei|taobao|target|tattoo|tennis|tienda|tjmaxx|tkmaxx|toyota|travel|unicom|viajes|viking|villas|virgin|vision|voting|voyage|vuelos|walter|warman|webcam|xihuan|yachts|yandex|zappos|москва|онлайн|ابوظبي|ارامكو|الاردن|المغرب|امارات|فلسطين|مليسيا|भारतम्|இலங்கை|ファッション|actor|adult|aetna|amfam|amica|apple|archi|audio|autos|azure|baidu|beats|bible|bingo|black|boats|bosch|build|canon|cards|chase|cheap|cisco|citic|click|cloud|coach|codes|crown|cymru|dabur|dance|deals|delta|dodge|drive|dubai|earth|edeka|email|epost|epson|faith|fedex|final|forex|forum|gallo|games|gifts|gives|glade|glass|globo|gmail|green|gripe|group|gucci|guide|homes|honda|horse|house|hyatt|ikano|intel|irish|iveco|jetzt|koeln|kyoto|lamer|lease|legal|lexus|lilly|linde|lipsy|lixil|loans|locus|lotte|lotto|lupin|macys|mango|media|miami|money|mopar|movie|nadex|nexus|nikon|ninja|nokia|nowtv|omega|osaka|paris|parts|party|phone|photo|pizza|place|poker|praxi|press|prime|promo|quest|radio|rehab|reise|ricoh|rocks|rodeo|rugby|salon|sener|seven|sharp|shell|shoes|skype|sling|smart|smile|solar|space|sport|stada|store|study|style|sucks|swiss|tatar|tires|tirol|tmall|today|tokyo|tools|toray|total|tours|trade|trust|tunes|tushu|ubank|vegas|video|vodka|volvo|wales|watch|weber|weibo|works|world|xerox|yahoo|zippo|ایران|بازار|بھارت|سودان|سورية|همراه|भारोत|संगठन|বাংলা|భారత్|ഭാരതം|嘉里大酒店|aarp|able|adac|aero|aigo|akdn|ally|amex|arab|army|arpa|arte|asda|asia|audi|auto|baby|band|bank|bbva|beer|best|bike|bing|blog|blue|bofa|bond|book|buzz|cafe|call|camp|care|cars|casa|case|cash|cbre|cern|chat|citi|city|club|cool|coop|cyou|data|date|dclk|deal|dell|desi|diet|dish|docs|doha|duck|duns|dvag|erni|fage|fail|fans|farm|fast|fiat|fido|film|fire|fish|flir|food|ford|free|fund|game|gbiz|gent|ggee|gift|gmbh|gold|golf|goog|guge|guru|hair|haus|hdfc|help|here|hgtv|host|hsbc|icbc|ieee|imdb|immo|info|itau|java|jeep|jobs|jprs|kddi|kiwi|kpmg|kred|land|lego|lgbt|lidl|life|like|limo|link|live|loan|loft|love|ltda|luxe|maif|meet|meme|menu|mini|mint|mobi|moda|moto|name|navy|news|next|nico|nike|ollo|open|page|pars|pccw|pics|ping|pink|play|plus|pohl|porn|post|prod|prof|qpon|raid|read|reit|rent|rest|rich|rmit|room|rsvp|ruhr|safe|sale|sarl|save|saxo|scor|scot|seat|seek|sexy|shaw|shia|shop|show|silk|sina|site|skin|sncf|sohu|song|sony|spot|star|surf|talk|taxi|team|tech|teva|tiaa|tips|town|toys|tube|vana|visa|viva|vivo|vote|voto|wang|weir|wien|wiki|wine|work|xbox|yoga|zara|zero|zone|дети|сайт|بارت|بيتك|ڀارت|تونس|شبكة|عراق|عمان|موقع|भारत|ভারত|ভাৰত|ਭਾਰਤ|ભારત|ଭାରତ|ಭಾರತ|ලංකා|グーグル|クラウド|ポイント|大众汽车|组织机构|電訊盈科|香格里拉|aaa|abb|abc|aco|ads|aeg|afl|aig|anz|aol|app|art|aws|axa|bar|bbc|bbt|bcg|bcn|bet|bid|bio|biz|bms|bmw|bnl|bom|boo|bot|box|buy|bzh|cab|cal|cam|car|cat|cba|cbn|cbs|ceb|ceo|cfa|cfd|com|crs|csc|dad|day|dds|dev|dhl|diy|dnp|dog|dot|dtv|dvr|eat|eco|edu|esq|eus|fan|fit|fly|foo|fox|frl|ftr|fun|fyi|gal|gap|gdn|gea|gle|gmo|gmx|goo|gop|got|gov|hbo|hiv|hkt|hot|how|ibm|ice|icu|ifm|inc|ing|ink|int|ist|itv|jcb|jcp|jio|jll|jmp|jnj|jot|joy|kfh|kia|kim|kpn|krd|lat|law|lds|llc|lol|lpl|ltd|man|map|mba|med|men|mil|mit|mlb|mls|mma|moe|moi|mom|mov|msd|mtn|mtr|nab|nba|nec|net|new|nfl|ngo|nhk|now|nra|nrw|ntt|nyc|obi|off|one|ong|onl|ooo|org|ott|ovh|pay|pet|phd|pid|pin|pnc|pro|pru|pub|pwc|qvc|red|ren|ril|rio|rip|run|rwe|sap|sas|sbi|sbs|sca|scb|ses|sew|sex|sfr|ski|sky|soy|srl|srt|stc|tab|tax|tci|tdk|tel|thd|tjx|top|trv|tui|tvs|ubs|uno|uol|ups|vet|vig|vin|vip|wed|win|wme|wow|wtc|wtf|xin|xxx|xyz|you|yun|zip|бел|ком|қаз|мкд|мон|орг|рус|срб|укр|հայ|קום|عرب|قطر|كوم|مصر|कॉम|नेट|คอม|ไทย|ストア|セール|みんな|中文网|天主教|我爱你|新加坡|淡马锡|诺基亚|飞利浦|ac|ad|ae|af|ag|ai|al|am|ao|aq|ar|as|at|au|aw|ax|az|ba|bb|bd|be|bf|bg|bh|bi|bj|bm|bn|bo|br|bs|bt|bv|bw|by|bz|ca|cc|cd|cf|cg|ch|ci|ck|cl|cm|cn|co|cr|cu|cv|cw|cx|cy|cz|de|dj|dk|dm|do|dz|ec|ee|eg|er|es|et|eu|fi|fj|fk|fm|fo|fr|ga|gb|gd|ge|gf|gg|gh|gi|gl|gm|gn|gp|gq|gr|gs|gt|gu|gw|gy|hk|hm|hn|hr|ht|hu|id|ie|il|im|in|io|iq|ir|is|it|je|jm|jo|jp|ke|kg|kh|ki|km|kn|kp|kr|kw|ky|kz|la|lb|lc|li|lk|lr|ls|lt|lu|lv|ly|ma|mc|md|me|mg|mh|mk|ml|mm|mn|mo|mp|mq|mr|ms|mt|mu|mv|mw|mx|my|mz|na|nc|ne|nf|ng|ni|nl|no|np|nr|nu|nz|om|pa|pe|pf|pg|ph|pk|pl|pm|pn|pr|ps|pt|pw|py|qa|re|ro|rs|ru|rw|sa|sb|sc|sd|se|sg|sh|si|sj|sk|sl|sm|sn|so|sr|st|su|sv|sx|sy|sz|tc|td|tf|tg|th|tj|tk|tl|tm|tn|to|tr|tt|tv|tw|tz|ua|ug|uk|us|uy|uz|va|vc|ve|vg|vi|vn|vu|wf|ws|ye|yt|za|zm|zw|ελ|бг|ею|рф|გე|닷넷|닷컴|삼성|한국|コム|世界|中信|中国|中國|企业|佛山|信息|健康|八卦|公司|公益|台湾|台灣|商城|商店|商标|嘉里|在线|大拿|娱乐|家電|工行|广东|微博|慈善|手机|手表|招聘|政务|政府|新闻|时尚|書籍|机构|游戏|澳門|点看|珠宝|移动|网址|网店|网站|网络|联通|谷歌|购物|通販|集团|食品|餐厅|香港)/;

    // For debugging: search for other "For debugging" lines
    // import CliTable from 'cli-table';
    // RegExp objects which are shared by all instances of EmailMatcher. These are
    // here to avoid re-instantiating the RegExp objects if `Autolinker.link()` is
    // called multiple times, thus instantiating EmailMatcher and its RegExp 
    // objects each time (which is very expensive - see https://github.com/gregjacobs/Autolinker.js/issues/314). 
    // See descriptions of the properties where they are used for details about them
    var localPartCharRegex = new RegExp("[" + alphaNumericAndMarksCharsStr + "!#$%&'*+/=?^_`{|}~-]");
    var strictTldRegex = new RegExp("^" + tldRegex.source + "$");
    /**
     * @class Autolinker.matcher.Email
     * @extends Autolinker.matcher.Matcher
     *
     * Matcher to find email matches in an input string.
     *
     * See this class's superclass ({@link Autolinker.matcher.Matcher}) for more details.
     */
    var EmailMatcher = /** @class */ (function (_super) {
        __extends(EmailMatcher, _super);
        function EmailMatcher() {
            var _this = _super !== null && _super.apply(this, arguments) || this;
            /**
             * Valid characters that can be used in the "local" part of an email address,
             * i.e. the "name" part of "name@site.com"
             */
            _this.localPartCharRegex = localPartCharRegex;
            /**
             * Stricter TLD regex which adds a beginning and end check to ensure
             * the string is a valid TLD
             */
            _this.strictTldRegex = strictTldRegex;
            return _this;
        }
        /**
         * @inheritdoc
         */
        EmailMatcher.prototype.parseMatches = function (text) {
            var tagBuilder = this.tagBuilder, localPartCharRegex = this.localPartCharRegex, strictTldRegex = this.strictTldRegex, matches = [], len = text.length, noCurrentEmailMatch = new CurrentEmailMatch();
            // for matching a 'mailto:' prefix
            var mailtoTransitions = {
                'm': 'a',
                'a': 'i',
                'i': 'l',
                'l': 't',
                't': 'o',
                'o': ':',
            };
            var charIdx = 0, state = 0 /* NonEmailMatch */, currentEmailMatch = noCurrentEmailMatch;
            // For debugging: search for other "For debugging" lines
            // const table = new CliTable( {
            // 	head: [ 'charIdx', 'char', 'state', 'charIdx', 'currentEmailAddress.idx', 'hasDomainDot' ]
            // } );
            while (charIdx < len) {
                var char = text.charAt(charIdx);
                // For debugging: search for other "For debugging" lines
                // table.push( 
                // 	[ charIdx, char, State[ state ], charIdx, currentEmailAddress.idx, currentEmailAddress.hasDomainDot ] 
                // );
                switch (state) {
                    case 0 /* NonEmailMatch */:
                        stateNonEmailAddress(char);
                        break;
                    case 1 /* Mailto */:
                        stateMailTo(text.charAt(charIdx - 1), char);
                        break;
                    case 2 /* LocalPart */:
                        stateLocalPart(char);
                        break;
                    case 3 /* LocalPartDot */:
                        stateLocalPartDot(char);
                        break;
                    case 4 /* AtSign */:
                        stateAtSign(char);
                        break;
                    case 5 /* DomainChar */:
                        stateDomainChar(char);
                        break;
                    case 6 /* DomainHyphen */:
                        stateDomainHyphen(char);
                        break;
                    case 7 /* DomainDot */:
                        stateDomainDot(char);
                        break;
                    default:
                        throwUnhandledCaseError(state);
                }
                // For debugging: search for other "For debugging" lines
                // table.push( 
                // 	[ charIdx, char, State[ state ], charIdx, currentEmailAddress.idx, currentEmailAddress.hasDomainDot ] 
                // );
                charIdx++;
            }
            // Capture any valid match at the end of the string
            captureMatchIfValidAndReset();
            // For debugging: search for other "For debugging" lines
            //console.log( '\n' + table.toString() );
            return matches;
            // Handles the state when we're not in an email address
            function stateNonEmailAddress(char) {
                if (char === 'm') {
                    beginEmailMatch(1 /* Mailto */);
                }
                else if (localPartCharRegex.test(char)) {
                    beginEmailMatch();
                }
            }
            // Handles if we're reading a 'mailto:' prefix on the string
            function stateMailTo(prevChar, char) {
                if (prevChar === ':') {
                    // We've reached the end of the 'mailto:' prefix
                    if (localPartCharRegex.test(char)) {
                        state = 2 /* LocalPart */;
                        currentEmailMatch = new CurrentEmailMatch(__assign({}, currentEmailMatch, { hasMailtoPrefix: true }));
                    }
                    else {
                        // we've matched 'mailto:' but didn't get anything meaningful
                        // immediately afterwards (for example, we encountered a 
                        // space character, or an '@' character which formed 'mailto:@'
                        resetToNonEmailMatchState();
                    }
                }
                else if (mailtoTransitions[prevChar] === char) ;
                else if (localPartCharRegex.test(char)) {
                    // We we're reading a prefix of 'mailto:', but encountered a
                    // different character that didn't continue the prefix
                    state = 2 /* LocalPart */;
                }
                else if (char === '.') {
                    // We we're reading a prefix of 'mailto:', but encountered a
                    // dot character
                    state = 3 /* LocalPartDot */;
                }
                else if (char === '@') {
                    // We we're reading a prefix of 'mailto:', but encountered a
                    // an @ character
                    state = 4 /* AtSign */;
                }
                else {
                    // not an email address character, return to "NonEmailAddress" state
                    resetToNonEmailMatchState();
                }
            }
            // Handles the state when we're currently in the "local part" of an 
            // email address (as opposed to the "domain part")
            function stateLocalPart(char) {
                if (char === '.') {
                    state = 3 /* LocalPartDot */;
                }
                else if (char === '@') {
                    state = 4 /* AtSign */;
                }
                else if (localPartCharRegex.test(char)) ;
                else {
                    // not an email address character, return to "NonEmailAddress" state
                    resetToNonEmailMatchState();
                }
            }
            // Handles the state where we've read 
            function stateLocalPartDot(char) {
                if (char === '.') {
                    // We read a second '.' in a row, not a valid email address 
                    // local part
                    resetToNonEmailMatchState();
                }
                else if (char === '@') {
                    // We read the '@' character immediately after a dot ('.'), not 
                    // an email address
                    resetToNonEmailMatchState();
                }
                else if (localPartCharRegex.test(char)) {
                    state = 2 /* LocalPart */;
                }
                else {
                    // Anything else, not an email address
                    resetToNonEmailMatchState();
                }
            }
            function stateAtSign(char) {
                if (domainNameCharRegex.test(char)) {
                    state = 5 /* DomainChar */;
                }
                else {
                    // Anything else, not an email address
                    resetToNonEmailMatchState();
                }
            }
            function stateDomainChar(char) {
                if (char === '.') {
                    state = 7 /* DomainDot */;
                }
                else if (char === '-') {
                    state = 6 /* DomainHyphen */;
                }
                else if (domainNameCharRegex.test(char)) ;
                else {
                    // Anything else, we potentially matched if the criteria has
                    // been met
                    captureMatchIfValidAndReset();
                }
            }
            function stateDomainHyphen(char) {
                if (char === '-' || char === '.') {
                    // Not valid to have two hyphens ("--") or hypen+dot ("-.")
                    captureMatchIfValidAndReset();
                }
                else if (domainNameCharRegex.test(char)) {
                    state = 5 /* DomainChar */;
                }
                else {
                    // Anything else
                    captureMatchIfValidAndReset();
                }
            }
            function stateDomainDot(char) {
                if (char === '.' || char === '-') {
                    // not valid to have two dots ("..") or dot+hypen (".-")
                    captureMatchIfValidAndReset();
                }
                else if (domainNameCharRegex.test(char)) {
                    state = 5 /* DomainChar */;
                    // After having read a '.' and then a valid domain character,
                    // we now know that the domain part of the email is valid, and
                    // we have found at least a partial EmailMatch (however, the
                    // email address may have additional characters from this point)
                    currentEmailMatch = new CurrentEmailMatch(__assign({}, currentEmailMatch, { hasDomainDot: true }));
                }
                else {
                    // Anything else
                    captureMatchIfValidAndReset();
                }
            }
            function beginEmailMatch(newState) {
                if (newState === void 0) { newState = 2 /* LocalPart */; }
                state = newState;
                currentEmailMatch = new CurrentEmailMatch({ idx: charIdx });
            }
            function resetToNonEmailMatchState() {
                state = 0 /* NonEmailMatch */;
                currentEmailMatch = noCurrentEmailMatch;
            }
            /*
             * Captures the current email address as an EmailMatch if it's valid,
             * and resets the state to read another email address.
             */
            function captureMatchIfValidAndReset() {
                if (currentEmailMatch.hasDomainDot) { // we need at least one dot in the domain to be considered a valid email address
                    var matchedText = text.slice(currentEmailMatch.idx, charIdx);
                    // If we read a '.' or '-' char that ended the email address
                    // (valid domain name characters, but only valid email address
                    // characters if they are followed by something else), strip 
                    // it off now
                    if (/[-.]$/.test(matchedText)) {
                        matchedText = matchedText.slice(0, -1);
                    }
                    var emailAddress = currentEmailMatch.hasMailtoPrefix
                        ? matchedText.slice('mailto:'.length)
                        : matchedText;
                    // if the email address has a valid TLD, add it to the list of matches
                    if (doesEmailHaveValidTld(emailAddress)) {
                        matches.push(new EmailMatch({
                            tagBuilder: tagBuilder,
                            matchedText: matchedText,
                            offset: currentEmailMatch.idx,
                            email: emailAddress
                        }));
                    }
                }
                resetToNonEmailMatchState();
                /**
                 * Determines if the given email address has a valid TLD or not
                 * @param {string} emailAddress - email address
                 * @return {Boolean} - true is email have valid TLD, false otherwise
                 */
                function doesEmailHaveValidTld(emailAddress) {
                    var emailAddressTld = emailAddress.split('.').pop() || '';
                    var emailAddressNormalized = emailAddressTld.toLowerCase();
                    var isValidTld = strictTldRegex.test(emailAddressNormalized);
                    return isValidTld;
                }
            }
        };
        return EmailMatcher;
    }(Matcher));
    var CurrentEmailMatch = /** @class */ (function () {
        function CurrentEmailMatch(cfg) {
            if (cfg === void 0) { cfg = {}; }
            this.idx = cfg.idx !== undefined ? cfg.idx : -1;
            this.hasMailtoPrefix = !!cfg.hasMailtoPrefix;
            this.hasDomainDot = !!cfg.hasDomainDot;
        }
        return CurrentEmailMatch;
    }());

    /**
     * @private
     * @class Autolinker.matcher.UrlMatchValidator
     * @singleton
     *
     * Used by Autolinker to filter out false URL positives from the
     * {@link Autolinker.matcher.Url UrlMatcher}.
     *
     * Due to the limitations of regular expressions (including the missing feature
     * of look-behinds in JS regular expressions), we cannot always determine the
     * validity of a given match. This class applies a bit of additional logic to
     * filter out any false positives that have been matched by the
     * {@link Autolinker.matcher.Url UrlMatcher}.
     */
    var UrlMatchValidator = /** @class */ (function () {
        function UrlMatchValidator() {
        }
        /**
         * Determines if a given URL match found by the {@link Autolinker.matcher.Url UrlMatcher}
         * is valid. Will return `false` for:
         *
         * 1) URL matches which do not have at least have one period ('.') in the
         *    domain name (effectively skipping over matches like "abc:def").
         *    However, URL matches with a protocol will be allowed (ex: 'http://localhost')
         * 2) URL matches which do not have at least one word character in the
         *    domain name (effectively skipping over matches like "git:1.0").
         *    However, URL matches with a protocol will be allowed (ex: 'intra-net://271219.76')
         * 3) A protocol-relative url match (a URL beginning with '//') whose
         *    previous character is a word character (effectively skipping over
         *    strings like "abc//google.com")
         *
         * Otherwise, returns `true`.
         *
         * @param {String} urlMatch The matched URL, if there was one. Will be an
         *   empty string if the match is not a URL match.
         * @param {String} protocolUrlMatch The match URL string for a protocol
         *   match. Ex: 'http://yahoo.com'. This is used to match something like
         *   'http://localhost', where we won't double check that the domain name
         *   has at least one '.' in it.
         * @return {Boolean} `true` if the match given is valid and should be
         *   processed, or `false` if the match is invalid and/or should just not be
         *   processed.
         */
        UrlMatchValidator.isValid = function (urlMatch, protocolUrlMatch) {
            if ((protocolUrlMatch && !this.isValidUriScheme(protocolUrlMatch)) ||
                this.urlMatchDoesNotHaveProtocolOrDot(urlMatch, protocolUrlMatch) || // At least one period ('.') must exist in the URL match for us to consider it an actual URL, *unless* it was a full protocol match (like 'http://localhost')
                (this.urlMatchDoesNotHaveAtLeastOneWordChar(urlMatch, protocolUrlMatch) && // At least one letter character must exist in the domain name after a protocol match. Ex: skip over something like "git:1.0"
                    !this.isValidIpAddress(urlMatch)) || // Except if it's an IP address
                this.containsMultipleDots(urlMatch)) {
                return false;
            }
            return true;
        };
        UrlMatchValidator.isValidIpAddress = function (uriSchemeMatch) {
            var newRegex = new RegExp(this.hasFullProtocolRegex.source + this.ipRegex.source);
            var uriScheme = uriSchemeMatch.match(newRegex);
            return uriScheme !== null;
        };
        UrlMatchValidator.containsMultipleDots = function (urlMatch) {
            var stringBeforeSlash = urlMatch;
            if (this.hasFullProtocolRegex.test(urlMatch)) {
                stringBeforeSlash = urlMatch.split('://')[1];
            }
            return stringBeforeSlash.split('/')[0].indexOf("..") > -1;
        };
        /**
         * Determines if the URI scheme is a valid scheme to be autolinked. Returns
         * `false` if the scheme is 'javascript:' or 'vbscript:'
         *
         * @private
         * @param {String} uriSchemeMatch The match URL string for a full URI scheme
         *   match. Ex: 'http://yahoo.com' or 'mailto:a@a.com'.
         * @return {Boolean} `true` if the scheme is a valid one, `false` otherwise.
         */
        UrlMatchValidator.isValidUriScheme = function (uriSchemeMatch) {
            var uriSchemeMatchArr = uriSchemeMatch.match(this.uriSchemeRegex), uriScheme = uriSchemeMatchArr && uriSchemeMatchArr[0].toLowerCase();
            return (uriScheme !== 'javascript:' && uriScheme !== 'vbscript:');
        };
        /**
         * Determines if a URL match does not have either:
         *
         * a) a full protocol (i.e. 'http://'), or
         * b) at least one dot ('.') in the domain name (for a non-full-protocol
         *    match).
         *
         * Either situation is considered an invalid URL (ex: 'git:d' does not have
         * either the '://' part, or at least one dot in the domain name. If the
         * match was 'git:abc.com', we would consider this valid.)
         *
         * @private
         * @param {String} urlMatch The matched URL, if there was one. Will be an
         *   empty string if the match is not a URL match.
         * @param {String} protocolUrlMatch The match URL string for a protocol
         *   match. Ex: 'http://yahoo.com'. This is used to match something like
         *   'http://localhost', where we won't double check that the domain name
         *   has at least one '.' in it.
         * @return {Boolean} `true` if the URL match does not have a full protocol,
         *   or at least one dot ('.') in a non-full-protocol match.
         */
        UrlMatchValidator.urlMatchDoesNotHaveProtocolOrDot = function (urlMatch, protocolUrlMatch) {
            return (!!urlMatch && (!protocolUrlMatch || !this.hasFullProtocolRegex.test(protocolUrlMatch)) && urlMatch.indexOf('.') === -1);
        };
        /**
         * Determines if a URL match does not have either:
         *
         * a) a full protocol (i.e. 'http://'), or
         * b) at least one word character after the protocol (i.e. in the domain name)
         *
         * At least one letter character must exist in the domain name after a
         * protocol match. Ex: skip over something like "git:1.0"
         *
         * @private
         * @param {String} urlMatch The matched URL, if there was one. Will be an
         *   empty string if the match is not a URL match.
         * @param {String} protocolUrlMatch The match URL string for a protocol
         *   match. Ex: 'http://yahoo.com'. This is used to know whether or not we
         *   have a protocol in the URL string, in order to check for a word
         *   character after the protocol separator (':').
         * @return {Boolean} `true` if the URL match does not have a full protocol, or
         * at least one word character in it, `false` otherwise.
         */
        UrlMatchValidator.urlMatchDoesNotHaveAtLeastOneWordChar = function (urlMatch, protocolUrlMatch) {
            if (urlMatch && protocolUrlMatch) {
                return !this.hasFullProtocolRegex.test(protocolUrlMatch) && !this.hasWordCharAfterProtocolRegex.test(urlMatch);
            }
            else {
                return false;
            }
        };
        /**
         * Regex to test for a full protocol, with the two trailing slashes. Ex: 'http://'
         *
         * @private
         * @property {RegExp} hasFullProtocolRegex
         */
        UrlMatchValidator.hasFullProtocolRegex = /^[A-Za-z][-.+A-Za-z0-9]*:\/\//;
        /**
         * Regex to find the URI scheme, such as 'mailto:'.
         *
         * This is used to filter out 'javascript:' and 'vbscript:' schemes.
         *
         * @private
         * @property {RegExp} uriSchemeRegex
         */
        UrlMatchValidator.uriSchemeRegex = /^[A-Za-z][-.+A-Za-z0-9]*:/;
        /**
         * Regex to determine if at least one word char exists after the protocol (i.e. after the ':')
         *
         * @private
         * @property {RegExp} hasWordCharAfterProtocolRegex
         */
        UrlMatchValidator.hasWordCharAfterProtocolRegex = new RegExp(":[^\\s]*?[" + alphaCharsStr + "]");
        /**
         * Regex to determine if the string is a valid IP address
         *
         * @private
         * @property {RegExp} ipRegex
         */
        UrlMatchValidator.ipRegex = /[0-9][0-9]?[0-9]?\.[0-9][0-9]?[0-9]?\.[0-9][0-9]?[0-9]?\.[0-9][0-9]?[0-9]?(:[0-9]*)?\/?$/;
        return UrlMatchValidator;
    }());

    // RegExp objects which are shared by all instances of UrlMatcher. These are
    // here to avoid re-instantiating the RegExp objects if `Autolinker.link()` is
    // called multiple times, thus instantiating UrlMatcher and its RegExp 
    // objects each time (which is very expensive - see https://github.com/gregjacobs/Autolinker.js/issues/314). 
    // See descriptions of the properties where they are used for details about them
    var matcherRegex = (function () {
        var schemeRegex = /(?:[A-Za-z][-.+A-Za-z0-9]{0,63}:(?![A-Za-z][-.+A-Za-z0-9]{0,63}:\/\/)(?!\d+\/?)(?:\/\/)?)/, // match protocol, allow in format "http://" or "mailto:". However, do not match the first part of something like 'link:http://www.google.com' (i.e. don't match "link:"). Also, make sure we don't interpret 'google.com:8000' as if 'google.com' was a protocol here (i.e. ignore a trailing port number in this regex)
        wwwRegex = /(?:www\.)/, // starting with 'www.'
        // Allow optional path, query string, and hash anchor, not ending in the following characters: "?!:,.;"
        // http://blog.codinghorror.com/the-problem-with-urls/
        urlSuffixRegex = new RegExp('[/?#](?:[' + alphaNumericAndMarksCharsStr + '\\-+&@#/%=~_()|\'$*\\[\\]{}?!:,.;^\u2713]*[' + alphaNumericAndMarksCharsStr + '\\-+&@#/%=~_()|\'$*\\[\\]{}\u2713])?');
        return new RegExp([
            '(?:',
            '(',
            schemeRegex.source,
            getDomainNameStr(2),
            ')',
            '|',
            '(',
            '(//)?',
            wwwRegex.source,
            getDomainNameStr(6),
            ')',
            '|',
            '(',
            '(//)?',
            getDomainNameStr(10) + '\\.',
            tldRegex.source,
            '(?![-' + alphaNumericCharsStr + '])',
            ')',
            ')',
            '(?::[0-9]+)?',
            '(?:' + urlSuffixRegex.source + ')?' // match for path, query string, and/or hash anchor - optional
        ].join(""), 'gi');
    })();
    var wordCharRegExp = new RegExp('[' + alphaNumericAndMarksCharsStr + ']');
    /**
     * @class Autolinker.matcher.Url
     * @extends Autolinker.matcher.Matcher
     *
     * Matcher to find URL matches in an input string.
     *
     * See this class's superclass ({@link Autolinker.matcher.Matcher}) for more details.
     */
    var UrlMatcher = /** @class */ (function (_super) {
        __extends(UrlMatcher, _super);
        /**
         * @method constructor
         * @param {Object} cfg The configuration properties for the Match instance,
         *   specified in an Object (map).
         */
        function UrlMatcher(cfg) {
            var _this = _super.call(this, cfg) || this;
            /**
             * @cfg {Object} stripPrefix (required)
             *
             * The Object form of {@link Autolinker#cfg-stripPrefix}.
             */
            _this.stripPrefix = { scheme: true, www: true }; // default value just to get the above doc comment in the ES5 output and documentation generator
            /**
             * @cfg {Boolean} stripTrailingSlash (required)
             * @inheritdoc Autolinker#stripTrailingSlash
             */
            _this.stripTrailingSlash = true; // default value just to get the above doc comment in the ES5 output and documentation generator
            /**
             * @cfg {Boolean} decodePercentEncoding (required)
             * @inheritdoc Autolinker#decodePercentEncoding
             */
            _this.decodePercentEncoding = true; // default value just to get the above doc comment in the ES5 output and documentation generator
            /**
             * @protected
             * @property {RegExp} matcherRegex
             *
             * The regular expression to match URLs with an optional scheme, port
             * number, path, query string, and hash anchor.
             *
             * Example matches:
             *
             *     http://google.com
             *     www.google.com
             *     google.com/path/to/file?q1=1&q2=2#myAnchor
             *
             *
             * This regular expression will have the following capturing groups:
             *
             * 1.  Group that matches a scheme-prefixed URL (i.e. 'http://google.com').
             *     This is used to match scheme URLs with just a single word, such as
             *     'http://localhost', where we won't double check that the domain name
             *     has at least one dot ('.') in it.
             * 2.  Group that matches a 'www.' prefixed URL. This is only matched if the
             *     'www.' text was not prefixed by a scheme (i.e.: not prefixed by
             *     'http://', 'ftp:', etc.)
             * 3.  A protocol-relative ('//') match for the case of a 'www.' prefixed
             *     URL. Will be an empty string if it is not a protocol-relative match.
             *     We need to know the character before the '//' in order to determine
             *     if it is a valid match or the // was in a string we don't want to
             *     auto-link.
             * 4.  Group that matches a known TLD (top level domain), when a scheme
             *     or 'www.'-prefixed domain is not matched.
             * 5.  A protocol-relative ('//') match for the case of a known TLD prefixed
             *     URL. Will be an empty string if it is not a protocol-relative match.
             *     See #3 for more info.
             */
            _this.matcherRegex = matcherRegex;
            /**
             * A regular expression to use to check the character before a protocol-relative
             * URL match. We don't want to match a protocol-relative URL if it is part
             * of another word.
             *
             * For example, we want to match something like "Go to: //google.com",
             * but we don't want to match something like "abc//google.com"
             *
             * This regular expression is used to test the character before the '//'.
             *
             * @protected
             * @type {RegExp} wordCharRegExp
             */
            _this.wordCharRegExp = wordCharRegExp;
            _this.stripPrefix = cfg.stripPrefix;
            _this.stripTrailingSlash = cfg.stripTrailingSlash;
            _this.decodePercentEncoding = cfg.decodePercentEncoding;
            return _this;
        }
        /**
         * @inheritdoc
         */
        UrlMatcher.prototype.parseMatches = function (text) {
            var matcherRegex = this.matcherRegex, stripPrefix = this.stripPrefix, stripTrailingSlash = this.stripTrailingSlash, decodePercentEncoding = this.decodePercentEncoding, tagBuilder = this.tagBuilder, matches = [], match;
            var _loop_1 = function () {
                var matchStr = match[0], schemeUrlMatch = match[1], wwwUrlMatch = match[4], wwwProtocolRelativeMatch = match[5], 
                //tldUrlMatch = match[ 8 ],  -- not needed at the moment
                tldProtocolRelativeMatch = match[9], offset = match.index, protocolRelativeMatch = wwwProtocolRelativeMatch || tldProtocolRelativeMatch, prevChar = text.charAt(offset - 1);
                if (!UrlMatchValidator.isValid(matchStr, schemeUrlMatch)) {
                    return "continue";
                }
                // If the match is preceded by an '@' character, then it is either
                // an email address or a username. Skip these types of matches.
                if (offset > 0 && prevChar === '@') {
                    return "continue";
                }
                // If it's a protocol-relative '//' match, but the character before the '//'
                // was a word character (i.e. a letter/number), then we found the '//' in the
                // middle of another word (such as "asdf//asdf.com"). In this case, skip the
                // match.
                if (offset > 0 && protocolRelativeMatch && this_1.wordCharRegExp.test(prevChar)) {
                    return "continue";
                }
                // If the URL ends with a question mark, don't include the question
                // mark as part of the URL. We'll assume the question mark was the
                // end of a sentence, such as: "Going to google.com?"
                if (/\?$/.test(matchStr)) {
                    matchStr = matchStr.substr(0, matchStr.length - 1);
                }
                // Handle a closing parenthesis or square bracket at the end of the 
                // match, and exclude it if there is not a matching open parenthesis 
                // or square bracket in the match itself.
                if (this_1.matchHasUnbalancedClosingParen(matchStr)) {
                    matchStr = matchStr.substr(0, matchStr.length - 1); // remove the trailing ")"
                }
                else {
                    // Handle an invalid character after the TLD
                    var pos = this_1.matchHasInvalidCharAfterTld(matchStr, schemeUrlMatch);
                    if (pos > -1) {
                        matchStr = matchStr.substr(0, pos); // remove the trailing invalid chars
                    }
                }
                // The autolinker accepts many characters in a url's scheme (like `fake://test.com`).
                // However, in cases where a URL is missing whitespace before an obvious link,
                // (for example: `nowhitespacehttp://www.test.com`), we only want the match to start
                // at the http:// part. We will check if the match contains a common scheme and then 
                // shift the match to start from there. 		
                var foundCommonScheme = ['http://', 'https://'].find(function (commonScheme) { return !!schemeUrlMatch && schemeUrlMatch.indexOf(commonScheme) !== -1; });
                if (foundCommonScheme) {
                    // If we found an overmatched URL, we want to find the index
                    // of where the match should start and shift the match to
                    // start from the beginning of the common scheme
                    var indexOfSchemeStart = matchStr.indexOf(foundCommonScheme);
                    matchStr = matchStr.substr(indexOfSchemeStart);
                    schemeUrlMatch = schemeUrlMatch.substr(indexOfSchemeStart);
                    offset = offset + indexOfSchemeStart;
                }
                var urlMatchType = schemeUrlMatch ? 'scheme' : (wwwUrlMatch ? 'www' : 'tld'), protocolUrlMatch = !!schemeUrlMatch;
                matches.push(new UrlMatch({
                    tagBuilder: tagBuilder,
                    matchedText: matchStr,
                    offset: offset,
                    urlMatchType: urlMatchType,
                    url: matchStr,
                    protocolUrlMatch: protocolUrlMatch,
                    protocolRelativeMatch: !!protocolRelativeMatch,
                    stripPrefix: stripPrefix,
                    stripTrailingSlash: stripTrailingSlash,
                    decodePercentEncoding: decodePercentEncoding,
                }));
            };
            var this_1 = this;
            while ((match = matcherRegex.exec(text)) !== null) {
                _loop_1();
            }
            return matches;
        };
        /**
         * Determines if a match found has an unmatched closing parenthesis,
         * square bracket or curly bracket. If so, the symbol will be removed
         * from the match itself, and appended after the generated anchor tag.
         *
         * A match may have an extra closing parenthesis at the end of the match
         * because the regular expression must include parenthesis for URLs such as
         * "wikipedia.com/something_(disambiguation)", which should be auto-linked.
         *
         * However, an extra parenthesis *will* be included when the URL itself is
         * wrapped in parenthesis, such as in the case of:
         *     "(wikipedia.com/something_(disambiguation))"
         * In this case, the last closing parenthesis should *not* be part of the
         * URL itself, and this method will return `true`.
         *
         * For square brackets in URLs such as in PHP arrays, the same behavior as
         * parenthesis discussed above should happen:
         *     "[http://www.example.com/foo.php?bar[]=1&bar[]=2&bar[]=3]"
         * The closing square bracket should not be part of the URL itself, and this
         * method will return `true`.
         *
         * @protected
         * @param {String} matchStr The full match string from the {@link #matcherRegex}.
         * @return {Boolean} `true` if there is an unbalanced closing parenthesis or
         *   square bracket at the end of the `matchStr`, `false` otherwise.
         */
        UrlMatcher.prototype.matchHasUnbalancedClosingParen = function (matchStr) {
            var endChar = matchStr.charAt(matchStr.length - 1);
            var startChar;
            if (endChar === ')') {
                startChar = '(';
            }
            else if (endChar === ']') {
                startChar = '[';
            }
            else if (endChar === '}') {
                startChar = '{';
            }
            else {
                return false; // not a close parenthesis or square bracket
            }
            // Find if there are the same number of open braces as close braces in
            // the URL string, minus the last character (which we have already 
            // determined to be either ')', ']' or '}'
            var numOpenBraces = 0;
            for (var i = 0, len = matchStr.length - 1; i < len; i++) {
                var char = matchStr.charAt(i);
                if (char === startChar) {
                    numOpenBraces++;
                }
                else if (char === endChar) {
                    numOpenBraces = Math.max(numOpenBraces - 1, 0);
                }
            }
            // If the number of open braces matches the number of close braces in
            // the URL minus the last character, then the match has *unbalanced*
            // braces because of the last character. Example of unbalanced braces
            // from the regex match:
            //     "http://example.com?a[]=1]"
            if (numOpenBraces === 0) {
                return true;
            }
            return false;
        };
        /**
         * Determine if there's an invalid character after the TLD in a URL. Valid
         * characters after TLD are ':/?#'. Exclude scheme matched URLs from this
         * check.
         *
         * @protected
         * @param {String} urlMatch The matched URL, if there was one. Will be an
         *   empty string if the match is not a URL match.
         * @param {String} schemeUrlMatch The match URL string for a scheme
         *   match. Ex: 'http://yahoo.com'. This is used to match something like
         *   'http://localhost', where we won't double check that the domain name
         *   has at least one '.' in it.
         * @return {Number} the position where the invalid character was found. If
         *   no such character was found, returns -1
         */
        UrlMatcher.prototype.matchHasInvalidCharAfterTld = function (urlMatch, schemeUrlMatch) {
            if (!urlMatch) {
                return -1;
            }
            var offset = 0;
            if (schemeUrlMatch) {
                offset = urlMatch.indexOf(':');
                urlMatch = urlMatch.slice(offset);
            }
            var re = new RegExp("^((.?\/\/)?[-." + alphaNumericAndMarksCharsStr + "]*[-" + alphaNumericAndMarksCharsStr + "]\\.[-" + alphaNumericAndMarksCharsStr + "]+)");
            var res = re.exec(urlMatch);
            if (res === null) {
                return -1;
            }
            offset += res[1].length;
            urlMatch = urlMatch.slice(res[1].length);
            if (/^[^-.A-Za-z0-9:\/?#]/.test(urlMatch)) {
                return offset;
            }
            return -1;
        };
        return UrlMatcher;
    }(Matcher));

    // RegExp objects which are shared by all instances of HashtagMatcher. These are
    // here to avoid re-instantiating the RegExp objects if `Autolinker.link()` is
    // called multiple times, thus instantiating HashtagMatcher and its RegExp 
    // objects each time (which is very expensive - see https://github.com/gregjacobs/Autolinker.js/issues/314). 
    // See descriptions of the properties where they are used for details about them
    var matcherRegex$1 = new RegExp("#[_" + alphaNumericAndMarksCharsStr + "]{1,139}(?![_" + alphaNumericAndMarksCharsStr + "])", 'g'); // lookahead used to make sure we don't match something above 139 characters
    var nonWordCharRegex = new RegExp('[^' + alphaNumericAndMarksCharsStr + ']');
    /**
     * @class Autolinker.matcher.Hashtag
     * @extends Autolinker.matcher.Matcher
     *
     * Matcher to find HashtagMatch matches in an input string.
     */
    var HashtagMatcher = /** @class */ (function (_super) {
        __extends(HashtagMatcher, _super);
        /**
         * @method constructor
         * @param {Object} cfg The configuration properties for the Match instance,
         *   specified in an Object (map).
         */
        function HashtagMatcher(cfg) {
            var _this = _super.call(this, cfg) || this;
            /**
             * @cfg {String} serviceName
             *
             * The service to point hashtag matches to. See {@link Autolinker#hashtag}
             * for available values.
             */
            _this.serviceName = 'twitter'; // default value just to get the above doc comment in the ES5 output and documentation generator
            /**
             * The regular expression to match Hashtags. Example match:
             *
             *     #asdf
             *
             * @protected
             * @property {RegExp} matcherRegex
             */
            _this.matcherRegex = matcherRegex$1;
            /**
             * The regular expression to use to check the character before a username match to
             * make sure we didn't accidentally match an email address.
             *
             * For example, the string "asdf@asdf.com" should not match "@asdf" as a username.
             *
             * @protected
             * @property {RegExp} nonWordCharRegex
             */
            _this.nonWordCharRegex = nonWordCharRegex;
            _this.serviceName = cfg.serviceName;
            return _this;
        }
        /**
         * @inheritdoc
         */
        HashtagMatcher.prototype.parseMatches = function (text) {
            var matcherRegex = this.matcherRegex, nonWordCharRegex = this.nonWordCharRegex, serviceName = this.serviceName, tagBuilder = this.tagBuilder, matches = [], match;
            while ((match = matcherRegex.exec(text)) !== null) {
                var offset = match.index, prevChar = text.charAt(offset - 1);
                // If we found the match at the beginning of the string, or we found the match
                // and there is a whitespace char in front of it (meaning it is not a '#' char
                // in the middle of a word), then it is a hashtag match.
                if (offset === 0 || nonWordCharRegex.test(prevChar)) {
                    var matchedText = match[0], hashtag = match[0].slice(1); // strip off the '#' character at the beginning
                    matches.push(new HashtagMatch({
                        tagBuilder: tagBuilder,
                        matchedText: matchedText,
                        offset: offset,
                        serviceName: serviceName,
                        hashtag: hashtag
                    }));
                }
            }
            return matches;
        };
        return HashtagMatcher;
    }(Matcher));

    // RegExp objects which are shared by all instances of PhoneMatcher. These are
    // here to avoid re-instantiating the RegExp objects if `Autolinker.link()` is
    // called multiple times, thus instantiating PhoneMatcher and its RegExp 
    // objects each time (which is very expensive - see https://github.com/gregjacobs/Autolinker.js/issues/314). 
    // See descriptions of the properties where they are used for details about them
    var phoneMatcherRegex = /(?:(?:(?:(\+)?\d{1,3}[-\040.]?)?\(?\d{3}\)?[-\040.]?\d{3}[-\040.]?\d{4})|(?:(\+)(?:9[976]\d|8[987530]\d|6[987]\d|5[90]\d|42\d|3[875]\d|2[98654321]\d|9[8543210]|8[6421]|6[6543210]|5[87654321]|4[987654310]|3[9643210]|2[70]|7|1)[-\040.]?(?:\d[-\040.]?){6,12}\d+))([,;]+[0-9]+#?)*/g;
    /**
     * @class Autolinker.matcher.Phone
     * @extends Autolinker.matcher.Matcher
     *
     * Matcher to find Phone number matches in an input string.
     *
     * See this class's superclass ({@link Autolinker.matcher.Matcher}) for more
     * details.
     */
    var PhoneMatcher = /** @class */ (function (_super) {
        __extends(PhoneMatcher, _super);
        function PhoneMatcher() {
            var _this = _super !== null && _super.apply(this, arguments) || this;
            /**
             * The regular expression to match Phone numbers. Example matches:
             *
             *     (123) 456-7890
             *     123 456 7890
             *     123-456-7890
             *     +18004441234,,;,10226420346#
             *     +1 (800) 444 1234
             *     10226420346#
             *     1-800-444-1234,1022,64,20346#
             *
             * This regular expression has the following capturing groups:
             *
             * 1 or 2. The prefixed '+' sign, if there is one.
             *
             * @protected
             * @property {RegExp} matcherRegex
             */
            _this.matcherRegex = phoneMatcherRegex;
            return _this;
        }
        /**
         * @inheritdoc
         */
        PhoneMatcher.prototype.parseMatches = function (text) {
            var matcherRegex = this.matcherRegex, tagBuilder = this.tagBuilder, matches = [], match;
            while ((match = matcherRegex.exec(text)) !== null) {
                // Remove non-numeric values from phone number string
                var matchedText = match[0], cleanNumber = matchedText.replace(/[^0-9,;#]/g, ''), // strip out non-digit characters exclude comma semicolon and #
                plusSign = !!(match[1] || match[2]), // match[ 1 ] or match[ 2 ] is the prefixed plus sign, if there is one
                before = match.index == 0 ? '' : text.substr(match.index - 1, 1), after = text.substr(match.index + matchedText.length, 1), contextClear = !before.match(/\d/) && !after.match(/\d/);
                if (this.testMatch(match[3]) && this.testMatch(matchedText) && contextClear) {
                    matches.push(new PhoneMatch({
                        tagBuilder: tagBuilder,
                        matchedText: matchedText,
                        offset: match.index,
                        number: cleanNumber,
                        plusSign: plusSign
                    }));
                }
            }
            return matches;
        };
        PhoneMatcher.prototype.testMatch = function (text) {
            return nonDigitRe.test(text);
        };
        return PhoneMatcher;
    }(Matcher));

    // RegExp objects which are shared by all instances of MentionMatcher. These are
    // here to avoid re-instantiating the RegExp objects if `Autolinker.link()` is
    // called multiple times, thus instantiating MentionMatcher and its RegExp 
    // objects each time (which is very expensive - see https://github.com/gregjacobs/Autolinker.js/issues/314). 
    // See descriptions of the properties where they are used for details about them
    var twitterRegex = new RegExp("@[_" + alphaNumericAndMarksCharsStr + "]{1,50}(?![_" + alphaNumericAndMarksCharsStr + "])", 'g'); // lookahead used to make sure we don't match something above 50 characters
    var instagramRegex = new RegExp("@[_." + alphaNumericAndMarksCharsStr + "]{1,30}(?![_" + alphaNumericAndMarksCharsStr + "])", 'g'); // lookahead used to make sure we don't match something above 30 characters
    var soundcloudRegex = new RegExp("@[-_." + alphaNumericAndMarksCharsStr + "]{1,50}(?![-_" + alphaNumericAndMarksCharsStr + "])", 'g'); // lookahead used to make sure we don't match something above 50 characters
    var nonWordCharRegex$1 = new RegExp('[^' + alphaNumericAndMarksCharsStr + ']');
    /**
     * @class Autolinker.matcher.Mention
     * @extends Autolinker.matcher.Matcher
     *
     * Matcher to find/replace username matches in an input string.
     */
    var MentionMatcher = /** @class */ (function (_super) {
        __extends(MentionMatcher, _super);
        /**
         * @method constructor
         * @param {Object} cfg The configuration properties for the Match instance,
         *   specified in an Object (map).
         */
        function MentionMatcher(cfg) {
            var _this = _super.call(this, cfg) || this;
            /**
             * @cfg {'twitter'/'instagram'/'soundcloud'} protected
             *
             * The name of service to link @mentions to.
             *
             * Valid values are: 'twitter', 'instagram', or 'soundcloud'
             */
            _this.serviceName = 'twitter'; // default value just to get the above doc comment in the ES5 output and documentation generator
            /**
             * Hash of regular expression to match username handles. Example match:
             *
             *     @asdf
             *
             * @private
             * @property {Object} matcherRegexes
             */
            _this.matcherRegexes = {
                'twitter': twitterRegex,
                'instagram': instagramRegex,
                'soundcloud': soundcloudRegex
            };
            /**
             * The regular expression to use to check the character before a username match to
             * make sure we didn't accidentally match an email address.
             *
             * For example, the string "asdf@asdf.com" should not match "@asdf" as a username.
             *
             * @private
             * @property {RegExp} nonWordCharRegex
             */
            _this.nonWordCharRegex = nonWordCharRegex$1;
            _this.serviceName = cfg.serviceName;
            return _this;
        }
        /**
         * @inheritdoc
         */
        MentionMatcher.prototype.parseMatches = function (text) {
            var serviceName = this.serviceName, matcherRegex = this.matcherRegexes[this.serviceName], nonWordCharRegex = this.nonWordCharRegex, tagBuilder = this.tagBuilder, matches = [], match;
            if (!matcherRegex) {
                return matches;
            }
            while ((match = matcherRegex.exec(text)) !== null) {
                var offset = match.index, prevChar = text.charAt(offset - 1);
                // If we found the match at the beginning of the string, or we found the match
                // and there is a whitespace char in front of it (meaning it is not an email
                // address), then it is a username match.
                if (offset === 0 || nonWordCharRegex.test(prevChar)) {
                    var matchedText = match[0].replace(/\.+$/g, ''), // strip off trailing .
                    mention = matchedText.slice(1); // strip off the '@' character at the beginning
                    matches.push(new MentionMatch({
                        tagBuilder: tagBuilder,
                        matchedText: matchedText,
                        offset: offset,
                        serviceName: serviceName,
                        mention: mention
                    }));
                }
            }
            return matches;
        };
        return MentionMatcher;
    }(Matcher));

    // For debugging: search for other "For debugging" lines
    // import CliTable from 'cli-table';
    /**
     * Parses an HTML string, calling the callbacks to notify of tags and text.
     *
     * ## History
     *
     * This file previously used a regular expression to find html tags in the input
     * text. Unfortunately, we ran into a bunch of catastrophic backtracking issues
     * with certain input text, causing Autolinker to either hang or just take a
     * really long time to parse the string.
     *
     * The current code is intended to be a O(n) algorithm that walks through
     * the string in one pass, and tries to be as cheap as possible. We don't need
     * to implement the full HTML spec, but rather simply determine where the string
     * looks like an HTML tag, and where it looks like text (so that we can autolink
     * that).
     *
     * This state machine parser is intended just to be a simple but performant
     * parser of HTML for the subset of requirements we have. We simply need to:
     *
     * 1. Determine where HTML tags are
     * 2. Determine the tag name (Autolinker specifically only cares about <a>,
     *    <script>, and <style> tags, so as not to link any text within them)
     *
     * We don't need to:
     *
     * 1. Create a parse tree
     * 2. Auto-close tags with invalid markup
     * 3. etc.
     *
     * The other intention behind this is that we didn't want to add external
     * dependencies on the Autolinker utility which would increase its size. For
     * instance, adding htmlparser2 adds 125kb to the minified output file,
     * increasing its final size from 47kb to 172kb (at the time of writing). It
     * also doesn't work exactly correctly, treating the string "<3 blah blah blah"
     * as an HTML tag.
     *
     * Reference for HTML spec:
     *
     *     https://www.w3.org/TR/html51/syntax.html#sec-tokenization
     *
     * @param {String} html The HTML to parse
     * @param {Object} callbacks
     * @param {Function} callbacks.onOpenTag Callback function to call when an open
     *   tag is parsed. Called with the tagName as its argument.
     * @param {Function} callbacks.onCloseTag Callback function to call when a close
     *   tag is parsed. Called with the tagName as its argument. If a self-closing
     *   tag is found, `onCloseTag` is called immediately after `onOpenTag`.
     * @param {Function} callbacks.onText Callback function to call when text (i.e
     *   not an HTML tag) is parsed. Called with the text (string) as its first
     *   argument, and offset (number) into the string as its second.
     */
    function parseHtml(html, _a) {
        var onOpenTag = _a.onOpenTag, onCloseTag = _a.onCloseTag, onText = _a.onText, onComment = _a.onComment, onDoctype = _a.onDoctype;
        var noCurrentTag = new CurrentTag();
        var charIdx = 0, len = html.length, state = 0 /* Data */, currentDataIdx = 0, // where the current data start index is
        currentTag = noCurrentTag; // describes the current tag that is being read
        // For debugging: search for other "For debugging" lines
        // const table = new CliTable( {
        // 	head: [ 'charIdx', 'char', 'state', 'currentDataIdx', 'currentOpenTagIdx', 'tag.type' ]
        // } );
        while (charIdx < len) {
            var char = html.charAt(charIdx);
            // For debugging: search for other "For debugging" lines
            // ALSO: Temporarily remove the 'const' keyword on the State enum
            // table.push( 
            // 	[ charIdx, char, State[ state ], currentDataIdx, currentTag.idx, currentTag.idx === -1 ? '' : currentTag.type ] 
            // );
            switch (state) {
                case 0 /* Data */:
                    stateData(char);
                    break;
                case 1 /* TagOpen */:
                    stateTagOpen(char);
                    break;
                case 2 /* EndTagOpen */:
                    stateEndTagOpen(char);
                    break;
                case 3 /* TagName */:
                    stateTagName(char);
                    break;
                case 4 /* BeforeAttributeName */:
                    stateBeforeAttributeName(char);
                    break;
                case 5 /* AttributeName */:
                    stateAttributeName(char);
                    break;
                case 6 /* AfterAttributeName */:
                    stateAfterAttributeName(char);
                    break;
                case 7 /* BeforeAttributeValue */:
                    stateBeforeAttributeValue(char);
                    break;
                case 8 /* AttributeValueDoubleQuoted */:
                    stateAttributeValueDoubleQuoted(char);
                    break;
                case 9 /* AttributeValueSingleQuoted */:
                    stateAttributeValueSingleQuoted(char);
                    break;
                case 10 /* AttributeValueUnquoted */:
                    stateAttributeValueUnquoted(char);
                    break;
                case 11 /* AfterAttributeValueQuoted */:
                    stateAfterAttributeValueQuoted(char);
                    break;
                case 12 /* SelfClosingStartTag */:
                    stateSelfClosingStartTag(char);
                    break;
                case 13 /* MarkupDeclarationOpenState */:
                    stateMarkupDeclarationOpen(char);
                    break;
                case 14 /* CommentStart */:
                    stateCommentStart(char);
                    break;
                case 15 /* CommentStartDash */:
                    stateCommentStartDash(char);
                    break;
                case 16 /* Comment */:
                    stateComment(char);
                    break;
                case 17 /* CommentEndDash */:
                    stateCommentEndDash(char);
                    break;
                case 18 /* CommentEnd */:
                    stateCommentEnd(char);
                    break;
                case 19 /* CommentEndBang */:
                    stateCommentEndBang(char);
                    break;
                case 20 /* Doctype */:
                    stateDoctype(char);
                    break;
                default:
                    throwUnhandledCaseError(state);
            }
            // For debugging: search for other "For debugging" lines
            // ALSO: Temporarily remove the 'const' keyword on the State enum
            // table.push( 
            // 	[ charIdx, char, State[ state ], currentDataIdx, currentTag.idx, currentTag.idx === -1 ? '' : currentTag.type ] 
            // );
            charIdx++;
        }
        if (currentDataIdx < charIdx) {
            emitText();
        }
        // For debugging: search for other "For debugging" lines
        // console.log( '\n' + table.toString() );
        // Called when non-tags are being read (i.e. the text around HTML †ags)
        // https://www.w3.org/TR/html51/syntax.html#data-state
        function stateData(char) {
            if (char === '<') {
                startNewTag();
            }
        }
        // Called after a '<' is read from the Data state
        // https://www.w3.org/TR/html51/syntax.html#tag-open-state
        function stateTagOpen(char) {
            if (char === '!') {
                state = 13 /* MarkupDeclarationOpenState */;
            }
            else if (char === '/') {
                state = 2 /* EndTagOpen */;
                currentTag = new CurrentTag(__assign({}, currentTag, { isClosing: true }));
            }
            else if (char === '<') {
                // start of another tag (ignore the previous, incomplete one)
                startNewTag();
            }
            else if (letterRe.test(char)) {
                // tag name start (and no '/' read)
                state = 3 /* TagName */;
                currentTag = new CurrentTag(__assign({}, currentTag, { isOpening: true }));
            }
            else {
                // Any other 
                state = 0 /* Data */;
                currentTag = noCurrentTag;
            }
        }
        // After a '<x', '</x' sequence is read (where 'x' is a letter character), 
        // this is to continue reading the tag name
        // https://www.w3.org/TR/html51/syntax.html#tag-name-state
        function stateTagName(char) {
            if (whitespaceRe.test(char)) {
                currentTag = new CurrentTag(__assign({}, currentTag, { name: captureTagName() }));
                state = 4 /* BeforeAttributeName */;
            }
            else if (char === '<') {
                // start of another tag (ignore the previous, incomplete one)
                startNewTag();
            }
            else if (char === '/') {
                currentTag = new CurrentTag(__assign({}, currentTag, { name: captureTagName() }));
                state = 12 /* SelfClosingStartTag */;
            }
            else if (char === '>') {
                currentTag = new CurrentTag(__assign({}, currentTag, { name: captureTagName() }));
                emitTagAndPreviousTextNode(); // resets to Data state as well
            }
            else if (!letterRe.test(char) && !digitRe.test(char) && char !== ':') {
                // Anything else that does not form an html tag. Note: the colon 
                // character is accepted for XML namespaced tags
                resetToDataState();
            }
        }
        // Called after the '/' is read from a '</' sequence
        // https://www.w3.org/TR/html51/syntax.html#end-tag-open-state
        function stateEndTagOpen(char) {
            if (char === '>') { // parse error. Encountered "</>". Skip it without treating as a tag
                resetToDataState();
            }
            else if (letterRe.test(char)) {
                state = 3 /* TagName */;
            }
            else {
                // some other non-tag-like character, don't treat this as a tag
                resetToDataState();
            }
        }
        // https://www.w3.org/TR/html51/syntax.html#before-attribute-name-state
        function stateBeforeAttributeName(char) {
            if (whitespaceRe.test(char)) ;
            else if (char === '/') {
                state = 12 /* SelfClosingStartTag */;
            }
            else if (char === '>') {
                emitTagAndPreviousTextNode(); // resets to Data state as well
            }
            else if (char === '<') {
                // start of another tag (ignore the previous, incomplete one)
                startNewTag();
            }
            else if (char === "=" || quoteRe.test(char) || controlCharsRe.test(char)) {
                // "Parse error" characters that, according to the spec, should be
                // appended to the attribute name, but we'll treat these characters
                // as not forming a real HTML tag
                resetToDataState();
            }
            else {
                // Any other char, start of a new attribute name
                state = 5 /* AttributeName */;
            }
        }
        // https://www.w3.org/TR/html51/syntax.html#attribute-name-state
        function stateAttributeName(char) {
            if (whitespaceRe.test(char)) {
                state = 6 /* AfterAttributeName */;
            }
            else if (char === '/') {
                state = 12 /* SelfClosingStartTag */;
            }
            else if (char === '=') {
                state = 7 /* BeforeAttributeValue */;
            }
            else if (char === '>') {
                emitTagAndPreviousTextNode(); // resets to Data state as well
            }
            else if (char === '<') {
                // start of another tag (ignore the previous, incomplete one)
                startNewTag();
            }
            else if (quoteRe.test(char)) {
                // "Parse error" characters that, according to the spec, should be
                // appended to the attribute name, but we'll treat these characters
                // as not forming a real HTML tag
                resetToDataState();
            }
        }
        // https://www.w3.org/TR/html51/syntax.html#after-attribute-name-state
        function stateAfterAttributeName(char) {
            if (whitespaceRe.test(char)) ;
            else if (char === '/') {
                state = 12 /* SelfClosingStartTag */;
            }
            else if (char === '=') {
                state = 7 /* BeforeAttributeValue */;
            }
            else if (char === '>') {
                emitTagAndPreviousTextNode();
            }
            else if (char === '<') {
                // start of another tag (ignore the previous, incomplete one)
                startNewTag();
            }
            else if (quoteRe.test(char)) {
                // "Parse error" characters that, according to the spec, should be
                // appended to the attribute name, but we'll treat these characters
                // as not forming a real HTML tag
                resetToDataState();
            }
            else {
                // Any other character, start a new attribute in the current tag
                state = 5 /* AttributeName */;
            }
        }
        // https://www.w3.org/TR/html51/syntax.html#before-attribute-value-state
        function stateBeforeAttributeValue(char) {
            if (whitespaceRe.test(char)) ;
            else if (char === "\"") {
                state = 8 /* AttributeValueDoubleQuoted */;
            }
            else if (char === "'") {
                state = 9 /* AttributeValueSingleQuoted */;
            }
            else if (/[>=`]/.test(char)) {
                // Invalid chars after an '=' for an attribute value, don't count 
                // the current tag as an HTML tag
                resetToDataState();
            }
            else if (char === '<') {
                // start of another tag (ignore the previous, incomplete one)
                startNewTag();
            }
            else {
                // Any other character, consider it an unquoted attribute value
                state = 10 /* AttributeValueUnquoted */;
            }
        }
        // https://www.w3.org/TR/html51/syntax.html#attribute-value-double-quoted-state
        function stateAttributeValueDoubleQuoted(char) {
            if (char === "\"") { // end the current double-quoted attribute
                state = 11 /* AfterAttributeValueQuoted */;
            }
        }
        // https://www.w3.org/TR/html51/syntax.html#attribute-value-single-quoted-state
        function stateAttributeValueSingleQuoted(char) {
            if (char === "'") { // end the current single-quoted attribute
                state = 11 /* AfterAttributeValueQuoted */;
            }
        }
        // https://www.w3.org/TR/html51/syntax.html#attribute-value-unquoted-state
        function stateAttributeValueUnquoted(char) {
            if (whitespaceRe.test(char)) {
                state = 4 /* BeforeAttributeName */;
            }
            else if (char === '>') {
                emitTagAndPreviousTextNode();
            }
            else if (char === '<') {
                // start of another tag (ignore the previous, incomplete one)
                startNewTag();
            }
        }
        // https://www.w3.org/TR/html51/syntax.html#after-attribute-value-quoted-state
        function stateAfterAttributeValueQuoted(char) {
            if (whitespaceRe.test(char)) {
                state = 4 /* BeforeAttributeName */;
            }
            else if (char === '/') {
                state = 12 /* SelfClosingStartTag */;
            }
            else if (char === '>') {
                emitTagAndPreviousTextNode();
            }
            else if (char === '<') {
                // start of another tag (ignore the previous, incomplete one)
                startNewTag();
            }
            else {
                // Any other character, "parse error". Spec says to switch to the
                // BeforeAttributeState and re-consume the character, as it may be
                // the start of a new attribute name
                state = 4 /* BeforeAttributeName */;
                reconsumeCurrentCharacter();
            }
        }
        // A '/' has just been read in the current tag (presumably for '/>'), and 
        // this handles the next character
        // https://www.w3.org/TR/html51/syntax.html#self-closing-start-tag-state
        function stateSelfClosingStartTag(char) {
            if (char === '>') {
                currentTag = new CurrentTag(__assign({}, currentTag, { isClosing: true }));
                emitTagAndPreviousTextNode(); // resets to Data state as well
            }
            else {
                state = 4 /* BeforeAttributeName */;
            }
        }
        // https://www.w3.org/TR/html51/syntax.html#markup-declaration-open-state
        // (HTML Comments or !DOCTYPE)
        function stateMarkupDeclarationOpen(char) {
            if (html.substr(charIdx, 2) === '--') { // html comment
                charIdx += 2; // "consume" characters
                currentTag = new CurrentTag(__assign({}, currentTag, { type: 'comment' }));
                state = 14 /* CommentStart */;
            }
            else if (html.substr(charIdx, 7).toUpperCase() === 'DOCTYPE') {
                charIdx += 7; // "consume" characters
                currentTag = new CurrentTag(__assign({}, currentTag, { type: 'doctype' }));
                state = 20 /* Doctype */;
            }
            else {
                // At this point, the spec specifies that the state machine should
                // enter the "bogus comment" state, in which case any character(s) 
                // after the '<!' that were read should become an HTML comment up
                // until the first '>' that is read (or EOF). Instead, we'll assume
                // that a user just typed '<!' as part of text data
                resetToDataState();
            }
        }
        // Handles after the sequence '<!--' has been read
        // https://www.w3.org/TR/html51/syntax.html#comment-start-state
        function stateCommentStart(char) {
            if (char === '-') {
                // We've read the sequence '<!---' at this point (3 dashes)
                state = 15 /* CommentStartDash */;
            }
            else if (char === '>') {
                // At this point, we'll assume the comment wasn't a real comment
                // so we'll just emit it as data. We basically read the sequence 
                // '<!-->'
                resetToDataState();
            }
            else {
                // Any other char, take it as part of the comment
                state = 16 /* Comment */;
            }
        }
        // We've read the sequence '<!---' at this point (3 dashes)
        // https://www.w3.org/TR/html51/syntax.html#comment-start-dash-state
        function stateCommentStartDash(char) {
            if (char === '-') {
                // We've read '<!----' (4 dashes) at this point
                state = 18 /* CommentEnd */;
            }
            else if (char === '>') {
                // At this point, we'll assume the comment wasn't a real comment
                // so we'll just emit it as data. We basically read the sequence 
                // '<!--->'
                resetToDataState();
            }
            else {
                // Anything else, take it as a valid comment
                state = 16 /* Comment */;
            }
        }
        // Currently reading the comment's text (data)
        // https://www.w3.org/TR/html51/syntax.html#comment-state
        function stateComment(char) {
            if (char === '-') {
                state = 17 /* CommentEndDash */;
            }
        }
        // When we we've read the first dash inside a comment, it may signal the
        // end of the comment if we read another dash
        // https://www.w3.org/TR/html51/syntax.html#comment-end-dash-state
        function stateCommentEndDash(char) {
            if (char === '-') {
                state = 18 /* CommentEnd */;
            }
            else {
                // Wasn't a dash, must still be part of the comment
                state = 16 /* Comment */;
            }
        }
        // After we've read two dashes inside a comment, it may signal the end of 
        // the comment if we then read a '>' char
        // https://www.w3.org/TR/html51/syntax.html#comment-end-state
        function stateCommentEnd(char) {
            if (char === '>') {
                emitTagAndPreviousTextNode();
            }
            else if (char === '!') {
                state = 19 /* CommentEndBang */;
            }
            else if (char === '-') ;
            else {
                // Anything else, switch back to the comment state since we didn't
                // read the full "end comment" sequence (i.e. '-->')
                state = 16 /* Comment */;
            }
        }
        // We've read the sequence '--!' inside of a comment
        // https://www.w3.org/TR/html51/syntax.html#comment-end-bang-state
        function stateCommentEndBang(char) {
            if (char === '-') {
                // We read the sequence '--!-' inside of a comment. The last dash
                // could signify that the comment is going to close
                state = 17 /* CommentEndDash */;
            }
            else if (char === '>') {
                // End of comment with the sequence '--!>'
                emitTagAndPreviousTextNode();
            }
            else {
                // The '--!' was not followed by a '>', continue reading the 
                // comment's text
                state = 16 /* Comment */;
            }
        }
        /**
         * For DOCTYPES in particular, we don't care about the attributes. Just
         * advance to the '>' character and emit the tag, unless we find a '<'
         * character in which case we'll start a new tag.
         *
         * Example doctype tag:
         *    <!DOCTYPE HTML PUBLIC "-//W3C//DTD HTML 4.01//EN" "http://www.w3.org/TR/html4/strict.dtd">
         *
         * Actual spec: https://www.w3.org/TR/html51/syntax.html#doctype-state
         */
        function stateDoctype(char) {
            if (char === '>') {
                emitTagAndPreviousTextNode();
            }
            else if (char === '<') {
                startNewTag();
            }
        }
        /**
         * Resets the state back to the Data state, and removes the current tag.
         *
         * We'll generally run this function whenever a "parse error" is
         * encountered, where the current tag that is being read no longer looks
         * like a real HTML tag.
         */
        function resetToDataState() {
            state = 0 /* Data */;
            currentTag = noCurrentTag;
        }
        /**
         * Starts a new HTML tag at the current index, ignoring any previous HTML
         * tag that was being read.
         *
         * We'll generally run this function whenever we read a new '<' character,
         * including when we read a '<' character inside of an HTML tag that we were
         * previously reading.
         */
        function startNewTag() {
            state = 1 /* TagOpen */;
            currentTag = new CurrentTag({ idx: charIdx });
        }
        /**
         * Once we've decided to emit an open tag, that means we can also emit the
         * text node before it.
         */
        function emitTagAndPreviousTextNode() {
            var textBeforeTag = html.slice(currentDataIdx, currentTag.idx);
            if (textBeforeTag) {
                // the html tag was the first element in the html string, or two 
                // tags next to each other, in which case we should not emit a text 
                // node
                onText(textBeforeTag, currentDataIdx);
            }
            if (currentTag.type === 'comment') {
                onComment(currentTag.idx);
            }
            else if (currentTag.type === 'doctype') {
                onDoctype(currentTag.idx);
            }
            else {
                if (currentTag.isOpening) {
                    onOpenTag(currentTag.name, currentTag.idx);
                }
                if (currentTag.isClosing) { // note: self-closing tags will emit both opening and closing
                    onCloseTag(currentTag.name, currentTag.idx);
                }
            }
            // Since we just emitted a tag, reset to the data state for the next char
            resetToDataState();
            currentDataIdx = charIdx + 1;
        }
        function emitText() {
            var text = html.slice(currentDataIdx, charIdx);
            onText(text, currentDataIdx);
            currentDataIdx = charIdx + 1;
        }
        /**
         * Captures the tag name from the start of the tag to the current character
         * index, and converts it to lower case
         */
        function captureTagName() {
            var startIdx = currentTag.idx + (currentTag.isClosing ? 2 : 1);
            return html.slice(startIdx, charIdx).toLowerCase();
        }
        /**
         * Causes the main loop to re-consume the current character, such as after
         * encountering a "parse error" that changed state and needs to reconsume
         * the same character in that new state.
         */
        function reconsumeCurrentCharacter() {
            charIdx--;
        }
    }
    var CurrentTag = /** @class */ (function () {
        function CurrentTag(cfg) {
            if (cfg === void 0) { cfg = {}; }
            this.idx = cfg.idx !== undefined ? cfg.idx : -1;
            this.type = cfg.type || 'tag';
            this.name = cfg.name || '';
            this.isOpening = !!cfg.isOpening;
            this.isClosing = !!cfg.isClosing;
        }
        return CurrentTag;
    }());

    /**
     * @class Autolinker
     * @extends Object
     *
     * Utility class used to process a given string of text, and wrap the matches in
     * the appropriate anchor (&lt;a&gt;) tags to turn them into links.
     *
     * Any of the configuration options may be provided in an Object provided
     * to the Autolinker constructor, which will configure how the {@link #link link()}
     * method will process the links.
     *
     * For example:
     *
     *     var autolinker = new Autolinker( {
     *         newWindow : false,
     *         truncate  : 30
     *     } );
     *
     *     var html = autolinker.link( "Joe went to www.yahoo.com" );
     *     // produces: 'Joe went to <a href="http://www.yahoo.com">yahoo.com</a>'
     *
     *
     * The {@link #static-link static link()} method may also be used to inline
     * options into a single call, which may be more convenient for one-off uses.
     * For example:
     *
     *     var html = Autolinker.link( "Joe went to www.yahoo.com", {
     *         newWindow : false,
     *         truncate  : 30
     *     } );
     *     // produces: 'Joe went to <a href="http://www.yahoo.com">yahoo.com</a>'
     *
     *
     * ## Custom Replacements of Links
     *
     * If the configuration options do not provide enough flexibility, a {@link #replaceFn}
     * may be provided to fully customize the output of Autolinker. This function is
     * called once for each URL/Email/Phone#/Hashtag/Mention (Twitter, Instagram, Soundcloud)
     * match that is encountered.
     *
     * For example:
     *
     *     var input = "...";  // string with URLs, Email Addresses, Phone #s, Hashtags, and Mentions (Twitter, Instagram, Soundcloud)
     *
     *     var linkedText = Autolinker.link( input, {
     *         replaceFn : function( match ) {
     *             console.log( "href = ", match.getAnchorHref() );
     *             console.log( "text = ", match.getAnchorText() );
     *
     *             switch( match.getType() ) {
     *                 case 'url' :
     *                     console.log( "url: ", match.getUrl() );
     *
     *                     if( match.getUrl().indexOf( 'mysite.com' ) === -1 ) {
     *                         var tag = match.buildTag();  // returns an `Autolinker.HtmlTag` instance, which provides mutator methods for easy changes
     *                         tag.setAttr( 'rel', 'nofollow' );
     *                         tag.addClass( 'external-link' );
     *
     *                         return tag;
     *
     *                     } else {
     *                         return true;  // let Autolinker perform its normal anchor tag replacement
     *                     }
     *
     *                 case 'email' :
     *                     var email = match.getEmail();
     *                     console.log( "email: ", email );
     *
     *                     if( email === "my@own.address" ) {
     *                         return false;  // don't auto-link this particular email address; leave as-is
     *                     } else {
     *                         return;  // no return value will have Autolinker perform its normal anchor tag replacement (same as returning `true`)
     *                     }
     *
     *                 case 'phone' :
     *                     var phoneNumber = match.getPhoneNumber();
     *                     console.log( phoneNumber );
     *
     *                     return '<a href="http://newplace.to.link.phone.numbers.to/">' + phoneNumber + '</a>';
     *
     *                 case 'hashtag' :
     *                     var hashtag = match.getHashtag();
     *                     console.log( hashtag );
     *
     *                     return '<a href="http://newplace.to.link.hashtag.handles.to/">' + hashtag + '</a>';
     *
     *                 case 'mention' :
     *                     var mention = match.getMention();
     *                     console.log( mention );
     *
     *                     return '<a href="http://newplace.to.link.mention.to/">' + mention + '</a>';
     *             }
     *         }
     *     } );
     *
     *
     * The function may return the following values:
     *
     * - `true` (Boolean): Allow Autolinker to replace the match as it normally
     *   would.
     * - `false` (Boolean): Do not replace the current match at all - leave as-is.
     * - Any String: If a string is returned from the function, the string will be
     *   used directly as the replacement HTML for the match.
     * - An {@link Autolinker.HtmlTag} instance, which can be used to build/modify
     *   an HTML tag before writing out its HTML text.
     */
    var Autolinker = /** @class */ (function () {
        /**
         * @method constructor
         * @param {Object} [cfg] The configuration options for the Autolinker instance,
         *   specified in an Object (map).
         */
        function Autolinker(cfg) {
            if (cfg === void 0) { cfg = {}; }
            /**
             * The Autolinker version number exposed on the instance itself.
             *
             * Ex: 0.25.1
             */
            this.version = Autolinker.version;
            /**
             * @cfg {Boolean/Object} [urls]
             *
             * `true` if URLs should be automatically linked, `false` if they should not
             * be. Defaults to `true`.
             *
             * Examples:
             *
             *     urls: true
             *
             *     // or
             *
             *     urls: {
             *         schemeMatches : true,
             *         wwwMatches    : true,
             *         tldMatches    : true
             *     }
             *
             * As shown above, this option also accepts an Object form with 3 properties
             * to allow for more customization of what exactly gets linked. All default
             * to `true`:
             *
             * @cfg {Boolean} [urls.schemeMatches] `true` to match URLs found prefixed
             *   with a scheme, i.e. `http://google.com`, or `other+scheme://google.com`,
             *   `false` to prevent these types of matches.
             * @cfg {Boolean} [urls.wwwMatches] `true` to match urls found prefixed with
             *   `'www.'`, i.e. `www.google.com`. `false` to prevent these types of
             *   matches. Note that if the URL had a prefixed scheme, and
             *   `schemeMatches` is true, it will still be linked.
             * @cfg {Boolean} [urls.tldMatches] `true` to match URLs with known top
             *   level domains (.com, .net, etc.) that are not prefixed with a scheme or
             *   `'www.'`. This option attempts to match anything that looks like a URL
             *   in the given text. Ex: `google.com`, `asdf.org/?page=1`, etc. `false`
             *   to prevent these types of matches.
             */
            this.urls = {}; // default value just to get the above doc comment in the ES5 output and documentation generator
            /**
             * @cfg {Boolean} [email=true]
             *
             * `true` if email addresses should be automatically linked, `false` if they
             * should not be.
             */
            this.email = true; // default value just to get the above doc comment in the ES5 output and documentation generator
            /**
             * @cfg {Boolean} [phone=true]
             *
             * `true` if Phone numbers ("(555)555-5555") should be automatically linked,
             * `false` if they should not be.
             */
            this.phone = true; // default value just to get the above doc comment in the ES5 output and documentation generator
            /**
             * @cfg {Boolean/String} [hashtag=false]
             *
             * A string for the service name to have hashtags (ex: "#myHashtag")
             * auto-linked to. The currently-supported values are:
             *
             * - 'twitter'
             * - 'facebook'
             * - 'instagram'
             *
             * Pass `false` to skip auto-linking of hashtags.
             */
            this.hashtag = false; // default value just to get the above doc comment in the ES5 output and documentation generator
            /**
             * @cfg {String/Boolean} [mention=false]
             *
             * A string for the service name to have mentions (ex: "@myuser")
             * auto-linked to. The currently supported values are:
             *
             * - 'twitter'
             * - 'instagram'
             * - 'soundcloud'
             *
             * Defaults to `false` to skip auto-linking of mentions.
             */
            this.mention = false; // default value just to get the above doc comment in the ES5 output and documentation generator
            /**
             * @cfg {Boolean} [newWindow=true]
             *
             * `true` if the links should open in a new window, `false` otherwise.
             */
            this.newWindow = true; // default value just to get the above doc comment in the ES5 output and documentation generator
            /**
             * @cfg {Boolean/Object} [stripPrefix=true]
             *
             * `true` if 'http://' (or 'https://') and/or the 'www.' should be stripped
             * from the beginning of URL links' text, `false` otherwise. Defaults to
             * `true`.
             *
             * Examples:
             *
             *     stripPrefix: true
             *
             *     // or
             *
             *     stripPrefix: {
             *         scheme : true,
             *         www    : true
             *     }
             *
             * As shown above, this option also accepts an Object form with 2 properties
             * to allow for more customization of what exactly is prevented from being
             * displayed. Both default to `true`:
             *
             * @cfg {Boolean} [stripPrefix.scheme] `true` to prevent the scheme part of
             *   a URL match from being displayed to the user. Example:
             *   `'http://google.com'` will be displayed as `'google.com'`. `false` to
             *   not strip the scheme. NOTE: Only an `'http://'` or `'https://'` scheme
             *   will be removed, so as not to remove a potentially dangerous scheme
             *   (such as `'file://'` or `'javascript:'`)
             * @cfg {Boolean} [stripPrefix.www] www (Boolean): `true` to prevent the
             *   `'www.'` part of a URL match from being displayed to the user. Ex:
             *   `'www.google.com'` will be displayed as `'google.com'`. `false` to not
             *   strip the `'www'`.
             */
            this.stripPrefix = { scheme: true, www: true }; // default value just to get the above doc comment in the ES5 output and documentation generator
            /**
             * @cfg {Boolean} [stripTrailingSlash=true]
             *
             * `true` to remove the trailing slash from URL matches, `false` to keep
             *  the trailing slash.
             *
             *  Example when `true`: `http://google.com/` will be displayed as
             *  `http://google.com`.
             */
            this.stripTrailingSlash = true; // default value just to get the above doc comment in the ES5 output and documentation generator
            /**
             * @cfg {Boolean} [decodePercentEncoding=true]
             *
             * `true` to decode percent-encoded characters in URL matches, `false` to keep
             *  the percent-encoded characters.
             *
             *  Example when `true`: `https://en.wikipedia.org/wiki/San_Jos%C3%A9` will
             *  be displayed as `https://en.wikipedia.org/wiki/San_José`.
             */
            this.decodePercentEncoding = true; // default value just to get the above doc comment in the ES5 output and documentation generator
            /**
             * @cfg {Number/Object} [truncate=0]
             *
             * ## Number Form
             *
             * A number for how many characters matched text should be truncated to
             * inside the text of a link. If the matched text is over this number of
             * characters, it will be truncated to this length by adding a two period
             * ellipsis ('..') to the end of the string.
             *
             * For example: A url like 'http://www.yahoo.com/some/long/path/to/a/file'
             * truncated to 25 characters might look something like this:
             * 'yahoo.com/some/long/pat..'
             *
             * Example Usage:
             *
             *     truncate: 25
             *
             *
             *  Defaults to `0` for "no truncation."
             *
             *
             * ## Object Form
             *
             * An Object may also be provided with two properties: `length` (Number) and
             * `location` (String). `location` may be one of the following: 'end'
             * (default), 'middle', or 'smart'.
             *
             * Example Usage:
             *
             *     truncate: { length: 25, location: 'middle' }
             *
             * @cfg {Number} [truncate.length=0] How many characters to allow before
             *   truncation will occur. Defaults to `0` for "no truncation."
             * @cfg {"end"/"middle"/"smart"} [truncate.location="end"]
             *
             * - 'end' (default): will truncate up to the number of characters, and then
             *   add an ellipsis at the end. Ex: 'yahoo.com/some/long/pat..'
             * - 'middle': will truncate and add the ellipsis in the middle. Ex:
             *   'yahoo.com/s..th/to/a/file'
             * - 'smart': for URLs where the algorithm attempts to strip out unnecessary
             *   parts first (such as the 'www.', then URL scheme, hash, etc.),
             *   attempting to make the URL human-readable before looking for a good
             *   point to insert the ellipsis if it is still too long. Ex:
             *   'yahoo.com/some..to/a/file'. For more details, see
             *   {@link Autolinker.truncate.TruncateSmart}.
             */
            this.truncate = { length: 0, location: 'end' }; // default value just to get the above doc comment in the ES5 output and documentation generator
            /**
             * @cfg {String} className
             *
             * A CSS class name to add to the generated links. This class will be added
             * to all links, as well as this class plus match suffixes for styling
             * url/email/phone/hashtag/mention links differently.
             *
             * For example, if this config is provided as "myLink", then:
             *
             * - URL links will have the CSS classes: "myLink myLink-url"
             * - Email links will have the CSS classes: "myLink myLink-email", and
             * - Phone links will have the CSS classes: "myLink myLink-phone"
             * - Hashtag links will have the CSS classes: "myLink myLink-hashtag"
             * - Mention links will have the CSS classes: "myLink myLink-mention myLink-[type]"
             *   where [type] is either "instagram", "twitter" or "soundcloud"
             */
            this.className = ''; // default value just to get the above doc comment in the ES5 output and documentation generator
            /**
             * @cfg {Function} replaceFn
             *
             * A function to individually process each match found in the input string.
             *
             * See the class's description for usage.
             *
             * The `replaceFn` can be called with a different context object (`this`
             * reference) using the {@link #context} cfg.
             *
             * This function is called with the following parameter:
             *
             * @cfg {Autolinker.match.Match} replaceFn.match The Match instance which
             *   can be used to retrieve information about the match that the `replaceFn`
             *   is currently processing. See {@link Autolinker.match.Match} subclasses
             *   for details.
             */
            this.replaceFn = null; // default value just to get the above doc comment in the ES5 output and documentation generator
            /**
             * @cfg {Object} context
             *
             * The context object (`this` reference) to call the `replaceFn` with.
             *
             * Defaults to this Autolinker instance.
             */
            this.context = undefined; // default value just to get the above doc comment in the ES5 output and documentation generator
            /**
             * @cfg {Boolean} [sanitizeHtml=false]
             *
             * `true` to HTML-encode the start and end brackets of existing HTML tags found
             * in the input string. This will escape `<` and `>` characters to `&lt;` and
             * `&gt;`, respectively.
             *
             * Setting this to `true` will prevent XSS (Cross-site Scripting) attacks,
             * but will remove the significance of existing HTML tags in the input string. If
             * you would like to maintain the significance of existing HTML tags while also
             * making the output HTML string safe, leave this option as `false` and use a
             * tool like https://github.com/cure53/DOMPurify (or others) on the input string
             * before running Autolinker.
             */
            this.sanitizeHtml = false; // default value just to get the above doc comment in the ES5 output and documentation generator
            /**
             * @private
             * @property {Autolinker.matcher.Matcher[]} matchers
             *
             * The {@link Autolinker.matcher.Matcher} instances for this Autolinker
             * instance.
             *
             * This is lazily created in {@link #getMatchers}.
             */
            this.matchers = null;
            /**
             * @private
             * @property {Autolinker.AnchorTagBuilder} tagBuilder
             *
             * The AnchorTagBuilder instance used to build match replacement anchor tags.
             * Note: this is lazily instantiated in the {@link #getTagBuilder} method.
             */
            this.tagBuilder = null;
            // Note: when `this.something` is used in the rhs of these assignments,
            //       it refers to the default values set above the constructor
            this.urls = this.normalizeUrlsCfg(cfg.urls);
            this.email = typeof cfg.email === 'boolean' ? cfg.email : this.email;
            this.phone = typeof cfg.phone === 'boolean' ? cfg.phone : this.phone;
            this.hashtag = cfg.hashtag || this.hashtag;
            this.mention = cfg.mention || this.mention;
            this.newWindow = typeof cfg.newWindow === 'boolean' ? cfg.newWindow : this.newWindow;
            this.stripPrefix = this.normalizeStripPrefixCfg(cfg.stripPrefix);
            this.stripTrailingSlash = typeof cfg.stripTrailingSlash === 'boolean' ? cfg.stripTrailingSlash : this.stripTrailingSlash;
            this.decodePercentEncoding = typeof cfg.decodePercentEncoding === 'boolean' ? cfg.decodePercentEncoding : this.decodePercentEncoding;
            this.sanitizeHtml = cfg.sanitizeHtml || false;
            // Validate the value of the `mention` cfg
            var mention = this.mention;
            if (mention !== false && mention !== 'twitter' && mention !== 'instagram' && mention !== 'soundcloud') {
                throw new Error("invalid `mention` cfg - see docs");
            }
            // Validate the value of the `hashtag` cfg
            var hashtag = this.hashtag;
            if (hashtag !== false && hashtag !== 'twitter' && hashtag !== 'facebook' && hashtag !== 'instagram') {
                throw new Error("invalid `hashtag` cfg - see docs");
            }
            this.truncate = this.normalizeTruncateCfg(cfg.truncate);
            this.className = cfg.className || this.className;
            this.replaceFn = cfg.replaceFn || this.replaceFn;
            this.context = cfg.context || this;
        }
        /**
         * Automatically links URLs, Email addresses, Phone Numbers, Twitter handles,
         * Hashtags, and Mentions found in the given chunk of HTML. Does not link URLs
         * found within HTML tags.
         *
         * For instance, if given the text: `You should go to http://www.yahoo.com`,
         * then the result will be `You should go to &lt;a href="http://www.yahoo.com"&gt;http://www.yahoo.com&lt;/a&gt;`
         *
         * Example:
         *
         *     var linkedText = Autolinker.link( "Go to google.com", { newWindow: false } );
         *     // Produces: "Go to <a href="http://google.com">google.com</a>"
         *
         * @static
         * @param {String} textOrHtml The HTML or text to find matches within (depending
         *   on if the {@link #urls}, {@link #email}, {@link #phone}, {@link #mention},
         *   {@link #hashtag}, and {@link #mention} options are enabled).
         * @param {Object} [options] Any of the configuration options for the Autolinker
         *   class, specified in an Object (map). See the class description for an
         *   example call.
         * @return {String} The HTML text, with matches automatically linked.
         */
        Autolinker.link = function (textOrHtml, options) {
            var autolinker = new Autolinker(options);
            return autolinker.link(textOrHtml);
        };
        /**
         * Parses the input `textOrHtml` looking for URLs, email addresses, phone
         * numbers, username handles, and hashtags (depending on the configuration
         * of the Autolinker instance), and returns an array of {@link Autolinker.match.Match}
         * objects describing those matches (without making any replacements).
         *
         * Note that if parsing multiple pieces of text, it is slightly more efficient
         * to create an Autolinker instance, and use the instance-level {@link #parse}
         * method.
         *
         * Example:
         *
         *     var matches = Autolinker.parse( "Hello google.com, I am asdf@asdf.com", {
         *         urls: true,
         *         email: true
         *     } );
         *
         *     console.log( matches.length );           // 2
         *     console.log( matches[ 0 ].getType() );   // 'url'
         *     console.log( matches[ 0 ].getUrl() );    // 'google.com'
         *     console.log( matches[ 1 ].getType() );   // 'email'
         *     console.log( matches[ 1 ].getEmail() );  // 'asdf@asdf.com'
         *
         * @static
         * @param {String} textOrHtml The HTML or text to find matches within
         *   (depending on if the {@link #urls}, {@link #email}, {@link #phone},
         *   {@link #hashtag}, and {@link #mention} options are enabled).
         * @param {Object} [options] Any of the configuration options for the Autolinker
         *   class, specified in an Object (map). See the class description for an
         *   example call.
         * @return {Autolinker.match.Match[]} The array of Matches found in the
         *   given input `textOrHtml`.
         */
        Autolinker.parse = function (textOrHtml, options) {
            var autolinker = new Autolinker(options);
            return autolinker.parse(textOrHtml);
        };
        /**
         * Normalizes the {@link #urls} config into an Object with 3 properties:
         * `schemeMatches`, `wwwMatches`, and `tldMatches`, all Booleans.
         *
         * See {@link #urls} config for details.
         *
         * @private
         * @param {Boolean/Object} urls
         * @return {Object}
         */
        Autolinker.prototype.normalizeUrlsCfg = function (urls) {
            if (urls == null)
                urls = true; // default to `true`
            if (typeof urls === 'boolean') {
                return { schemeMatches: urls, wwwMatches: urls, tldMatches: urls };
            }
            else { // object form
                return {
                    schemeMatches: typeof urls.schemeMatches === 'boolean' ? urls.schemeMatches : true,
                    wwwMatches: typeof urls.wwwMatches === 'boolean' ? urls.wwwMatches : true,
                    tldMatches: typeof urls.tldMatches === 'boolean' ? urls.tldMatches : true
                };
            }
        };
        /**
         * Normalizes the {@link #stripPrefix} config into an Object with 2
         * properties: `scheme`, and `www` - both Booleans.
         *
         * See {@link #stripPrefix} config for details.
         *
         * @private
         * @param {Boolean/Object} stripPrefix
         * @return {Object}
         */
        Autolinker.prototype.normalizeStripPrefixCfg = function (stripPrefix) {
            if (stripPrefix == null)
                stripPrefix = true; // default to `true`
            if (typeof stripPrefix === 'boolean') {
                return { scheme: stripPrefix, www: stripPrefix };
            }
            else { // object form
                return {
                    scheme: typeof stripPrefix.scheme === 'boolean' ? stripPrefix.scheme : true,
                    www: typeof stripPrefix.www === 'boolean' ? stripPrefix.www : true
                };
            }
        };
        /**
         * Normalizes the {@link #truncate} config into an Object with 2 properties:
         * `length` (Number), and `location` (String).
         *
         * See {@link #truncate} config for details.
         *
         * @private
         * @param {Number/Object} truncate
         * @return {Object}
         */
        Autolinker.prototype.normalizeTruncateCfg = function (truncate) {
            if (typeof truncate === 'number') {
                return { length: truncate, location: 'end' };
            }
            else { // object, or undefined/null
                return defaults(truncate || {}, {
                    length: Number.POSITIVE_INFINITY,
                    location: 'end'
                });
            }
        };
        /**
         * Parses the input `textOrHtml` looking for URLs, email addresses, phone
         * numbers, username handles, and hashtags (depending on the configuration
         * of the Autolinker instance), and returns an array of {@link Autolinker.match.Match}
         * objects describing those matches (without making any replacements).
         *
         * This method is used by the {@link #link} method, but can also be used to
         * simply do parsing of the input in order to discover what kinds of links
         * there are and how many.
         *
         * Example usage:
         *
         *     var autolinker = new Autolinker( {
         *         urls: true,
         *         email: true
         *     } );
         *
         *     var matches = autolinker.parse( "Hello google.com, I am asdf@asdf.com" );
         *
         *     console.log( matches.length );           // 2
         *     console.log( matches[ 0 ].getType() );   // 'url'
         *     console.log( matches[ 0 ].getUrl() );    // 'google.com'
         *     console.log( matches[ 1 ].getType() );   // 'email'
         *     console.log( matches[ 1 ].getEmail() );  // 'asdf@asdf.com'
         *
         * @param {String} textOrHtml The HTML or text to find matches within
         *   (depending on if the {@link #urls}, {@link #email}, {@link #phone},
         *   {@link #hashtag}, and {@link #mention} options are enabled).
         * @return {Autolinker.match.Match[]} The array of Matches found in the
         *   given input `textOrHtml`.
         */
        Autolinker.prototype.parse = function (textOrHtml) {
            var _this = this;
            var skipTagNames = ['a', 'style', 'script'], skipTagsStackCount = 0, // used to only Autolink text outside of anchor/script/style tags. We don't want to autolink something that is already linked inside of an <a> tag, for instance
            matches = [];
            // Find all matches within the `textOrHtml` (but not matches that are
            // already nested within <a>, <style> and <script> tags)
            parseHtml(textOrHtml, {
                onOpenTag: function (tagName) {
                    if (skipTagNames.indexOf(tagName) >= 0) {
                        skipTagsStackCount++;
                    }
                },
                onText: function (text, offset) {
                    // Only process text nodes that are not within an <a>, <style> or <script> tag
                    if (skipTagsStackCount === 0) {
                        // "Walk around" common HTML entities. An '&nbsp;' (for example)
                        // could be at the end of a URL, but we don't want to 
                        // include the trailing '&' in the URL. See issue #76
                        // TODO: Handle HTML entities separately in parseHtml() and
                        // don't emit them as "text" except for &amp; entities
                        var htmlCharacterEntitiesRegex = /(&nbsp;|&#160;|&lt;|&#60;|&gt;|&#62;|&quot;|&#34;|&#39;)/gi;
                        var textSplit = splitAndCapture(text, htmlCharacterEntitiesRegex);
                        var currentOffset_1 = offset;
                        textSplit.forEach(function (splitText, i) {
                            // even number matches are text, odd numbers are html entities
                            if (i % 2 === 0) {
                                var textNodeMatches = _this.parseText(splitText, currentOffset_1);
                                matches.push.apply(matches, textNodeMatches);
                            }
                            currentOffset_1 += splitText.length;
                        });
                    }
                },
                onCloseTag: function (tagName) {
                    if (skipTagNames.indexOf(tagName) >= 0) {
                        skipTagsStackCount = Math.max(skipTagsStackCount - 1, 0); // attempt to handle extraneous </a> tags by making sure the stack count never goes below 0
                    }
                },
                onComment: function (offset) { },
                onDoctype: function (offset) { },
            });
            // After we have found all matches, remove subsequent matches that
            // overlap with a previous match. This can happen for instance with URLs,
            // where the url 'google.com/#link' would match '#link' as a hashtag.
            matches = this.compactMatches(matches);
            // And finally, remove matches for match types that have been turned
            // off. We needed to have all match types turned on initially so that
            // things like hashtags could be filtered out if they were really just
            // part of a URL match (for instance, as a named anchor).
            matches = this.removeUnwantedMatches(matches);
            return matches;
        };
        /**
         * After we have found all matches, we need to remove matches that overlap
         * with a previous match. This can happen for instance with URLs, where the
         * url 'google.com/#link' would match '#link' as a hashtag. Because the
         * '#link' part is contained in a larger match that comes before the HashTag
         * match, we'll remove the HashTag match.
         *
         * @private
         * @param {Autolinker.match.Match[]} matches
         * @return {Autolinker.match.Match[]}
         */
        Autolinker.prototype.compactMatches = function (matches) {
            // First, the matches need to be sorted in order of offset
            matches.sort(function (a, b) { return a.getOffset() - b.getOffset(); });
            for (var i = 0; i < matches.length - 1; i++) {
                var match = matches[i], offset = match.getOffset(), matchedTextLength = match.getMatchedText().length, endIdx = offset + matchedTextLength;
                if (i + 1 < matches.length) {
                    // Remove subsequent matches that equal offset with current match
                    if (matches[i + 1].getOffset() === offset) {
                        var removeIdx = matches[i + 1].getMatchedText().length > matchedTextLength ? i : i + 1;
                        matches.splice(removeIdx, 1);
                        continue;
                    }
                    // Remove subsequent matches that overlap with the current match
                    if (matches[i + 1].getOffset() < endIdx) {
                        matches.splice(i + 1, 1);
                    }
                }
            }
            return matches;
        };
        /**
         * Removes matches for matchers that were turned off in the options. For
         * example, if {@link #hashtag hashtags} were not to be matched, we'll
         * remove them from the `matches` array here.
         *
         * Note: we *must* use all Matchers on the input string, and then filter
         * them out later. For example, if the options were `{ url: false, hashtag: true }`,
         * we wouldn't want to match the text '#link' as a HashTag inside of the text
         * 'google.com/#link'. The way the algorithm works is that we match the full
         * URL first (which prevents the accidental HashTag match), and then we'll
         * simply throw away the URL match.
         *
         * @private
         * @param {Autolinker.match.Match[]} matches The array of matches to remove
         *   the unwanted matches from. Note: this array is mutated for the
         *   removals.
         * @return {Autolinker.match.Match[]} The mutated input `matches` array.
         */
        Autolinker.prototype.removeUnwantedMatches = function (matches) {
            if (!this.hashtag)
                remove(matches, function (match) { return match.getType() === 'hashtag'; });
            if (!this.email)
                remove(matches, function (match) { return match.getType() === 'email'; });
            if (!this.phone)
                remove(matches, function (match) { return match.getType() === 'phone'; });
            if (!this.mention)
                remove(matches, function (match) { return match.getType() === 'mention'; });
            if (!this.urls.schemeMatches) {
                remove(matches, function (m) { return m.getType() === 'url' && m.getUrlMatchType() === 'scheme'; });
            }
            if (!this.urls.wwwMatches) {
                remove(matches, function (m) { return m.getType() === 'url' && m.getUrlMatchType() === 'www'; });
            }
            if (!this.urls.tldMatches) {
                remove(matches, function (m) { return m.getType() === 'url' && m.getUrlMatchType() === 'tld'; });
            }
            return matches;
        };
        /**
         * Parses the input `text` looking for URLs, email addresses, phone
         * numbers, username handles, and hashtags (depending on the configuration
         * of the Autolinker instance), and returns an array of {@link Autolinker.match.Match}
         * objects describing those matches.
         *
         * This method processes a **non-HTML string**, and is used to parse and
         * match within the text nodes of an HTML string. This method is used
         * internally by {@link #parse}.
         *
         * @private
         * @param {String} text The text to find matches within (depending on if the
         *   {@link #urls}, {@link #email}, {@link #phone},
         *   {@link #hashtag}, and {@link #mention} options are enabled). This must be a non-HTML string.
         * @param {Number} [offset=0] The offset of the text node within the
         *   original string. This is used when parsing with the {@link #parse}
         *   method to generate correct offsets within the {@link Autolinker.match.Match}
         *   instances, but may be omitted if calling this method publicly.
         * @return {Autolinker.match.Match[]} The array of Matches found in the
         *   given input `text`.
         */
        Autolinker.prototype.parseText = function (text, offset) {
            if (offset === void 0) { offset = 0; }
            offset = offset || 0;
            var matchers = this.getMatchers(), matches = [];
            for (var i = 0, numMatchers = matchers.length; i < numMatchers; i++) {
                var textMatches = matchers[i].parseMatches(text);
                // Correct the offset of each of the matches. They are originally
                // the offset of the match within the provided text node, but we
                // need to correct them to be relative to the original HTML input
                // string (i.e. the one provided to #parse).
                for (var j = 0, numTextMatches = textMatches.length; j < numTextMatches; j++) {
                    textMatches[j].setOffset(offset + textMatches[j].getOffset());
                }
                matches.push.apply(matches, textMatches);
            }
            return matches;
        };
        /**
         * Automatically links URLs, Email addresses, Phone numbers, Hashtags,
         * and Mentions (Twitter, Instagram, Soundcloud) found in the given chunk of HTML. Does not link
         * URLs found within HTML tags.
         *
         * For instance, if given the text: `You should go to http://www.yahoo.com`,
         * then the result will be `You should go to
         * &lt;a href="http://www.yahoo.com"&gt;http://www.yahoo.com&lt;/a&gt;`
         *
         * This method finds the text around any HTML elements in the input
         * `textOrHtml`, which will be the text that is processed. Any original HTML
         * elements will be left as-is, as well as the text that is already wrapped
         * in anchor (&lt;a&gt;) tags.
         *
         * @param {String} textOrHtml The HTML or text to autolink matches within
         *   (depending on if the {@link #urls}, {@link #email}, {@link #phone}, {@link #hashtag}, and {@link #mention} options are enabled).
         * @return {String} The HTML, with matches automatically linked.
         */
        Autolinker.prototype.link = function (textOrHtml) {
            if (!textOrHtml) {
                return "";
            } // handle `null` and `undefined` (for JavaScript users that don't have TypeScript support)
            /* We would want to sanitize the start and end characters of a tag
             * before processing the string in order to avoid an XSS scenario.
             * This behaviour can be changed by toggling the sanitizeHtml option.
             */
            if (this.sanitizeHtml) {
                textOrHtml = textOrHtml
                    .replace(/</g, '&lt;')
                    .replace(/>/g, '&gt;');
            }
            var matches = this.parse(textOrHtml), newHtml = [], lastIndex = 0;
            for (var i = 0, len = matches.length; i < len; i++) {
                var match = matches[i];
                newHtml.push(textOrHtml.substring(lastIndex, match.getOffset()));
                newHtml.push(this.createMatchReturnVal(match));
                lastIndex = match.getOffset() + match.getMatchedText().length;
            }
            newHtml.push(textOrHtml.substring(lastIndex)); // handle the text after the last match
            return newHtml.join('');
        };
        /**
         * Creates the return string value for a given match in the input string.
         *
         * This method handles the {@link #replaceFn}, if one was provided.
         *
         * @private
         * @param {Autolinker.match.Match} match The Match object that represents
         *   the match.
         * @return {String} The string that the `match` should be replaced with.
         *   This is usually the anchor tag string, but may be the `matchStr` itself
         *   if the match is not to be replaced.
         */
        Autolinker.prototype.createMatchReturnVal = function (match) {
            // Handle a custom `replaceFn` being provided
            var replaceFnResult;
            if (this.replaceFn) {
                replaceFnResult = this.replaceFn.call(this.context, match); // Autolinker instance is the context
            }
            if (typeof replaceFnResult === 'string') {
                return replaceFnResult; // `replaceFn` returned a string, use that
            }
            else if (replaceFnResult === false) {
                return match.getMatchedText(); // no replacement for the match
            }
            else if (replaceFnResult instanceof HtmlTag) {
                return replaceFnResult.toAnchorString();
            }
            else { // replaceFnResult === true, or no/unknown return value from function
                // Perform Autolinker's default anchor tag generation
                var anchorTag = match.buildTag(); // returns an Autolinker.HtmlTag instance
                return anchorTag.toAnchorString();
            }
        };
        /**
         * Lazily instantiates and returns the {@link Autolinker.matcher.Matcher}
         * instances for this Autolinker instance.
         *
         * @private
         * @return {Autolinker.matcher.Matcher[]}
         */
        Autolinker.prototype.getMatchers = function () {
            if (!this.matchers) {
                var tagBuilder = this.getTagBuilder();
                var matchers = [
                    new HashtagMatcher({ tagBuilder: tagBuilder, serviceName: this.hashtag }),
                    new EmailMatcher({ tagBuilder: tagBuilder }),
                    new PhoneMatcher({ tagBuilder: tagBuilder }),
                    new MentionMatcher({ tagBuilder: tagBuilder, serviceName: this.mention }),
                    new UrlMatcher({ tagBuilder: tagBuilder, stripPrefix: this.stripPrefix, stripTrailingSlash: this.stripTrailingSlash, decodePercentEncoding: this.decodePercentEncoding })
                ];
                return (this.matchers = matchers);
            }
            else {
                return this.matchers;
            }
        };
        /**
         * Returns the {@link #tagBuilder} instance for this Autolinker instance,
         * lazily instantiating it if it does not yet exist.
         *
         * @private
         * @return {Autolinker.AnchorTagBuilder}
         */
        Autolinker.prototype.getTagBuilder = function () {
            var tagBuilder = this.tagBuilder;
            if (!tagBuilder) {
                tagBuilder = this.tagBuilder = new AnchorTagBuilder({
                    newWindow: this.newWindow,
                    truncate: this.truncate,
                    className: this.className
                });
            }
            return tagBuilder;
        };
        /**
         * @static
         * @property {String} version
         *
         * The Autolinker version number in the form major.minor.patch
         *
         * Ex: 0.25.1
         */
        Autolinker.version = '3.14.1';
        /**
         * For backwards compatibility with Autolinker 1.x, the AnchorTagBuilder
         * class is provided as a static on the Autolinker class.
         */
        Autolinker.AnchorTagBuilder = AnchorTagBuilder;
        /**
         * For backwards compatibility with Autolinker 1.x, the HtmlTag class is
         * provided as a static on the Autolinker class.
         */
        Autolinker.HtmlTag = HtmlTag;
        /**
         * For backwards compatibility with Autolinker 1.x, the Matcher classes are
         * provided as statics on the Autolinker class.
         */
        Autolinker.matcher = {
            Email: EmailMatcher,
            Hashtag: HashtagMatcher,
            Matcher: Matcher,
            Mention: MentionMatcher,
            Phone: PhoneMatcher,
            Url: UrlMatcher
        };
        /**
         * For backwards compatibility with Autolinker 1.x, the Match classes are
         * provided as statics on the Autolinker class.
         */
        Autolinker.match = {
            Email: EmailMatch,
            Hashtag: HashtagMatch,
            Match: Match,
            Mention: MentionMatch,
            Phone: PhoneMatch,
            Url: UrlMatch
        };
        return Autolinker;
    }());

    return Autolinker;

})); /*
 * Leaflet.markercluster 1.4.1+master.37ab9a2,
 * Provides Beautiful Animated Marker Clustering functionality for Leaflet, a JS library for interactive maps.
 * https://github.com/Leaflet/Leaflet.markercluster
 * (c) 2012-2017, Dave Leaver, smartrak
 */
(function (global, factory) {
	typeof exports === 'object' && typeof module !== 'undefined' ? factory(exports) :
	typeof define === 'function' && define.amd ? define(['exports'], factory) :
	(factory((global.Leaflet = global.Leaflet || {}, global.Leaflet.markercluster = global.Leaflet.markercluster || {})));
}(this, (function (exports) { 'use strict';

/*
 * L.MarkerClusterGroup extends L.FeatureGroup by clustering the markers contained within
 */

var MarkerClusterGroup = L.MarkerClusterGroup = L.FeatureGroup.extend({

	options: {
		maxClusterRadius: 0, //A cluster will cover at most this many pixels from its center
		iconCreateFunction: null,
		clusterPane: L.Marker.prototype.options.pane,

		spiderfyOnMaxZoom: true,
		showCoverageOnHover: false,
		zoomToBoundsOnClick: true,
		singleMarkerMode: true,

		disableClusteringAtZoom: null,

		// Setting this to false prevents the removal of any clusters outside of the viewpoint, which
		// is the default behaviour for performance reasons.
		removeOutsideVisibleBounds: false,

		// Set to false to disable all animations (zoom and spiderfy).
		// If false, option animateAddingMarkers below has no effect.
		// If L.DomUtil.TRANSITION is falsy, this option has no effect.
		animate: false,

		//Whether to animate adding markers after adding the MarkerClusterGroup to the map
		// If you are adding individual markers set to true, if adding bulk markers leave false for massive performance gains.
		animateAddingMarkers: false,

		//Increase to increase the distance away that spiderfied markers appear from the center
		spiderfyDistanceMultiplier: 1.75,

		// Make it possible to specify a polyline options on a spider leg
		spiderLegPolylineOptions: { weight: 2, color: '#fff', opacity: 0.7 },

		// When bulk adding layers, adds markers in chunks. Means addLayers may not add all the layers in the call, others will be loaded during setTimeouts
		chunkedLoading: false,
		chunkInterval: 200, // process markers for a maximum of ~ n milliseconds (then trigger the chunkProgress callback)
		chunkDelay: 50, // at the end of each interval, give n milliseconds back to system/browser
		chunkProgress: null, // progress callback: function(processed, total, elapsed) (e.g. for a progress indicator)

		//Options to pass to the L.Polygon constructor
		polygonOptions: {color:"#eeeeee",fillcolor:"#f5f5f5"}
	},

	initialize: function (options) {
		L.Util.setOptions(this, options);
		if (!this.options.iconCreateFunction) {
			this.options.iconCreateFunction = this._defaultIconCreateFunction;
		}

		this._featureGroup = L.featureGroup();
		this._featureGroup.addEventParent(this);

		this._nonPointGroup = L.featureGroup();
		this._nonPointGroup.addEventParent(this);

		this._inZoomAnimation = 0;
		this._needsClustering = [];
		this._needsRemoving = []; //Markers removed while we aren't on the map need to be kept track of
		//The bounds of the currently shown area (from _getExpandedVisibleBounds) Updated on zoom/move
		this._currentShownBounds = null;

		this._queue = [];

		this._childMarkerEventHandlers = {
			'dragstart': this._childMarkerDragStart,
			'move': this._childMarkerMoved,
			'dragend': this._childMarkerDragEnd,
		};

		// Hook the appropriate animation methods.
		var animate = L.DomUtil.TRANSITION && this.options.animate;
		L.extend(this, animate ? this._withAnimation : this._noAnimation);
		// Remember which MarkerCluster class to instantiate (animated or not).
		this._markerCluster = animate ? L.MarkerCluster : L.MarkerClusterNonAnimated;
	},

	addLayer: function (layer) {
		if (layer instanceof L.LayerGroup) {
			return this.addLayers([layer]);
		}

		//Don't cluster non point data
		if (!layer.getLatLng) {
			this._nonPointGroup.addLayer(layer);
			this.fire('layeradd', { layer: layer });
			return this;
		}

		if (!this._map) {
			this._needsClustering.push(layer);
			this.fire('layeradd', { layer: layer });
			return this;
		}

		if (this.hasLayer(layer)) {
			return this;
		}


		//If we have already clustered we'll need to add this one to a cluster

		if (this._unspiderfy) {
			this._unspiderfy();
		}

		this._addLayer(layer, this._maxZoom);
		this.fire('layeradd', { layer: layer });

		// Refresh bounds and weighted positions.
		this._topClusterLevel._recalculateBounds();

		this._refreshClustersIcons();

		//Work out what is visible
		var visibleLayer = layer,
		    currentZoom = this._zoom;
		if (layer.__parent) {
			while (visibleLayer.__parent._zoom >= currentZoom) {
				visibleLayer = visibleLayer.__parent;
			}
		}

		if (this._currentShownBounds.contains(visibleLayer.getLatLng())) {
			if (this.options.animateAddingMarkers) {
				this._animationAddLayer(layer, visibleLayer);
			} else {
				this._animationAddLayerNonAnimated(layer, visibleLayer);
			}
		}
		return this;
	},

	removeLayer: function (layer) {

		if (layer instanceof L.LayerGroup) {
			return this.removeLayers([layer]);
		}

		//Non point layers
		if (!layer.getLatLng) {
			this._nonPointGroup.removeLayer(layer);
			this.fire('layerremove', { layer: layer });
			return this;
		}

		if (!this._map) {
			if (!this._arraySplice(this._needsClustering, layer) && this.hasLayer(layer)) {
				this._needsRemoving.push({ layer: layer, latlng: layer._latlng });
			}
			this.fire('layerremove', { layer: layer });
			return this;
		}

		if (!layer.__parent) {
			return this;
		}

		if (this._unspiderfy) {
			this._unspiderfy();
			this._unspiderfyLayer(layer);
		}

		//Remove the marker from clusters
		this._removeLayer(layer, true);
		this.fire('layerremove', { layer: layer });

		// Refresh bounds and weighted positions.
		this._topClusterLevel._recalculateBounds();

		this._refreshClustersIcons();

		layer.off(this._childMarkerEventHandlers, this);

		if (this._featureGroup.hasLayer(layer)) {
			this._featureGroup.removeLayer(layer);
			if (layer.clusterShow) {
				layer.clusterShow();
			}
		}

		return this;
	},

	//Takes an array of markers and adds them in bulk
	addLayers: function (layersArray, skipLayerAddEvent) {
		if (!L.Util.isArray(layersArray)) {
			return this.addLayer(layersArray);
		}

		var fg = this._featureGroup,
		    npg = this._nonPointGroup,
		    chunked = this.options.chunkedLoading,
		    chunkInterval = this.options.chunkInterval,
		    chunkProgress = this.options.chunkProgress,
		    l = layersArray.length,
		    offset = 0,
		    originalArray = true,
		    m;

		if (this._map) {
			var started = (new Date()).getTime();
			var process = L.bind(function () {
				var start = (new Date()).getTime();
				for (; offset < l; offset++) {
					if (chunked && offset % 200 === 0) {
						// every couple hundred markers, instrument the time elapsed since processing started:
						var elapsed = (new Date()).getTime() - start;
						if (elapsed > chunkInterval) {
							break; // been working too hard, time to take a break :-)
						}
					}

					m = layersArray[offset];

					// Group of layers, append children to layersArray and skip.
					// Side effects:
					// - Total increases, so chunkProgress ratio jumps backward.
					// - Groups are not included in this group, only their non-group child layers (hasLayer).
					// Changing array length while looping does not affect performance in current browsers:
					// http://jsperf.com/for-loop-changing-length/6
					if (m instanceof L.LayerGroup) {
						if (originalArray) {
							layersArray = layersArray.slice();
							originalArray = false;
						}
						this._extractNonGroupLayers(m, layersArray);
						l = layersArray.length;
						continue;
					}

					//Not point data, can't be clustered
					if (!m.getLatLng) {
						npg.addLayer(m);
						if (!skipLayerAddEvent) {
							this.fire('layeradd', { layer: m });
						}
						continue;
					}

					if (this.hasLayer(m)) {
						continue;
					}

					this._addLayer(m, this._maxZoom);
					if (!skipLayerAddEvent) {
						this.fire('layeradd', { layer: m });
					}

					//If we just made a cluster of size 2 then we need to remove the other marker from the map (if it is) or we never will
					if (m.__parent) {
						if (m.__parent.getChildCount() === 2) {
							var markers = m.__parent.getAllChildMarkers(),
							    otherMarker = markers[0] === m ? markers[1] : markers[0];
							fg.removeLayer(otherMarker);
						}
					}
				}

				if (chunkProgress) {
					// report progress and time elapsed:
					chunkProgress(offset, l, (new Date()).getTime() - started);
				}

				// Completed processing all markers.
				if (offset === l) {

					// Refresh bounds and weighted positions.
					this._topClusterLevel._recalculateBounds();

					this._refreshClustersIcons();

					this._topClusterLevel._recursivelyAddChildrenToMap(null, this._zoom, this._currentShownBounds);
				} else {
					setTimeout(process, this.options.chunkDelay);
				}
			}, this);

			process();
		} else {
			var needsClustering = this._needsClustering;

			for (; offset < l; offset++) {
				m = layersArray[offset];

				// Group of layers, append children to layersArray and skip.
				if (m instanceof L.LayerGroup) {
					if (originalArray) {
						layersArray = layersArray.slice();
						originalArray = false;
					}
					this._extractNonGroupLayers(m, layersArray);
					l = layersArray.length;
					continue;
				}

				//Not point data, can't be clustered
				if (!m.getLatLng) {
					npg.addLayer(m);
					continue;
				}

				if (this.hasLayer(m)) {
					continue;
				}

				needsClustering.push(m);
			}
		}
		return this;
	},

	//Takes an array of markers and removes them in bulk
	removeLayers: function (layersArray) {
		var i, m,
		    l = layersArray.length,
		    fg = this._featureGroup,
		    npg = this._nonPointGroup,
		    originalArray = true;

		if (!this._map) {
			for (i = 0; i < l; i++) {
				m = layersArray[i];

				// Group of layers, append children to layersArray and skip.
				if (m instanceof L.LayerGroup) {
					if (originalArray) {
						layersArray = layersArray.slice();
						originalArray = false;
					}
					this._extractNonGroupLayers(m, layersArray);
					l = layersArray.length;
					continue;
				}

				this._arraySplice(this._needsClustering, m);
				npg.removeLayer(m);
				if (this.hasLayer(m)) {
					this._needsRemoving.push({ layer: m, latlng: m._latlng });
				}
				this.fire('layerremove', { layer: m });
			}
			return this;
		}

		if (this._unspiderfy) {
			this._unspiderfy();

			// Work on a copy of the array, so that next loop is not affected.
			var layersArray2 = layersArray.slice(),
			    l2 = l;
			for (i = 0; i < l2; i++) {
				m = layersArray2[i];

				// Group of layers, append children to layersArray and skip.
				if (m instanceof L.LayerGroup) {
					this._extractNonGroupLayers(m, layersArray2);
					l2 = layersArray2.length;
					continue;
				}

				this._unspiderfyLayer(m);
			}
		}

		for (i = 0; i < l; i++) {
			m = layersArray[i];

			// Group of layers, append children to layersArray and skip.
			if (m instanceof L.LayerGroup) {
				if (originalArray) {
					layersArray = layersArray.slice();
					originalArray = false;
				}
				this._extractNonGroupLayers(m, layersArray);
				l = layersArray.length;
				continue;
			}

			if (!m.__parent) {
				npg.removeLayer(m);
				this.fire('layerremove', { layer: m });
				continue;
			}

			this._removeLayer(m, true, true);
			this.fire('layerremove', { layer: m });

			if (fg.hasLayer(m)) {
				fg.removeLayer(m);
				if (m.clusterShow) {
					m.clusterShow();
				}
			}
		}

		// Refresh bounds and weighted positions.
		this._topClusterLevel._recalculateBounds();

		this._refreshClustersIcons();

		//Fix up the clusters and markers on the map
		this._topClusterLevel._recursivelyAddChildrenToMap(null, this._zoom, this._currentShownBounds);

		return this;
	},

	//Removes all layers from the MarkerClusterGroup
	clearLayers: function () {
		//Need our own special implementation as the LayerGroup one doesn't work for us

		//If we aren't on the map (yet), blow away the markers we know of
		if (!this._map) {
			this._needsClustering = [];
			this._needsRemoving = [];
			delete this._gridClusters;
			delete this._gridUnclustered;
		}

		if (this._noanimationUnspiderfy) {
			this._noanimationUnspiderfy();
		}

		//Remove all the visible layers
		this._featureGroup.clearLayers();
		this._nonPointGroup.clearLayers();

		this.eachLayer(function (marker) {
			marker.off(this._childMarkerEventHandlers, this);
			delete marker.__parent;
		}, this);

		if (this._map) {
			//Reset _topClusterLevel and the DistanceGrids
			this._generateInitialClusters();
		}

		return this;
	},

	//Override FeatureGroup.getBounds as it doesn't work
	getBounds: function () {
		var bounds = new L.LatLngBounds();

		if (this._topClusterLevel) {
			bounds.extend(this._topClusterLevel._bounds);
		}

		for (var i = this._needsClustering.length - 1; i >= 0; i--) {
			bounds.extend(this._needsClustering[i].getLatLng());
		}

		bounds.extend(this._nonPointGroup.getBounds());

		return bounds;
	},

	//Overrides LayerGroup.eachLayer
	eachLayer: function (method, context) {
		var markers = this._needsClustering.slice(),
			needsRemoving = this._needsRemoving,
			thisNeedsRemoving, i, j;

		if (this._topClusterLevel) {
			this._topClusterLevel.getAllChildMarkers(markers);
		}

		for (i = markers.length - 1; i >= 0; i--) {
			thisNeedsRemoving = true;

			for (j = needsRemoving.length - 1; j >= 0; j--) {
				if (needsRemoving[j].layer === markers[i]) {
					thisNeedsRemoving = false;
					break;
				}
			}

			if (thisNeedsRemoving) {
				method.call(context, markers[i]);
			}
		}

		this._nonPointGroup.eachLayer(method, context);
	},

	//Overrides LayerGroup.getLayers
	getLayers: function () {
		var layers = [];
		this.eachLayer(function (l) {
			layers.push(l);
		});
		return layers;
	},

	//Overrides LayerGroup.getLayer, WARNING: Really bad performance
	getLayer: function (id) {
		var result = null;

		id = parseInt(id, 10);

		this.eachLayer(function (l) {
			if (L.stamp(l) === id) {
				result = l;
			}
		});

		return result;
	},

	//Returns true if the given layer is in this MarkerClusterGroup
	hasLayer: function (layer) {
		if (!layer) {
			return false;
		}

		var i, anArray = this._needsClustering;

		for (i = anArray.length - 1; i >= 0; i--) {
			if (anArray[i] === layer) {
				return true;
			}
		}

		anArray = this._needsRemoving;
		for (i = anArray.length - 1; i >= 0; i--) {
			if (anArray[i].layer === layer) {
				return false;
			}
		}

		return !!(layer.__parent && layer.__parent._group === this) || this._nonPointGroup.hasLayer(layer);
	},

	//Zoom down to show the given layer (spiderfying if necessary) then calls the callback
	zoomToShowLayer: function (layer, callback) {

		if (typeof callback !== 'function') {
			callback = function () {};
		}

		var showMarker = function () {
			if ((layer._icon || layer.__parent._icon) && !this._inZoomAnimation) {
				this._map.off('moveend', showMarker, this);
				this.off('animationend', showMarker, this);

				if (layer._icon) {
					callback();
				} else if (layer.__parent._icon) {
					this.once('spiderfied', callback, this);
					layer.__parent.spiderfy();
				}
			}
		};

		if (layer._icon && this._map.getBounds().contains(layer.getLatLng())) {
			//Layer is visible ond on screen, immediate return
			callback();
		} else if (layer.__parent._zoom < Math.round(this._map._zoom)) {
			//Layer should be visible at this zoom level. It must not be on screen so just pan over to it
			this._map.on('moveend', showMarker, this);
			this._map.panTo(layer.getLatLng());
		} else {
			this._map.on('moveend', showMarker, this);
			this.on('animationend', showMarker, this);
			layer.__parent.zoomToBounds();
		}
	},

	//Overrides FeatureGroup.onAdd
	onAdd: function (map) {
		this._map = map;
		var i, l, layer;

		if (!isFinite(this._map.getMaxZoom())) {
			throw "Map has no maxZoom specified";
		}

		this._featureGroup.addTo(map);
		this._nonPointGroup.addTo(map);

		if (!this._gridClusters) {
			this._generateInitialClusters();
		}

		this._maxLat = map.options.crs.projection.MAX_LATITUDE;

		//Restore all the positions as they are in the MCG before removing them
		for (i = 0, l = this._needsRemoving.length; i < l; i++) {
			layer = this._needsRemoving[i];
			layer.newlatlng = layer.layer._latlng;
			layer.layer._latlng = layer.latlng;
		}
		//Remove them, then restore their new positions
		for (i = 0, l = this._needsRemoving.length; i < l; i++) {
			layer = this._needsRemoving[i];
			this._removeLayer(layer.layer, true);
			layer.layer._latlng = layer.newlatlng;
		}
		this._needsRemoving = [];

		//Remember the current zoom level and bounds
		this._zoom = Math.round(this._map._zoom);
		this._currentShownBounds = this._getExpandedVisibleBounds();

		this._map.on('zoomend', this._zoomEnd, this);
		this._map.on('moveend', this._moveEnd, this);

		if (this._spiderfierOnAdd) { //TODO FIXME: Not sure how to have spiderfier add something on here nicely
			this._spiderfierOnAdd();
		}

		this._bindEvents();

		//Actually add our markers to the map:
		l = this._needsClustering;
		this._needsClustering = [];
		this.addLayers(l, true);
	},

	//Overrides FeatureGroup.onRemove
	onRemove: function (map) {
		map.off('zoomend', this._zoomEnd, this);
		map.off('moveend', this._moveEnd, this);

		this._unbindEvents();

		//In case we are in a cluster animation
		this._map._mapPane.className = this._map._mapPane.className.replace(' leaflet-cluster-anim', '');

		if (this._spiderfierOnRemove) { //TODO FIXME: Not sure how to have spiderfier add something on here nicely
			this._spiderfierOnRemove();
		}

		delete this._maxLat;

		//Clean up all the layers we added to the map
		this._hideCoverage();
		this._featureGroup.remove();
		this._nonPointGroup.remove();

		this._featureGroup.clearLayers();

		this._map = null;
	},

	getVisibleParent: function (marker) {
		var vMarker = marker;
		while (vMarker && !vMarker._icon) {
			vMarker = vMarker.__parent;
		}
		return vMarker || null;
	},

	//Remove the given object from the given array
	_arraySplice: function (anArray, obj) {
		for (var i = anArray.length - 1; i >= 0; i--) {
			if (anArray[i] === obj) {
				anArray.splice(i, 1);
				return true;
			}
		}
	},

	/**
	 * Removes a marker from all _gridUnclustered zoom levels, starting at the supplied zoom.
	 * @param marker to be removed from _gridUnclustered.
	 * @param z integer bottom start zoom level (included)
	 * @private
	 */
	_removeFromGridUnclustered: function (marker, z) {
		var map = this._map,
		    gridUnclustered = this._gridUnclustered,
			minZoom = Math.floor(this._map.getMinZoom());

		for (; z >= minZoom; z--) {
			if (!gridUnclustered[z].removeObject(marker, map.project(marker.getLatLng(), z))) {
				break;
			}
		}
	},

	_childMarkerDragStart: function (e) {
		e.target.__dragStart = e.target._latlng;
	},

	_childMarkerMoved: function (e) {
		if (!this._ignoreMove && !e.target.__dragStart) {
			var isPopupOpen = e.target._popup && e.target._popup.isOpen();

			this._moveChild(e.target, e.oldLatLng, e.latlng);

			if (isPopupOpen) {
				e.target.openPopup();
			}
		}
	},

	_moveChild: function (layer, from, to) {
		layer._latlng = from;
		this.removeLayer(layer);

		layer._latlng = to;
		this.addLayer(layer);
	},

	_childMarkerDragEnd: function (e) {
		var dragStart = e.target.__dragStart;
		delete e.target.__dragStart;
		if (dragStart) {
			this._moveChild(e.target, dragStart, e.target._latlng);
		}		
	},


	//Internal function for removing a marker from everything.
	//dontUpdateMap: set to true if you will handle updating the map manually (for bulk functions)
	_removeLayer: function (marker, removeFromDistanceGrid, dontUpdateMap) {
		var gridClusters = this._gridClusters,
			gridUnclustered = this._gridUnclustered,
			fg = this._featureGroup,
			map = this._map,
			minZoom = Math.floor(this._map.getMinZoom());

		//Remove the marker from distance clusters it might be in
		if (removeFromDistanceGrid) {
			this._removeFromGridUnclustered(marker, this._maxZoom);
		}

		//Work our way up the clusters removing them as we go if required
		var cluster = marker.__parent,
			markers = cluster._markers,
			otherMarker;

		//Remove the marker from the immediate parents marker list
		this._arraySplice(markers, marker);

		while (cluster) {
			cluster._childCount--;
			cluster._boundsNeedUpdate = true;

			if (cluster._zoom < minZoom) {
				//Top level, do nothing
				break;
			} else if (removeFromDistanceGrid && cluster._childCount <= 1) { //Cluster no longer required
				//We need to push the other marker up to the parent
				otherMarker = cluster._markers[0] === marker ? cluster._markers[1] : cluster._markers[0];

				//Update distance grid
				gridClusters[cluster._zoom].removeObject(cluster, map.project(cluster._cLatLng, cluster._zoom));
				gridUnclustered[cluster._zoom].addObject(otherMarker, map.project(otherMarker.getLatLng(), cluster._zoom));

				//Move otherMarker up to parent
				this._arraySplice(cluster.__parent._childClusters, cluster);
				cluster.__parent._markers.push(otherMarker);
				otherMarker.__parent = cluster.__parent;

				if (cluster._icon) {
					//Cluster is currently on the map, need to put the marker on the map instead
					fg.removeLayer(cluster);
					if (!dontUpdateMap) {
						fg.addLayer(otherMarker);
					}
				}
			} else {
				cluster._iconNeedsUpdate = true;
			}

			cluster = cluster.__parent;
		}

		delete marker.__parent;
	},

	_isOrIsParent: function (el, oel) {
		while (oel) {
			if (el === oel) {
				return true;
			}
			oel = oel.parentNode;
		}
		return false;
	},

	//Override L.Evented.fire
	fire: function (type, data, propagate) {
		if (data && data.layer instanceof L.MarkerCluster) {
			//Prevent multiple clustermouseover/off events if the icon is made up of stacked divs (Doesn't work in ie <= 8, no relatedTarget)
			if (data.originalEvent && this._isOrIsParent(data.layer._icon, data.originalEvent.relatedTarget)) {
				return;
			}
			type = 'cluster' + type;
		}

		L.FeatureGroup.prototype.fire.call(this, type, data, propagate);
	},

	//Override L.Evented.listens
	listens: function (type, propagate) {
		return L.FeatureGroup.prototype.listens.call(this, type, propagate) || L.FeatureGroup.prototype.listens.call(this, 'cluster' + type, propagate);
	},

	//Default functionality
	_defaultIconCreateFunction: function (cluster) {
		var childCount = cluster.getChildCount();

		var c = ' marker-cluster-';
		if (childCount < 10) {
			c += 'small';
		} else if (childCount < 100) {
			c += 'medium';
		} else {
			c += 'large';
		}

		return new L.DivIcon({ html: '<div><span>' + childCount + '</span></div>', className: 'marker-cluster' + c, iconSize: new L.Point(40, 40) });
	},

	_bindEvents: function () {
		var map = this._map,
		    spiderfyOnMaxZoom = this.options.spiderfyOnMaxZoom,
		    showCoverageOnHover = this.options.showCoverageOnHover,
		    zoomToBoundsOnClick = this.options.zoomToBoundsOnClick;

		//Zoom on cluster click or spiderfy if we are at the lowest level
		if (spiderfyOnMaxZoom || zoomToBoundsOnClick) {
			this.on('clusterclick', this._zoomOrSpiderfy, this);
		}

		//Show convex hull (boundary) polygon on mouse over
		if (showCoverageOnHover) {
			this.on('clustermouseover', this._showCoverage, this);
			this.on('clustermouseout', this._hideCoverage, this);
			map.on('zoomend', this._hideCoverage, this);
		}
	},

	_zoomOrSpiderfy: function (e) {
		for(var c in MI.clusters) {
			MI.clusters[c].unspiderfy();
		}
		var cluster = e.layer,
		    bottomCluster = cluster;

		while (bottomCluster._childClusters.length === 1) {
			bottomCluster = bottomCluster._childClusters[0];
		}

		if (bottomCluster._zoom === this._maxZoom &&
			bottomCluster._childCount === cluster._childCount &&
			this.options.spiderfyOnMaxZoom) {

			// All child markers are contained in a single cluster from this._maxZoom to this cluster.
			cluster.spiderfy();
		} else if (this.options.zoomToBoundsOnClick) {
			cluster.zoomToBounds();
		}

		// Focus the map again for keyboard users.
		if (e.originalEvent && e.originalEvent.keyCode === 13) {
			this._map._container.focus();
		}
	},

	_showCoverage: function (e) {
		var map = this._map;
		if (this._inZoomAnimation) {
			return;
		}
		if (this._shownPolygon) {
			map.removeLayer(this._shownPolygon);
		}
		if (e.layer.getChildCount() > 2 && e.layer !== this._spiderfied) {
			this._shownPolygon = new L.Polygon(e.layer.getConvexHull(), this.options.polygonOptions);
			map.addLayer(this._shownPolygon);
		}
	},

	_hideCoverage: function () {
		if (this._shownPolygon) {
			this._map.removeLayer(this._shownPolygon);
			this._shownPolygon = null;
		}
	},

	_unbindEvents: function () {
		var spiderfyOnMaxZoom = this.options.spiderfyOnMaxZoom,
			showCoverageOnHover = this.options.showCoverageOnHover,
			zoomToBoundsOnClick = this.options.zoomToBoundsOnClick,
			map = this._map;

		if (spiderfyOnMaxZoom || zoomToBoundsOnClick) {
			this.off('clusterclick', this._zoomOrSpiderfy, this);
		}
		if (showCoverageOnHover) {
			this.off('clustermouseover', this._showCoverage, this);
			this.off('clustermouseout', this._hideCoverage, this);
			map.off('zoomend', this._hideCoverage, this);
		}
	},

	_zoomEnd: function () {
		for(var c in MI.clusters) {
			MI.clusters[c].unspiderfy();
		}
		
		if (!this._map) { //May have been removed from the map by a zoomEnd handler
			return;
		}
		this._mergeSplitClusters();

		this._zoom = Math.round(this._map._zoom);
		this._currentShownBounds = this._getExpandedVisibleBounds();
		
		// TODO : Improve this cludge for researching clustered markers
		MI.functions.search();
	},

	_moveEnd: function () {
		if (this._inZoomAnimation) {
			return;
		}

		var newBounds = this._getExpandedVisibleBounds();

		//this._topClusterLevel._recursivelyRemoveChildrenFromMap(this._currentShownBounds, Math.floor(this._map.getMinZoom()), this._zoom, newBounds);
		this._topClusterLevel._recursivelyAddChildrenToMap(null, Math.round(this._map._zoom), newBounds);

		this._currentShownBounds = newBounds;
		MI.functions.search();
		
		return;
	},

	_generateInitialClusters: function () {
		var maxZoom = Math.ceil(this._map.getMaxZoom()),
			minZoom = Math.floor(this._map.getMinZoom()),
			radius = this.options.maxClusterRadius,
			radiusFn = radius;

		//If we just set maxClusterRadius to a single number, we need to create
		//a simple function to return that number. Otherwise, we just have to
		//use the function we've passed in.
		if (typeof radius !== "function") {
			radiusFn = function () { return radius; };
		}

		if (this.options.disableClusteringAtZoom !== null) {
			maxZoom = this.options.disableClusteringAtZoom - 1;
		}
		this._maxZoom = maxZoom;
		this._gridClusters = {};
		this._gridUnclustered = {};

		//Set up DistanceGrids for each zoom
		for (var zoom = maxZoom; zoom >= minZoom; zoom--) {
			this._gridClusters[zoom] = new L.DistanceGrid(radiusFn(zoom));
			this._gridUnclustered[zoom] = new L.DistanceGrid(radiusFn(zoom));
		}

		// Instantiate the appropriate L.MarkerCluster class (animated or not).
		this._topClusterLevel = new this._markerCluster(this, minZoom - 1);
	},

	//Zoom: Zoom to start adding at (Pass this._maxZoom to start at the bottom)
	_addLayer: function (layer, zoom) {
		var gridClusters = this._gridClusters,
		    gridUnclustered = this._gridUnclustered,
			minZoom = Math.floor(this._map.getMinZoom()),
		    markerPoint, z;

		if (this.options.singleMarkerMode) {
			this._overrideMarkerIcon(layer);
		}

		layer.on(this._childMarkerEventHandlers, this);

		//Find the lowest zoom level to slot this one in
		for (; zoom >= minZoom; zoom--) {
			markerPoint = this._map.project(layer.getLatLng(), zoom); // calculate pixel position

			//Try find a cluster close by
			var closest = gridClusters[zoom].getNearObject(markerPoint);
			if (closest) {
				closest._addChild(layer);
				layer.__parent = closest;
				return;
			}

			//Try find a marker close by to form a new cluster with
			closest = gridUnclustered[zoom].getNearObject(markerPoint);
			if (closest) {
				var parent = closest.__parent;
				if (parent) {
					this._removeLayer(closest, false);
				}

				//Create new cluster with these 2 in it

				var newCluster = new this._markerCluster(this, zoom, closest, layer);
				gridClusters[zoom].addObject(newCluster, this._map.project(newCluster._cLatLng, zoom));
				closest.__parent = newCluster;
				layer.__parent = newCluster;

				//First create any new intermediate parent clusters that don't exist
				var lastParent = newCluster;
				for (z = zoom - 1; z > parent._zoom; z--) {
					lastParent = new this._markerCluster(this, z, lastParent);
					gridClusters[z].addObject(lastParent, this._map.project(closest.getLatLng(), z));
				}
				parent._addChild(lastParent);

				//Remove closest from this zoom level and any above that it is in, replace with newCluster
				this._removeFromGridUnclustered(closest, zoom);

				return;
			}

			//Didn't manage to cluster in at this zoom, record us as a marker here and continue upwards
			gridUnclustered[zoom].addObject(layer, markerPoint);
		}

		//Didn't get in anything, add us to the top
		this._topClusterLevel._addChild(layer);
		layer.__parent = this._topClusterLevel;
		return;
	},

	/**
	 * Refreshes the icon of all "dirty" visible clusters.
	 * Non-visible "dirty" clusters will be updated when they are added to the map.
	 * @private
	 */
	_refreshClustersIcons: function () {
		this._featureGroup.eachLayer(function (c) {
			if (c instanceof L.MarkerCluster && c._iconNeedsUpdate) {
				c._updateIcon();
			}
		});
	},

	//Enqueue code to fire after the marker expand/contract has happened
	_enqueue: function (fn) {
		this._queue.push(fn);
		if (!this._queueTimeout) {
			this._queueTimeout = setTimeout(L.bind(this._processQueue, this), 300);
		}
	},
	_processQueue: function () {
		for (var i = 0; i < this._queue.length; i++) {
			this._queue[i].call(this);
		}
		this._queue.length = 0;
		clearTimeout(this._queueTimeout);
		this._queueTimeout = null;
	},

	//Merge and split any existing clusters that are too big or small
	_mergeSplitClusters: function () {
		var mapZoom = Math.round(this._map._zoom);

		//In case we are starting to split before the animation finished
		this._processQueue();

		if (this._zoom < mapZoom && this._currentShownBounds.intersects(this._getExpandedVisibleBounds())) { //Zoom in, split
			this._animationStart();
			//Remove clusters now off screen
			this._topClusterLevel._recursivelyRemoveChildrenFromMap(this._currentShownBounds, Math.floor(this._map.getMinZoom()), this._zoom, this._getExpandedVisibleBounds());

			this._animationZoomIn(this._zoom, mapZoom);

		} else if (this._zoom > mapZoom) { //Zoom out, merge
			this._animationStart();

			this._animationZoomOut(this._zoom, mapZoom);
		} else {
			this._moveEnd();
		}
	},

	//Gets the maps visible bounds expanded in each direction by the size of the screen (so the user cannot see an area we do not cover in one pan)
	_getExpandedVisibleBounds: function () {
		if (!this.options.removeOutsideVisibleBounds) {
			return this._mapBoundsInfinite;
		} else if (L.Browser.mobile) {
			return this._checkBoundsMaxLat(this._map.getBounds());
		}

		return this._checkBoundsMaxLat(this._map.getBounds().pad(1)); // Padding expands the bounds by its own dimensions but scaled with the given factor.
	},

	/**
	 * Expands the latitude to Infinity (or -Infinity) if the input bounds reach the map projection maximum defined latitude
	 * (in the case of Web/Spherical Mercator, it is 85.0511287798 / see https://en.wikipedia.org/wiki/Web_Mercator#Formulas).
	 * Otherwise, the removeOutsideVisibleBounds option will remove markers beyond that limit, whereas the same markers without
	 * this option (or outside MCG) will have their position floored (ceiled) by the projection and rendered at that limit,
	 * making the user think that MCG "eats" them and never displays them again.
	 * @param bounds L.LatLngBounds
	 * @returns {L.LatLngBounds}
	 * @private
	 */
	_checkBoundsMaxLat: function (bounds) {
		var maxLat = this._maxLat;

		if (maxLat !== undefined) {
			if (bounds.getNorth() >= maxLat) {
				bounds._northEast.lat = Infinity;
			}
			if (bounds.getSouth() <= -maxLat) {
				bounds._southWest.lat = -Infinity;
			}
		}

		return bounds;
	},

	//Shared animation code
	_animationAddLayerNonAnimated: function (layer, newCluster) {
		if (newCluster === layer) {
			this._featureGroup.addLayer(layer);
		} else if (newCluster._childCount === 2) {
			newCluster._addToMap();

			var markers = newCluster.getAllChildMarkers();
			this._featureGroup.removeLayer(markers[0]);
			this._featureGroup.removeLayer(markers[1]);
		} else {
			newCluster._updateIcon();
		}
	},

	/**
	 * Extracts individual (i.e. non-group) layers from a Layer Group.
	 * @param group to extract layers from.
	 * @param output {Array} in which to store the extracted layers.
	 * @returns {*|Array}
	 * @private
	 */
	_extractNonGroupLayers: function (group, output) {
		var layers = group.getLayers(),
		    i = 0,
		    layer;

		output = output || [];

		for (; i < layers.length; i++) {
			layer = layers[i];

			if (layer instanceof L.LayerGroup) {
				this._extractNonGroupLayers(layer, output);
				continue;
			}

			output.push(layer);
		}

		return output;
	},

	/**
	 * Implements the singleMarkerMode option.
	 * @param layer Marker to re-style using the Clusters iconCreateFunction.
	 * @returns {L.Icon} The newly created icon.
	 * @private
	 */
	_overrideMarkerIcon: function (layer) {
		var icon = layer.options.icon = this.options.iconCreateFunction({
			getChildCount: function () {
				return 1;
			},
			getAllChildMarkers: function () {
				return [layer];
			}
		});

		return icon;
	}
});

// Constant bounds used in case option "removeOutsideVisibleBounds" is set to false.
L.MarkerClusterGroup.include({
	_mapBoundsInfinite: new L.LatLngBounds(new L.LatLng(-Infinity, -Infinity), new L.LatLng(Infinity, Infinity))
});

L.MarkerClusterGroup.include({
	_noAnimation: {
		//Non Animated versions of everything
		_animationStart: function () {
			//Do nothing...
		},
		_animationZoomIn: function (previousZoomLevel, newZoomLevel) {
			//this._topClusterLevel._recursivelyRemoveChildrenFromMap(this._currentShownBounds, Math.floor(this._map.getMinZoom()), previousZoomLevel);
			//this._topClusterLevel._recursivelyAddChildrenToMap(null, newZoomLevel, this._getExpandedVisibleBounds());

			//We didn't actually animate, but we use this event to mean "clustering animations have finished"
			this.fire('animationend');
		},
		_animationZoomOut: function (previousZoomLevel, newZoomLevel) {
			//this._topClusterLevel._recursivelyRemoveChildrenFromMap(this._currentShownBounds, Math.floor(this._map.getMinZoom()), previousZoomLevel);
			//this._topClusterLevel._recursivelyAddChildrenToMap(null, newZoomLevel, this._getExpandedVisibleBounds());

			//We didn't actually animate, but we use this event to mean "clustering animations have finished"
			this.fire('animationend');
		},
		_animationAddLayer: function (layer, newCluster) {
			this._animationAddLayerNonAnimated(layer, newCluster);
		}
	},

	_withAnimation: {
		//Animated versions here
		_animationStart: function () {
			this._map._mapPane.className += ' leaflet-cluster-anim';
			this._inZoomAnimation++;
		},

		_animationZoomIn: function (previousZoomLevel, newZoomLevel) {
			var bounds = this._getExpandedVisibleBounds(),
			    fg = this._featureGroup,
				minZoom = Math.floor(this._map.getMinZoom()),
			    i;

			this._ignoreMove = true;

			//Add all children of current clusters to map and remove those clusters from map
			this._topClusterLevel._recursively(bounds, previousZoomLevel, minZoom, function (c) {
				var startPos = c._latlng,
				    markers  = c._markers,
				    m;

				if (!bounds.contains(startPos)) {
					startPos = null;
				}

				if (c._isSingleParent() && previousZoomLevel + 1 === newZoomLevel) { //Immediately add the new child and remove us
					fg.removeLayer(c);
					c._recursivelyAddChildrenToMap(null, newZoomLevel, bounds);
				} else {
					//Fade out old cluster
					c.clusterHide();
					c._recursivelyAddChildrenToMap(startPos, newZoomLevel, bounds);
				}

				//Remove all markers that aren't visible any more
				//TODO: Do we actually need to do this on the higher levels too?
				for (i = markers.length - 1; i >= 0; i--) {
					m = markers[i];
					if (!bounds.contains(m._latlng)) {
						fg.removeLayer(m);
					}
				}

			});

			this._forceLayout();

			//Update opacities
			this._topClusterLevel._recursivelyBecomeVisible(bounds, newZoomLevel);
			//TODO Maybe? Update markers in _recursivelyBecomeVisible
			fg.eachLayer(function (n) {
				if (!(n instanceof L.MarkerCluster) && n._icon) {
					n.clusterShow();
				}
			});

			//update the positions of the just added clusters/markers
			this._topClusterLevel._recursively(bounds, previousZoomLevel, newZoomLevel, function (c) {
				c._recursivelyRestoreChildPositions(newZoomLevel);
			});

			this._ignoreMove = false;

			//Remove the old clusters and close the zoom animation
			this._enqueue(function () {
				//update the positions of the just added clusters/markers
				this._topClusterLevel._recursively(bounds, previousZoomLevel, minZoom, function (c) {
					fg.removeLayer(c);
					c.clusterShow();
				});

				this._animationEnd();
			});
		},

		_animationZoomOut: function (previousZoomLevel, newZoomLevel) {
			this._animationZoomOutSingle(this._topClusterLevel, previousZoomLevel - 1, newZoomLevel);

			//Need to add markers for those that weren't on the map before but are now
			//this._topClusterLevel._recursivelyAddChildrenToMap(null, newZoomLevel, this._getExpandedVisibleBounds());
			//Remove markers that were on the map before but won't be now
			this._topClusterLevel._recursivelyRemoveChildrenFromMap(this._currentShownBounds, Math.floor(this._map.getMinZoom()), previousZoomLevel, this._getExpandedVisibleBounds());
		},

		_animationAddLayer: function (layer, newCluster) {
			var me = this,
			    fg = this._featureGroup;

			fg.addLayer(layer);
			if (newCluster !== layer) {
				if (newCluster._childCount > 2) { //Was already a cluster

					newCluster._updateIcon();
					this._forceLayout();
					this._animationStart();

					layer._setPos(this._map.latLngToLayerPoint(newCluster.getLatLng()));
					layer.clusterHide();

					this._enqueue(function () {
						fg.removeLayer(layer);
						layer.clusterShow();

						me._animationEnd();
					});

				} else { //Just became a cluster
					this._forceLayout();

					me._animationStart();
					me._animationZoomOutSingle(newCluster, this._map.getMaxZoom(), this._zoom);
				}
			}
		}
	},

	// Private methods for animated versions.
	_animationZoomOutSingle: function (cluster, previousZoomLevel, newZoomLevel) {
		var bounds = this._getExpandedVisibleBounds(),
			minZoom = Math.floor(this._map.getMinZoom());

		//Animate all of the markers in the clusters to move to their cluster center point
		cluster._recursivelyAnimateChildrenInAndAddSelfToMap(bounds, minZoom, previousZoomLevel + 1, newZoomLevel);

		var me = this;

		//Update the opacity (If we immediately set it they won't animate)
		this._forceLayout();
		cluster._recursivelyBecomeVisible(bounds, newZoomLevel);

		//TODO: Maybe use the transition timing stuff to make this more reliable
		//When the animations are done, tidy up
		this._enqueue(function () {

			//This cluster stopped being a cluster before the timeout fired
			if (cluster._childCount === 1) {
				var m = cluster._markers[0];
				//If we were in a cluster animation at the time then the opacity and position of our child could be wrong now, so fix it
				this._ignoreMove = true;
				m.setLatLng(m.getLatLng());
				this._ignoreMove = false;
				if (m.clusterShow) {
					m.clusterShow();
				}
			} else {
				cluster._recursively(bounds, newZoomLevel, minZoom, function (c) {
					c._recursivelyRemoveChildrenFromMap(bounds, minZoom, previousZoomLevel + 1);
				});
			}
			me._animationEnd();
		});
	},

	_animationEnd: function () {
		if (this._map) {
			this._map._mapPane.className = this._map._mapPane.className.replace(' leaflet-cluster-anim', '');
		}
		this._inZoomAnimation--;
		this.fire('animationend');
	},

	//Force a browser layout of stuff in the map
	// Should apply the current opacity and location to all elements so we can update them again for an animation
	_forceLayout: function () {
		//In my testing this works, infact offsetWidth of any element seems to work.
		//Could loop all this._layers and do this for each _icon if it stops working

		L.Util.falseFn(document.body.offsetWidth);
	}
});

L.markerClusterGroup = function (options) {
	return new L.MarkerClusterGroup(options);
};

var MarkerCluster = L.MarkerCluster = L.Marker.extend({
	options: L.Icon.prototype.options,

	initialize: function (group, zoom, a, b) {

		L.Marker.prototype.initialize.call(this, a ? (a._cLatLng || a.getLatLng()) : new L.LatLng(0, 0),
            { icon: this, pane: group.options.clusterPane });

		this._group = group;
		this._zoom = zoom;

		this._markers = [];
		this._childClusters = [];
		this._childCount = 0;
		this._iconNeedsUpdate = true;
		this._boundsNeedUpdate = true;

		this._bounds = new L.LatLngBounds();

		if (a) {
			this._addChild(a);
		}
		if (b) {
			this._addChild(b);
		}
	},

	//Recursively retrieve all child markers of this cluster
	getAllChildMarkers: function (storageArray, ignoreDraggedMarker) {
		storageArray = storageArray || [];

		for (var i = this._childClusters.length - 1; i >= 0; i--) {
			this._childClusters[i].getAllChildMarkers(storageArray);
		}

		for (var j = this._markers.length - 1; j >= 0; j--) {
			if (ignoreDraggedMarker && this._markers[j].__dragStart) {
				continue;
			}
			storageArray.push(this._markers[j]);
		}

		return storageArray;
	},

	//Returns the count of how many child markers we have
	getChildCount: function () {
		return this._childCount;
	},

	//Zoom to the minimum of showing all of the child markers, or the extents of this cluster
	zoomToBounds: function (fitBoundsOptions) {
		var childClusters = this._childClusters.slice(),
			map = this._group._map,
			boundsZoom = map.getBoundsZoom(this._bounds),
			zoom = this._zoom + 1,
			mapZoom = map.getZoom(),
			i;

		//calculate how far we need to zoom down to see all of the markers
		while (childClusters.length > 0 && boundsZoom > zoom) {
			zoom++;
			var newClusters = [];
			for (i = 0; i < childClusters.length; i++) {
				newClusters = newClusters.concat(childClusters[i]._childClusters);
			}
			childClusters = newClusters;
		}

		if (boundsZoom > zoom) {
			this._group._map.setView(this._latlng, zoom);
		} else if (boundsZoom <= mapZoom) { //If fitBounds wouldn't zoom us down, zoom us down instead
			this._group._map.setView(this._latlng, mapZoom + 1);
		} else {
			this._group._map.fitBounds(this._bounds, fitBoundsOptions);
		}
	},

	getBounds: function () {
		var bounds = new L.LatLngBounds();
		bounds.extend(this._bounds);
		return bounds;
	},

	_updateIcon: function () {
		this._iconNeedsUpdate = true;
		if (this._icon) {
			this.setIcon(this);
		}
	},

	//Cludge for Icon, we pretend to be an icon for performance
	createIcon: function () {
		if (this._iconNeedsUpdate) {
			this._iconObj = this._group.options.iconCreateFunction(this);
			this._iconNeedsUpdate = false;
		}
		return this._iconObj.createIcon();
	},
	createShadow: function () {
		return this._iconObj.createShadow();
	},


	_addChild: function (new1, isNotificationFromChild) {

		this._iconNeedsUpdate = true;

		this._boundsNeedUpdate = true;
		this._setClusterCenter(new1);

		if (new1 instanceof L.MarkerCluster) {
			if (!isNotificationFromChild) {
				this._childClusters.push(new1);
				new1.__parent = this;
			}
			this._childCount += new1._childCount;
		} else {
			if (!isNotificationFromChild) {
				this._markers.push(new1);
			}
			this._childCount++;
		}

		if (this.__parent) {
			this.__parent._addChild(new1, true);
		}
	},

	/**
	 * Makes sure the cluster center is set. If not, uses the child center if it is a cluster, or the marker position.
	 * @param child L.MarkerCluster|L.Marker that will be used as cluster center if not defined yet.
	 * @private
	 */
	_setClusterCenter: function (child) {
		if (!this._cLatLng) {
			// when clustering, take position of the first point as the cluster center
			this._cLatLng = child._cLatLng || child._latlng;
		}
	},

	/**
	 * Assigns impossible bounding values so that the next extend entirely determines the new bounds.
	 * This method avoids having to trash the previous L.LatLngBounds object and to create a new one, which is much slower for this class.
	 * As long as the bounds are not extended, most other methods would probably fail, as they would with bounds initialized but not extended.
	 * @private
	 */
	_resetBounds: function () {
		var bounds = this._bounds;

		if (bounds._southWest) {
			bounds._southWest.lat = Infinity;
			bounds._southWest.lng = Infinity;
		}
		if (bounds._northEast) {
			bounds._northEast.lat = -Infinity;
			bounds._northEast.lng = -Infinity;
		}
	},

	_recalculateBounds: function () {
		var markers = this._markers,
		    childClusters = this._childClusters,
		    latSum = 0,
		    lngSum = 0,
		    totalCount = this._childCount,
		    i, child, childLatLng, childCount;

		// Case where all markers are removed from the map and we are left with just an empty _topClusterLevel.
		if (totalCount === 0) {
			return;
		}

		// Reset rather than creating a new object, for performance.
		this._resetBounds();

		// Child markers.
		for (i = 0; i < markers.length; i++) {
			childLatLng = markers[i]._latlng;

			this._bounds.extend(childLatLng);

			latSum += childLatLng.lat;
			lngSum += childLatLng.lng;
		}

		// Child clusters.
		for (i = 0; i < childClusters.length; i++) {
			child = childClusters[i];

			// Re-compute child bounds and weighted position first if necessary.
			if (child._boundsNeedUpdate) {
				child._recalculateBounds();
			}

			this._bounds.extend(child._bounds);

			childLatLng = child._wLatLng;
			childCount = child._childCount;

			latSum += childLatLng.lat * childCount;
			lngSum += childLatLng.lng * childCount;
		}

		this._latlng = this._wLatLng = new L.LatLng(latSum / totalCount, lngSum / totalCount);

		// Reset dirty flag.
		this._boundsNeedUpdate = false;
	},

	//Set our markers position as given and add it to the map
	_addToMap: function (startPos) {
		if (startPos) {
			this._backupLatlng = this._latlng;
			this.setLatLng(startPos);
		}
		this._group._featureGroup.addLayer(this);
	},

	_recursivelyAnimateChildrenIn: function (bounds, center, maxZoom) {
		this._recursively(bounds, this._group._map.getMinZoom(), maxZoom - 1,
			function (c) {
				var markers = c._markers,
					i, m;
				for (i = markers.length - 1; i >= 0; i--) {
					m = markers[i];

					//Only do it if the icon is still on the map
					if (m._icon) {
						m._setPos(center);
						m.clusterHide();
					}
				}
			},
			function (c) {
				var childClusters = c._childClusters,
					j, cm;
				for (j = childClusters.length - 1; j >= 0; j--) {
					cm = childClusters[j];
					if (cm._icon) {
						cm._setPos(center);
						cm.clusterHide();
					}
				}
			}
		);
	},

	_recursivelyAnimateChildrenInAndAddSelfToMap: function (bounds, mapMinZoom, previousZoomLevel, newZoomLevel) {
		this._recursively(bounds, newZoomLevel, mapMinZoom,
			function (c) {
				c._recursivelyAnimateChildrenIn(bounds, c._group._map.latLngToLayerPoint(c.getLatLng()).round(), previousZoomLevel);

				//TODO: depthToAnimateIn affects _isSingleParent, if there is a multizoom we may/may not be.
				//As a hack we only do a animation free zoom on a single level zoom, if someone does multiple levels then we always animate
				if (c._isSingleParent() && previousZoomLevel - 1 === newZoomLevel) {
					c.clusterShow();
					c._recursivelyRemoveChildrenFromMap(bounds, mapMinZoom, previousZoomLevel); //Immediately remove our children as we are replacing them. TODO previousBounds not bounds
				} else {
					c.clusterHide();
				}

				c._addToMap();
			}
		);
	},

	_recursivelyBecomeVisible: function (bounds, zoomLevel) {
		this._recursively(bounds, this._group._map.getMinZoom(), zoomLevel, null, function (c) {
			c.clusterShow();
		});
	},

	_recursivelyAddChildrenToMap: function (startPos, zoomLevel, bounds) {
		this._recursively(bounds, this._group._map.getMinZoom() - 1, zoomLevel,
			function (c) {
				if (zoomLevel === c._zoom) {
					return;
				}

				//Add our child markers at startPos (so they can be animated out)
				for (var i = c._markers.length - 1; i >= 0; i--) {
					var nm = c._markers[i];

					if (!bounds.contains(nm._latlng)) {
						continue;
					}

					if (startPos) {
						nm._backupLatlng = nm.getLatLng();

						nm.setLatLng(startPos);
						if (nm.clusterHide) {
							nm.clusterHide();
						}
					}

					c._group._featureGroup.addLayer(nm);
				}
			},
			function (c) {
				c._addToMap(startPos);
			}
		);
	},

	_recursivelyRestoreChildPositions: function (zoomLevel) {
		//Fix positions of child markers
		for (var i = this._markers.length - 1; i >= 0; i--) {
			var nm = this._markers[i];
			if (nm._backupLatlng) {
				nm.setLatLng(nm._backupLatlng);
				delete nm._backupLatlng;
			}
		}

		if (zoomLevel - 1 === this._zoom) {
			//Reposition child clusters
			for (var j = this._childClusters.length - 1; j >= 0; j--) {
				this._childClusters[j]._restorePosition();
			}
		} else {
			for (var k = this._childClusters.length - 1; k >= 0; k--) {
				this._childClusters[k]._recursivelyRestoreChildPositions(zoomLevel);
			}
		}
	},

	_restorePosition: function () {
		if (this._backupLatlng) {
			this.setLatLng(this._backupLatlng);
			delete this._backupLatlng;
		}
	},

	//exceptBounds: If set, don't remove any markers/clusters in it
	_recursivelyRemoveChildrenFromMap: function (previousBounds, mapMinZoom, zoomLevel, exceptBounds) {
		var m, i;
		this._recursively(previousBounds, mapMinZoom - 1, zoomLevel - 1,
			function (c) {
				//Remove markers at every level
				for (i = c._markers.length - 1; i >= 0; i--) {
					m = c._markers[i];
					if (!exceptBounds || !exceptBounds.contains(m._latlng)) {
						c._group._featureGroup.removeLayer(m);
						if (m.clusterShow) {
							m.clusterShow();
						}
					}
				}
			},
			function (c) {
				//Remove child clusters at just the bottom level
				for (i = c._childClusters.length - 1; i >= 0; i--) {
					m = c._childClusters[i];
					if (!exceptBounds || !exceptBounds.contains(m._latlng)) {
						c._group._featureGroup.removeLayer(m);
						if (m.clusterShow) {
							m.clusterShow();
						}
					}
				}
			}
		);
	},

	//Run the given functions recursively to this and child clusters
	// boundsToApplyTo: a L.LatLngBounds representing the bounds of what clusters to recurse in to
	// zoomLevelToStart: zoom level to start running functions (inclusive)
	// zoomLevelToStop: zoom level to stop running functions (inclusive)
	// runAtEveryLevel: function that takes an L.MarkerCluster as an argument that should be applied on every level
	// runAtBottomLevel: function that takes an L.MarkerCluster as an argument that should be applied at only the bottom level
	_recursively: function (boundsToApplyTo, zoomLevelToStart, zoomLevelToStop, runAtEveryLevel, runAtBottomLevel) {
		var childClusters = this._childClusters,
		    zoom = this._zoom,
		    i, c;

		if (zoomLevelToStart <= zoom) {
			if (runAtEveryLevel) {
				runAtEveryLevel(this);
			}
			if (runAtBottomLevel && zoom === zoomLevelToStop) {
				runAtBottomLevel(this);
			}
		}

		if (zoom < zoomLevelToStart || zoom < zoomLevelToStop) {
			for (i = childClusters.length - 1; i >= 0; i--) {
				c = childClusters[i];
				if (c._boundsNeedUpdate) {
					c._recalculateBounds();
				}
				if (boundsToApplyTo.intersects(c._bounds)) {
					c._recursively(boundsToApplyTo, zoomLevelToStart, zoomLevelToStop, runAtEveryLevel, runAtBottomLevel);
				}
			}
		}
	},

	//Returns true if we are the parent of only one cluster and that cluster is the same as us
	_isSingleParent: function () {
		//Don't need to check this._markers as the rest won't work if there are any
		return this._childClusters.length > 0 && this._childClusters[0]._childCount === this._childCount;
	}
});

/*
* Extends L.Marker to include two extra methods: clusterHide and clusterShow.
* 
* They work as setOpacity(0) and setOpacity(1) respectively, but
* don't overwrite the options.opacity
* 
*/

L.Marker.include({
	clusterHide: function () {
		var backup = this.options.opacity;
		this.setOpacity(0);
		this.options.opacity = backup;
		return this;
	},
	
	clusterShow: function () {
		return this.setOpacity(this.options.opacity);
	}
});

L.DistanceGrid = function (cellSize) {
	this._cellSize = cellSize;
	this._sqCellSize = cellSize * cellSize;
	this._grid = {};
	this._objectPoint = { };
};

L.DistanceGrid.prototype = {

	addObject: function (obj, point) {
		var x = this._getCoord(point.x),
		    y = this._getCoord(point.y),
		    grid = this._grid,
		    row = grid[y] = grid[y] || {},
		    cell = row[x] = row[x] || [],
		    stamp = L.Util.stamp(obj);

		this._objectPoint[stamp] = point;

		cell.push(obj);
	},

	updateObject: function (obj, point) {
		this.removeObject(obj);
		this.addObject(obj, point);
	},

	//Returns true if the object was found
	removeObject: function (obj, point) {
		var x = this._getCoord(point.x),
		    y = this._getCoord(point.y),
		    grid = this._grid,
		    row = grid[y] = grid[y] || {},
		    cell = row[x] = row[x] || [],
		    i, len;

		delete this._objectPoint[L.Util.stamp(obj)];

		for (i = 0, len = cell.length; i < len; i++) {
			if (cell[i] === obj) {

				cell.splice(i, 1);

				if (len === 1) {
					delete row[x];
				}

				return true;
			}
		}

	},

	eachObject: function (fn, context) {
		var i, j, k, len, row, cell, removed,
		    grid = this._grid;

		for (i in grid) {
			row = grid[i];

			for (j in row) {
				cell = row[j];

				for (k = 0, len = cell.length; k < len; k++) {
					removed = fn.call(context, cell[k]);
					if (removed) {
						k--;
						len--;
					}
				}
			}
		}
	},

	getNearObject: function (point) {
		var x = this._getCoord(point.x),
		    y = this._getCoord(point.y),
		    i, j, k, row, cell, len, obj, dist,
		    objectPoint = this._objectPoint,
		    closestDistSq = this._sqCellSize,
		    closest = null;

		for (i = y - 1; i <= y + 1; i++) {
			row = this._grid[i];
			if (row) {

				for (j = x - 1; j <= x + 1; j++) {
					cell = row[j];
					if (cell) {

						for (k = 0, len = cell.length; k < len; k++) {
							obj = cell[k];
							dist = this._sqDist(objectPoint[L.Util.stamp(obj)], point);
							if (dist < closestDistSq ||
								dist <= closestDistSq && closest === null) {
								closestDistSq = dist;
								closest = obj;
							}
						}
					}
				}
			}
		}
		return closest;
	},

	_getCoord: function (x) {
		var coord = Math.floor(x / this._cellSize);
		return isFinite(coord) ? coord : x;
	},

	_sqDist: function (p, p2) {
		var dx = p2.x - p.x,
		    dy = p2.y - p.y;
		return dx * dx + dy * dy;
	}
};

/* Copyright (c) 2012 the authors listed at the following URL, and/or
the authors of referenced articles or incorporated external code:
http://en.literateprograms.org/Quickhull_(Javascript)?action=history&offset=20120410175256

Permission is hereby granted, free of charge, to any person obtaining
a copy of this software and associated documentation files (the
"Software"), to deal in the Software without restriction, including
without limitation the rights to use, copy, modify, merge, publish,
distribute, sublicense, and/or sell copies of the Software, and to
permit persons to whom the Software is furnished to do so, subject to
the following conditions:

The above copyright notice and this permission notice shall be
included in all copies or substantial portions of the Software.

THE SOFTWARE IS PROVIDED "AS IS", WITHOUT WARRANTY OF ANY KIND,
EXPRESS OR IMPLIED, INCLUDING BUT NOT LIMITED TO THE WARRANTIES OF
MERCHANTABILITY, FITNESS FOR A PARTICULAR PURPOSE AND NONINFRINGEMENT.
IN NO EVENT SHALL THE AUTHORS OR COPYRIGHT HOLDERS BE LIABLE FOR ANY
CLAIM, DAMAGES OR OTHER LIABILITY, WHETHER IN AN ACTION OF CONTRACT,
TORT OR OTHERWISE, ARISING FROM, OUT OF OR IN CONNECTION WITH THE
SOFTWARE OR THE USE OR OTHER DEALINGS IN THE SOFTWARE.

Retrieved from: http://en.literateprograms.org/Quickhull_(Javascript)?oldid=18434
*/

(function () {
	L.QuickHull = {

		/*
		 * @param {Object} cpt a point to be measured from the baseline
		 * @param {Array} bl the baseline, as represented by a two-element
		 *   array of latlng objects.
		 * @returns {Number} an approximate distance measure
		 */
		getDistant: function (cpt, bl) {
			var vY = bl[1].lat - bl[0].lat,
				vX = bl[0].lng - bl[1].lng;
			return (vX * (cpt.lat - bl[0].lat) + vY * (cpt.lng - bl[0].lng));
		},

		/*
		 * @param {Array} baseLine a two-element array of latlng objects
		 *   representing the baseline to project from
		 * @param {Array} latLngs an array of latlng objects
		 * @returns {Object} the maximum point and all new points to stay
		 *   in consideration for the hull.
		 */
		findMostDistantPointFromBaseLine: function (baseLine, latLngs) {
			var maxD = 0,
				maxPt = null,
				newPoints = [],
				i, pt, d;

			for (i = latLngs.length - 1; i >= 0; i--) {
				pt = latLngs[i];
				d = this.getDistant(pt, baseLine);

				if (d > 0) {
					newPoints.push(pt);
				} else {
					continue;
				}

				if (d > maxD) {
					maxD = d;
					maxPt = pt;
				}
			}

			return { maxPoint: maxPt, newPoints: newPoints };
		},


		/*
		 * Given a baseline, compute the convex hull of latLngs as an array
		 * of latLngs.
		 *
		 * @param {Array} latLngs
		 * @returns {Array}
		 */
		buildConvexHull: function (baseLine, latLngs) {
			var convexHullBaseLines = [],
				t = this.findMostDistantPointFromBaseLine(baseLine, latLngs);

			if (t.maxPoint) { // if there is still a point "outside" the base line
				convexHullBaseLines =
					convexHullBaseLines.concat(
						this.buildConvexHull([baseLine[0], t.maxPoint], t.newPoints)
					);
				convexHullBaseLines =
					convexHullBaseLines.concat(
						this.buildConvexHull([t.maxPoint, baseLine[1]], t.newPoints)
					);
				return convexHullBaseLines;
			} else {  // if there is no more point "outside" the base line, the current base line is part of the convex hull
				return [baseLine[0]];
			}
		},

		/*
		 * Given an array of latlngs, compute a convex hull as an array
		 * of latlngs
		 *
		 * @param {Array} latLngs
		 * @returns {Array}
		 */
		getConvexHull: function (latLngs) {
			// find first baseline
			var maxLat = false, minLat = false,
				maxLng = false, minLng = false,
				maxLatPt = null, minLatPt = null,
				maxLngPt = null, minLngPt = null,
				maxPt = null, minPt = null,
				i;

			for (i = latLngs.length - 1; i >= 0; i--) {
				var pt = latLngs[i];
				if (maxLat === false || pt.lat > maxLat) {
					maxLatPt = pt;
					maxLat = pt.lat;
				}
				if (minLat === false || pt.lat < minLat) {
					minLatPt = pt;
					minLat = pt.lat;
				}
				if (maxLng === false || pt.lng > maxLng) {
					maxLngPt = pt;
					maxLng = pt.lng;
				}
				if (minLng === false || pt.lng < minLng) {
					minLngPt = pt;
					minLng = pt.lng;
				}
			}
			
			if (minLat !== maxLat) {
				minPt = minLatPt;
				maxPt = maxLatPt;
			} else {
				minPt = minLngPt;
				maxPt = maxLngPt;
			}

			var ch = [].concat(this.buildConvexHull([minPt, maxPt], latLngs),
								this.buildConvexHull([maxPt, minPt], latLngs));
			return ch;
		}
	};
}());

L.MarkerCluster.include({
	getConvexHull: function () {
		var childMarkers = this.getAllChildMarkers(),
			points = [],
			p, i;

		for (i = childMarkers.length - 1; i >= 0; i--) {
			p = childMarkers[i].getLatLng();
			points.push(p);
		}

		return L.QuickHull.getConvexHull(points);
	}
});

//This code is 100% based on https://github.com/jawj/OverlappingMarkerSpiderfier-Leaflet
//Huge thanks to jawj for implementing it first to make my job easy :-)

L.MarkerCluster.include({

	_2PI: Math.PI * 2,
	_circleFootSeparation: 25, //related to circumference of circle
	_circleStartAngle: 0,

	_spiralFootSeparation:  28, //related to size of spiral (experiment!)
	_spiralLengthStart: 11,
	_spiralLengthFactor: 5,

	_circleSpiralSwitchover: 9, //show spiral instead of circle from this marker count upwards.
								// 0 -> always spiral; Infinity -> always circle

	spiderfy: function () {
		if (this._group._spiderfied === this || this._group._inZoomAnimation) {
			return;
		}

		var childMarkers = this.getAllChildMarkers(null, true),
			group = this._group,
			map = group._map,
			center = map.latLngToLayerPoint(this._latlng),
			positions;

			
		// Disable action if all children are hidden.
		var hidden = true;
		for(var i in childMarkers) { if(childMarkers[i].options.opacity == 1) { hidden = false; } }
		if(hidden) { return; }
		
		this._group._unspiderfy();
		this._group._spiderfied = this;

		//TODO Maybe: childMarkers order by distance to center

		if (childMarkers.length >= this._circleSpiralSwitchover) {
			positions = this._generatePointsSpiral(childMarkers.length, center);
		} else {
			center.y += 10; // Otherwise circles look wrong => hack for standard blue icon, renders differently for other icons.
			positions = this._generatePointsCircle(childMarkers.length, center);
		}

		this._animationSpiderfy(childMarkers, positions);
	},

	unspiderfy: function (zoomDetails) {
		/// <param Name="zoomDetails">Argument from zoomanim if being called in a zoom animation or null otherwise</param>
		if (this._group._inZoomAnimation) {
			return;
		}
		this._animationUnspiderfy(zoomDetails);

		this._group._spiderfied = null;
	},

	_generatePointsCircle: function (count, centerPt) {
		var circumference = this._group.options.spiderfyDistanceMultiplier * this._circleFootSeparation * (2 + count),
			legLength = circumference / this._2PI,  //radius from circumference
			angleStep = this._2PI / count,
			res = [],
			i, angle;

		legLength = Math.max(legLength, 35); // Minimum distance to get outside the cluster icon.

		res.length = count;

		for (i = 0; i < count; i++) { // Clockwise, like spiral.
			angle = this._circleStartAngle + i * angleStep;
			res[i] = new L.Point(centerPt.x + legLength * Math.cos(angle), centerPt.y + legLength * Math.sin(angle))._round();
		}

		return res;
	},

	_generatePointsSpiral: function (count, centerPt) {
		var spiderfyDistanceMultiplier = this._group.options.spiderfyDistanceMultiplier,
			legLength = spiderfyDistanceMultiplier * this._spiralLengthStart,
			separation = spiderfyDistanceMultiplier * this._spiralFootSeparation,
			lengthFactor = spiderfyDistanceMultiplier * this._spiralLengthFactor * this._2PI,
			angle = 0,
			res = [],
			i;

		res.length = count;

		// Higher index, closer position to cluster center.
		for (i = count; i >= 0; i--) {
			// Skip the first position, so that we are already farther from center and we avoid
			// being under the default cluster icon (especially important for Circle Markers).
			if (i < count) {
				res[i] = new L.Point(centerPt.x + legLength * Math.cos(angle), centerPt.y + legLength * Math.sin(angle))._round();
			}
			angle += separation / legLength + i * 0.0005;
			legLength += lengthFactor / angle;
		}
		return res;
	},

	_noanimationUnspiderfy: function () {
		var group = this._group,
			map = group._map,
			fg = group._featureGroup,
			childMarkers = this.getAllChildMarkers(null, true),
			m, i;

		group._ignoreMove = true;

		this.setOpacity(1);
		for (i = childMarkers.length - 1; i >= 0; i--) {
			m = childMarkers[i];

			fg.removeLayer(m);

			if (m._preSpiderfyLatlng) {
				m.setLatLng(m._preSpiderfyLatlng);
				delete m._preSpiderfyLatlng;
			}
			if (m.setZIndexOffset) {
				m.setZIndexOffset(0);
			}

			if (m._spiderLeg) {
				map.removeLayer(m._spiderLeg);
				delete m._spiderLeg;
			}
		}

		group.fire('unspiderfied', {
			cluster: this,
			markers: childMarkers
		});
		group._ignoreMove = false;
		group._spiderfied = null;
	}
});

//Non Animated versions of everything
L.MarkerClusterNonAnimated = L.MarkerCluster.extend({
	_animationSpiderfy: function (childMarkers, positions) {
		var group = this._group,
			map = group._map,
			fg = group._featureGroup,
			legOptions = this._group.options.spiderLegPolylineOptions,
			i, m, leg, newPos;

		group._ignoreMove = true;

		// Traverse in ascending order to make sure that inner circleMarkers are on top of further legs. Normal markers are re-ordered by newPosition.
		// The reverse order trick no longer improves performance on modern browsers.
		for (i = 0; i < childMarkers.length; i++) {
			newPos = map.layerPointToLatLng(positions[i]);
			m = childMarkers[i];
			
			// Add the leg before the marker, so that in case the latter is a circleMarker, the leg is behind it.
			leg = new L.Polyline([this._latlng, newPos], legOptions);
			
			// TODO : Could hide the leg here, but we need a way to bring it back when search is cleared.
			//if(m.options.opacity != 0.1) {
				map.addLayer(leg);
			//}
			m._spiderLeg = leg;

			// Now add the marker.
			m._preSpiderfyLatlng = m._latlng;
			m.setLatLng(newPos);
			if (m.setZIndexOffset) {
				m.setZIndexOffset(1000000); //Make these appear on top of EVERYTHING
			}

			fg.addLayer(m);
		}
		this.setOpacity(1);

		group._ignoreMove = false;
		group.fire('spiderfied', {
			cluster: this,
			markers: childMarkers
		});
	},

	_animationUnspiderfy: function () {
		this._noanimationUnspiderfy();
	}
});

//Animated versions here
L.MarkerCluster.include({

	_animationSpiderfy: function (childMarkers, positions) {
		var me = this,
			group = this._group,
			map = group._map,
			fg = group._featureGroup,
			thisLayerLatLng = this._latlng,
			thisLayerPos = map.latLngToLayerPoint(thisLayerLatLng),
			svg = L.Path.SVG,
			legOptions = L.extend({}, this._group.options.spiderLegPolylineOptions), // Copy the options so that we can modify them for animation.
			finalLegOpacity = legOptions.opacity,
			i, m, leg, legPath, legLength, newPos;

		if (finalLegOpacity === undefined) {
			finalLegOpacity = L.MarkerClusterGroup.prototype.options.spiderLegPolylineOptions.opacity;
		}

		if (svg) {
			// If the initial opacity of the spider leg is not 0 then it appears before the animation starts.
			legOptions.opacity = 0;

			// Add the class for CSS transitions.
			legOptions.className = (legOptions.className || '') + ' leaflet-cluster-spider-leg';
		} else {
			// Make sure we have a defined opacity.
			legOptions.opacity = finalLegOpacity;
		}

		group._ignoreMove = true;

		// Add markers and spider legs to map, hidden at our center point.
		// Traverse in ascending order to make sure that inner circleMarkers are on top of further legs. Normal markers are re-ordered by newPosition.
		// The reverse order trick no longer improves performance on modern browsers.
		for (i = 0; i < childMarkers.length; i++) {
			m = childMarkers[i];

			newPos = map.layerPointToLatLng(positions[i]);

			// Add the leg before the marker, so that in case the latter is a circleMarker, the leg is behind it.
			leg = new L.Polyline([thisLayerLatLng, newPos], legOptions);
			map.addLayer(leg);
			m._spiderLeg = leg;

			// Explanations: https://jakearchibald.com/2013/animated-line-drawing-svg/
			// In our case the transition property is declared in the CSS file.
			if (svg) {
				legPath = leg._path;
				legLength = legPath.getTotalLength() + 0.1; // Need a small extra length to avoid remaining dot in Firefox.
				legPath.style.strokeDasharray = legLength; // Just 1 length is enough, it will be duplicated.
				legPath.style.strokeDashoffset = legLength;
			}

			// If it is a marker, add it now and we'll animate it out
			if (m.setZIndexOffset) {
				m.setZIndexOffset(1000000); // Make normal markers appear on top of EVERYTHING
			}
			if (m.clusterHide) {
				m.clusterHide();
			}
			
			// Vectors just get immediately added
			fg.addLayer(m);

			if (m._setPos) {
				m._setPos(thisLayerPos);
			}
		}

		group._forceLayout();
		group._animationStart();

		// Reveal markers and spider legs.
		for (i = childMarkers.length - 1; i >= 0; i--) {
			newPos = map.layerPointToLatLng(positions[i]);
			m = childMarkers[i];

			//Move marker to new position
			m._preSpiderfyLatlng = m._latlng;
			m.setLatLng(newPos);
			
			if (m.clusterShow) {
				m.clusterShow();
			}

			// Animate leg (animation is actually delegated to CSS transition).
			if (svg) {
				leg = m._spiderLeg;
				legPath = leg._path;
				legPath.style.strokeDashoffset = 0;
				//legPath.style.strokeOpacity = finalLegOpacity;
				leg.setStyle({opacity: finalLegOpacity});
			}
		}
		this.setOpacity(0.1);

		group._ignoreMove = false;

		setTimeout(function () {
			group._animationEnd();
			group.fire('spiderfied', {
				cluster: me,
				markers: childMarkers
			});
		}, 200);
	},

	_animationUnspiderfy: function (zoomDetails) {
		var me = this,
			group = this._group,
			map = group._map,
			fg = group._featureGroup,
			thisLayerPos = zoomDetails ? map._latLngToNewLayerPoint(this._latlng, zoomDetails.zoom, zoomDetails.center) : map.latLngToLayerPoint(this._latlng),
			childMarkers = this.getAllChildMarkers(null, true),
			svg = L.Path.SVG,
			m, i, leg, legPath, legLength, nonAnimatable;

		group._ignoreMove = true;
		group._animationStart();

		//Make us visible and bring the child markers back in
		this.setOpacity(1);
		for (i = childMarkers.length - 1; i >= 0; i--) {
			m = childMarkers[i];

			//Marker was added to us after we were spiderfied
			if (!m._preSpiderfyLatlng) {
				continue;
			}

			//Close any popup on the marker first, otherwise setting the location of the marker will make the map scroll
			m.closePopup();

			//Fix up the location to the real one
			m.setLatLng(m._preSpiderfyLatlng);
			delete m._preSpiderfyLatlng;

			//Hack override the location to be our center
			nonAnimatable = true;
			if (m._setPos) {
				m._setPos(thisLayerPos);
				nonAnimatable = false;
			}
			if (m.clusterHide) {
				m.clusterHide();
				nonAnimatable = false;
			}
			if (nonAnimatable) {
				fg.removeLayer(m);
			}

			// Animate the spider leg back in (animation is actually delegated to CSS transition).
			if (svg) {
				leg = m._spiderLeg;
				legPath = leg._path;
				legLength = legPath.getTotalLength() + 0.1;
				legPath.style.strokeDashoffset = legLength;
				leg.setStyle({opacity: 0});
			}
		}

		group._ignoreMove = false;

		setTimeout(function () {
			//If we have only <= one child left then that marker will be shown on the map so don't remove it!
			var stillThereChildCount = 0;
			for (i = childMarkers.length - 1; i >= 0; i--) {
				m = childMarkers[i];
				if (m._spiderLeg) {
					stillThereChildCount++;
				}
			}


			for (i = childMarkers.length - 1; i >= 0; i--) {
				m = childMarkers[i];

				if (!m._spiderLeg) { //Has already been unspiderfied
					continue;
				}

				if (m.clusterShow) {
					m.clusterShow();
				}
				if (m.setZIndexOffset) {
					m.setZIndexOffset(0);
				}

				if (stillThereChildCount > 1) {
					fg.removeLayer(m);
				}

				map.removeLayer(m._spiderLeg);
				delete m._spiderLeg;
			}
			group._animationEnd();
			group.fire('unspiderfied', {
				cluster: me,
				markers: childMarkers
			});
		}, 200);
	}
});


L.MarkerClusterGroup.include({
	//The MarkerCluster currently spiderfied (if any)
	_spiderfied: null,

	unspiderfy: function () {
		this._unspiderfy.apply(this, arguments);
	},

	_spiderfierOnAdd: function () {
		this._map.on('click', this._unspiderfyWrapper, this);

		if (this._map.options.zoomAnimation) {
			//this._map.on('zoomstart', this._unspiderfyZoomStart, this);
		}
		//Browsers without zoomAnimation or a big zoom don't fire zoomstart
		//this._map.on('zoomend', this._noanimationUnspiderfy, this);

		if (!L.Browser.touch) {
			this._map.getRenderer(this);
			//Needs to happen in the pageload, not after, or animations don't work in webkit
			//  http://stackoverflow.com/questions/8455200/svg-animate-with-dynamically-added-elements
			//Disable on touch browsers as the animation messes up on a touch zoom and isn't very noticable
		}
	},

	_spiderfierOnRemove: function () {
		this._map.off('click', this._unspiderfyWrapper, this);
		//this._map.off('zoomstart', this._unspiderfyZoomStart, this);
		//this._map.off('zoomanim', this._unspiderfyZoomAnim, this);
		//this._map.off('zoomend', this._noanimationUnspiderfy, this);

		//Ensure that markers are back where they should be
		// Use no animation to avoid a sticky leaflet-cluster-anim class on mapPane
		this._noanimationUnspiderfy();
	},

	//On zoom start we add a zoomanim handler so that we are guaranteed to be last (after markers are animated)
	//This means we can define the animation they do rather than Markers doing an animation to their actual location
	_unspiderfyZoomStart: function () {
		if (!this._map) { //May have been removed from the map by a zoomEnd handler
			return;
		}

		//this._map.on('zoomanim', this._unspiderfyZoomAnim, this);
	},

	_unspiderfyZoomAnim: function (zoomDetails) {
		//Wait until the first zoomanim after the user has finished touch-zooming before running the animation
		if (L.DomUtil.hasClass(this._map._mapPane, 'leaflet-touching')) {
			return;
		}

		//this._map.off('zoomanim', this._unspiderfyZoomAnim, this);
		this._unspiderfy(zoomDetails);
	},

	_unspiderfyWrapper: function () {
		/// <summary>_unspiderfy but passes no arguments</summary>
		MI.scview.active_point = null;
		this._unspiderfy();
	},

	_unspiderfy: function (zoomDetails) {
		if (this._spiderfied) {
			this._spiderfied.unspiderfy(zoomDetails);
		}
	},

	_noanimationUnspiderfy: function () {
		if (this._spiderfied) {
			this._spiderfied._noanimationUnspiderfy();
		}
	},

	//If the given layer is currently being spiderfied then we unspiderfy it so it isn't on the map anymore etc
	_unspiderfyLayer: function (layer) {
		if (layer._spiderLeg) {
			this._featureGroup.removeLayer(layer);

			if (layer.clusterShow) {
				layer.clusterShow();
			}
				//Position will be fixed up immediately in _animationUnspiderfy
			if (layer.setZIndexOffset) {
				layer.setZIndexOffset(0);
			}

			this._map.removeLayer(layer._spiderLeg);
			delete layer._spiderLeg;
		}
	}
});

/**
 * Adds 1 public method to MCG and 1 to L.Marker to facilitate changing
 * markers' icon options and refreshing their icon and their parent clusters
 * accordingly (case where their iconCreateFunction uses data of childMarkers
 * to make up the cluster icon).
 */


L.MarkerClusterGroup.include({
	/**
	 * Updates the icon of all clusters which are parents of the given marker(s).
	 * In singleMarkerMode, also updates the given marker(s) icon.
	 * @param layers L.MarkerClusterGroup|L.LayerGroup|Array(L.Marker)|Map(L.Marker)|
	 * L.MarkerCluster|L.Marker (optional) list of markers (or single marker) whose parent
	 * clusters need to be updated. If not provided, retrieves all child markers of this.
	 * @returns {L.MarkerClusterGroup}
	 */
	refreshClusters: function (layers) {
		if (!layers) {
			layers = this._topClusterLevel.getAllChildMarkers();
		} else if (layers instanceof L.MarkerClusterGroup) {
			layers = layers._topClusterLevel.getAllChildMarkers();
		} else if (layers instanceof L.LayerGroup) {
			layers = layers._layers;
		} else if (layers instanceof L.MarkerCluster) {
			layers = layers.getAllChildMarkers();
		} else if (layers instanceof L.Marker) {
			layers = [layers];
		} // else: must be an Array(L.Marker)|Map(L.Marker)
		this._flagParentsIconsNeedUpdate(layers);
		this._refreshClustersIcons();

		// In case of singleMarkerMode, also re-draw the markers.
		if (this.options.singleMarkerMode) {
			this._refreshSingleMarkerModeMarkers(layers);
		}

		return this;
	},

	/**
	 * Simply flags all parent clusters of the given markers as having a "dirty" icon.
	 * @param layers Array(L.Marker)|Map(L.Marker) list of markers.
	 * @private
	 */
	_flagParentsIconsNeedUpdate: function (layers) {
		var id, parent;

		// Assumes layers is an Array or an Object whose prototype is non-enumerable.
		for (id in layers) {
			// Flag parent clusters' icon as "dirty", all the way up.
			// Dumb process that flags multiple times upper parents, but still
			// much more efficient than trying to be smart and make short lists,
			// at least in the case of a hierarchy following a power law:
			// http://jsperf.com/flag-nodes-in-power-hierarchy/2
			parent = layers[id].__parent;
			while (parent) {
				parent._iconNeedsUpdate = true;
				parent = parent.__parent;
			}
		}
	},

	/**
	 * Re-draws the icon of the supplied markers.
	 * To be used in singleMarkerMode only.
	 * @param layers Array(L.Marker)|Map(L.Marker) list of markers.
	 * @private
	 */
	_refreshSingleMarkerModeMarkers: function (layers) {
		var id, layer;

		for (id in layers) {
			layer = layers[id];

			// Make sure we do not override markers that do not belong to THIS group.
			if (this.hasLayer(layer)) {
				// Need to re-create the icon first, then re-draw the marker.
				layer.setIcon(this._overrideMarkerIcon(layer));
			}
		}
	}
});

L.Marker.include({
	/**
	 * Updates the given options in the marker's icon and refreshes the marker.
	 * @param options map object of icon options.
	 * @param directlyRefreshClusters boolean (optional) true to trigger
	 * MCG.refreshClustersOf() right away with this single marker.
	 * @returns {L.Marker}
	 */
	refreshIconOptions: function (options, directlyRefreshClusters) {
		var icon = this.options.icon;

		L.setOptions(icon, options);

		this.setIcon(icon);

		// Shortcut to refresh the associated MCG clusters right away.
		// To be used when refreshing a single marker.
		// Otherwise, better use MCG.refreshClusters() once at the end with
		// the list of modified markers.
		if (directlyRefreshClusters && this.__parent) {
			this.__parent._group.refreshClusters(this);
		}

		return this;
	}
});

exports.MarkerClusterGroup = MarkerClusterGroup;
exports.MarkerCluster = MarkerCluster;

}))); /*
 * Leaflet zoom control with a home button for resetting the view.
 *
 * Distributed under the CC-BY-SA-3.0 license. See the file "LICENSE"
 * for details.
 *
 * Based on code by toms (https://gis.stackexchange.com/a/127383/48264).
 */
(function () {
    "use strict";

    L.Control.ZoomHome = L.Control.Zoom.extend({
        options: {
            position: 'topleft',
            zoomInText: '+',
            zoomInTitle: 'Zoom in',
            zoomOutText: '-',
            zoomOutTitle: 'Zoom out',
            zoomHomeIcon: 'window-maximize',
            zoomHomeTitle: 'Home',
            homeCoordinates: null,
            homeZoom: null
        },

        onAdd: function (map) {
            var controlName = 'leaflet-control-zoomhome',
                container = L.DomUtil.create('div', controlName + ' leaflet-bar'),
                options = this.options;

            if (options.homeCoordinates === null) {
                options.homeCoordinates = map.getCenter();
            }
            if (options.homeZoom === null) {
                options.homeZoom = map.getZoom();
            }

            this._zoomInButton = this._createButton(options.zoomInText, options.zoomInTitle,
                controlName + '-in', container, this._zoomIn.bind(this));
            this._zoomOutButton = this._createButton(options.zoomOutText, options.zoomOutTitle,
                controlName + '-out', container, this._zoomOut.bind(this));
            var zoomHomeText = '<i class="fa fa-' + options.zoomHomeIcon + '" style="line-height:1.65;"></i>';
            this._zoomHomeButton = this._createButton(zoomHomeText, options.zoomHomeTitle,
                controlName + '-home', container, this._zoomHome.bind(this));

            this._updateDisabled();
            map.on('zoomend zoomlevelschange', this._updateDisabled, this);

            return container;
        },

        setHomeBounds: function (bounds) {
            if (bounds === undefined) {
                bounds = this._map.getBounds();
            } else {
                if (typeof bounds.getCenter !== 'function') {
                    bounds = L.latLngBounds(bounds);
                }
            }
            this.options.homeZoom = this._map.getBoundsZoom(bounds);
            this.options.homeCoordinates = bounds.getCenter();
        },

        setHomeCoordinates: function (coordinates) {
            if (coordinates === undefined) {
                coordinates = this._map.getCenter();
            }
            this.options.homeCoordinates = coordinates;
        },

        setHomeZoom: function (zoom) {
            if (zoom === undefined) {
                zoom = this._map.getZoom();
            }
            this.options.homeZoom = zoom;
        },

        getHomeZoom: function () {
            return this.options.homeZoom;
        },

        getHomeCoordinates: function () {
            return this.options.homeCoordinates;
        },

        _zoomHome: function (e) {
            //jshint unused:false
            this._map.setView(this.options.homeCoordinates, this.options.homeZoom);
        }
    });

    L.Control.zoomHome = function (options) {
        return new L.Control.ZoomHome(options);
    };
}()); /* Native Grate Code */
Grate = {};
Grate.great_circle_route = function(pt1, pt2, ttl, bounds) {
    var gc = new arc.GreatCircle(new arc.Coord(pt1[0], pt1[1]), new arc.Coord(pt2[0], pt2[1]));	    
	var line = gc.Arc(200);	   
	return [bezier(line.geometries[0].coords)];
};

function bezier(pts) {
    function curve(points) {
        var c = [];
        var steps = 40;

        for (var i = 0; i <= steps; i++) {
            var t = i / steps;

            var pt = [
                Math.pow(1 - t, 3) * points[0][0] + 
				3 * t * Math.pow(1 - t, 2) * points[1][0] + 
				3 * (1 - t) * Math.pow(t, 2) * points[2][0] + 
				Math.pow(t, 3) * points[3][0],
				Math.pow(1 - t, 3) * points[0][1] + 
				3 * t * Math.pow(1-t,2) * points[1][1] + 
				3 * (1-t) * Math.pow(t,2) * points[2][1] + 
				Math.pow(t, 3) * points[3][1]
            ];
            c.push(pt);
        }
        return c;
    }

    var c = [];

    if (pts.length < 4) return pts;

    for (var i = 0; i < pts.length; i += 3) {
        if (i + 4 <= pts.length) {
            c = c.concat(curve(pts.slice(i, i + 4)));
        }
    }

    return c;
}

Grate.bezier_route = function(from, to) {
    var x0 = from[0];
    var y0 = from[1];
    var x1 = to[0];
    var y1 = to[1];

    var dx = x1 - x0;
    var dy = y1 - y0;

    var bzx = x0 + dx/4;
    var bzy = y1;

    var res = 100;

    var pts = [];
    for(var t=0.0; t<1.0; t += 1.0/res) {
        var x = (1-t) * (1-t) * x0 + 2 * (1-t) * t * bzx + t * t * x1;
        var y = (1-t) * (1-t) * y0 + 2 * (1-t) * t * bzy + t * t * y1;
        pts.push([x, y]);
    }
    if(!(to[0] == pts[pts.length-1][0] && to[1] == pts[pts.length-1][1])) {
		var to_clone = [to[0],to[1]];
        pts.push(to_clone);
		
	}
    return [pts];
};

// Arc.js Compatible Code
var D2R = Math.PI / 180;
var R2D = 180 / Math.PI;

var Coord = function(lon,lat) {
    this.lon = lon;
    this.lat = lat;
    this.x = D2R * lon;
    this.y = D2R * lat;
};

Coord.prototype.view = function() {
    return String(this.lon).slice(0, 4) + ',' + String(this.lat).slice(0, 4);
};

Coord.prototype.antipode = function() {

    var anti_lat = -1 * this.lat;
	var anti_lon = null;
    if (this.lon < 0) {
        anti_lon = 180 + this.lon;
    } else {
        anti_lon = (180 - this.lon) * -1;
    }
    return new Coord(anti_lon, anti_lat);
};

var LineString = function() {
    this.coords = [];
    this.length = 0;
};

LineString.prototype.move_to = function(coord) {
    this.length++;
    this.coords.push(coord);
};

var Arc = function(properties) {
    this.properties = properties || {};
    this.geometries = [];
};

Arc.prototype.json = function() {
    if (this.geometries.length <= 0) {
        return {'geometry': { 'type': 'LineString', 'coordinates': null },
                'type': 'Feature', 'properties': this.properties
               };
    } else if (this.geometries.length == 1) {
        return {'geometry': { 'type': 'LineString', 'coordinates': this.geometries[0].coords },
                'type': 'Feature', 'properties': this.properties
               };
    } else {
        var multiline = [];
        for (i = 0; i < this.geometries.length; i++) {
            multiline.push(this.geometries[i].coords);
        }
        return {'geometry': { 'type': 'MultiLineString', 'coordinates': multiline },
                'type': 'Feature', 'properties': this.properties
               };
    }
};

Arc.prototype.wkt = function() {
    var wkt_string = '';
    for (i = 0; i < this.geometries.length; i++) {
        if (this.geometries[i].coords.length === 0) {
            return 'LINESTRING(empty)';
        } else {
            this.wkt = 'LINESTRING(';
            this.geometries[i].coords.forEach(function(c,idx) {
                this.wkt += c[0] + ' ' + c[1] + ',';
            }, this);
            wkt_string += this.wkt.substring(0, this.wkt.length - 1) + ')';
        }
    }
    return wkt_string; 
};

/*
 * http://en.wikipedia.org/wiki/Great-circle_distance
 *
 */
var GreatCircle = function(start,end,properties) {

    this.start = start;
    this.end = end;
    this.properties = properties || {};

    var w = this.start.x - this.end.x;
    var h = this.start.y - this.end.y;
    var z = Math.pow(Math.sin(h / 2.0), 2) +
                Math.cos(this.start.y) *
                   Math.cos(this.end.y) *
                     Math.pow(Math.sin(w / 2.0), 2);
    this.g = 2.0 * Math.asin(Math.sqrt(z));

    if (this.g == Math.PI) {
        throw new Error('it appears ' + start.view() + ' and ' + end.view() + " are 'antipodal', e.g diametrically opposite, thus there is no single route but rather infinite");
    } else if (isNaN(this.g)) {
        throw new Error('could not calculate great circle between ' + start + ' and ' + end);
    }
};

/*
 * http://williams.best.vwh.net/avform.htm#Intermediate
 */
GreatCircle.prototype.interpolate = function(f) {
    var A = Math.sin((1 - f) * this.g) / Math.sin(this.g);
    var B = Math.sin(f * this.g) / Math.sin(this.g);
    var x = A * Math.cos(this.start.y) * Math.cos(this.start.x) + B * Math.cos(this.end.y) * Math.cos(this.end.x);
    var y = A * Math.cos(this.start.y) * Math.sin(this.start.x) + B * Math.cos(this.end.y) * Math.sin(this.end.x);
    var z = A * Math.sin(this.start.y) + B * Math.sin(this.end.y);
    var lat = R2D * Math.atan2(z, Math.sqrt(Math.pow(x, 2) + Math.pow(y, 2)));
    var lon = R2D * Math.atan2(y, x);
    return [lon, lat];
};



/*
 * Generate points along the great circle
 */
GreatCircle.prototype.Arc = function(npoints,options) {
    var first_pass = [];
    //var minx = 0;
    //var maxx = 0;
    if (npoints <= 2) {
        first_pass.push([this.start.lon, this.start.lat]);
        first_pass.push([this.end.lon, this.end.lat]);
    } else {
        var delta = 1.0 / (npoints - 1);
        for (var i = 0; i < npoints; i++) {
            var step = delta * i;
            var pair = this.interpolate(step);
            //minx = Math.min(minx,pair[0]);
            //maxx = Math.max(maxx,pair[0]);
            first_pass.push(pair);
        }
    }
    /* partial port of dateline handling from:
      gdal/ogr/ogrgeometryfactory.cpp

      TODO - does not handle all wrapping scenarios yet
    */
    var bHasBigDiff = false;
    var dfMaxSmallDiffLong = 0;
	var dfX = null;
    for (var j = 1; j < first_pass.length; j++) {
        //if (minx > 170 && maxx > 180) {
        // }
        var dfPrevX = first_pass[j-1][0];
        dfX = first_pass[j][0];
        var dfDiffLong = Math.abs(dfX - dfPrevX);
        if (dfDiffLong > 350 &&
            ((dfX > 170 && dfPrevX < -170) || (dfPrevX > 170 && dfX < -170))) {
            bHasBigDiff = true;
        } else if (dfDiffLong > dfMaxSmallDiffLong) {
            dfMaxSmallDiffLong = dfDiffLong;
        }
    }

    var poMulti = [];
	var poNewLS = null;
    if (bHasBigDiff && dfMaxSmallDiffLong < 10) {
        poNewLS = [];
        poMulti.push(poNewLS);
        for (var k = 0; k < first_pass.length; k++) {
            dfX = parseFloat(first_pass[k][0]);
            if (k > 0 &&  Math.abs(dfX - first_pass[k-1][0]) > 350) {
                var dfX1 = parseFloat(first_pass[k-1][0]);
                var dfY1 = parseFloat(first_pass[k-1][1]);
                var dfX2 = parseFloat(first_pass[k][0]);
                var dfY2 = parseFloat(first_pass[k][1]);
                if (dfX1 > -180 && dfX1 < -170 && dfX2 == 180 &&
                    k+1 < first_pass.length &&
                   first_pass[k-1][0] > -180 && first_pass[k-1][0] < -170)
                {
                     poNewLS.push([-180, first_pass[k][1]]);
                     k++;
                     poNewLS.push([first_pass[k][0], first_pass[k][1]]);
                     continue;
                } else if (dfX1 > 170 && dfX1 < 180 && dfX2 == -180 &&
                     k+1 < first_pass.length &&
                     first_pass[k-1][0] > 170 && first_pass[k-1][0] < 180)
                {
                     poNewLS.push([180, first_pass[k][1]]);
                     k++;
                     poNewLS.push([first_pass[k][0], first_pass[k][1]]);
                     continue;
                }

                if (dfX1 < -170 && dfX2 > 170)
                {
                    // swap dfX1, dfX2
                    var tmpX = dfX1;
                    dfX1 = dfX2;
                    dfX2 = tmpX;
                    // swap dfY1, dfY2
                    var tmpY = dfY1;
                    dfY1 = dfY2;
                    dfY2 = tmpY;
                }
                if (dfX1 > 170 && dfX2 < -170) {
                    dfX2 += 360;
                }

                if (dfX1 <= 180 && dfX2 >= 180 && dfX1 < dfX2)
                {
                    var dfRatio = (180 - dfX1) / (dfX2 - dfX1);
                    var dfY = dfRatio * dfY2 + (1 - dfRatio) * dfY1;
                    poNewLS.push([first_pass[k-1][0] > 170 ? 180 : -180, dfY]);
                    poNewLS = [];
                    poNewLS.push([first_pass[k-1][0] > 170 ? -180 : 180, dfY]);
                    poMulti.push(poNewLS);
                }
                else
                {
                    poNewLS = [];
                    poMulti.push(poNewLS);
                }
                poNewLS.push([dfX, first_pass[k][1]]);
            } else {
                poNewLS.push([first_pass[k][0], first_pass[k][1]]);
            }
        }
    } else {
       // add normally
        poNewLS = [];
        poMulti.push(poNewLS);
        for (var l = 0; l < first_pass.length; l++) {
            poNewLS.push([first_pass[l][0],first_pass[l][1]]);
        }
    }

    var arc = new Arc(this.properties);
    for (var m = 0; m < poMulti.length; m++) {
        var line = new LineString();
        arc.geometries.push(line);
        var points = poMulti[m];
        for (var n = 0; n < points.length; n++) {
            line.move_to(points[n]);
        }
    }
    return arc;
};

if (typeof window === 'undefined') {
  // nodejs
  module.exports.Coord = Coord;
  module.exports.Arc = Arc;
  module.exports.GreatCircle = GreatCircle;

} else {
  // browser
  var arc = {};
  arc.Coord = Coord;
  arc.Arc = Arc;
  arc.GreatCircle = GreatCircle;
} /* Manifest =-=-=-=-=-=-=-=-=-=-=-=-=-=-=-=-=-=-=-=-=-=-=-=-=-=-=-=-=-=-=-=-=-=-=-=-=-=-=-=-=-=-=-=-=-=-=-=-=-=-=-=-=-=-=-=-=-=-=-=-=-=- */
/* =-=-=-=-=-=-=-=-=-=-=-=-=-=-=-=-=-=-=-=-=-=-=-=-=-=-=-=-=-=-=-=-=-=-=-=-=-=-=-=-=-=-=-=-=-=-=-=-=-=-=-=-=-=-=-=-=-=-=-=-=-=-=-=-=-=-= */

/* Manifest Base Classes /* =-=-=-=-=-=-=-=-=-=-=-=-=-=-=-=-=-=-=-=-=-=-=-=-=-=-=-=-=-=-=-=-=-=-=-=-=-=-=-=-=-=-=-=-=-=-=-=-=-=-=-=-=-=- */

/** Manifest Class **/
function Manifest() {
	this.supplychains = [];
	this.clusters = [];
	this.attributes = {
		'initialized': false,
		'clustering':true,
		'scrollpos': 0,
		'prevsearch': "",
		'linetype': LINETYPES.GREATCIRCLE,
		'tiletypes': TILETYPES,
		'measures': MEASURES,
		'globes': GLOBES
	};
	this.functions = {
		'process': SCProcessor,
		'center':  InterestView, // OR CenterView
		'cleanup': Cleanup,
		'search': SimpleSearch
	};
		
	this.visualization = "map";
	this.scview = new SpatialSupplyChain();
}

/** Initialize a Spatial Supply Chain **/
function SpatialSupplyChain() {
	this.map = new L.Map('map', { preferCanvas: true, worldCopyJump: false, center: new L.LatLng(40.730610,-73.935242), zoom: 3, zoomControl: false, scrollWheelZoom: false });
	this.clustergroup = this.active_point = null;
	
	/* Define Layers */
	this.layerdefs = {
		'google': new L.TileLayer(TILETYPES.GOOGLE, 
			{ maxZoom: 20, className: "googlebase", detectRetina: true, subdomains:['mt0','mt1','mt2','mt3'], attribution: 'Terrain, Google' }),		
		'light': new L.TileLayer(TILETYPES.LIGHT, {detectRetina: true, subdomains: 'abcd', minZoom: 0, maxZoom: 20, ext: 'png', attribution: 'Toner, Stamen' }),
		'terrain': new L.TileLayer(TILETYPES.TERRAIN, { detectRetina: true, subdomains: 'abcd', minZoom: 0, maxZoom: 18, ext: 'png', attribution: 'Terrain, Stamen' }),	
		'satellite': new L.TileLayer(TILETYPES.SATELLITE, { detectRetina: true, attribution: 'Satellite, ESRI' }),
	 	'dark': new L.TileLayer(TILETYPES.DARK, { subdomains: 'abcd', maxZoom: 19, detectRetina: true, attribution: 'Dark, CartoDB' }),

		'shipping': new L.TileLayer(TILETYPES.SHIPPING, 
			{ maxNativeZoom: 4, detectRetina: true, className: "shippinglayer", bounds:L.latLngBounds( L.latLng(-60, -180), L.latLng(60, 180)), attribution: '[ARCGIS Data]' }),
		'marine': new L.TileLayer(TILETYPES.MARINE, { maxZoom: 19, tileSize: 512, detectRetina: false, className: "marinelayer", attribution: '[Marinetraffic Data]' }),
		'rail': new L.TileLayer(TILETYPES.RAIL, { maxZoom: 19, className: "raillayer", attribution: '[OpenStreetMap Data]' })		
	};
	
					  
	/* Renderers */
	this.pointrender = RenderPoint;	
	this.linerender = RenderLine;
	
	/* Focus Function */
	this.focus = PointFocus;
	
	/* Styles */
	this.styles = {
		'point': { fillColor: "#eeeeee", color: "#999999", radius: 8, weight: 4, opacity: 1, fillOpacity: 1 },
		'highlight': { fillColor: "#ffffff" },
		'line': { color: "#dddddd", stroke: true, weight: 2, opacity: 0.4, smoothFactor: 0 }
	};
	this.colorchoice = Colorize(COLORSETS);
	
	// Map configuration
	this.map.attributionControl.setPrefix('');
	L.Control.zoomHome().addTo(this.map);
	this.map.setMaxBounds(new L.LatLngBounds(new L.LatLng(-85, 180), new L.LatLng(85, - 240)));
	this.map.on("popupopen", function(e) {
			MI.scview.map.setView(e.popup._latlng, MI.scview.map.getZoom());	
			MI.scview.active_point = e.sourceTarget;
			ui_pointclick(MI.scview.active_point); 
			$(".fa-tag").click(function() {
				if(e.target._popup._source._preSpiderfyLatlng) {
					MI.scview.map.setView(e.popup._source.__parent._latlng, 16);
					
				} else {
					MI.scview.map.setView(e.popup._latlng, 16);
					
				}
			});
			
	});
	this.map.on("popupclose", function(e) { MI.scview.active_point = null; } );

	
	if($("body").hasClass("light")) {
		this.map.addLayer(this.layerdefs.google);
		this.map.addLayer(this.layerdefs.shipping);
	} else if($("body").hasClass("dark")) { 
		this.map.addLayer(this.layerdefs.dark);		
		this.map.addLayer(this.layerdefs.shipping);
	}
	
	// General UI
	$("#fullscreen-menu").click(function() { ui_fullscreen(); });	
	$("#minfo, #minfo-hamburger").click(function() { ui_hamburger(); });			
	$("#searchbar").bind('keyup mouseup', function() { MI.functions.search(); });
	$(".searchclear").click(function() { $("#searchbar").val(""); MI.functions.search(); });
}

/* Map core functions /* =-=-=-=-=-=-=-=-=-=-=-=-=-=-=-=-=-=-=-=-=-=-=-=-=-=-=-=-=-=-=-=-=-=-=-=-=-=-=-=-=-=-=-=-=-=-=-=-=-=-=-=-=-=-=-= */

/** Render points by setting up a GeoJSON feature for display **/
function RenderPoint(feature, layer) {
		var title = (typeof(feature.properties.title) != 'undefined') ? feature.properties.title : "Unnamed.";
		var description = (typeof(feature.properties.description) != 'undefined' && feature.properties.description != "...") ? feature.properties.description : "";
		var fid = feature.properties.lid;
		var popupContent = "<h2 id='popup-"+fid+"' style='background:"+feature.properties.style.fillColor+"; color:"+feature.properties.style.textcolor+"'><i class='fas fa-tag'></i> " + title + "</h2><p>" + Autolinker.link(description) + "</p>";
		if (feature.properties && feature.properties.popupContent) { popupContent += feature.properties.popupContent;}
		
		layer.bindPopup(popupContent, {className: "color-"+feature.properties.style.textcolor.substring(1)});
		layer.bindTooltip(title);	
	
		layer.on("click", function(e) {  		
			var toolTip = layer.getTooltip();
        	if (toolTip) { layer.closeTooltip(toolTip);}
		});
		layer.on("mouseover", function (e) { if(layer.options.fillOpacity != 0.1) { layer.setStyle(MI.scview.styles.highlight); } });
		layer.on("mouseout", function (e) {

			if (layer.feature.properties && layer.feature.properties.style) {
				layer.setStyle(layer.feature.properties.style);
				var measure_sort = $("#measure-choices").val();
				var radius = 8;
				if(feature.properties.measures != undefined) {
		
					if(feature.properties.measures[measure_sort] != undefined) {			
						radius = feature.properties.style.radius = 8 + 100 * feature.properties.measures[measure_sort] / MI.supplychains[feature.properties.scid].details.measures[measure_sort].max;
					}
				}
				radius = radius || 0;
				layer.setStyle({radius: radius});
			
				// Not Great!
				if($("#searchbar").val() != "") { MI.functions.search();}
			}
		});	

		var measure_sort = $("#measure-choices").val();
		if(feature.properties.measures != undefined) {
		
			if(feature.properties.measures[measure_sort] != undefined) {			
				feature.properties.style.radius = 8 + 100 * feature.properties.measures[measure_sort] / MI.supplychains[feature.properties.scid].details.measures[measure_sort].max;
			}
		}
	
		if (feature.properties && feature.properties.style) { layer.setStyle(feature.properties.style); }		
}

/** Render lines by setting up a GeoJSON feature for display **/
function RenderLine(feature, layer) {
	var title = "Unnamed.";
	if (typeof(feature.properties.title) != 'undefined') {
		title = feature.properties.title;
	}
	var description = "";
	if (typeof(feature.properties.description) != 'undefined') {
		description = feature.properties.description;
	}

	var popupContent = "<h2>" + title + "</h2><p>" + Autolinker.link(description) + "</p>";
	if (feature.properties && feature.properties.popupContent) {
		popupContent += feature.properties.popupContent;
	}
	layer.bindPopup(popupContent);
	if (feature.properties && feature.properties.style && layer.setStyle) {
		layer.setStyle(e.properties.style);
	}
}

/** Focus on a point on the map and open its popup. **/
function PointFocus(pid) {	
	var id = (typeof(pid) != 'object' ? pid : $(this).attr("id").substring(6));		
	for (var i in MI.scview.map._layers) {
		if (typeof(MI.scview.map._layers[i].feature) != 'undefined') {			
			if (MI.scview.map._layers[i].feature.properties.lid == id) {				
				MI.scview.active_point = MI.scview.map._layers[i];
				MI.scview.map._layers[i].openPopup();
			}
		} else if (typeof(MI.scview.map._layers[i].getAllChildMarkers) != 'undefined') {				
			var childmarkers = MI.scview.map._layers[i].getAllChildMarkers();
			for (var j in childmarkers) {
				if (typeof(childmarkers[j].feature) != 'undefined') {
					if (childmarkers[j].feature.properties.lid == id) {
						MI.scview.map._layers[i].spiderfy();
						MI.scview.active_point = childmarkers[j];
						childmarkers[j].openPopup();
						MI.functions.search();
					}
				} // Get Childmarker feature
			} // Iterate Childmarkers
		} // Get all Childmarkers
	} // Iterate Map Layers
}
	
/* Supply chain core functions /* =-=-=-=-=-=-=-=-=-=-=-=-=-=-=-=-=-=-=-=-=-=-=-=-=-=-=-=-=-=-=-=-=-=-=-=-=-=-=-=-=-=-=-=-=-=-=-=-=-=-=- */
	
/** SupplyChain processor main wrapper function. **/
function SCProcessor(type, d, options) {
	for(var s in MI.supplychains) { if(MI.supplychains[s].details.id == options.id) {return;}}
	var scid = null;
	if(type == "smap") { 
		var geo = d.g;
		var graph = d.r;
		d = FormatSMAP(geo, options); 
		scid = SetupSC(d, options); 
		MapSC(d, scid);
		SMAPGraph(graph, options);
	} 
	else if(type == "yeti") { 
		//YetiAPI(d, options);
		d = FormatYETI(d, options); 
		scid = SetupSC(d, options); 
		MapSC(d, scid);
		YETIGraph(d, {"id": d.details.id});		
	}
	else if(type == "gsheet") { 
		d = FormatGSHEET(d, options); 
		scid = SetupSC(d, options); 
		MapSC(d, scid);
		GSHEETGraph(d, options);		
	}
	
}

/** Setup the supply chain rendering by adding it to the user interface */
function SetupSC(d, options) {	
	var scid = MI.supplychains.push(d);
	MI.attributes.scrollpos = $(".sidepanel").scrollTop();
	$("#manifestlist").append(
		'<div class="mheader" id="mheader-'+d.details.id+'">'+
			'<div class="mtitle" style="background:'+d.details.style.fillColor+'; color:'+d.details.style.textcolor+';">'+
				'<i class="menu-map fas fa-globe-'+d.details.globe+'"></i><a>' + d.properties.title + '</a>' +
				'<i class="fas fa-times-circle close-map" style="color:'+d.details.style.textcolor+';"></i>'+
			'</div>'+
		'</div>'				
	);
	
	// Title setup
	var temptitle = "";
	$( ".mtitle").text(function(i, t){ temptitle += i == 0 ? t : ' + ' + t; });
	document.title = temptitle + " - Manifest";
	
	// UI Setup
	$("#mheader-"+d.details.id).click(function() { ui_mheader(d.details.id);});	
	$("#mheader-"+d.details.id+" .close-map").click(function() { ui_mclose(d.details.id);});	
	$("#mheader-"+d.details.id+" .menu-map").click(function() { ui_mmenu(d.details.id);});	
	
	$("#manifestlist").append('<div class="mdetails" id="mdetails-'+d.details.id+'"></div>');	
	if (d.properties.description != "") { $("#mdetails-"+d.details.id).append(
		'<p class="mdescription">'+Autolinker.link(d.properties.description)+'</p>'
	);}
	$("#manifestlist").append('<ul class="mlist" id="mlist-'+d.details.id+'"></ul>');
		
	$("#mapmenu").click(function() {
		$("#mapmenu-window").removeClass("closed");
	});
	$("#mapmenu-window").mouseleave(function() {
		$("#mapmenu-window").addClass("closed");
	});
	
	$("#basemap-chooser li").click(function() {
		var tile = $(this).attr("class");
		var previoustiles = $("#basemap-preview").attr("class");
		$("#basemap-preview").removeClass();
		$("#basemap-preview").addClass(tile);
		MI.scview.map.removeLayer(MI.scview.layerdefs[previoustiles]);
		MI.scview.map.addLayer(MI.scview.layerdefs[tile]);	
		$('#datalayers input').each(function() { 
			MI.scview.map.removeLayer(MI.scview.layerdefs[$(this).val()]);
			if($(this).prop("checked")) {
				MI.scview.map.addLayer(MI.scview.layerdefs[$(this).val()]);		
			} 
		});
	});	

	$('#datalayers input').click(function() {
		if($(this).prop("checked")) {
			MI.scview.map.addLayer(MI.scview.layerdefs[$(this).val()]);		
		} else {
			MI.scview.map.removeLayer(MI.scview.layerdefs[$(this).val()]);
		}	
	});
	
	// Finalize UI
	var moffset = 0; $('.mheader').each(function(i) { $(this).css("top", moffset); moffset += $(this).outerHeight(); });
	var roffset = 0; $('.mheader').reverse().each(function(i) { $(this).css("bottom", roffset); roffset += $(this).outerHeight(); });
	
	if($("#searchbar").val() != "") { $("#searchbar").val(""); MI.functions.search(); }
	
	return scid;
}

/** Setup the supply chain map **/
function MapSC(d, scid) {
	// Setup Layer
	for (var i in d.features) {
		templid = 10000*d.details.id+Number(i);
		if (typeof(d.features[i].properties) != 'undefined') {
			if (typeof(d.features[i].properties.title) != 'undefined' && d.features[i].geometry.type != "LineString") {
				var ptitle = d.features[i].properties.title ? d.features[i].properties.title : "Untitled Point";
				var pdesc = (d.features[i].properties.description && d.features[i].properties.description != "...") ? 
					"<p class='description'>" + d.features[i].properties.description + "</p>" : "";
				
				d.features[i].properties.placename = d.features[i].properties.placename ? 
					d.features[i].properties.placename : (d.features[i].properties.address ? d.features[i].properties.address : ""); 
				var pplace = d.features[i].properties.placename ? "<p class='placename'>" + d.features[i].properties.placename + "</p>" : "";
				
				var pcategory = (d.features[i].properties.category && d.features[i].properties.category != "...") ? 
					"<p class='category'><a href='javascript:MI.functions.search(\"" + d.features[i].properties.category + "\");'>#" + d.features[i].properties.category + "</a></p>" : "";
				var pnotes = (d.features[i].properties.notes && d.features[i].properties.notes != "") ? 
					"<li>" + d.features[i].properties.notes + "</li>" : "";
				var psources = (d.features[i].properties.sources && d.features[i].properties.sources != "") ? 
					"<details class='sources'><summary>Notes</summary><ul>" + pnotes + "<li>" + 
					d.features[i].properties.sources.replace(/,/g, "</li><li>") + "</li></ul></details>" : "";
	
				
				
				// Try to map to graph
				if(d.mapper) {
					d.mapper["map"+d.features[i].properties.placename.replace(/[^a-zA-Z0-9]/g, '')+d.features[i].properties.title.replace(/[^a-zA-Z0-9]/g, '')] = d.features[i]; 
				}
				
				// Setup Measures
				if(d.features[i].properties.measures == undefined) { d.features[i].properties.measures = {}; }
				var measure = d.features[i].properties.measures;				
				var measure_list = MI.attributes.measures;
				
				pdesc += "<p class='measures'>";
				var measuredesc = [];
				
				for(var m in measure_list) {		
					if(d.features[i].properties[measure_list[m].measure] != undefined) { 
						if(d.details.measures[measure_list[m].measure] == undefined) {
							d.details.measures[measure_list[m].measure] = {"max":1,"min":0}; 
						}
						d.details.measures[measure_list[m].measure] = {
							"max": Number(d.details.measures[measure_list[m].measure].max) +
								   Number(d.features[i].properties[measure_list[m].measure]),
							"min": 0
						};		
						measure[measure_list[m].measure] = d.features[i].properties[measure_list[m].measure]; 
						measuredesc.push(measure_list[m].measure + ": " +
							 			 d.features[i].properties[measure_list[m].measure] +  
										 measure_list[m].unit);		
					}
				}
				pdesc += measuredesc.join(" / ")+"</p>";
				d.features[i].properties.scid = scid-1;
				
				// Set Style
				d.features[i].properties.style=d.details.style;
				var li = $(						
					"<li id='local_" + templid + "'>"+
						"<div class='dot' style='background:"+d.details.style.fillColor+"; border-color:"+d.details.style.color+";'></div>"+
					"<h5 class='mdetail_title'>" + ptitle + "</h5><div class='pdetails'>" + pplace + pcategory + "</div>" + Autolinker.link(pdesc) + Autolinker.link(psources) + 
					"</li>"						
				);
				li.delegate( li, "click", MI.scview.focus);
				$("#mlist-"+d.details.id).append(li);
			}
			d.features[i].properties.lid = templid;
		}
	}
	
	// Setup Lines
	points = $.extend(true, {}, d); lines = $.extend(true, {}, d);

	var plen = points.features.length; var llen = lines.features.length;
	while (plen--) { if (points.features[plen].geometry.type == GEOMTYPES.LINE) { points.features.splice(plen, 1); } }
	while (llen--) { if (lines.features[llen].geometry.type == GEOMTYPES.POINT) { lines.features.splice(llen, 1); } }

	if (MI.attributes.linetype != LINETYPES.STRAIGHT) {
		for (var k = 0, len = lines.features.length; k < len; k++) {
			var fromx = lines.features[k].geometry.coordinates[0][0]; var fromy = lines.features[k].geometry.coordinates[0][1];
			var tox = lines.features[k].geometry.coordinates[1][0]; var toy = lines.features[k].geometry.coordinates[1][1];

			lines.features[k].geometry.type = GEOMTYPES.MULTI;
			var multipass = null;
			if (MI.attributes.linetype == LINETYPES.GREATCIRCLE) {
				multipass = Grate.great_circle_route([fromx, fromy], [tox, toy], 7, MI.scview.map.getPixelBounds());
			} else {
				multipass = Grate.bezier_route([fromx, fromy], [tox, toy], 7, MI.scview.map.getPixelBounds());
			}
			lines.features[k].geometry.coordinates = multipass;
		}
	}

	// Setup Pointlayer
	var pointLayer = new L.geoJSON(points, { onEachFeature: MI.scview.pointrender, pointToLayer: function (feature, latlng) { 
		return L.circleMarker(latlng, MI.scview.styles.points); 
	} });	
	pointLayer.on('mouseup', function(e){	
		if(!(e.sourceTarget._preSpiderfyLatlng)){		
			for(var c in MI.clusters) {
				MI.clusters[c].unspiderfy();
			}
		}		
	});

	// Prepare to add layers
	maplayergroup = L.layerGroup();
		
	// Set Lines (if lines)
	if(lines.features.length == 0) { MI.scview.detailstyle = "points";
	} else {
		MI.scview.detailstyle = "lines";
		var lineLayer = new L.geoJSON(lines, { onEachFeature: MI.scview.linerender, style: MI.scview.styles.line });
		d.details.layers.push(maplayergroup.addLayer(lineLayer));		
	}
	
	// Set Pointlayer or Clusterview		
	MI.scview.clustergroup = new L.MarkerClusterGroup({ 
    	iconCreateFunction: function (cluster) {
        	var markers = cluster.getAllChildMarkers();
        	var html = '<div style="background:'+markers[0].options.fillColor+'; border-color:'+markers[0].options.color+'; color:'+markers[0].options.textcolor+';">' +
					   '<span>' + markers.length + '</span></div>';
        	return L.divIcon({ html: html, className: 'marker-cluster marker-cluster-small', iconSize: L.point(40, 40) });
    	},
    	spiderfyOnMaxZoom: true, showCoverageOnHover: false, zoomToBoundsOnClick: true 
	});
	if(MI.attributes.clustering) {
		MI.scview.clustergroup.addLayer(pointLayer);
		MI.clusters.push(MI.scview.clustergroup);
		d.details.layers.push(maplayergroup.addLayer(MI.scview.clustergroup));		
	} else {
		d.details.layers.push(maplayergroup.addLayer(pointLayer));
	}
		
	// Initialize Measurelist UI
	ui_measurelist();
	
	// Final Layer Setup
	if(MI.supplychains.length > 1 && $(".leaflet-popup").length > 0 && MI.scview.active_point) {		
		ui_pointclick(MI.scview.active_point, 0);
	}
	d.details.layers.push(MI.scview.map.addLayer(maplayergroup));
	pointLayer.bringToFront();	

	$('.sidepanel').scrollTo( MI.attributes.scrollpos,  0, {  } );	
}

/** Format a legacy Sourcemap file so Manifest can understand it */
function FormatSMAP(d, options) {
	d.details = options; d.details.layers = []; d.details.measures = {};
	d.details.globe = GLOBES[Math.floor(Math.random() * GLOBES.length)];
	d.details.colorchoice = MI.scview.colorchoice();

	d.mapper = {}; // Try to map to graph
	
	// Set default layerstyle
	if(!d.details.style) { 
		d.details.style = Object.assign({}, MI.scview.styles.point); 
		d.details.style.fillColor = d.details.colorchoice[0];
		d.details.style.color = d.details.colorchoice[1];
		d.details.style.textcolor = d.details.colorchoice[2];
	}
	
	// Error Checking
	if (typeof(d.properties.description) == 'undefined') { d.properties.description = ""; } 
	
	return d;
}

/** Format a google sheet file so Manifest can understand it */
function FormatGSHEET(d, options) {
	var sheetoverview = d.g;
	var sheetpoints = d.r;
	var so_offset = 6;
	var sp_offset = 8;
	var sheetid = options.id;
	
	var sheetsc = {"type":"FeatureCollection"};
	sheetsc.properties = {
		title: sheetoverview.feed.entry[so_offset].gs$cell.$t,
		description: sheetoverview.feed.entry[so_offset+1].gs$cell.$t,
		address: sheetoverview.feed.entry[so_offset+2].gs$cell.$t,
		geocode: sheetoverview.feed.entry[so_offset+3].gs$cell.$t,
		measure: sheetoverview.feed.entry[so_offset+4].gs$cell.$t
	};
	sheetsc.tempFeatures = {};
	
	for(var s in sheetpoints.feed.entry) {		
		if(Number(sheetpoints.feed.entry[s].gs$cell.row) > 1) {
			if(sheetsc.tempFeatures[Number(sheetpoints.feed.entry[s].gs$cell.row)-1] == undefined) { 
				sheetsc.tempFeatures[Number(sheetpoints.feed.entry[s].gs$cell.row)-1] = {};
			}
			var position = (Number(sheetpoints.feed.entry[s].gs$cell.row)-1)*sp_offset-1+(Number(sheetpoints.feed.entry[s].gs$cell.col)+1);
			var header = position - (sp_offset*(Number(sheetpoints.feed.entry[s].gs$cell.row)-1));
		
			var point = sheetsc.tempFeatures[Number(sheetpoints.feed.entry[s].gs$cell.row)-1];
			point[sheetpoints.feed.entry[header-1].gs$cell.$t] = sheetpoints.feed.entry[s].gs$cell.$t;	
		}				
	}		
	sheetsc.details = options; sheetsc.details.layers = []; sheetsc.details.measures = {};
	sheetsc.details.globe = GLOBES[Math.floor(Math.random() * GLOBES.length)];
	sheetsc.details.colorchoice = MI.scview.colorchoice();

	sheetsc.mapper = {}; // Try to map to graph
	
	// Set default layerstyle
	if(!sheetsc.details.style) { 
		sheetsc.details.style = Object.assign({}, MI.scview.styles.point); 
		sheetsc.details.style.fillColor = sheetsc.details.colorchoice[0];
		sheetsc.details.style.color = sheetsc.details.colorchoice[1];
		sheetsc.details.style.textcolor = sheetsc.details.colorchoice[2];
		
	}

	sheetsc.features = [];
	
	for (var i in sheetsc.tempFeatures) {
		// TODO This templid should be based off of a numeric id, which Google doesn't have right 
		var j = i-1;
		if (typeof(sheetsc.tempFeatures[i]) != 'undefined') {
			sheetsc.features[j] = {"type": "Feature"};			
			sheetsc.features[j].properties = {};	
			sheetsc.features[j].properties.title = sheetsc.tempFeatures[i].Name;
			sheetsc.features[j].properties.description = sheetsc.tempFeatures[i].Description;
			sheetsc.features[j].properties.placename = sheetsc.tempFeatures[i].Location;
			sheetsc.features[j].properties.category = sheetsc.tempFeatures[i].Category;
			sheetsc.features[j].properties.sources = sheetsc.tempFeatures[i].Sources;
			sheetsc.features[j].properties.notes = sheetsc.tempFeatures[i].Notes;
			
			sheetsc.features[j].properties.measures = {};
			sheetsc.features[j].geometry = {"type":"Point","coordinates":[Number(sheetsc.tempFeatures[i].Geocode.split(",")[1]), Number(sheetsc.tempFeatures[i].Geocode.split(",")[0])]};
		}
	}
		
	delete sheetsc.tempFeatures;
	return sheetsc;
}

/** Format a Yeti file so Manifest can understand it */
function FormatYETI(yeti, options) {	
	var d = {"type":"FeatureCollection"};
	d.details = options; d.details.layers = []; d.details.measures = {};
	d.properties = {"title": yeti.company_name, "description": yeti.company_address};
	d.details.colorchoice = MI.scview.colorchoice();
	d.details.globe = GLOBES[Math.floor(Math.random() * GLOBES.length)];	
	for(var item in yeti){	d.properties[item] = yeti[item]; }	
	d.tempFeatures = d.properties.vendor_table; delete d.properties.vendor_table;	
		
	// Set default layerstyle
	if(!d.details.style) { 
		d.details.style = Object.assign({}, MI.scview.styles.point); 
		d.details.style.fillColor = d.details.colorchoice[0];
		d.details.style.color = d.details.colorchoice[1];
		d.details.style.textcolor = d.details.colorchoice[2];
	}
		
	// Format Layer
	d.features = [];
	
	for (var i in d.tempFeatures) {
		if (typeof(d.tempFeatures[i]) != 'undefined') {
			d.features[i] = {"type": "Feature"};			
			d.features[i].properties = {};	
			for(var ft in d.tempFeatures[i]) { d.features[i][ft] = d.tempFeatures[i][ft]; }
			d.features[i].properties.title = d.tempFeatures[i].vendor_name; delete d.tempFeatures[i].vendor_name;
			d.features[i].properties.description = d.tempFeatures[i].product_descriptions.join(" / "); delete d.tempFeatures[i].product_descriptions;
			d.features[i].properties.placename = d.tempFeatures[i].vendor_address; delete d.tempFeatures[i].vendor_address;
						
			d.features[i].properties.measures = {};
			d.features[i].properties.percent = d.tempFeatures[i].shipments_percents_company;
			d.features[i].properties.measures.percent = d.tempFeatures[i].shipments_percents_company;
			d.details.measures.percent = {"max":100,"min":0};
			d.features[i].geometry = {"type":"Point","coordinates":[d.tempFeatures[i].lng, d.tempFeatures[i].lat]};
		}
	}
	
	delete d.tempFeatures;
	return d;
}

/** Setup the graph relationships for legacy Sourcemap files **/
function SMAPGraph(d, options) {
	var sc = null;
	for(var s in MI.supplychains) {
		if(MI.supplychains[s].details.id == options.id) { 
			MI.supplychains[s].graph = {"nodes":[], "links":[]}; 
			sc = MI.supplychains[s]; 
		} 
	}
	var digits = null;
	if (typeof(d.supplychain.stops) != 'undefined') {
		for (var i = 0; i < d.supplychain.stops.length; ++i) {
			
			var place = (typeof(d.supplychain.stops[i].attributes.placename) != 'undefined') ? d.supplychain.stops[i].attributes.placename : d.supplychain.stops[i].attributes.address;
			loc = place.split(", ");
			loc = loc[loc.length - 1];
			if (loc == "USA") { loc = "United States"; }
			
			// Correct local stop id
			digits = (Math.round(100*Math.log(d.supplychain.stops.length)/Math.log(10))/100)+1;
			d.supplychain.stops[i].local_stop_id = Number((""+d.supplychain.stops[i].local_stop_id).slice(-1*digits));
			var ref = sc.mapper["map"+place.replace(/[^a-zA-Z0-9]/g, '')+d.supplychain.stops[i].attributes.title.replace(/[^a-zA-Z0-9]/g, '')];
			var newNode = { "id": i, "name": d.supplychain.stops[i].attributes.title, "loc": loc, "place": place, "group": d.supplychain.stops[i].local_stop_id - 1, "links": [], "weight": 10, "size": 10, "ref": ref };
			sc.graph.nodes[d.supplychain.stops[i].local_stop_id - 1] = newNode;
		}
	} delete sc.mapper; // Remove Mapper

	
	if (typeof(d.supplychain.hops) != 'undefined' && d.supplychain.hops.length > 0) {
		sc.graph.type = "directed";
		for (var j = 0; j < d.supplychain.hops.length; ++j) {
			// Correct stop ids
			d.supplychain.hops[j].to_stop_id = Number((""+d.supplychain.hops[j].to_stop_id).slice(-1*digits));
			d.supplychain.hops[j].from_stop_id = Number((""+d.supplychain.hops[j].from_stop_id).slice(-1*digits));
			
			sc.graph.nodes[d.supplychain.hops[j].to_stop_id - 1].links.push(sc.graph.nodes[d.supplychain.hops[j].from_stop_id - 1].loc);
			var newLink = { "source": Number(d.supplychain.hops[j].from_stop_id - 1), "target": Number(d.supplychain.hops[j].to_stop_id - 1), "value": 10, "size": 4 };
			sc.graph.links.push(newLink);

		} 	
		for (var k = 0; k < d.supplychain.hops.length; ++k) {
			sc.graph.nodes[d.supplychain.hops[k].from_stop_id - 1].links.push(sc.graph.nodes[d.supplychain.hops[k].to_stop_id - 1].loc);
		}
	} else { sc.graph.type = "undirected"; }

	for (var l = 0; l < sc.graph.nodes.length; l++) {
		if (typeof(sc.graph.nodes[l]) == 'undefined') {
			sc.graph.nodes[l] = { "name": "", "loc": "", "place": "", "group": l, "links": [], "weight": 10, "size": 10 };
		}
	}

	if (typeof(d.supplychain.hops) != 'undefined') {
		for (var m = 0; m < d.supplychain.hops.length; ++m) {
			sc.graph.nodes[d.supplychain.hops[m].to_stop_id - 1].links = sc.graph.nodes[d.supplychain.hops[m].from_stop_id - 1].links = [];
			sc.graph.nodes[d.supplychain.hops[m].to_stop_id - 1].links.push(sc.graph.nodes[d.supplychain.hops[m].from_stop_id - 1].place);
			sc.graph.nodes[d.supplychain.hops[m].from_stop_id - 1].links.push(sc.graph.nodes[d.supplychain.hops[m].to_stop_id - 1].place);
		}
	}
}

/** Setup the graph relationships for Yeti files **/
function YETIGraph(d, options) {
	var sc = null;
	for(var i in MI.supplychains) {
		if(MI.supplychains[i].details.id == options.id) { 
			MI.supplychains[i].graph = {"nodes":[], "links":[]}; 
			sc = MI.supplychains[i]; 
		} 
	}
	var root = {
		id: sc.details.id,
		group: 1,
		name: sc.properties.company_name,
		ref: sc.features[0]	
	};
	sc.graph.nodes.push(root);
	
	for(var f in sc.features) {
		var node = {
			id: sc.features[f].properties.lid,
			group: sc.features[f].properties.lid,
			name: sc.features[f].properties.title,
			ref: sc.features[f]
		};
		sc.graph.nodes.push(node);
	}
	for (var j = 1; j <  sc.graph.nodes.length; ++j) {

		var link = {
			"size": 4,
			"source": 0,
			"target": j,
			"value": 10
		};
		sc.graph.links.push(link);
	}
	
	sc.graph.type = "directed";
}

function GSHEETGraph(d, options) {

}
/* Miscellaneous functions /* =-=-=-=-=-=-=-=-=-=-=-=-=-=-=-=-=-=-=-=-=-=-=-=-=-=-=-=-=-=-=-=-=-=-=-=-=-=-=-=-=-=-=-=-=-=-=-=-=-=-=-=-=- */

/** Called after Manifest has been initialized and the first supply chain loaded **/ 
function Cleanup() { 
	console.log("++++++++++++++++++++++++++++++++++++++++++++++++++++++++++++++++"); 
	console.log(MI); 
	console.log("++++++++++++++++++++++++++++++++++++++++++++++++++++++++++++++++"); 
	
	MI.attributes.initialized = true;	
	$("#load-samples").change(function() {
		if($("#load-samples option:selected").val() == "other") {
			$("#load-samples").css("width","20%");
			$("#load-samples-input").removeClass("closed");
		} else {
			$("#load-samples").css("width","100%");
			$("#load-samples-input").addClass("closed");
		}
	});

	// @TODO Move this to a more general function
	$("#load-samples-btn").click(function() {
		var loadurl = "";
		var loaded = false;
		var id = null;
		var type = null;
		
		if($("#load-samples").val() == "other") {
			loadurl = $("#load-samples-input").val();
			
			if (loadurl.toLowerCase().indexOf("https://raw.githubusercontent.com/hock/smapdata/master/data/") >= 0) {
				type = "smap";
				id = loadurl.substring(60).split(".")[0];
				loadurl = MI.serviceurl + "?type="+type+"&id=" + id;								
			} else if(loadurl.toLowerCase().indexOf("https://spreadsheets.google.com/feeds/cells/") >= 0) {
				type = "gsheet";
				id = loadurl.substring(44).split("/")[0];
				loadurl = MI.serviceurl + "?type="+type+"&id=" + id;								
				id = id.hashCode();
			}
			
			
		} else {
			var option = $("#load-samples").val().split("-");
			type = option[0];	
			option = [option.shift(), option.join('-')];
			id = option[1];
			if(type == "smap") {				
				loadurl = MI.serviceurl + "?type="+type+"&id=" + id;				
			} else if(type == "gsheet")	{
				loadurl = MI.serviceurl + "?type="+type+"&id=" + id;				
				id = id.hashCode();
			}	
		}
		for(var s in MI.supplychains) { if(MI.supplychains[s].details.id == id) { loaded = true; }}
				
		if(!loaded && id != null) {
			$.getJSON(loadurl, function(d) { MI.functions.process(type, d, {"id": id});});					
			ui_hamburger();
		} else {
			$("#manifestbar").shake(50,10,3);			
		}
	});
	
	$("#viz-choices").change(function() {
		visualize($("#viz-choices").val());		
	});
	$("#measure-choices").change(function() {
		MeasureSort();		
		visualize($("#viz-choices").val());	
	});
	
	var dropArea = new jsondrop('minfodetail', {
	    onEachFile: function(file) {
	        console.log(file);
	        // and other stuff ...
	    }
	});
	$("#minfodetail").on('drag dragstart dragend dragover dragenter dragleave drop', function(e) {
			e.preventDefault();
			e.stopPropagation();
		})
		.on('dragover dragenter', function() {
			$("#minfodetail").addClass('is-dragover');
		})
		.on('dragleave dragend drop', function() {
			$("#minfodetail").removeClass('is-dragover');
		});

	$( window ).resize(function() {
		if(!($(".vizwrap").hasClass("closed"))) {
			viz_resize();
		}			
	});
	setTimeout(function() {$("#loader").remove();}, 250);
	 
}

/** A dumb centering function that always sets the map to the same location (New York, NY) **/
function CenterView() { MI.scview.map.setView(new L.LatLng(40.730610,-73.935242), 3);}

/** A slightly smarter centering function that focuses on the first point of a supply chain **/
function InterestView() {
	if(MI.visualization == "map") {
		for(var c in MI.clusters) {
			MI.clusters[c].unspiderfy();
		}
		var idname = $(".mlist").last().attr("id").split("-");
		idname = [idname.shift(), idname.join('-')];
		var id = idname[1];
		ui_mheader(id);
		MI.scview.focus($(".mlist").last().children("li").first().attr('id').split("_")[1]);	
	}	
	//map.locate({setView : true, maxZoom: map.getZoom()});
}

/** Cycle through the colors for supply chains randomly **/
function Colorize(array) {
	var copy = array.slice(0);
	return function() {
		if (copy.length < 1) { copy = array.slice(0); }
		var index = Math.floor(Math.random() * copy.length);
		var item = copy[index];
		copy.splice(index, 1);
		return item;
	};
}

/** A simple text match search **/
function SimpleSearch(term) {
	if(term) { $("#searchbar").val(term); }
	var s = $("#searchbar").val().toLowerCase();
	// Only do something if the search has changed.
	if(s == MI.attributes.prevsearch) { return; }
	else { MI.attributes.prevsearch = s; }
	
    $(".mlist li").each(function () {
        var $this = $(this);
        if ($(this).text().toLowerCase().indexOf(s) !== -1)  { $this.show();
        } else { $this.hide(); }
    });
	var found = false;
	var clusterfound = false;
	for (var i in MI.scview.map._layers) {
		if (typeof(MI.scview.map._layers[i].feature) != 'undefined') {
			if (MI.scview.map._layers[i].feature.geometry.type != "MultiLineString") {
				found = false;
				for (var k in MI.scview.map._layers[i].feature.properties) {
					if (String(MI.scview.map._layers[i].feature.properties[k]) .toLowerCase() .indexOf(s) != -1) { found = true; }
				}
				if (!(found)) { 
					MI.scview.map._layers[i].setStyle({ fillOpacity: 0.1, opacity: 0.1 }); 
					
					if(MI.scview.active_point) {
						if(MI.scview.active_point._popup._source._leaflet_id == MI.scview.map._layers[i]._leaflet_id) { MI.scview.active_point.closePopup(); }
					}
				} else { MI.scview.map._layers[i].setStyle({ fillOpacity: 1, opacity: 1 }); MI.scview.map._layers[i].bringToFront();}
			} else {
				// Do something with lines
			}
		} else if (typeof(MI.scview.map._layers[i].getAllChildMarkers) != 'undefined') {
			var childmarkers = MI.scview.map._layers[i].getAllChildMarkers();
			clusterfound = false;
			
			for (var j in childmarkers) {
				found = false;
				
				if (typeof(childmarkers[j].feature) != 'undefined') {
					for (var l in childmarkers[j].feature.properties) {
						if (String(childmarkers[j].feature.properties[l]) .toLowerCase() .indexOf(s) != -1) { found = true; clusterfound = true;}
						if (!(found)) { 
							childmarkers[j].options.opacity = 0.1; childmarkers[j].options.fillOpacity = 0.1; } 
						else { childmarkers[j].options.opacity = 1; childmarkers[j].options.fillOpacity = 1; }						
					}
				}
			}
			if (!(clusterfound)) { MI.scview.map._layers[i].setOpacity(0.1); } else { MI.scview.map._layers[i].setOpacity(1); }
		}
	} // Search map layers	
	if(MI.visualization != "map") {
		visualize(MI.visualization);
	}
} // SimpleSearch

/** Scales the map based on selected measure **/
function MeasureSort() {
	var measure_sort = $("#measure-choices").val();
	
	for (var i in MI.scview.map._layers) {
		if (typeof(MI.scview.map._layers[i].feature) != 'undefined') {
			if (MI.scview.map._layers[i].feature.geometry.type != "MultiLineString") {
				var radius = 8;
				
				if(MI.scview.map._layers[i].feature.properties.measures != undefined) {	
					if(MI.scview.map._layers[i].feature.properties.measures[measure_sort] != undefined) {
						if(measure_sort != "none") {							
							radius = MI.scview.map._layers[i].feature.properties.style.radius = 8 + 100 * (MI.scview.map._layers[i].feature.properties.measures[measure_sort] / MI.supplychains[MI.scview.map._layers[i].feature.properties.scid].details.measures[measure_sort].max);
						}						
					}
				}
				
				MI.scview.map._layers[i].setStyle({ radius: radius });
				MI.scview.map._layers[i].bringToFront();
			}
		}
	}
}

/* UI functions /* =-=-=-=-=-=-=-=-=-=-=-=-=-=-=-=-=-=-=-=-=-=-=-=-=-=-=-=-=-=-=-=-=-=-=-=-=-=-=-=-=-=-=-=-=-=-=-=-=-=-=-=-=-=-=-=-=-=-= */

/** Handles header actions **/
function ui_mheader(id) {
	var offset = $("#mheader-"+id).outerHeight();
	$("#mheader-"+id).prevAll(".mheader").each(function(i) {
		offset += $(this).outerHeight();
	});
	$('.sidepanel').scrollTo($("#mdetails-"+id),  50, { offset: -1*offset}); 	
}

/** Sets interface to full screen mode **/
function ui_fullscreen() {
	if(!($("body").hasClass("fullscreen"))) {
		$("body").addClass("fullscreen");			
	} else {
		$("body").removeClass("fullscreen");	

		if($(".leaflet-popup").length > 0 && MI.scview.active_point != null) {
			ui_pointclick(MI.scview.active_point);				
		} 		
	}
	viz_resize();
}

/** Removes a supply chain from the interface (along with its data) **/
function ui_mclose(id) {
	event.stopPropagation();
	
	var offset = $("#mheader-"+id).outerHeight();
	var target_id = 0;
	if(MI.supplychains.length > 1) {
		$("#mheader-"+id).prevAll(".mheader").each(function(i) {
			offset += $(this).outerHeight();
		});
		var target = $("#mheader-"+id).nextUntil("",".mheader");
		if(target.length == 0) {
			target = $("#mheader-"+id).prev(); 
			offset = 0;
			$("#mheader-"+id).prevAll(".mheader").each(function(i) {
				offset += $(this).outerHeight();
			});
		 }
		target_id = target.attr("id").split("-")[1];	
	}
	
	$("#mheader-"+id).remove();
	$("#mdetails-"+id).remove();
	$("#mlist-"+id).remove();
	
	for(var s in MI.supplychains) {
		if(MI.supplychains[s].details.id == id) {
			for(var i in MI.supplychains[s].details.layers) {
				MI.scview.map.removeLayer(MI.supplychains[s].details.layers[i]);
			}
			
			MI.supplychains.splice(s, 1);
			// DEP delete MI.supplychains[s];
		}
	}
	
	var moffset = 0; $('.mheader').each(function(i) { $(this).css("top", moffset); moffset += $(this).outerHeight(); });
	var roffset = 0; $('.mheader').reverse().each(function(i) { $(this).css("bottom", roffset); roffset += $(this).outerHeight(); });
	
	if(MI.supplychains.length != 0) {
		if($(".leaflet-popup").length > 0 && MI.scview.active_point) {
			ui_pointclick(MI.scview.active_point, 0);		
		} else {					
			$('.sidepanel').scrollTo($("#mdetails-"+target_id),  0, { offset: -1*offset}); 	
		}
	} else {
		if($("#minfodetail").hasClass("closed")) { ui_hamburger(); }
	}
	MI.scview.map.fitBounds(MI.scview.map.getBounds());
	
	ui_measurelist();
	viz_resize();
}

/** Handles the supply chain extra menu **/
function ui_mmenu(id) {
	event.stopPropagation();

	var raw = "";
	for(var s in MI.supplychains) {

		if(MI.supplychains[s].details.id == id) {

			raw = JSON.stringify(MI.supplychains[s].details.id) + " : " + 
			JSON.stringify(MI.supplychains[s].properties) + JSON.stringify(MI.supplychains[s].features) + JSON.stringify(MI.supplychains[s].graph);
		}
	}
	if($("#mdetails-"+id+" #mmenu").length == 0) {
		$("#mdetails-"+id).prepend(
			'<div id="mmenu" style="background:'+$("#mheader-"+id+" .mtitle").css("color")+'">'+
				raw +
			'</div>'
		);
	} else {
		$("#mdetails-"+id+" #mmenu").remove();
	}
}

/** Handles the Manifest information and loading menu **/
function ui_hamburger() {
	$("#minfodetail").toggleClass("closed");
	$("#manifestbar").toggleClass("open");
	
	if($("#manifestbar").hasClass("open")) { $(".sidepanel").css("top", $("#manifestbar").outerHeight() + $("#manifestbar").outerHeight() / 20); } 
	else { $(".sidepanel").css("top", "4rem"); }
}

/** Handles the measure sorting interface **/
function ui_measurelist() {
	var choices = {"none":"none"};
	var previous = $("#measure-choices").val();
	for(var s in MI.supplychains) { for(var m in MI.supplychains[s].details.measures) { choices[m] = m; }}
	$("#measure-choices").empty();	
	for(var c in choices) { $("#measure-choices").append('<option value="'+c+'">'+c+'</option>'); }	
	if($("#measure-choices option[value='"+previous+"']").length) {
		$("#measure-choices").val(previous);
	}
}

/** The UI side of the focus function, scrolls the user interface to a point based on map (or functional) action **/
function ui_pointclick(e, speed, slid) {
	if($(window).width() <= 920) { return; }
		
	if(speed == undefined) { speed = 500; }
	if(slid == undefined) {
		if(e != undefined && e._popup) {
			slid = e._popup._source.feature.properties.lid;
			if(e._popup._source.options.fillOpacity == 0.1) { return; }
		} else { return; }
	} 
	if($("li#local_"+slid).parent().length > 0 && !($("body").hasClass("fullscreen"))) {
		var offset = 0;
		$("li#local_"+slid).parent().prevAll(".mheader").each(function(i) {
			offset += $(this).outerHeight();
		});

		// Scroll to point
		$('.sidepanel').scrollTo(
			$("li#local_"+slid),  speed, {
				offset: -1*offset
			}
		);		
	}
	if(e == undefined && $("li#local_"+slid).length > 0) {
		$("li#local_"+slid).click();
	}
}

/** Checks to see if user interface elements overlap **/
function ui_collide( $div1, $div2 ) {
	var d1_offset             = $div1.offset();
	var d1_height             = $div1.outerHeight( true );
	var d1_width              = $div1.outerWidth( true );
	var d1_distance_from_top  = d1_offset.top + d1_height;
	var d1_distance_from_left = d1_offset.left + d1_width;

	var d2_offset             = $div2.offset();
	var d2_height             = $div2.outerHeight( true );
	var d2_width              = $div2.outerWidth( true );
	var d2_distance_from_top  = d2_offset.top + d2_height;
	var d2_distance_from_left = d2_offset.left + d2_width;

	var not_colliding = ( d1_distance_from_top < d2_offset.top || d1_offset.top > d2_distance_from_top || d1_distance_from_left < d2_offset.left || d1_offset.left > d2_distance_from_left );

	// Return whether it IS colliding
	return ! not_colliding;
}

/* Utility functions /* =-=-=-=-=-=-=-=-=-=-=-=-=-=-=-=-=-=-=-=-=-=-=-=-=-=-=-=-=-=-=-=-=-=-=-=-=-=-=-=-=-=-=-=-=-=-=-=-=-=-=-=-=-=-=-=- */

String.prototype.hashCode = function() {
  var hash = 0, i, chr;
  if (this.length === 0) return hash;
  for (i = 0; i < this.length; i++) {
    chr   = this.charCodeAt(i);
    hash  = ((hash << 5) - hash) + chr;
    hash |= 0; // Convert to 32bit integer
  }
  return Math.abs(hash);
};

jQuery.fn.shake = function(interval,distance,times){
   interval = typeof interval == "undefined" ? 100 : interval;
   distance = typeof distance == "undefined" ? 10 : distance;
   times = typeof times == "undefined" ? 3 : times;
   var jTarget = $(this);
   jTarget.css('position','relative');
   for(var iter=0;iter<(times+1);iter++){
      jTarget.animate({ left: ((iter%2==0 ? distance : distance*-1))}, interval);
   }
   return jTarget.animate({ left: 0},interval);
};

jQuery.fn.reverse = [].reverse;

/* Constants /* =-=-=-=-=-=-=-=-=-=-=-=-=-=-=-=-=-=-=-=-=-=-=-=-=-=-=-=-=-=-=-=-=-=-=-=-=-=-=-=-=-=-=-=-=-=-=-=-=-=-=-=-=-=-=-=-=-=-=-=- */

LINETYPES = {
	'GREATCIRCLE': 'GREAT_CIRCLE_LINE',
	'BEZIER': 'BEZIER_LINE',
	'STRAIGHT': 'STRAIGHT_LINE'
};

GEOMTYPES = {
	'MULTI': 'MultiLineString',
	'LINE': 'LineString',
	'POINT': 'Point'
};

MEASURES = [{measure: "weight", unit: "kg"}, {measure: "co2e", unit: "kg"}, {measure: "water", unit: "kl"},
{measure: "energy", unit: "kj"}, {measure: "cost", unit: "dollars"}, {measure: "percent", unit: "%"}];

COLORSETS = [["#3498DB","#dbedf9", "#dbedf9"],["#FF0080","#f9dbde","#f9dbde"],["#34db77","#dbf9e7","#dbf9e7"],["#ff6500","#f6d0ca","#f6d0ca"],["#4d34db","#dfdbf9","#dfdbf9"],  ["#5E2BFF","#E0D6FF","#E0D6FF"],["#EE4266","#FAC7D2","#FAC7D2"],["#3BCEAC","#CEF3EA","#CEF3EA"],["#00ABE7","#C2EFFF","#C2EFFF"],["#F85A3E","#FEDDD8","#FEDDD8"]];

TILETYPES = {
	'GOOGLE': 'https://{s}.google.com/vt/lyrs=m&x={x}&y={y}&z={z}',
	'DARK': 'https://{s}.basemaps.cartocdn.com/dark_all/{z}/{x}/{y}{r}.png',	
	'LIGHT': 'https://stamen-tiles-{s}.a.ssl.fastly.net/toner-lite/{z}/{x}/{y}{r}.{ext}',	
	'TERRAIN': 'https://stamen-tiles-{s}.a.ssl.fastly.net/terrain/{z}/{x}/{y}{r}.{ext}',
	'SATELLITE': 'https://server.arcgisonline.com/ArcGIS/rest/services/World_Imagery/MapServer/tile/{z}/{y}/{x}',
	
	'SHIPPING': 'https://tiles.arcgis.com/tiles/nzS0F0zdNLvs7nc8/arcgis/rest/services/ShipRoutes/MapServer/WMTS/tile/1.0.0/ShipRoutes/default/default028mm/{z}/{y}/{x}.png',
	'MARINE': 'https://tiles.marinetraffic.com/ais_helpers/shiptilesingle.aspx?output=png&sat=1&grouping=shiptype&tile_size=512&legends=1&zoom={z}&X={x}&Y={y}',
	'RAIL': 'https://{s}.tiles.openrailwaymap.org/standard/{z}/{x}/{y}.png'
};

GLOBES = ["americas","asia","europe","africa"]; function visualize(type) {
	switch(type) {
		case "map":
			MI.visualization = "map";
			$(".map").removeClass("closed");
			$(".vizwrap").addClass("closed");
			MI.scview.map.invalidateSize();
			viz_cleanup();
			break;
		case "forcegraph":
			MI.visualization = "forcegraph";		
			viz_cleanup();
			for(var c in MI.clusters) {
				MI.clusters[c].unspiderfy();
			}
			$(".map").addClass("closed");
			$(".vizwrap").removeClass("closed");
			for(var i in MI.supplychains) {
				if(MI.supplychains[i].graph != undefined) { 
					viz_forcegraph(MI.supplychains[i].graph, MI.supplychains[i].details.id); 
				}
			}
	    	break;
	  	default:
			console.log("Visualization type not supported...");
	}
}

function viz_cleanup() {
	$(".vizwrap .viz").remove();
	if($(window).width() <= 920) {
		$(".vizwrap svg").attr("viewBox","0 0 "+$(window).width()+" "+$(window).width());
	} else {
		$(".vizwrap svg").attr("viewBox","0 0 "+$(window).width()+" "+$(window).height());
	}
	if(MI.scview.active_point) {
		if(MI.visualization != "map") { }
		else { ui_pointclick(null, null, MI.scview.active_point._popup._source.feature.properties.lid); } 	
	}
}

function viz_resize() {
	visualize(MI.visualization);
}


// Force Directed Graph
function viz_forcegraph(graph, id) {	
	var width = $(window).width(),
	    height = $(window).height(),
	    radius = 12;
	
		var adj = 0;
	if(width > 920) {
		if(!($("body").hasClass("fullscreen"))) {
			adj = $(".sidepanel").width();
		} else {
			adj = 0;
		}
	}  else {
		height = $(window).width();
	}
	//Math.ceil(Math.random() * 300) * (Math.round(Math.random()) ? 1 : -1)
	var simulation = d3.forceSimulation()
	    .velocityDecay(0.5)
	    .force("x", d3.forceX((width+adj) / 2).strength(0.1))
	    .force("y", d3.forceY(height / 2).strength(0.1))
	    .force("charge", d3.forceManyBody().strength( function(d) { 
			var measure_sort = $("#measure-choices").val();

			var linkd = 0;
			if(d.ref != undefined) {
				linkd = d.ref.properties.measures[measure_sort] != undefined ? 
					10000 * (d.ref.properties.measures[measure_sort] / MI.supplychains[d.ref.properties.scid].details.measures[measure_sort].max) : 
					0;
			}
			return -240 - linkd;
		}))
	    .force("link", d3.forceLink().distance(100).strength(0.5));

	var svg = d3.select("svg")
	    .attr("width", width)
	    .attr("height", height);

	var viz = svg.append("g")
		.attr("class", "viz forcegraph");

	var link = viz.selectAll("line")
	  	.data(graph.links)
		.enter().append("line");

	var node = viz.selectAll("circle")
	  	.data(graph.nodes)
		.enter().append("circle")
	  	.attr("r", radius - 0.75)
		.style("fill", function(d) { if(d.ref != undefined) { return $("#mlist-"+id+" .dot").css("background-color");} })
		.style("stroke", function(d) { if(d.ref != undefined) { return $("#mlist-"+id+" .dot").css("border-color");} })
		.call(d3.drag()
			.on("start", dragstarted)
			.on("drag", dragged)
			.on("end", dragended));  
			
	var labels = viz.selectAll("text")
	  	.data(graph.nodes)
		.enter().append('text')
		.attr("fill", function(d) { if(d.ref != undefined) {return $("#mlist-"+id+" .dot").css("background-color");} })
		.attr("pointer-events", "none")
		.text(function (d){return d.name;});

	simulation
		.nodes(graph.nodes)
		.on("tick", tick);

	simulation.force('link')
		.links(graph.links);
  
	function tick() {
		node.attr("cx", function(d) { d.x = Math.max(radius, Math.min(width - radius, d.x)); return d.x; })
		.attr("cy", function(d) { d.y = Math.max(radius, Math.min(height - radius, d.y)); return d.y; })
		.attr("opacity", function(d) { if(d.ref != undefined) { if($("li#local_"+d.ref.properties.lid).css("display") == "none") {return 0.1; } else { return 1;} }});
		
		link.attr("x1", function(d) { return d.source.x; })
		    .attr("y1", function(d) { return d.source.y; })
		    .attr("x2", function(d) { return d.target.x; })
		    .attr("y2", function(d) { return d.target.y; });

		labels.attr('x', function(d) { return d.x+radius+(0.2 * parseFloat(getComputedStyle(document.documentElement).fontSize)); })
			  .attr('y', function(d) { return d.y+(radius+(0.2 * parseFloat(getComputedStyle(document.documentElement).fontSize)))/2; });
		
		width = $(window).width();
		height = $(window).height();
		if(width > 920) {
			if(!($("body").hasClass("fullscreen"))) {
				adj = $(".sidepanel").width();
			} else {
				adj = 0;
			}
		}  else {
			height = $(window).width();
		}
	}
  
	force_scale();

	function dragstarted(d) {
		if(d.ref != undefined) {
			ui_pointclick(null, null, d.ref.properties.lid);
		}
		if (!d3.event.active) simulation.alphaTarget(0.3).restart();
		d.fx = d.x;
		d.fy = d.y;
	}

	function dragged(d) {
		d.fx = d3.event.x;
		d.fy = d3.event.y;
	}

	function dragended(d) {
		if (!d3.event.active) simulation.alphaTarget(0);
		d.fx = null;
		d.fy = null;
	}
	
	function force_scale() {		
		d3.select("svg").selectAll("circle")
		.attr("r", function(d) { 
			var measure_sort = $("#measure-choices").val();
			var radius = 8;
			if(d.ref != undefined) {
				if(d.ref.properties.measures != undefined) {	
					if(d.ref.properties.measures[measure_sort] != undefined) {
							if(measure_sort != "None" && MI.supplychains[d.ref.properties.scid].details != undefined) {							
								radius = d.ref.properties.style.radius = 8 + 100 * 
								(d.ref.properties.measures[measure_sort] / MI.supplychains[d.ref.properties.scid].details.measures[measure_sort].max);
							}
					}
				}		
			}			
			return radius;
		});
	}
} // End Forcegraph


/* Image Creation */
 $( document ).ready(function() {
	MI = new Manifest();
	MI.serviceurl = "https://supplystudies.com/manifest/services/";
	MI.jsoncollection = "json/samples.json";
	
	var hash = "";
	var hashtype = "";
	var hashid = "";
	
	var initialmap = false;
	if(typeof(location.hash) != 'undefined' && location.hash != "") { 
		// TODO handle bad hashes gracefully and still load the page.
		hash =  location.hash.substr(1).split("-");
		hashtype = hash[0]; 
		hash = [hash.shift(), hash.join('-')];
		hashid = hash[1]; 
		
		if(typeof(hashtype) == 'undefined' || typeof(hashid) == 'undefined') {
			$("#loader h2").text("[BAD REQUEST]");
		}
		switch(hashtype) {
			case "smap":
				initialmap = true;
				$.getJSON(MI.serviceurl + "?type=smap&id=" + hashid, function(d) { MI.functions.process("smap", d, {"id": hashid});}).fail(function() {
					$("#loader h2").text("[SMAP ID NOT FOUND]");
				});
				break;
			case "gsheet":
				initialmap = true;
				$.getJSON(MI.serviceurl + "?type=gsheet&id=" + hashid, function(d) { MI.functions.process("gsheet", d, {"id": hashid.hashCode()});}).fail(function() {
					$("#loader h2").text("[GOOGLE SHEET NOT FOUND]");
				}); 
		    	break;
			case "manifest":
				initialmap = true;
				console.log("Load manifest...");
				break;
			case "collection":
				initialmap = false;			
				MI.jsoncollection = hashid;
				break;
		  	default:
				console.log("Option not supported...");
		}
	} 
	

	//MI.functions.process("yeti", yeti, {"id": ("casper sleep").hashCode()});
	//	var starters = [5333,2239,602,5228,4532,2737,5228]; ... if(d.featured)

		
	$.getJSON(MI.jsoncollection, function(d) { 
		$("#collection-description").html(d.description);
		for(var s in d.collection) { 
			$("#load-samples").append('<option value="'+d.collection[s].id+'">'+d.collection[s].title+'</option>');	
		} 
		$("#load-samples").append('<option value="other">Other...</option>');	
		
		if(hashtype != "" && hashtype != "collection") { return; } // If a specific hash is passed, we're done--otherwise load a starter map.
			
		var option = $("#load-samples").val().split("-");
		type = option[0];	
		option = [option.shift(), option.join('-')];
		id = option[1];
		
		var starter = d.collection[Math.floor(Math.random() * d.collection.length)];
		var starterstring = starter.id.split("-"); 
		var startertype = starterstring[0];
		starterstring = [starterstring.shift(), starterstring.join('-')];
		var starterid = starterstring[1]; 
		
		if(startertype == "gsheet" || startertype == "yeti") {
			starterid = starterid.hashCode();
		}
		$.getJSON(MI.serviceurl + "?type="+startertype+"&id=" + starterstring[1], function(d) { MI.functions.process(startertype, d, {"id": starterid});});	
	});
	
	$(document).ajaxStop(function() {
		MI.scview.map.fitBounds(MI.scview.map.getBounds());
		MI.scview.map.setMaxBounds(new L.LatLngBounds(new L.LatLng(-85, 180), new L.LatLng(85, - 240)));
		
		viz_resize();
		
		if(MI.supplychains.length > 0) {
			if(MI.scview.active_point == null) { MI.functions.center(); }
			if(!(MI.attributes.initialized)) { MI.functions.cleanup(); }   
		}
	});
	
	// Do Testing
	// ManifestTests();
});	
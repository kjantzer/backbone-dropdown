/*
	Dropdown view
	
	creates a dropdown on a specified element and 
	renders whatever backbone view was given
	
	EXAMPLES:
		
		$btn.dropdown(view, [options])
		
		$btn.dropdown('This would be tooltip text', {align: 'bottom'})
	
	
	@param "view" - can be:
		- function (which should return one of the views below)
		- text (creates "tooltip")
		- array (which generates a menu)
		- Backbone.View
		- Backbone.Model (prints model.templateData - more for development purposes)
		- Book.Record (shows "book preview" - see Popover.Views.BookPreview class)
		- Person.Record (same concept as Book.Record, but not yet coded)

		NOTE: see determineView() method for auto detecting what view should be used; add to it as you see fit
		
	@param "options" - see Dropdown.defaultOpts below
	
	
	Dropdown.permission -> you'll want to override this method to fit your application
		
	
	@author Kevin Jantzer, Blackstone Audio
	@since 2012-12-14
	
	https://github.com/kjantzer/backbonejs-dropdown-view
	
*/

var Dropdown = Backbone.View.extend({

	tagName: 'div',
	
	className: 'dropdown',
	
	arrowW: 10,
	
	defaultOpts: {
		w: 200,
		align: 'bottomRight',	// bottomLeft, bottom, bottomRight, leftTop, left, leftBottom, etc, also "auto"
		autoCenter: false,		// centers dropdown to renderTo el with the arrow as the center point
		alignVerticalToParent: false,
		style: 'default',		// toolbar - DEPRECATED, use theme
		theme: 'default',		// 'toolbar', 'select'
		animated: true,
		closeOn: 'body',		// body, el
		closeOnEsc: true,
		closeOnScroll: false,
		actionOnEnter: false,	// will trigger "actionOnEnter" method on view when enter is pressed
		view: null, 			// view to be rendered ( see @param "view" above for documentation)
		trigger: 'click',		// click, dbclick, hover, delay, none (will open upon init and be removed when closed)
		delay: 1000,			// delay duration when using trigger='delay'
		openOnInit: false,		// dropdown will automatically open when initialized
	},
	
	defaultEvents: {
		'click': 'stopPropagation',
		'contextmenu': 'stopPropagation' // right click
	},
	
	initialize: function(opts){
		
		this.options = _.extend({}, this.defaultOpts, opts);
		this.events = _.extend({}, this.defaultEvents, this.events||{});
		
		// setup dropdown states
		this.isOpen = false;
		
		
		// check for required parameters
		if( !this.options.renderTo){ // TODO: change to `target`
			console.error('Dropdown.js: You need to specify an element to "renderTo"');
			return false;
		}else if( !this.options.view ){
			console.error('Dropdown.js: You don’t have a view to load in the dropdown');
			return false;
		}
		
		// bind to `this`
		this.deferClose = this._deferClose.bind(this)
		this.stopDeferClose = this._stopDeferClose.bind(this)
		this.onKeyup = this._onKeyup.bind(this);

		
		if( this.options.trigger === 'delay' )
			this.bindDelayedTrigger();
		if( this.options.trigger === 'hover' )
			this.bindHoverTrigger();
		else if( this.options.trigger !== 'none')
			this.options.renderTo[0].addEventListener(this.options.trigger, this.toggle.bind(this), false);
		
		this.setup()
	
		// when the dropdown is opened, render the view
		this.on('dropdown:opened', this.render, this);
	
		// listen for the view telling us to close
		this.view.on('dropdown:close', this.close, this);
		this.view.on('dropdown:open', this.open, this);
		
		if( this.options.trigger === 'none' || this.options.openOnInit )
			_.defer(this.toggle.bind(this));
		
	},
	
	remove: function(){
		this.unbindTrigger();
		
		this.off('dropdown:opened', this.render, this);
		this.view.off('dropdown:close', this.close, this);
		this.view.off('dropdown:open', this.open, this);
		
		this.$el.remove();
	},

	_bindEvents: function(){

		this._unbindEvents();

		// close
		if(this.options.closeOn == 'body'){
			document.body.addEventListener('click', this.deferClose, true);
			document.body.addEventListener('contextmenu', this.deferClose, true);
			this.el.addEventListener('click', this.stopDeferClose, true);
			this.el.addEventListener('contextmenu', this.stopDeferClose, true);
		}

		// FIXME: whoops, `scrollParent` is not native...its a side effect of `VisualSearch`
		if( this.options.closeOnScroll && this.options.renderTo.scrollParent && this.options.renderTo.scrollParent()[0] )
			this.options.renderTo.scrollParent()[0].addEventListener('scroll', this.deferClose, true);

		// watch for esc or enter key
		if( this.options.closeOnEsc || this.options.actionOnEnter )
			document.body.addEventListener('keyup', this.onKeyup, false);
	},

	_unbindEvents: function(){
		
		document.body.removeEventListener('click', this.deferClose);
		document.body.removeEventListener('contextmenu', this.deferClose);
		this.el.removeEventListener('click', this.stopDeferClose);
		this.el.removeEventListener('contextmenu', this.stopDeferClose);
		document.body.removeEventListener('keyup', this.onKeyup);

		// FIXME
		if( this.options.renderTo.scrollParent && this.options.renderTo.scrollParent()[0] )
			this.options.renderTo.scrollParent()[0].removeEventListener('scroll', this.deferClose);
	},

	
	unbindTrigger: function(){
		
		if( this.options.trigger === 'delay' )
			this.unbindDelayedTrigger();
		if( this.options.trigger === 'hover' )
			this.unbindHoverTrigger();
		else if( this.options.trigger !== 'none')
			this.options.renderTo.unbind(this.options.trigger, this.toggle.bind(this));
	},
	
	bindHoverTrigger: function(){
		this.options.renderTo.bind('mouseenter', this.open.bind(this));
		this.options.renderTo.bind('mouseleave', this.delayEnd.bind(this));
	},
	
	unbindHoverTrigger: function(){
		this.options.renderTo.unbind('mouseenter', this.open.bind(this));
		this.options.renderTo.unbind('mouseleave', this.delayEnd.bind(this));
	},
	
	bindDelayedTrigger: function(){
		this.options.renderTo.bind('mouseenter', this.delayStart.bind(this));
		this.options.renderTo.bind('mouseleave', this.delayEnd.bind(this));
	},
	
	unbindDelayedTrigger: function(){
		this.options.renderTo.unbind('mouseenter', this.delayStart.bind(this));
		this.options.renderTo.unbind('mouseleave', this.delayEnd.bind(this));
	},
	
	delayStart: function(){
		clearTimeout(this.closeTimeout);
		this.delayTimeout = setTimeout(this.open.bind(this), this.options.delay)
	},
	
	delayEnd: function(){
		clearTimeout(this.delayTimeout);
		
		this.closeTimeout = setTimeout(this.close.bind(this), 300)
	},
	
	setup: function(){
	
		// add the dropdown to the DOM, set styles
		this.$el.appendTo(this.options.renderTo);
		this.$el.width(this.options.w+'px');
		this.$el.addClass('align-'+this.options.align)
		this.$el.addClass('style-'+this.options.style)
		this.$el.addClass('theme-'+this.options.theme)
		
		if( this.options.animated )
			this.$el.addClass('animate')
		
		this.options.renderTo.addClass('has-dropdown')
		
		// append the inner view to the dropdown
		this.view = this.options.view;
		
		this.determineView();
		
	},
	
	determineView: function(){
		
		var view = this.view;
		
		// is the given view a function?
		if( _.isFunction(view) ){
			this.options.viewFn = this.view.bind(this.options.context||this);	// lets keep a link to this view function
			this.view = view = this.options.viewFn(this, this.options);// and then run the function to get the view
		}
		
		// if the given view is a string (or jQuery object), then load that string with a "default dropdown text view"
		if(_.isString(view) || view instanceof jQuery)
			this.view = new DropdownTextView(_.extend({},this.options,{html:this.view}));
			
		else if(_.isArray(view))
			this.view = new DropdownMenuView(view, this.options);
		
		else if( (view instanceof Backbone.Model && view.has('book_id')) || (typeof Book !== 'undefined' && view instanceof Book.Record) )
			this.view = new BSA.Views.BookOverview({id: view.id });

		else if( typeof Book !== 'undefined' && view instanceof Book.Record )
			this.view = new Popover.Views.BookPreview({model: view });
			
		else if( typeof Person !== 'undefined' && view instanceof Person.Record )
			this.view = new Popover.Views.PersonPreview({model: view});
		
		else if( view instanceof Backbone.Model )
			this.view = new Popover.Views.ModelPreview({model: view});

		// if no custom view was determined, then just use the Backbone.View that was given
	},
	
	render: function(){
		this.view.render(); // tell the inner view to render itself
		this.$el.append( this.view.el );
	},
	
	stopPropagation: function(e){
		e.stopPropagation();
		e.stopImmediatePropagation(); // note: this is jQuery thing I think, so probably don't need this...
	},
	
	// toggle open and close
	toggle: function(e){
	
		if(this.isOpen !== true)
			this.open(e);
		else
			this.close(e);	
	},
	
	open: function(e){
		window.dropdown = this;
		clearTimeout(this.closeTimeout);
		clearTimeout(this.deferCloseTimeout)
		
		if( e && e.stopPropagation )
			e.stopPropagation();
		
		if(this.isOpen) return; // don't do anything if we are already open
		
		this._bindEvents();

		this.isOpen = true;
		this.options.renderTo.addClass('dropdown-open')
		this.$el.addClass('open');
		this.trigger('dropdown:opened');
		this.view.trigger('dropdown:opened'); // tell the inner view we've opened
		
		this.adjustPosition();
	},
	
	close: function(e){
	
		if(!this.isOpen || (e && e.cancelBubble)) return; // don't do anything if we are already closed
	
		this._unbindEvents();

		this.isOpen = false;
		this.options.renderTo.removeClass('dropdown-open')
		this.$el.removeClass('open');
		this.trigger('dropdown:closed');
		this.view.trigger('dropdown:closed'); // tell the inner view we've closed
		
		if( this.options.trigger === 'none' ){
			this.options.renderTo.removeClass('has-dropdown')
			_.defer(this.remove.bind(this))
		}

		if( this.options.onClose )
			this.options.onClose()
		
		if( e && e.stopPropagation )
			e.stopPropagation();
	},
	
	_onKeyup: function(e){
		if( !this.isOpen ) return;

		if( this.options.closeOnEsc && e.which == 27){
			this.deferClose(e);
			e.stopPropagation();
		}else if( this.options.actionOnEnter && e.which == 13){
			this.actionOnEnter(e);
			e.stopPropagation();
		}
	},

	actionOnEnter: function(e){
		if( this.view.actionOnEnter )
			this.view.actionOnEnter(e); // view must have an "actionOnEnter" method for this to work
	},
	
	_deferClose: function(e){
		this.deferCloseTimeout = setTimeout(this.close.bind(this, e), 0);
	},
	
	_stopDeferClose: function(e){
		clearTimeout(this.deferCloseTimeout)
	},
	
	adjustPosition: function(){
		
		var align = this.options.align;
		
		if(align === 'left' || align === 'right')
			this.alignVerticalMiddle();
			
		else if(align === 'top' || align === 'bottom')
			this.alignHorizontalMiddle();
		
		else if(align === 'auto')
			this.autoAlign();
			
		else
			this.autoCenter();
			
		if( this.options.alignVerticalToParent ){
			this.el.style.top = this.options.renderTo[0].offsetTop;
			
			if( align == 'auto' ){
				this.el.style.top = this.options.renderTo[0].offsetTop 
									+ this.options.renderTo[0].offsetHeight
									- this.options.renderTo[0].parentElement.scrollTop;
			}
			else if( align == 'rightBottom'
					|| this.options.align == 'leftBottom' ){
				this.el.style.top = this.options.renderTo[0].offsetTop 
									- this.options.renderTo[0].parentElement.scrollTop;
			}
		}
		
		// WIP
		if( this.options.moveToBody ){
			var f = this.el.getBoundingClientRect();
			document.body.appendChild(this.el);
			this.el.style.position = 'absolute';
			this.el.style.zIndex = 10000;
			this.el.style.left = f.left;
			this.el.style.top = f.top;
		}
		
		// this logic is flawed, but better than nothing for now
		if( this.isCovered() ){
			
			if( align == 'top' ) this._switchAlignment('top', 'bottom')
			else if( align == 'topRight' ) this._switchAlignment('topRight', 'bottomRight')
			else if( align == 'topLeft' ) this._switchAlignment('topLeft', 'bottomLeft')
			
			else if( align == 'bottom' ) this._switchAlignment('bottom', 'top')
			else if( align == 'bottomRight' ) this._switchAlignment('bottomRight', 'topRight')
			else if( align == 'bottomLeft' ) this._switchAlignment('bottomLeft', 'topLeft')
			
		}
		
		
	},
	
	_switchAlignment: function(before, after){
		this.el.classList.remove('align-'+before)
		this.el.classList.add('align-'+after)
	},
	
	// is the dropdown covered by another element?
	isCovered: function(){
		var f = this.el.getBoundingClientRect();
		var onTopEl;
		
		switch(this.options.align){
			case 'top': onTopEl = document.elementFromPoint(f.left+(f.width/2), f.top+5); break;
			case 'topRight': onTopEl = document.elementFromPoint(f.right-5, f.top+5); break;
			case 'topLeft': onTopEl = document.elementFromPoint(f.left+5, f.top+5); break;
			
			case 'bottom': onTopEl = document.elementFromPoint(f.left+(f.width/2), f.bottom-5); break;
			case 'bottomRight': onTopEl = document.elementFromPoint(f.right-5, f.bottom-5); break;
			case 'bottomLeft': onTopEl = document.elementFromPoint(f.left+5, f.bottom-5); break;
		}
		
		return onTopEl !== this.el && !this.el.contains(onTopEl)
	},
	
	alignVerticalMiddle: function(){
		
		var h = this.$el.outerHeight();
		
		this.$el.css({
			top: '50%',
			marginTop: '-'+(h/2)+'px'
		});
		
	},
	
	alignHorizontalMiddle: function(){
		
		var w = this.$el.outerWidth();
		
		this.$el.css({
			left: '50%',
			marginLeft: '-'+(w/2)+'px'
		});
		
	},
	
	autoAlign: function(){
	
		if( this.align )
			this.$el.removeClass( 'align-'+this.align );
		
		var right = this.rightDist();
		var bottom = this.bottomDist();
		
		var align = 'bottomRight';
		
		if( right < 0 && bottom < 0 )
			align = 'topLeft'
		
		else if( right < 0 )
			align = 'bottomLeft'
		
		else if( bottom < 0 )
			align = 'topRight'
		
		this.align = align;
		
		this.$el.addClass('align-'+align)
		
		this.autoCenter();
		
	},
	
	rightDist: function(){
		return window.innerWidth - this.el.getBoundingClientRect().right;
	},
	
	bottomDist: function(){
		return window.innerHeight - this.el.getBoundingClientRect().bottom;
	},
	
	// centers dropdown to renderTo el with the arrow as the center point
	autoCenter: function(){
	
		if( this.options.autoCenter !== true ) return;
	
		adjustToCenterArrow = -8 + (this.options.renderTo.outerWidth()/2) - (this.arrowW/2) + 'px'
		
		this.el.style.removeProperty('left')
		this.el.style.removeProperty('right')
		
		if( /Left$/.test(this.align) )
			this.$el.css('right', adjustToCenterArrow)
		else
			this.$el.css('left', adjustToCenterArrow)
	}
	
})



var DropdownTextView = Backbone.View.extend({

	className: 'dropdown-text-view standard-text',
	
	initialize: function(){
		this.doRender();
	},

	render: function(){

		// if the view given was a function, call that function on each render for dynamic content
		if( this.options.viewFn ){
			this.options.html = this.options.viewFn(this, this.options);
			this.doRender();
		}
	},

	doRender: function(){
		var html = this.options.html;
	
		if( !(html instanceof jQuery ) && !/^</.test(html) )
			html = '<p>'+html+'</p>';
	
		this.$el.html( html );
	}
})



var DropdownMenuView = Backbone.View.extend({

	tagName: 'div',
	
	className: 'dropdown-menu-view no-selection',

	context: function(){
		return this.options.context || this;
	},
	
	initialize: function(menu, opts){
		
		this.menu = menu;
		
		this.options = _.extend({
		
			collection: null,	// used to render the menu
			autoFetch: false,	// will fetch the collection and then render the menu
			noResultsMsg: 'No Results',
			selected: null,			// set to value of one of the menu items and it will be selected
			search: true,			// turns search on if more values than threshold
			searchMinScore: .7,
			searchThreshold: 20,
			closeOnClick: true
			
		}, opts || {});	

		if( this.options.collection && _.isFunction(this.options.collection) )
			this.options.collection = this.options.collection.call(this.context())

		if( this.options.viewFn )
			this.menu = this.options.viewFn(this, this.options);
		
		this.$el.addClass('theme-'+this.options.theme)
		
		this.$ul = $('<ul class="dropdown-menu-view"></ul>').appendTo(this.$el);
		
		this.toggleSearch();

		this.addItems();
	},
	
	render: function(){

		if( this.options.collection && this.options.autoFetch ){

			//var coll = _.isFunction(this.options.collection) ? this.options.collection.call(this.context()) : this.options.collection;
			var coll = this.options.collection;
			
			if( coll.length == 0)
				this.$ul.html('<p style="padding: 10px; word-break: normal;">Loading...</p>')
			else
				this._render();
			
			//if( coll.length == 0) // might want to remove this later (when caching is in place)
				coll.fetch({update: true, success: this._render.bind(this)})
		
		}else{
			this._render();
		}
		
	},

	_render: function(){

		if( this.options.viewFn ){
			this.menu = this.options.viewFn(this, this.options);

			if( !_.isArray(this.menu) ){
				
				if( this.menu )
					this.options.noResultsMsg = this.menu;

				this.menu = [];
			}

			this.toggleSearch();
			this.addItems();
		}

		this.delegateEvents();
		setTimeout(this.focus.bind(this),200);
		return this;

	},

	toggleSearch: function(){
		if( this.options.search != false && this.menu.length > this.options.searchThreshold ){
			if( !this.$searchView ){
				this.$searchView = $('<div class="search-bar"></div>')
					.prependTo(this.$el)
					.append( this.$search = $('<input type="text" class="search" placeholder="Filter...">').on('keyup', this.onSearch.bind(this)) )
			}
		}
		else if( this.$searchView ){
			this.$searchView.remove();
			this.$searchView = null;
		}
	},
	
	onSearch: function(e){
		this.term = e.currentTarget.value;
		this.addItems();
	},
	
	focus: function(){
		if(this.$search) this.$search.focus();
	},
	
	addItems: function(){
		this.$ul.html('');

		if( this.menu && this.menu.length > 0)
			_.each(this.menu, this.addItem, this);
		else
			this.$ul.html('<p style="padding: 10px; word-break: normal;">'+this.options.noResultsMsg+'</p>')
	},
	
	addItem: function(item){
	
		var $el = this.$ul ? this.$ul : this.$el;
	
		if( item && (item === 'divider' || item.divider) && !this.term )
			return this.addDivider(item);
		
		if( _.isString(item) )
			item = {
				label: item,
				val: item
			}
			
		if( this.term && _.score(item.label||'', this.term) < this.options.searchMinScore)
			return;
		
		item = _.extend({
			label: 'No Label',
			description: '',
			title: '',
			className: '',
			dataAttrs: null,	// key/value object to be set as html5 data attributes
			permission: false // dont need permission... add "key" to limit (see User.can())
		},item)
		
		// user doesn't have permission to click this menu
		if( item.permission && !Dropdown.permission(item.permission) )
			return;
		
		var className = item.className;
		var iconClassName = item.icon ? 'icon-'+item.icon : '';

		if( this.options.theme == 'select' )
			iconClassName += ' icon-plus';

		var selected = this.options.selected; selected =_.isFunction(selected) ? selected.call(this.context()) : selected;

		if( item.selected === true
		|| (selected !== null
		&& selected !== undefined
		&& (selected == item.val ||  (_.isArray(selected) &&_.contains(selected, item.val)))) )
			className += 'selected';
		
		var $li = $('<li data-val="'+item.val+'" class="'+className+'" title="'+item.title+'">\
						<span class="'+iconClassName+'">'+item.label+'\
						<span class="description">'+item.description+'</span>'+
						(item.options?'<span class="options badge gray-50 icon-only icon-dot-3"></span>':'')
						+'</span>\
					</li>').appendTo($el);


		if( item.options ){
			item.options.renderTo = $li.find('.options');
			item.options.align = item.options.align || 'bottomLeft';
			item.options.w = item.options.w || 120;
			item.options.context = item.options.context || this.context();
			new Dropdown(item.options);
		}
		
		if( item.dataAttrs )
			_.each(item.dataAttrs, function(val, key){
				$li.attr('data-'+key, val);
			})
			
		if(item.border)
			$li.css('border-right', 'solid 4px '+this.borderColor(item.border));
		
		if( item.input )
			item.dropdown = {
				view: new DropdownMenuInputSelectView({
					//onClick: item.onClick || this.options.onClick,
					onClick: this._determineOnClickMethod(item),
					item: item,
					parent: this.options
				}),
				w: item.input.w || 120,
				align: item.input.align || 'rightBottom'
			}
		else if( (item.onClick || this.options.onClick) && !item.dropdown )
		$li.click(_.bind(function(){
			
			if(item.onClick === 'trigger'){ // this onClick is deprecated (haven't used it for a while and dont think its useful anymore)
				this.trigger('click', item, $li);

			}else{

				var fn = this._determineOnClickMethod(item);

				if( fn )
					fn(item, $li, this.options.opts)	
			}
			
			if( this.options.closeOnClick && item.closeOnClick !== false )
				this.trigger('dropdown:close')
			else
				this.render();	 
			
		},this));
		
		
		if( item.dropdown && item.dropdown.view){
			item.dropdown.alignVerticalToParent = true;
			item.dropdown.context = item.dropdown.context || this.context();
			$li.dropdown(item.dropdown.view, item.dropdown);
		}
		
		if( item.uploader ){
			item.uploader.button = $li;
			$li.css('position','relative');
			item.uploader.obj = new Uploader(item.uploader);
		}
		
	},
	
	addDivider: function(item){
		
		var $el = this.$ul ? this.$ul : this.$el;
		
		if( item.divider )
			$('<li class="label-divider clear">'+item.divider+'</li>').appendTo($el);
		else
			$('<li class="divider clear"></li>').appendTo($el);
	},
	
	borderColor: function(color){
		switch(color){
			case 'gray': return '#ccc'; break;
			case 'blue': return '#2981E4'; break;
			case 'red': return '#b94a48'; break;
			case 'yellow': return '#f0cb37'; break;
			case 'green': return '#468847'; break;
			default: return color; break
			
		}
	},

	// could leverage `_.determineFn()` but then it would be a dependency
	_determineOnClickMethod: function(item){

		var fn = item.onClick || this.options.onClick;
		var ctx = this.context();

		// look for function name on the context
		if( _.isString(fn) ){

			if( !ctx ){
				console.error('Could not bind onClick “'+fn+'”; please provide a context')
				fn = null;

			}else if( ctx[fn] && _.isFunction(ctx[fn]) ){
				fn = ctx[fn].bind(ctx);
			
			}else{
				console.error('Method “'+fn+'” does not exist on context:', ctx)
				fn = null;
			}

		}else if( fn && _.isFunction(fn) ){
			fn = fn.bind(ctx)

		}else{
			fn = null;
		}

		return fn;
	},
	
})

var DropdownMenuInputSelectView = Backbone.View.extend({

	className: 'date-selector padded',

	events: {
		'click .btn': 'submitVal',
		'keypress input': 'onKeyPress'
	},

	format: {
		'string': {
			'placeholder': '',
			'pattern': '.*'
		},
		'integer': {
			'placeholder': '',
			'pattern': '^[0-9]*$'
		},
		'float': {
			'placeholder': '',
			'pattern': '^[0-9\.]*$'
		},
		'date': {
			'placeholder': 'YYYY-MM-DD',
			'pattern': '^[0-9]{4}-[0-1]?[0-9]{1}-[0-9]{1,2}$'
		},
		'month': {
			'placeholder': 'YYYY-MM',
			'pattern': '^[0-9]{4}-[0-1]?[0-9]{1}$',
		},
		'year': {
			'placeholder': 'YYYY',
			'pattern': '^[0-9]{4}$'
		}
	},

	initialize: function(){
		
		this.opts = _.extend({

			title: '',
			footer: '',
			val: '',
			placeholder: '',
			format: 'date', // month, year
			range: false,
			btn: false		// "select" button

		}, this.options.item.input)
	},

	render: function(){
		
		this.$el.html('');

		var format = this.format[this.opts.format];
		var placeholder = this.opts.placeholder || format.placeholder;

		if( this.opts.title )
			this.$el.append('<label class="dropdown-input-title">'+this.opts.title+'</label>')

		var val1 = this.opts.val;
		var val2 = '';

		if( this.opts.range && _.isArray(this.opts.val) && this.opts.val.length == 2){
			val1 = this.opts.val[0]
			val2 = this.opts.val[1]
		}

		this.$input = $('<input type="text" style="width: 100%;" placeholder="'+placeholder+'" value="'+val1+'">').appendTo(this.$el)

		if( this.opts.range == true )
			this.$input2 = $('<input type="text" style="width: 100%;" placeholder="'+placeholder+'" value="'+val2+'">').appendTo(this.$el)

		setTimeout(this.focus.bind(this), 200)

		if( this.opts.footer )
			this.$el.append('<div class="dropdown-input-footer">'+this.opts.footer+'</div>')

		if( this.opts.btn )
			this.$el.append('<p class="label-divider footer clear clearfix"><a class="right btn primary">'
									+(typeof this.opts.btn == 'string' ? this.opts.btn : 'Select')+'</a></p>')
	},

	focus: function(){
		this.$input.focus();
	},

	onKeyPress: function(e){
		if( e.which == 13 ) // on enter
			this.submitVal(); 
	},

	submitVal: function(){
		
		var pattern = new RegExp(this.format[this.opts.format].pattern)
		var val = this.$input.val();

		// make sure user inputed a month
		if( !pattern.test(val) )
			return this.$input.bounce();

		if( this.opts.range == true ){
			var val2 = this.$input2.val();

			if( !pattern.test(val2) )
				return this.$input2.bounce();
		}

		if( val2 )
			this.options.item.val = [val, val2]; // set this so the value will be used
		else
			this.options.item.val = val; // set this so the value will be used
		
		this.options.onClick(this.options.item)
	}
})


/*
	Override this to fit your application
*/
Dropdown.permission = function(permission){
	return User.can(permission);
}



var Popover = {
	Views: {}
}



Popover.Views.ModelPreview = Backbone.View.extend({
	
	className: 'model-preview',
	
	render: function(){
		if( this.template )
			this.$el.html( _.template(this.template, this.model.templateData()) )
		else
			this.$el.html( this.printObject() )
			
		
		if( this.finishRender )
			this.finishRender();
	},
	
	printObject: function(){
		var obj = this.model.templateData()
		var output = '';
		for (property in obj) {
		  output += '<b>'+property + ':</b> ' + obj[property]+'; <br>';
		}
		return output;
	}
	
})

// !! DEPRECATED - see BSA.Views.BookOverview
Popover.Views.BookPreview = Popover.Views.ModelPreview.extend({

	className: 'model-preview book-preview',

	template: $('#popover-book-preview').html(),
	
	events: {
		'click .related-books': 'relatedBooks',
		'click a[href]': 'goToLink'
	},
	
	render: function(){
	
		if( this.model.get('is_approved') == null ){
			this.model.fetch({success: this.render.bind(this)});
			return;
		}
	
		this.$el.html( _.template(this.template, this.model.templateData()) )
		
		// render products if we have them already
		if( this.model.get('products').length > 0)
			this.renderProducts();
			
		// fetch products from DB
		this.model.get('products').fetch({success: this.renderProducts.bind(this)});
	},
	
	renderProducts: function(){
		
		var id = this.model.id,
			products = this.model.get('products').active(),
			$div = this.$('.products');
		
		$div.html('<p class="label-divider">'+(_.plural('[num] Product{s}', products.length))+' <a href="/book/'+id+'/products" class="right">edit</a></p>');
		
		_.each(products, function(p){
			
			var label = p.get('label'),
				isbn = p.get('isbn_13') || '';
			
			$('<p class="product divider dashed"><span class="p-label">'+label+'</span> <span class="cursive right isbn">'+isbn+'</span></p>')
				.appendTo($div)
				.find('.p-label').popover(p.quickView(), {w: 185, align: 'rightTop'})
			
			
		})
	},
	
	relatedBooks: function(event){
		this.model.relatedBooks();
	},
	
	goToLink: function(e){
		_.goToLink(e);
	}

});

Popover.Views.PersonPreview = Popover.Views.ModelPreview.extend({

});




/*
	jQuery Plugin
*/
$.fn.dropdown = function( view, opts ) {  

	opts = opts || {};

	return this.each(function() {
		
		$(this).data('dropdown', new Dropdown(_.extend({renderTo: $(this), view:view}, opts)) );
	
	});

};


$.fn.dropdownOpen = function() {  
	var $el = $(this);
	return $el.data('dropdown') && $el.data('dropdown').isOpen;
};



/*
	Popover is just a dropdown with some defaults
*/
$.fn.popover = function( view, opts ) {  

	opts = _.extend({
		
		trigger: 'delay',
		align: 'auto',
		w: 440
		
	}, opts || {});

	return this.dropdown(view, opts)

};


/*
	Book Preview Popover - deprecated (just send book model to `popover`)
*/
$.fn.bookPreviewPopover = function( idOrModel, opts ) {  

	opts = opts || {};

	var model = null;
	
	// were we given a Book.Record model?
	if( idOrModel instanceof Book.Record )
		model = idOrModel;
		
	// were we just given a model (still has book info, but not actually a Book.Record)...then find the Book.Record
	else if( idOrModel instanceof Backbone.Model && idOrModel.id )
		model = Book.Record.findOrCreate({id:idOrModel.id});
	
	// or was it an ID (number) that we were given?
	else if( _.isNumber(parseInt(idOrModel)) )
		model = Book.Record.findOrCreate({id:idOrModel});
	
	// if no model found, throw error and stop
	if( !model )
		return console.error('!! $.bookPreviewPopover: could not resolve “idOrModel” to a Book.Record: ', idOrModel)

	return this.popover(model, opts)

};



/*
	Person Preview Popover
*/
$.fn.personPreviewPopover = function( idOrModel, opts ) {  

	opts = opts || {};

	var model = null;
	
	// were we given a Person.Record model?
	if( idOrModel instanceof Person.Record )
		model = idOrModel;
		
	// were we just given a model (still has book info, but not actually a Person.Record)...then find the Person.Record
	else if( idOrModel instanceof Backbone.Model && idOrModel.id )
		model = Person.Record.findOrCreate({id:idOrModel.id});
	
	// or was it an ID (number) that we were given?
	else if( _.isNumber(parseInt(idOrModel)) )
		model = Person.Record.findOrCreate({id:idOrModel});
	
	// if no model found, throw error and stop
	if( !model )
		return console.error('!! $.personPreviewPopover: could not resolve “idOrModel” to a Person.Record: ', idOrModel)

	return this.popover(model, opts)

};

	

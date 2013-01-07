/*
	Dropdown view
	
	creates a dropdown on a specified element and 
	renders whatever backbone view was given
	
	ex:
		new Dropdown({
			renderTo: $btn,							// when this el is clicked
			view: new MyBackboneDropdownView()		// dropdown will appear and this view will be rendered inside (you can also use a string of HTML)
		});
		
	
	@author Kevin Jantzer, Blackstone Audio
	@since 2012-12-14
*/

var Dropdown = Backbone.View.extend({

	tagName: 'div',
	
	className: 'dropdown',
	
	defaultOpts: {
		w: 200,
		align: 'bottomRight',	// bottomLeft, bottom, bottomRight, etc
		style: 'default',		// toolbar
		closeOn: 'body',		// body, el
		view: null 				// backbone view to be rendered
	},
	
	defaultEvents: {
		'click': 'stopPropagation'
	},
	
	initialize: function(opts){
		
		this.options = _.extend({}, this.defaultOpts, opts);
		this.events = _.extend({}, this.defaultEvents, this.events||{});
		
		// setup dropdown states
		this.isOpen = false;
		
		
		// check for required parameters
		if( !this.options.renderTo){
			console.error('Dropdown.js: You need to specify an element to "renderTo"');
			return false;
		}else if( !this.options.view ){
			console.error('Dropdown.js: You don’t have a view to load in the dropdown');
			return false;
		}
		
		
		// close
		if(this.options.closeOn == 'body')
			$('html').click(_.bind(this.close, this));
			
		this.options.renderTo.click(_.bind(this.toggle, this));
		
		this.setup()
	
		// when the dropdown is opened, render the view
		this.on('dropdown:opened', this.render, this);
	
		// listen for the view telling us to close
		this.view.on('dropdown:close', this.close, this);
		
	},
	
	setup: function(){
	
		// add the dropdown to the DOM, set styles
		this.$el.appendTo(this.options.renderTo);
		this.$el.width(this.options.w+'px');
		this.$el.addClass('align-'+this.options.align)
		this.$el.addClass('style-'+this.options.style)
		
		
		// append the inner view to the dropdown
		this.view = this.options.view;
		
		// if the given view is a string, then load that string with a "default dropdown view"
		if(_.isString(this.view))
			this.view = new DropdownTextView(this.view);
		else if(_.isArray(this.view))
			this.view = new DropdownMenuView(this.view);
		
		this.$el.append( this.view.el );
		
	},
	
	render: function(){
		// tell the inner view to render itself
		this.view.render();
	},
	
	stopPropagation: function(e){
		e.stopPropagation();
	},
	
	// toggle open and close
	toggle: function(e){
	
		if(this.isOpen !== true)
			this.open(e);
		else
			this.close(e);
			
	},
	
	open: function(e){
		
		if(e) e.stopPropagation();
	
		if(this.isOpen) return; // don't do anything if we are already open
	
		this.isOpen = true;
		this.$el.addClass('open');
		this.trigger('dropdown:opened');
		this.view.trigger('dropdown:opened'); // tell the inner view we've opened
		
		this.adjustPosition();
	},
	
	close: function(e){
	
		if(!this.isOpen) return; // don't do anything if we are already closed
	
		this.isOpen = false;
		this.$el.removeClass('open');
		this.trigger('dropdown:closed');
		this.view.trigger('dropdown:closed'); // tell the inner view we've closed
	},
	
	adjustPosition: function(){
		
		if(this.options.align === 'left' || this.options.align === 'right')
			this.alignVerticalMiddle();
			
		else if(this.options.align === 'top' || this.options.align === 'bottom')
			this.alignHorizontalMiddle();
		
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
		
	}
	
})


var DropdownTextView = Backbone.View.extend({

	className: 'dropdown-text-view',
	
	initialize: function(html){
	
		if( !/^</.test(html) )
			html = '<p>'+html+'</p>';
	
		this.$el.html( html );
	}
})


var DropdownMenuView = Backbone.View.extend({

	tagName: 'ul',
	
	className: 'dropdown-menu-view',
	
	initialize: function(menu){
		
		_.each(menu, this.addItem, this);
		
	},
	
	addItem: function(item){
		
		item = _.extend({
			label: 'No Label'
		},item)
		
		var $li = $('<li>'+item.label+'</li>').appendTo(this.$el);
		
		if(item.icon)
			$li.addClass('icon-'+item.icon);
		
		if(item.onClick)
			$li.click(_.bind(function(){
				
				item.onClick();
				
				this.trigger('dropdown:close')
				
			},this));
		
	}
	
})




/*
	jQuery Plugin
*/
$.fn.dropdown = function( view, opts ) {  

	opts = opts || {};

	return this.each(function() {
		
		new Dropdown(_.extend({renderTo: $(this), view:view}, opts));
	
	});

};
	

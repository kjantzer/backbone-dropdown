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
    `Dropdown.permission = function(permission){return true}`


    @author Kevin Jantzer, Blackstone Audio
    @since 2012-12-14

    https://github.com/kjantzer/backbonejs-dropdown-view

*/

const Backbone = require('backbone')
const $ = require('jquery')
const TextView = require('./views/text')
const MenuView = require('./views/menu')
const DropdownMenuInputSelectView = require('./views/input-select')
const DetermineViewMap = new Map()

Backbone.$ = $

DetermineViewMap.set(
    dd=> _.isString(dd.view) || dd.view instanceof jQuery,
    dd=> new TextView(_.extend({}, this.options, {html:dd.view}))
)

DetermineViewMap.set(
    dd=> _.isArray(dd.view),
    dd=> new MenuView(dd.view, dd.options)
)


let Dropdown = Backbone.View.extend({

    tagName: 'div',

    className: 'dropdown',

    arrowW: 10,

    defaultOpts: {
        w: 200,
        align: 'bottomRight',	// bottomLeft, bottom, bottomRight, leftTop, left, leftBottom, etc, also "auto"
        autoCenter: false,		// centers dropdown to renderTo el with the arrow as the center point
        alignVerticalToParent: false,
        adjustIfCovered: true,
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
        hasStyles: false,
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

        this.options.trigger === 'delay'
        
        if( this.options.openOnInit && this.options.trigger === 'delay' )
            this.delayStart()
        else if( this.options.trigger === 'none' || this.options.openOnInit )
            _.defer(this.toggle.bind(this));
                

    },

    remove: function(){
        this.unbindTrigger();

        this.off('dropdown:opened', this.render, this);
        this.view.off('dropdown:close', this.close, this);
        this.view.off('dropdown:open', this.open, this);

        this.options.renderTo.data('dropdown', null);
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
        this.$el.width(_.isNumber(this.options.w)?this.options.w+'px':this.options.w);
        this.$el.addClass('align-'+this.options.align)
        this.$el.addClass('style-'+this.options.style)
        this.$el.addClass('theme-'+this.options.theme)

        if( this.options.animated )
            this.$el.addClass('animate')

        if(this.options.hasStyles ){
            for(var name in this.options.hasStyles){
                this.el.style[name] = this.options.hasStyles[name];
            }
        }

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

        let createdView = null
        DetermineViewMap.forEach((createFn, testFn)=>{
            
            if( createdView ) return;
            
            if( testFn(this) )
                createdView = createFn(this)
        })
        
        this.view = createdView ? createdView : view
        this.view.dropdown = this
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

        var exit = false;
        if(e && e.path)
            e.path.forEach(function(path){
               if(path.id === 'ui-datepicker-div')
                   exit = true;
            });
        if(exit)
            return;

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

        if( this.options.onClose ){
            if( _.isFunction(this.options.onClose) )
                this.options.onClose();
            else if( _.isString(this.options.onClose) && this.options.context[this.options.onClose] )
                this.options.context[this.options.onClose].call(this.options.context)
        }

        if( e && e.stopPropagation )
            e.stopPropagation();
            
        this.trigger('dropdown:close')
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
            this.el.style.bottom = null;
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
            else if( align == 'rightTop'
                    || this.options.align == 'leftTop' ){
                
                this.el.style.bottom = this.el.parentElement.parentElement.offsetHeight - (this.el.parentElement.offsetTop + this.el.parentElement.offsetHeight)    
                this.el.style.top = 'auto'
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

        // defer to allow other dropdowns to close before checking if covered
        _.defer(this._changeAlignmentIfCovered.bind(this))

    },

    _changeAlignmentIfCovered: function(){
        var align = this.options.align;

        // this logic is flawed, but better than nothing for now
        if( this.options.adjustIfCovered !== false &&  this.isCovered() ){

            if( align == 'top' ) this._switchAlignment('top', 'bottom')
            else if( align == 'topRight' ) this._switchAlignment('topRight', 'bottomRight')
            else if( align == 'topLeft' ) this._switchAlignment('topLeft', 'bottomLeft')

            else if( align == 'bottom' ) this._switchAlignment('bottom', 'top')
            else if( align == 'bottomRight' ) this._switchAlignment('bottomRight', 'topRight')
            else if( align == 'bottomLeft' ) this._switchAlignment('bottomLeft', 'topLeft')
            else if( align == 'rightBottom' ){
                this._switchAlignment('rightBottom', 'rightTop')
                this.el.style.top = null
                // FIXME: this is wrong...
                this.el.style.bottom = this.options.renderTo[0].offsetTop
                                    + this.options.renderTo[0].offsetHeight
                                    - this.options.renderTo[0].parentElement.scrollTop;
            }

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
            case 'rightBottom': onTopEl = document.elementFromPoint(f.right-5, f.bottom-5); break;
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

/*
    Override this to fit your application
*/
Dropdown.permission = function(permission){
    return true
}

/*
    Add to these presets if you want
*/
Dropdown.Presets = {
    DatePicker: {
        'date': {format: 'm/d/y', val: new Date(), w: 190},
        'daterange': {format: 'm/d/y', val: [new Date(), new Date()], range:true, w: 190},
        'month': {format: 'm/y', val: new Date(), valFormat:'YYYY-MM', w: 150},
        'year': {format: 'y', val: new Date(), valFormat:'YYYY', w: 110},
    }
}

Dropdown.addViewType = (testFn, createFn)=>{
    DetermineViewMap.set(testFn, createFn)
}

module.exports = Dropdown
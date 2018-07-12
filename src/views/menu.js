
const Backbone = require('backbone')
const $ = require('jquery')
const MenuDatePickerView = require('./date-picker')
const LiquidMetal = require('liquidmetal')

module.exports = Backbone.View.extend({

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
            
            // TODO: change to hash - search: {threshold:20, ...}
            search: true,			// turns search on if more values than threshold
            searchScore: null,      // function(item, term, minScore, dd){}
            searchMinScore: .7,
            searchThreshold: 20,
            searchPlaceholder: 'Filter...',
            searchNoResultItem: function(dd){return {label: 'No Results for "'+dd.term+'"'}},
            closeOnClick: true

        }, opts || {});

        if( this.options.collection && _.isFunction(this.options.collection) ){
            this.options.collectionFn = this.options.collection; // reference
            this.options.collection = this.options.collection.call(this.context())
        }

        if( this.options.viewFn )
            this.menu = this.options.viewFn(this, this.options);

        this.$el.addClass('theme-'+this.options.theme)

        this.$ul = $('<ul class="dropdown-menu-view"></ul>').appendTo(this.$el);

        this.toggleSearch();

        this.addItems();
    },

    render: function(){

        if( this.options.collection && this.options.autoFetch ){

            if( this.options.collectionFn )
                this.options.collection = this.options.collectionFn.call(this.context())

            //var coll = _.isFunction(this.options.collection) ? this.options.collection.call(this.context()) : this.options.collection;
            var coll = this.options.collection;

            if( coll.length == 0)
                this.$ul.html('<p style="padding: 10px; word-break: normal;">Loading...</p>')
            else
                this._render();

            //if( coll.length == 0) // might want to remove this later (when caching is in place)
                coll.fetch({force: true, update: true, success: this._render.bind(this), error: function(model, xhr){
                    this.options.autoFetchError && this.options.autoFetchError(model, xhr)
                    this._render()
                }.bind(this)})

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
    
    searchVisible: function(){
        return this.options.search != false && this.menu.length > this.options.searchThreshold
    },

    toggleSearch: function(){
        if( this.searchVisible() ){
            if( !this.$searchView ){
                this.$searchView = $('<div class="search-bar"></div>')
                    .prependTo(this.$el)
                    .append( this.$search = $('<input type="text" class="search" placeholder="'+this.options.searchPlaceholder+'">').on('keyup', this.onSearch.bind(this)) )
            }
        }
        else if( this.$searchView ){
            this.$searchView.remove();
            this.$searchView = null;
        }
    },

    onSearch: function(e){
        
        if( e.which == 38 ){ // up
            this._hoverItem(-1)
        }else if( e.which == 40 ){ // down
            this._hoverItem(1)
        }else if(e.which == 13){
            if( this._hoverIndxItem ) _.defer(function(){this._hoverIndxItem.click()}.bind(this))
        }else{
            this.term = e.currentTarget.value;
            this.addItems();
            this._hoverItem(0);
        }
    },
    
    _hoverItem: function(move){
        
        // not set, set initial value now
        if( this._hoverIndx == undefined ) this._hoverIndx = (move>0?-1:0);
        
        if( this._hoverIndxItem ){
            this._hoverIndxItem.removeClass('hover')
            this._hoverIndxItem = null;
        }
        
        if( this._visibleItems.length == 0 ) return;
        
        if( move == 0 ) this._hoverIndx = 0;
        else this._hoverIndx += move;
        
        // to far, loop back
        if( this._hoverIndx >= this._visibleItems.length ) this._hoverIndx = 0;
        else if( this._hoverIndx < 0 ) this._hoverIndx = this._visibleItems.length - 1;
        
        if( this._visibleItems[this._hoverIndx] ){
            this._hoverIndxItem = this._visibleItems[this._hoverIndx];
            this._hoverIndxItem.addClass('hover')
            
            // experiemental but works in all major browsers
            // https://developer.mozilla.org/en-US/docs/Web/API/Element/scrollIntoView
            this._hoverIndxItem[0].scrollIntoView(false)
        }
    },

    focus: function(){
        if(this.$search) this.$search.focus();
    },

    addItems: function(){
        this.$ul.empty();

        if( this.menu && this.menu.length > 0){
            
            this._visibleItems = [];
            var items = _.map(this.menu, this.addItem, this)
            this._visibleItems = _.filter(items, function(val){ return val });
            
            if( this.term ){
                // if searching and no results returned
                if( this._visibleItems.length == 0 && this.options.searchNoResultItem ){
                    var noResultItem = this.options.searchNoResultItem
                    if( _.isFunction(noResultItem) )
                        noResultItem = noResultItem.call(this.context(), this)
                    noResultItem._noResultItem = true;
                    this._visibleItems.push( this.addItem(noResultItem) )
                }
            }
            
        }else{
            this.$ul.html('<p style="padding: 10px; word-break: normal;">'+this.options.noResultsMsg+'</p>')
        }
    },
    
    searchScore: function(item){
        var fn = this.options.searchScore || this._searchScoreDefault
        return fn(item, this.term, this.options.searchMinScore, this)
    },
    
    _searchScoreDefault: function(item, term, minScore, dd){
        return LiquidMetal.score(item.label||'', term) < minScore
    },

    addItem: function(item){

        var $el = this.$ul ? this.$ul : this.$el;

        if( _.isFunction(item) )
            item = item.call(this.context(), this)
            
        if( item && (item === 'divider' || item.divider) && !this.term )
            return this.addDivider(item);

        if( item && item.text && !this.term )
            return this.addText(item)

        if( _.isString(item) )
            item = {
                label: item,
                val: item
            }

        if( this.term && item._noResultItem !== true && this.searchScore(item))
            return false;

        item = _.extend({
            label: 'No Label',
            description: '',
            title: '',
            className: '',
            disabled: false,
            dataAttrs: null,	// key/value object to be set as html5 data attributes
            permission: false // dont need permission... add "key" to limit (see User.can())
        },item)

        // user doesn't have permission to click this menu
        if( item.permission && !Dropdown.permission(item.permission) )
            return false;

        var className = item.className;
        var iconClassName = item.icon ? 'icon-'+item.icon : '';

        if( this.options.theme == 'select' )
            iconClassName += ' icon-plus';

        if( item.disabled == true )
            className += ' disabled';

        var selected = this.options.selected; selected =_.isFunction(selected) ? selected.call(this.context()) : selected;

        if( item.selected === true
        || ( !item.input && !item.datepicker
        && selected !== null
        && selected !== undefined
        && (selected == item.val ||  (_.isArray(selected) &&_.contains(selected, item.val)))) )
            className += ' selected';

        if( item.label.jquery ){
            var $li = $(`<li data-val="${item.val}" class="${className}" title="${item.title}"></li>`)
                        .append(item.label)
                        .appendTo($el)
                        
            if( item.description )
                $li.append('<span class="description">'+item.description+'</span>')
            
        }else{

            var $li = $('<li data-val="'+item.val+'" class="'+className+'" title="'+item.title+'">\
                            <span class="'+iconClassName+'">'+item.label+'\
                            <span class="description">'+item.description+'</span>'+
                            (item.options?'<span class="options badge gray-50 icon-only icon-options"></span>':'')
                            +'</span>\
                        </li>').appendTo($el);
        }
            

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
        else if( item.datepicker ){

            // use a datepicker preset if given
            if( item.datepicker.preset ){
                if( !Dropdown.Presets.DatePicker[item.datepicker.preset])
                    console.warn('Dropdown: `'+item.datepicker.preset+'` is not valid preset in Dropdown.Presets.DatePicker')
                else
                    item.datepicker = _.extend({}, Dropdown.Presets.DatePicker[item.datepicker.preset], item.datepicker)
            }

            item.dropdown = {
                view: new MenuDatePickerView({
                    //onClick: item.onClick || this.options.onClick,
                    onClick: this._determineOnClickMethod(item),
                    item: item,
                    parent: this.options
                }),
                w: item.datepicker.w || 160,
                align: item.datepicker.align || 'rightBottom'
            }
        }
        else if( (item.onClick || this.options.onClick) && item.onClick !== false && !item.dropdown )
        $li.click(_.bind(function(){

            if( item.disabled == true )
                return;

            if(item.onClick === 'trigger'){ // this onClick is deprecated (haven't used it for a while and dont think its useful anymore)
                this.trigger('click', item, $li);

            }else{

                var fn = this._determineOnClickMethod(item);

                if( fn )
                    fn(item, $li, this.options.opts||this.options, this)
                    // TODO: remove `this.options.opts` (left for legacy support)
            }

            if( this.options.closeOnClick && item.closeOnClick !== false )
                this.close()
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
        
        return $li;
    },

    addDivider: function(item){

        var $el = this.$ul ? this.$ul : this.$el;

        if( item.divider )
            $('<li class="label-divider not-menu clear '+(item.className||'')+'">'+item.divider+'</li>').appendTo($el);
        else
            $('<li class="divider not-menu clear"></li>').appendTo($el);
    },

    addText: function(item){

        var $el = this.$ul ? this.$ul : this.$el;
        var className = item.className || ''

        $('<li class="dd-text not-menu clear '+className+'">'+item.text+'</li>').appendTo($el);
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

    close: function(){
        this.trigger('dropdown:close')
    }

})
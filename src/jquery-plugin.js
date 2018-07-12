
const $ = require('jquery')
const Dropdown = require('./dropdown')

let plugins = {
    
    /*
        jQuery Plugin
    */
    dropdown: function( view, opts ) {

        opts = opts || {};

        return this.each(function() {

            $(this).data('dropdown', new Dropdown(_.extend({renderTo: $(this), view:view}, opts)) );

        });

    },

    openDropdown: function( view, opts ) {
        opts = opts || {};
        opts.trigger = 'none' // will open dropdown upon init
        $(this).dropdown(view, opts)
    },

    dropdownOpen: function() {
        var $el = $(this);
        return $el.data('dropdown') && $el.data('dropdown').isOpen;
    },

    hasDropdown: function() {
        var $el = $(this);
        return !!$el.data('dropdown')
    },

    removeDropdown: function() {
        var $el = $(this);
        var dd = $el.data('dropdown')
        if( dd ) dd.close();
        $el.data('dropdown', null);
    },

    /*
        Popover is just a dropdown with some defaults
    */
    popover: function( view, opts ) {

        opts = _.extend({

            trigger: 'delay',
            align: 'auto',
            w: 440

        }, opts || {});

        return this.dropdown(view, opts)
    }
    
}

for( let key in plugins ){
    $.fn[key] = plugins[key]
}

module.exports = plugins
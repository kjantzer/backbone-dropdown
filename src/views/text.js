
const Backbone = require('backbone')
const jQuery = require('jquery')

module.exports = Backbone.View.extend({

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

const Backbone = require('backbone')
const $ = require('jquery')

module.exports = Backbone.View.extend({

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
        'sql-limit': {
            'placeholder': '',
            'pattern': '^[0-9]*(,[0-9]+)?$'
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

        this.$el.empty();

        var format = this.format[this.opts.format];
        var placeholder = this.opts.placeholder || format.placeholder;

        if( this.opts.title )
            this.$el.append('<label class="dropdown-input-title">'+this.opts.title+'</label>')

        var val1 = _.isFunction(this.opts.val) ? this.opts.val(this) : this.opts.val;
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

        var pattern = new RegExp(this.opts.pattern || this.format[this.opts.format].pattern)
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
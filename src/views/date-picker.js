
const Backbone = require('backbone')

module.exports = Backbone.View.extend({

    className: 'dropdown-date-picker padded',

    events: {
        'click .save-date-picker': 'save'
    },

    initialize: function(){
        this.opts = _.extend({
            val: '',
            range: false,
        }, this.options.item.datepicker)
        
        this.listenTo(this, 'dropdown:closed', function(){
            this.date1 && this.date1.blur()
            this.date2 && this.date2.blur()
        }.bind(this))
    },

    render: function(){

        // look for global date picker or requireJS module
        if( !window.DatePicker ){
            this.$el.html('DatePicker plugin missing')
            return this;
        }

        if( !this.date1 )
            if( window.DatePicker )
                this.renderPickers(window.DatePicker)
        else{
            this.date1.reset();
            this.date2 && this.date2.reset()
        }

        return this;
    },

    renderPickers: function(DatePicker){

        this.$el.html('<div class="pickers"></div><a class="btn save-date-picker icon-ok icon-only blue"></a>')
        this.$pickers = this.$('.pickers')

        var val1 = this.opts.val;
        var val2 = '';

        if( this.opts.range && _.isArray(this.opts.val) && this.opts.val.length == 2){
            val1 = this.opts.val[0]
            val2 = this.opts.val[1]
        }

        this.date1 = new DatePicker(_.extend({}, this.opts, {
            val: val1,
            onEnter: function(unit, dp){
                this.save()
            }.bind(this),
            onTab: function(unit, dp, shiftKey){
                if( shiftKey && unit.isFirst() ){
                    this.date2 ? this.date2.activate('last') : dp.activatePrev()
                }else if( !shiftKey && unit.isLast() ){
                    this.date2 ? this.date2.activate('first') : dp.activateNext()
                }else{
                    shiftKey ? dp.activatePrev() : dp.activateNext()
                }
            }.bind(this)
        }))

        this.$pickers.append( this.date1.render().el )

        if( this.opts.range ){

            this.date2 = new DatePicker(_.extend({}, this.opts, {
                val: val2,
                onEnter: function(unit, dp){
                    this.save()
                }.bind(this),
                onTab: function(unit, dp, shiftKey){
                    if( shiftKey && unit.isFirst() ){
                        this.date1 ? this.date1.activate('last') : dp.activatePrev()
                    }else if( !shiftKey && unit.isLast() ){
                        this.date1 ? this.date1.activate('first') : dp.activateNext()
                    }else{
                        shiftKey ? dp.activatePrev() : dp.activateNext()
                    }
                }.bind(this)
            }))

            this.$pickers.append( this.date2.render().el )
        }
        
        setTimeout(function(){
            this.date1.activateNext();
        }.bind(this), 200)

    },

    save: function(){

        if( !this.date1.value() )
            return this.date1.$el.pulse();

        if( this.opts.range && !this.date2.value() )
            return this.date2.$el.pulse();

        if( this.opts.range )
            this.options.item.val = [this.date1.value(), this.date2.value()]
        else
            this.options.item.val = this.date1.value()

        // make sure earlier date is first
        if( this.opts.range && this.options.item.val[0] > this.options.item.val[1] )
            this.options.item.val = [this.options.item.val[1], this.options.item.val[0]]

        this.options.onClick(this.options.item)
    }

})
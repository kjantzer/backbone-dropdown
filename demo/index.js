
window.jQuery = window.$ = require('jquery')
window._ = require('underscore')
window.Backbone = require('backbone')
Backbone.$ = jQuery

window.Dropdown = require('../index')


// Examples: ======================================

document.addEventListener('DOMContentLoaded', function(){
	

let CustomView = Backbone.View.extend({
	
	className: 'custom-view',
	
	events: {
		'click .btn': 'menu'
	},
	
	initialize: function(){
		this.$el.html(`<h4 style="position: relative;">Custom View</h4>
			<p>This is a custom view</p>
			<p><a class="btn blue">Button</a></p>`)
	},
	
	menu(e){
		$(e.currentTarget).openDropdown('A dropdown inside of the custom view', {
			align: 'bottom',
			theme: 'dark'
		})
	}

});

let customView = new CustomView()


$('#header-demo').dropdown([{
	label:'Edit',
	icon: 'pencil',
	options: {
		view: [{
			label: 'Option'
		}]
	},
	onClick(){
		alert('You clicked "edit"')
	}
},{
	label:'Lots of rows',
	icon: 'tasks',
	dropdown: {
		view: function(){
			let menu = []
			for (var i =65; i < 91; i++){
				let char = String.fromCharCode(i)
				menu.push({
					label: 'Row '+char,
					description: 'Character code num: '+i,
					val: char
				})
			}
			return menu
		},
		onClick(item){
			alert('You selected '+item.val)
		},
		w: 200,
		align: 'rightBottom',
	}
},{
	label:'Options',
	icon: 'cog',
	dropdown: {
		view: [
			{divider: 'Option Header'},
			'Option 1',
			'Option 2', {text: 'Dropdown can render Backbone views, jQuery objects or text and menus can be made from arrays'},],
		w: 200,
		selected: 'Option 1',
		align: 'rightBottom',
	}
},{
	label: 'Custom View',
	icon: 'window',
	description: 'Show backbone view',
	dropdown: {
		view: customView,
		w: 300,
		align: 'rightBottom',
	}
},'divider',{
	label:'Delete',
	icon: 'trash'
}], {
	w:200,
	align: 'bottom',
})

}) // dom ready
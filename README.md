#Dropdown Backbone View

Easily create dropdown (or popover) views for menus, inline editing, or just a simple tooltip. Has support for many locations (bottomLeft, bottom, bottomRight; on all sides)

![preview](http://cl.ly/image/0B1a3p3j2416/backbonejs-dropdown-view-preview.png)

### Requires
- LESS
- Elements.less
- [Underscore.String.js](https://github.com/epeli/underscore.string)

Use
---
#### Normal

    new Dropdown({
      renderTo: $('.some-el'),
    	view: new MyBackBoneView()
    })

#### Change defaults

    new Dropdown({
    	renderTo: $('.some-el'),
    	view: new MyBackBoneView(),
    	w: 300, // default width is 200px
    	align: 'top' // default is bottomRight,
    	closeOn: 'el' // only close when clicking "renderTo" el
    })
    
#### Simple Tooltip

    new Dropdown({
    	renderTo: $('.some-el'),
    	view: 'I‘m a simple tooltip'
    })
    
#### jQuery Plugin

    $('.selector').dropdown('I‘m a tooltip');
    
    $('.selector').dropdown('I‘m a tooltip on top', {align:'top'});
    
    $('.selector').dropdown( (new Backbone.View()) );
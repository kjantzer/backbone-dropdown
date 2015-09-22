# Backbone Dropdown

> Easily create dropdown views for menus, inline editing, or just a simple tooltip.

[![Preview](http://i.imgur.com/V7jaCWZ.png)](http://kjantzer.github.io/backbone-dropdown/)

### [Demo & Documentation](http://kjantzer.github.io/backbone-dropdown/)

Dropdown is designed to be robust and extensible. It can be used independently or embedded into another plugin such as [List Controller](https://github.com/kjantzer/backbone-list-controller).

The general idea is to display a view inline with the target element. A `Backbone.View`, `jQuery/HTML String`, or `Array` are all acceptable types of "views". An array will be converted into a DropdownMenuView.

***

### Example Use

```
$('#menu').dropdown([
    { divider: 'My Menu'},
    { label:'Item 1', val: 1 },
    { label:'Item 2', val: 2 },
    { label:'Item 3', val: 3 },
    'divider',
    { label:'Item 4', val: 4 },
], {
    w:120,
    align: 'bottom',
    onClick: function(item){
        console.log(item)
    }
})
```
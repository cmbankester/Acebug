/* See license.txt for terms of usage */

FBL.ns(function() { with (FBL) {


/*Firebug.currentContext.getPanel('net')
//Firebug.getp

//FirebugChrome.getSelectedPanel()

panelBar = Firebug.chrome.$("fbPanelBar1");
panelType = panelBar.selectedTab.panelType;


for(var i=Firebug.panelTypes.length;i--;)
if (Firebug.panelTypes[i].name=='NetPanel') {
var netPanel=Firebug.panelTypes[i]
break
}
netPanel.prototype.setEnabled(true)
//netPanel.prototype.setEnabled(false)


Firebug.TabWatcher.reloadPageFromMemory(Firebug.currentContext)*/

function treeView(table) {
    this.rowCount = table.length;
    this.getCellText  = function(row, col) {return table[row][col.id];};
    this.getCellValue = function(row, col) {return table[row][col.id];};
    this.setTree = function(treebox) {this.treebox = treebox;};
    this.isEditable = function(row, col) {return false;};

    this.isContainer = function(row) {return false;};
    this.isContainerOpen = function(row) {return false;};
    this.isContainerEmpty = function(row) {return true;};
    this.getParentIndex = function(row) { return 0;};
    this.getLevel = function(row) {return 0;};
    this.hasNextSibling = function(row) {return false;};

    this.isSeparator = function(row) {return false;};
    this.isSorted = function() {return false;};
    this.getImageSrc = function(row, col) {return table[row].iconURL}; // return "chrome://global/skin/checkbox/cbox-check.gif"; };
    this.getRowProperties = function(row, props) {
        //var aserv=Components.classes["@mozilla.org/atom-service;1"].getService(Components.interfaces.nsIAtomService);
        //props.AppendElement(aserv.getAtom(table[row].depth));
        //props.AppendElement(aserv.getAtom('a'));
    };
    this.getCellProperties = function(row, col, props) {
        var aserv=Components.classes["@mozilla.org/atom-service;1"].getService(Components.interfaces.nsIAtomService);
        props.AppendElement(aserv.getAtom('d'+table[row].depth));
    };
    this.getColumnProperties = function(colid, col, props) {};
    this.cycleHeader = function(col, elem) {};
}

var enumerateRequests = function(fn) {
    var netPanel = Firebug.currentContext.getPanel('net');
    if (!netPanel.table)
        return;

    var rows = netPanel.table.getElementsByClassName("netRow");
    for (var i=0; i<rows.length; i++) {
        var row = rows[i];
        var pageRow = FBL.hasClass(row, "netPageRow");

        if (FBL.hasClass(row, "collapsed") && !pageRow)
            continue;

        if (FBL.hasClass(row, "history"))
            continue;


        var file = Firebug.getRepObject(row);
        if (file)
            fn(file);
    }
};

function fileIconURL(item) {
	var ext = item.ext
	if (!ext) {
		var spec = item.name || item.href;
		var m = spec.match(/\.(\w*)$/)
		if (m)
			ext = item.ext = m[1]
	}
    if (!ext)       return "moz-icon://" + ".broken" + "?size=16";
    if (ext=='exe') return "moz-icon://" + spec + "?size=16";
    if (ext=='ico') return spec + "?size=16";
    return "moz-icon://" + "." + ext + "?size=16";
}

var  getAllLocations = function() {
    var i, src;
    var document = Firebug.currentContext.window.document;
    var baseURI = document.baseURI.replace(/[\?#].*$/, '');
    var locationList = [{href: document.documentURI, type: 'text', ext: 'html'}];
    var hrefs = [];
    function addLocation(href, type) {
        href = href.trim().replace(/#.*$/, '');
        if (!href || hrefs.indexOf(href)!=-1)
            return;
		dump(href)
        hrefs.push(href);
        locationList.push({href: href, type: type});
    }
    //scripts
    var list = document.documentElement.getElementsByTagName('script');
    for(i = list.length; i--;) {
        src = list[i].getAttribute('src');
        if (src)
            addLocation(src, 'text');
    }
    //images
    list = document.documentElement.getElementsByTagName('img');
    for(i = list.length; i--;) {
        src = list[i].getAttribute('src');
        if (src)
            addLocation(src, 'image');
    }
    //stylesheets
    list = document.styleSheets;
    for (i = list.length; i--;) {
        src = list[i].href;
        if (src)
            addLocation(src, 'text');
        else
            src = baseURI
        var cssRules = list[i].cssRules
        for(var j = cssRules.length; j--;) {
            var match = cssRules[j].cssText.match(/url\("[^"]*"\)/g)
            var k = 0, href
            if (!match)
                continue;
            while(href = match[k++]) {
                href = href.slice(5,-2)
                if (href.indexOf('://')==-1 && href.slice(0, 5) != 'data:')
                    href = FBL.absoluteURL(href, src)
                addLocation(href, 'image')
            }
        }
    }

    // add icons
    for (i = locationList.length; i--;) {
        var item = locationList[i];
        if (item.href.indexOf('://') === -1 && item.href.slice(0, 5) != 'data:')
            item.href = FBL.absoluteURL(item.href, baseURI);
       /* var match = item.href.match(/\/([^\?\/#]+)(?:\?|#|$)/);
        item.name = match?match[1]:'e  *'+item.href;*/
        item.name = item.href;
		dump(item.iconURL,item.name ,item.ext )
        item.iconURL = fileIconURL(item);
    }
    return locationList;
};

/*a=[]
enumerateRequests(function(x)a.push(x))
a.map(function(a)a.href)
*/
// ************************************************************************************************
// stylesheet panel
Firebug.ResourcePanel = function ResourcePanel() {};

Firebug.ResourcePanel.prototype = extend(Firebug.Panel,
{

    // * * * * * * * * * * * * * * * * * * * * * * * * * * * * * * * * * * * * * * * * * * * * * *
    // extends Panel

    name: "resource",
    title: "Resource",
    parentPanel: null,
    searchable: true,
    order: 190,

    initialize: function()
    {
        this.__defineGetter__('browser', function() {
            return Firebug.chrome.$("fbAceBrowser1-parent");
        });
        this.search = bind(Firebug.Ace.search, this);

        Firebug.Panel.initialize.apply(this, arguments);
    },

    show: function()
    {
        var treePane = this.browser.firstChild;
        treePane.hidden = false;
        treePane.nextSibling.hidden = false;
        this.aceWindow = Firebug.Ace.win1;
        this.editor = this.aceWindow.editor;

        this.tree = treePane.firstChild;
        this.tree.ownerPanel = this;
        this.data = getAllLocations();
        this.tree.view = new treeView(this.data);

        this.tree.ownerPanel = this

        if (this.editor) {
            //this.editor.renderer.onResize(true);
            //this.editor.setReadOnly(true);
            var sel = this.tree.view.selection
            if(sel.currentIndex == this.selectedIndex)
                this.onSelect();
            else
                sel.timedSelect(this.selectedIndex, 0)
        } else {
            this.aceWindow.startAce(bind(function() {
                this.editor = this.aceWindow.editor;
                this.editor.renderer.onResize(true);
                //this.editor.setReadOnly(true);
                this.setSession();
            }, this));
        }
    },

    setSession: function()
    {
        this.onSelect();
    },

    onSelect: function()
    {
        var index = this.tree.view.selection.currentIndex;
        var data = this.data[index], content, href;

        this.selectedIndex = index;

		// location textbox
		this.tree.nextSibling.value = (data && data.href)

        if (!data) {
            this.session = this.aceWindow.createSession('', '');
        } else if (data.type=='image') {
            this.showImage(data);
            return;
        } else if (data.session) {
            this.session = data.session;
        } else if (data) {
            href = data.href;
            dump(href);
            content = Firebug.currentContext.sourceCache.loadText(href);
            this.session = data.session = this.aceWindow.createSession(content || '', href || '');
        }
        var im = this.aceWindow.imageViewer;
        if (im && im.isOpen)
            im.hide();

        this.editor.setSession(this.session);
    },

    showImage: function(data)
    {
        if (!this.aceWindow.imageViewer) {
            var self = this;
            this.aceWindow.require(['fbace/imageViewer'], function() {
                self.aceWindow.imageViewer.showImage(data);
            });
        } else {
            this.aceWindow.imageViewer.showImage(data);
        }
    },

    hide: function()
    {
        var treePane = this.browser.firstChild;
        treePane.hidden = true;
        treePane.nextSibling.hidden = true;

        if (this.aceWindow.imageViewer)
            this.aceWindow.imageViewer.hide();
    },

    showHref: function(href) {
        Firebug.currentContext.sourceCache.loadText(href);
    },
    // context menu
    getContextMenuItems: function(nada, target) {
        if (target.tagName == 'treechildren') {
            
        }
		var view = this.tree.view
        var url = view.getCellText(view.selection.currentIndex,{id:'name'})

        var items = []

        items.push(
            {
                label: $ACESTR("acebug.copy"),
                command: function() {
                    gClipboardHelper.copyString(url);
                },
                disabled: !url
            },{
                label: $ACESTR("acebug.save"),
                command: function() {
                    internalSave(url);
                },
                disabled: !url
            }
        );

        return items;
    },
    // for ace editor
    addContextMenuItems: function(items, editor, editorText){
        return items;
    },

    getSourceLink: function(target, object) {
        var env = target.ownerDocument.defaultView.wrappedJSObject;
        var session = env.editor.session;
        if (!session.href)
            return;
        var cursor = Firebug.Ace.win1.editor.session.selection.selectionLead;
        var link = new FBL.SourceLink(session.href, cursor.row);
        link.column = cursor.column;
        return link;
    },

    getPopupObject: function(target) {
        return null;
    },

    getTooltipObject: function(target) {
        return null;
    },

});

var gClipboardHelper = Firebug.Ace.gClipboardHelper
// ************************************************************************************************

Firebug.registerPanel(Firebug.ResourcePanel);

// ************************************************************************************************

}});

/**
 * CircleManagementInjection Content Script.
 *
 * @author Mohamed Mansour 2011 (http://mohamedmansour.com)
 * @constructor
 */
CircleManagementInjection = function() {
  this.INJECTED_CLASSNAME = 'crx-circle-management-injection';
  this.circleModule = new CircleFilterModule(this);
  this.circleUI = new CircleUserInterfaceInjection();
};

/**
 * Initialize the events that will be listening within this DOM.
 */
CircleManagementInjection.prototype.init = function() {
  this.circleUI.init();
  document.body.addEventListener('DOMNodeInserted', this.onGooglePlusContentModified.bind(this), false);
};

/**
 * Render the "Share on ..." Link on each post.
 */
CircleManagementInjection.prototype.onGooglePlusContentModified = function(e) {
  var currentNode = e.target;
  if (currentNode.nodeType == Node.ELEMENT_NODE && currentNode.className != '' &&
      !currentNode.classList.contains(this.INJECTED_CLASSNAME)) {
    this.circleModule.process(currentNode);
    //this.findShareDialog(currentNode);
  }
};

CircleManagementInjection.prototype.findShareDialog = function(currentNode) {
  var shareDialog = currentNode.querySelector('div[role="dialog"] > div > span');
  if (!shareDialog) {
    return false;
  }
  console.log('Share Dialog');
  currentNode.classList.add(this.INJECTED_CLASSNAME);
};

//
// =============================================================================
//

/**
 *
 * @constructor
 */
CircleUserInterfaceInjection = function() {
  this.iframe = document.createElement('iframe');
  this.iframe.src = chrome.extension.getURL('management.html');
  this.iframe.width = '100%';
  this.iframe.height = '100%';
  this.iframe.frameborder = '0';
  this.iframe.style.border = 'none'
  this.circleManagementTextDOM = null;
  this.circleSelected = false;
};

/**
 *
 */
CircleUserInterfaceInjection.prototype.init = function() {
  var navigationDOM = document.querySelector('div[role="navigation"]');
  if (navigationDOM) {
    var circleDOM = navigationDOM.querySelector('a[aria-label="Circles"]');
    if (circleDOM) {
      var circleManagementDOM = circleDOM.cloneNode(true);
      circleManagementDOM.setAttribute('aria-label', 'Circles');
      circleManagementDOM.setAttribute('href', '#');
      circleManagementDOM.id = 'circleDOM';
      this.circleManagementTextDOM = circleManagementDOM.childNodes[0];
      this.circleManagementTextDOM.setAttribute('data-tooltip', 'Circles');
      this.circleManagementTextDOM.className = '';
      this.circleManagementTextDOM.setAttribute('style', 'height: 18px; width: 18px; margin-top: 5px; display: inline-block;');
      
      // Add the button listener on the parent which is a bigger frame, but only
      // modify the element inside since that is the background image.
      this.circleManagementTextDOM.style.background = 'no-repeat url(' + chrome.extension.getURL('/img/circle_icon.png') + ') 0 0}';
      circleManagementDOM.onmouseover = function(e) {
        if (!this.circleSelected)
          this.circleManagementTextDOM.style.backgroundPosition = '0 -18px';
      }.bind(this);
      circleManagementDOM.onmouseout = function(e) {
        if (!this.circleSelected)
          this.circleManagementTextDOM.style.backgroundPosition = '0 0';
      }.bind(this);
      
      // Add the circle manager after the circle dom.
      navigationDOM.insertBefore(circleManagementDOM, circleDOM.nextSibling);
      var childNodes = navigationDOM.childNodes;
      for (var i = 0; i < childNodes.length; i++) {
        childNodes[i].addEventListener('click', this.onNavButtonClick_.bind(this), false);
      }
    }
  }
};

/**
 *
 */
CircleUserInterfaceInjection.prototype.onNavButtonClick_ = function(e) {
  var button = e.target.nodeName == 'SPAN' ? e.target.parentNode : e.target;
  var content = document.getElementById('contentPane');
  if (button.id == 'circleDOM') {
    // Set the image to be selected.
    this.circleSelected = true;
    this.circleManagementTextDOM.style.backgroundPosition = '0 -18px';

    // Show the first and last DOM since it is the profile.
    var panes = content.parentNode.childNodes;
    panes[0].style.display = 'none';
    panes[2].style.display = 'none';
    
    // Preserve the width and stretch it to the complete width.
    this.width = content.style.width;
    content.style.width = '100%';
    content.appendChild(this.iframe);
    
    // Hide the child content nodes since we replaced them.
    var childNodes = content.childNodes;
    for (var i = 0; i < childNodes.length; i++) {
      if (i != childNodes.length - 1) {
        childNodes[i].innerHTML = '';
        childNodes[i].setAttribute('style', 'display: none;');
      }
    }
    
    // We don't want to active the link, so we prevent all actions.
    e.preventDefault();
    return false;
  }
  else {
    // Unset the image back to normal since the circle tab is not selected.
    this.circleSelected = false;
    this.circleManagementTextDOM.style.backgroundPosition = '0 0';
    
    // Revert the width back to the previous saved version.
    if (this.width) {
      content.style.width = this.width;
    }
    
    // Clean up the rest of the children since that is how Google does it in
    // their DOM. This immitates a quick transition.
    if (content.contains(this.iframe)) {
      content.removeChild(this.iframe);
    }
    return true;
  }
};

//
// =============================================================================
//

/**
 * Adds some circle filtering as module.
 * @constructor
 */
CircleFilterModule = function(managementInjection) {
  this.FILTER_ITEM_LABEL_MAIN_SELECTOR = 'div[id$=".lbl"]';
  this.parent = managementInjection;
  this.pickListDOM = null;
  this.textFieldDOM = null;
  this.originalModel = null;
  this.filteredModel = [];
  this.circleListSelectedIndex = -1;
};

/**
 * Process the node coming in.
 */
CircleFilterModule.prototype.process = function(currentNode) {
  var itemListDOM = currentNode.querySelector(this.FILTER_ITEM_LABEL_MAIN_SELECTOR);
  if (!itemListDOM) {
    return false;
  }
  console.log('Circle Popup');
  currentNode.classList.add(this.parent.INJECTED_CLASSNAME);
  this.pickListDOM = itemListDOM.parentNode;
  this.pickListDOM.classList.add(this.parent.INJECTED_CLASSNAME + '-main')
  this.originalModel = this.pickListDOM.childNodes;

  var textFieldWrapperDOM = document.createElement('div');
  textFieldWrapperDOM.id = this.parent.INJECTED_CLASSNAME + '-textfield';

  this.textFieldDOM = document.createElement('input');
  this.textFieldDOM.setAttribute('placeholder', 'Search ...');
  this.textFieldDOM.addEventListener('keyup', this.onCircleKeyDownFilter.bind(this), false);
  textFieldWrapperDOM.appendChild(this.textFieldDOM);

  var containerPickList = this.pickListDOM.parentNode;
  containerPickList.insertBefore(textFieldWrapperDOM, containerPickList.firstChild);
  this.filterCircle();
  return true;
};

CircleFilterModule.prototype.onCircleKeyDownFilter = function(e) {
  var e = e || event;
  var code = e.keyCode;
  if (code == 27) { // Esc
    
  }
  else if (code == 13 || code == 32) { // Space
    if (this.circleListSelectedIndex != -1) { // Currently selecting
      var selectedItem = this.filteredModel[this.circleListSelectedIndex];
      this.filterCircle();
      InjectionUtils.simulateClick(selectedItem.querySelector('div:nth-of-type(2)'));
      InjectionUtils.simulateClick(this.textFieldDOM);
      this.textFieldDOM.focus();
    }
  }
  else if (code == 40) { // Down Arrow  
    if (this.circleListSelectedIndex < this.filteredModel.length) {
      this.circleListSelectedIndex++;
      this.traverseCircle();
    }
  }
  else if (code == 38) { // Up Arrow
    if (this.circleListSelectedIndex >= 0) {
      this.circleListSelectedIndex--;
      this.traverseCircle();
    }
  }
  else { // Valid characters
    this.filterCircle(e.target.value);
  }
};

/**
 * Use some sort of trie with a proper datastructure. This was just quick and messy.
 */
CircleFilterModule.prototype.filterCircle = function(pattern) {
  this.filteredModel = [];
  for (var i = 0; i < this.originalModel.length; i++) {
    var searchItemDOM = this.originalModel[i];
    var text = searchItemDOM.innerText;
    if (text.length > 0) {
      if (!pattern || text.search(new RegExp(pattern, 'i')) > -1) {
        searchItemDOM.style.display = '';
        this.filteredModel.push(searchItemDOM);
      }
      else {
        searchItemDOM.style.display = 'none';
      }
    }
  }
};

/**
 * Traverse Circle to find and select the item.
 */
CircleFilterModule.prototype.traverseCircle = function() {
  for (var i = 0; i < this.filteredModel.length; i++) {
    var currentCircleDOM = this.filteredModel[i];
    if (this.circleListSelectedIndex == i) {
      currentCircleDOM.classList.add(this.parent.INJECTED_CLASSNAME + '-selected');
    }
    else {
      currentCircleDOM.classList.remove(this.parent.INJECTED_CLASSNAME + '-selected');
    }
  }
  
  if (this.circleListSelectedIndex != -1) {
    // This is a hack ... how do we get the height of a div?
    var itemWidth = this.pickListDOM.clientHeight / 6.5;
    var recommendedScrollHeight = itemWidth * this.circleListSelectedIndex;
    var scroll = this.pickListDOM.scrollTop;
    
    if (recommendedScrollHeight < scroll) {
      scroll = recommendedScrollHeight;
    }
    else if (recommendedScrollHeight > (scroll + (itemWidth * 6.5))) {
      scroll = scroll + (itemWidth * 6.5);
    }
    this.pickListDOM.scrollTop = scroll;
  } 
  else {
    InjectionUtils.simulateClick(this.textFieldDOM);
  }
};

//
// =============================================================================
//

/**
 * Simulate a mouse click event.
 */
InjectionUtils = {};
InjectionUtils.simulateClick = function(element) { 
  var initEvent = function(element, str) { 
    var clickEvent = document.createEvent('MouseEvents'); 
    clickEvent.initEvent(str, true, true); 
    element.dispatchEvent(clickEvent); 
  }; 
  initEvent(element, 'mousedown'); 
  initEvent(element, 'click'); 
  initEvent(element, 'mouseup'); 
};

// Main
var CircleManagementInjection = new CircleManagementInjection();
CircleManagementInjection.init();

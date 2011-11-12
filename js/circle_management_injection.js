/**
 * CircleManagementInjection Content Script.
 *
 * @author Mohamed Mansour 2011 (http://mohamedmansour.com)
 * @constructor
 */
CircleManagementInjection = function() {
  this.INJECTED_CLASSNAME = 'crx-circle-management-injection';
  this.circleModule = new CircleFilterModule(this);
  this.circleUI = new NavigationPlusInjection();
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
 * Injects a button into Google+ interface. This is used to show a custom pane
 * next to the other navigations. 
 *
 * @constructor
 */
NavigationPlusInjection = function() {
  this.buttonName = 'Cirlces';
  this.buttonID = 'cirlceDOM';
  
  this.iframe = document.createElement('iframe');
  this.iframe.src = chrome.extension.getURL('management.html');
  this.iframe.frameborder = '0';
  this.iframe.setAttribute('style',
    'width: 960px; margin: 0 auto; border: none; display: block;' +
    'background-color: white; height: 100%');
  this.circleManagementTextDOM = null;
  this.circleSelected = false;
};

/**
 * Toggle the custom button action so we can know visually when it is toggled.
 *
 * @param {boolean} state True if it requires to be selected.
 */
NavigationPlusInjection.prototype.setToggle = function(state) {
  this.circleManagementTextDOM.style.backgroundPosition = state ? '0 -18px' : '0 0';
};

/**
 * Initialize the User Interface component so it is properly positioned on the
 * screen. We are hacking the navigation like crazy, it is needed since JS
 * was used to modify the view, unfortunately this is the only way.
 */
NavigationPlusInjection.prototype.init = function() {
  var navigationDOM = document.querySelector('div[role="navigation"]');
  if (navigationDOM) {
    // Find the circles button since we want to clone and use it.
    var circleDOM = navigationDOM.querySelector('a[aria-label="Circles"]');
    if (circleDOM) {
      var circleManagementDOM = circleDOM.cloneNode(true);
      circleManagementDOM.setAttribute('aria-label', this.buttonName);
      circleManagementDOM.setAttribute('href', '#');
      circleManagementDOM.id = this.buttonID;
      
      // To separate the click style, we need to remove some classNames to
      // uniquely identify this. This is dangerous! This will fix the hover
      // states to match properly with the other nav buttons.
      var removeClasses = [
        circleManagementDOM.classList[0],
        circleManagementDOM.classList[1],
        circleManagementDOM.classList[4]
      ];
      removeClasses.forEach(function(element, index) {
        circleManagementDOM.classList.remove(element);
      });
      
      this.circleManagementTextDOM = circleManagementDOM.childNodes[0];
      this.circleManagementTextDOM.setAttribute('data-tooltip', this.buttonName);
      this.circleManagementTextDOM.className = '';
      this.circleManagementTextDOM.setAttribute('style',
          'height: 18px; width: 18px; margin-top: 5px; display: inline-block;');
      
      // Add the button listener on the parent which is a bigger frame, but only
      // modify the element inside since that is the background image.
      this.circleManagementTextDOM.style.background =
          'no-repeat url(' + chrome.extension.getURL('/img/navigation_icon.png') + ') 0 0}';
      circleManagementDOM.onmouseover = function(e) {
        if (!this.circleSelected) this.setToggle(true);
      }.bind(this);
      circleManagementDOM.onmouseout = function(e) {
        if (!this.circleSelected) this.setToggle(false);
      }.bind(this);
      
      // Add the custom button right after the circle dom. We need to override
      // the click listeners so we can adjust the layout.
      navigationDOM.insertBefore(circleManagementDOM, circleDOM.nextSibling);
      var childNodes = navigationDOM.childNodes;
      for (var i = 0; i < childNodes.length; i++) {
        childNodes[i].addEventListener('click', this.onNavButtonClick_.bind(this), false);
      }
    }
  }
};

/**
 * Fired when any navigation button has been clicked. This requires all
 * navigations since Google overrides many panes. So we need to force our
 * style to make it look nice.
 */
NavigationPlusInjection.prototype.onNavButtonClick_ = function(e) {
  var button = e.target.nodeName == 'SPAN' ? e.target.parentNode : e.target;
  var content = document.getElementById('contentPane');
  if (button.id == this.buttonID) {
    // Set the image to be selected.
    this.circleSelected = true;
    this.setToggle(true);
    
    // Show the first and last DOM since it is the profile. We want this
    // to be full screen.
    var panes = content.parentNode.childNodes;
    panes[0].style.display = 'none';
    panes[2].style.display = 'none';
    
    // Check if the iframe if it was injected already. If so, just show it.
    // We do not want to reload the frame every time. We just load it once.
    if (content.contains(this.iframe)) {
      this.iframe.style.display = 'block';
    }
    else {
      content.appendChild(this.iframe);
    }
    
    // Hide the child content nodes since we replaced them.
    var childNodes = content.childNodes;
    for (var i = 0; i < childNodes.length; i++) {
      var pane = childNodes[i];
      if (pane != this.iframe) {
        pane.innerHTML = '';
        pane.setAttribute('style', 'display: none;');
      }
    }
    
    // We don't want to active the link, so we prevent all actions.
    e.preventDefault();
  }
  else {
    // Unset the image back to normal since the circle tab is not selected.
    this.circleSelected = false;
    this.setToggle(false);
    
    // This immitates a quick refresh. This is how Google handles swapping panes.
    if (content.contains(this.iframe)) {
      this.iframe.style.display = 'none';
    }
  }
  return !this.circleSelected;
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
var circleManagementInjection = new CircleManagementInjection();
circleManagementInjection.init();

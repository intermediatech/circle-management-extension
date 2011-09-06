/**
 * CircleManagementInjection Content Script.
 *
 * @author Mohamed Mansour 2011 (http://mohamedmansour.com)
 * @constructor
 */
CircleManagementInjection = function() {
  this.INJECTED_CLASSNAME = 'crx-circle-management-injection';
  this.circleModule = new CircleFilterModule(this);
};

/**
 * Initialize the events that will be listening within this DOM.
 */
CircleManagementInjection.prototype.init = function() {
  var googlePlusContentPane = document.body.addEventListener('DOMNodeInserted',
      this.onGooglePlusContentModified.bind(this), false);
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
 * Adds some circle filtering as module.
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

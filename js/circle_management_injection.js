/**
 * CircleManagementInjection Content Script.
 *
 * @author Mohamed Mansour 2011 (http://mohamedmansour.com)
 * @constructor
 */
CircleManagementInjection = function() {
  this.FILTER_CONTAINER_CLASSNAME = 'ag qm';
  this.FILTER_TEXT_INPUT_CLASSNAME = 'crx-circle-management-injection';
  this.pickListDOM = null;
  this.textFieldDOM = null;
  this.originalModel = null;
  this.filteredModel = [];
  this.circleListSelectedIndex = -1;
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
  if (currentNode.nodeType == Node.ELEMENT_NODE) {
    this.renderCircleFilter(currentNode);
  }
};

CircleManagementInjection.prototype.renderCircleFilter = function(currentNode) {
  if (currentNode.className == this.FILTER_CONTAINER_CLASSNAME &&
      !currentNode.classList.contains(this.FILTER_TEXT_INPUT_CLASSNAME)) {
    this.pickListDOM = currentNode.querySelector('span[id$=".label"]').parentNode.parentNode;
    this.pickListDOM.classList.add(this.FILTER_TEXT_INPUT_CLASSNAME + '-main')
    this.originalModel = this.pickListDOM.childNodes;

    var textFieldWrapperDOM = document.createElement('div');
    textFieldWrapperDOM.id = this.FILTER_TEXT_INPUT_CLASSNAME + '-textfield';

    this.textFieldDOM = document.createElement('input');
    this.textFieldDOM.setAttribute('placeholder', 'Search ...');
    this.textFieldDOM.addEventListener('keyup', this.onCircleKeyDownFilter.bind(this), false);
    textFieldWrapperDOM.appendChild(this.textFieldDOM);

    var containerPickList = this.pickListDOM.parentNode;
    containerPickList.insertBefore(textFieldWrapperDOM, containerPickList.firstChild);
    currentNode.classList.add(this.FILTER_TEXT_INPUT_CLASSNAME);
    this.filterCircle();
  }
  this.circleListSelectedIndex = -1;
};

CircleManagementInjection.prototype.onCircleKeyDownFilter = function(e) {
  var e = e || event;
  var code = e.keyCode;
  if (code == 27) { // Esc
    
  }
  else if (code == 13 || code == 32) { // Space
    if (this.circleListSelectedIndex != -1) { // Currently selecting
      var selectedItem = this.filteredModel[this.circleListSelectedIndex];
      this.filterCircle();
      this.simulateClick(selectedItem.querySelector('div:nth-of-type(2)'));
      this.simulateClick(this.textFieldDOM);
      this.textFieldDOM.focus();
    }
  }
  else if (code == 40) { // Down Arrow  
    if (this.circleListSelectedIndex < this.filteredModel.length) {
      this.circleListSelectedIndex++;
      this.visitCircle();
    }
  }
  else if (code == 38) { // Up Arrow
    if (this.circleListSelectedIndex >= 0) {
      this.circleListSelectedIndex--;
      this.visitCircle();
    }
  }
  else { // Valid characters
    this.filterCircle(e.target.value);
  }
};

/**
 * Use some sort of trie with a proper datastructure. This was just quick and messy.
 */
CircleManagementInjection.prototype.filterCircle = function(pattern) {
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

CircleManagementInjection.prototype.visitCircle = function() {
  for (var i = 0; i < this.filteredModel.length; i++) {
    var currentCircleDOM = this.filteredModel[i];
    if (this.circleListSelectedIndex == i) {
      currentCircleDOM.classList.add(this.FILTER_TEXT_INPUT_CLASSNAME + '-selected');
    }
    else {
      currentCircleDOM.classList.remove(this.FILTER_TEXT_INPUT_CLASSNAME + '-selected');
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
    this.simulateClick(this.textFieldDOM);
  }
};
 
/**
 * Simulate a mouse click event.
 */
CircleManagementInjection.prototype.simulateClick = function(element) { 
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

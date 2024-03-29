/**
 * Debug utility functions that help me figure out what Google is kinda doing
 * quickly and efficiently. I don't want to bloody do a binary search manually :(
 *
 * @author Mohamed Mansour 2011 (http://mohamedmansour.com)
 * @constructor
 */
JSAPIHelper = function() {};

/**
 * @see Google Closure goog.inherits
 */
JSAPIHelper.inherits = function(childCtor, parentCtor) {
  /** @constructor */
  function tempCtor() {};
  tempCtor.prototype = parentCtor.prototype;
  childCtor.superClass_ = parentCtor.prototype;
  childCtor.prototype = new tempCtor();
  childCtor.prototype.constructor = childCtor;
};

/**
 * Lame test, I know ...
 */
JSAPIHelper.prototype.test = function() {
  JSAPIHelper.assertEquals(JSAPIHelper.searchArray(null, ['foo', 'hi']), false);
  JSAPIHelper.assertEquals(JSAPIHelper.searchArray(null, ['foo', null]), 1);
  JSAPIHelper.assertEquals(JSAPIHelper.searchArray(null, null), false);
  JSAPIHelper.assertEquals(JSAPIHelper.searchArray('hi', ['foo', 'hi']), [1]);
  JSAPIHelper.assertEquals(JSAPIHelper.searchArray('hi', ['foo', ['hi', 'bar']]), [1, 0]);
  JSAPIHelper.assertEquals(JSAPIHelper.searchArray('hi', ['foo', ['test', ['1', '2'], ['hi', 'hie']]]), [1, 2, 0]);
  JSAPIHelper.assertEquals(JSAPIHelper.firstDifference('abcd', 'abcd'), false);
  JSAPIHelper.assertEquals(JSAPIHelper.firstDifference('abcd', 'abcde'), 4);
  JSAPIHelper.assertEquals(JSAPIHelper.firstDifference('abbd', 'abcd'), 2);
  JSAPIHelper.assertEquals(JSAPIHelper.firstDifference('a', 'abbb'), 1);
  JSAPIHelper.assertEquals(JSAPIHelper.firstDifference(null, 'a'), false);
};

/**
 * Is a given value a string?
 */
JSAPIHelper.isString = function(obj) {
  return !!(obj === '' || (obj && obj.charCodeAt && obj.substr));
};

/**
 * Checks if the item is indeed an Array.
 *
 * @param {*} obj Any item.
 * return {boolean} True if the object is an array, otherwise false.
 */
JSAPIHelper.isArray = function(obj) {
    if (!obj) {
        return false;
    }
    return obj.constructor == Array;
};

/**
 * Recursively searches the arrays so I can know when a needle was found in
 * the huge haystack. This saves a lot of time! We can make it auto discover
 * in the future.
 *
 * Basically this just visits each item in the array and if it found the item
 * it will return it back to the recursion buffer. So I am using recursion to
 * backtrack the paths it took to find that needle. Everytime it sees an array
 * it will recurse inside and return the result back to the stack.
 *
 * @param {?string=} needle The text to find.
 * @param {?*=} haystack The multi multi huge array to find.
 * @return {Array.<number?>|boolean} The path to the needle in the haystack,
 *                                   false if not found.
 */
JSAPIHelper.searchArray = function(needle, haystack) {
    if (!JSAPIHelper.isArray(haystack)) {
        return false;
    }
    for (var i = 0; i < haystack.length; i++) {
        var currentValue = haystack[i];
        if (JSAPIHelper.isArray(currentValue)) {
          path = JSAPIHelper.searchArray(needle, currentValue);
          if (path) {
            return [i].concat(path);
          }
        }
        if (currentValue == needle) {
          return [i];
        }
    }
    return false;
};

/**
 * Very basic string diff to see which character differs.
 *
 * @param {?string} a The first text to compare.
 * @param {?string} b The second text to compare
 * @return {number|boolean} The index of the convergence otherwise false if equal.
 */
JSAPIHelper.firstDifference = function(a, b) {
  if (!a || !b) {
    return false;
  }
  var aLength = a.length;
  var bLength = b.length;
  var length = aLength > bLength ? aLength : bLength;
  for (var i = 0; i < length; i++) {
    if (a[i] != b[i]) {
      return i;
    }
  }
  return false;
};

/**
 * Testing stuff ...
 */
JSAPIHelper.assertEquals = function(expected, actual) {
  if (JSAPIHelper.isArray(expected)) {
    expected = expected.join(',');
  }
  if (JSAPIHelper.isArray(actual)) {
    actual = actual.join(',');
  }
  var results = expected == actual;
  if (results) {
    console.debug(results, expected, actual);
  }
  else {
    console.error(results, expected, actual);
  }
};

/**
 * Encode stuff that only matter in the GAPI.
 *
 * @param {string} input The encoded string.
 * @return {string} The decoded string.
 */
JSAPIHelper.decodeHTMLCodes = function(input) {
  var htmlCodes = [
   ['%5B', '['],
   ['%22', '"'],
   ['%5C', '\\'],
   ['%20', ' '],
   ['%2C', ','],
   ['%5D', ']'],
   ['%3A', ':']
  ];
  htmlCodes.forEach(function(element, index) {
    input = input.replace(new RegExp(element[0], 'g'), element[1]);
  });
  return input;
};
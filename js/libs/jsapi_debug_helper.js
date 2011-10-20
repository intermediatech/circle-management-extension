/**
 * Debug utility functions that help me figure out what Google is kinda doing
 * quickly and efficiently. I don't want to bloody do a binary search manually :(
 *
 * TODO: Rename this to something less debug.
 *
 * @author Mohamed Mansour 2011 (http://mohamedmansour.com)
 * @constructor
 */
DebugHelper = function() {};

/**
 * @see Google Closure goog.inherits
 */
DebugHelper.inherits = function(childCtor, parentCtor) {
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
DebugHelper.prototype.test = function() {
  DebugHelper.assertEquals(DebugHelper.searchArray(null, ['foo', 'hi']), false);
  DebugHelper.assertEquals(DebugHelper.searchArray(null, ['foo', null]), 1);
  DebugHelper.assertEquals(DebugHelper.searchArray(null, null), false);
  DebugHelper.assertEquals(DebugHelper.searchArray('hi', ['foo', 'hi']), [1]);
  DebugHelper.assertEquals(DebugHelper.searchArray('hi', ['foo', ['hi', 'bar']]), [1, 0]);
  DebugHelper.assertEquals(DebugHelper.searchArray('hi', ['foo', ['test', ['1', '2'], ['hi', 'hie']]]), [1, 2, 0]);
  DebugHelper.assertEquals(DebugHelper.firstDifference('abcd', 'abcd'), false);
  DebugHelper.assertEquals(DebugHelper.firstDifference('abcd', 'abcde'), 4);
  DebugHelper.assertEquals(DebugHelper.firstDifference('abbd', 'abcd'), 2);
  DebugHelper.assertEquals(DebugHelper.firstDifference('a', 'abbb'), 1);
  DebugHelper.assertEquals(DebugHelper.firstDifference(null, 'a'), false);
};

/**
 * Checks if the item is indeed an Array.
 *
 * @param {any} obj Any item.
 * return {boolean} True if the object is an array, otherwise false.
 */
DebugHelper.isArray = function(obj) {
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
 * @param {string} needle The text to find.
 * @param {string} haystack The multi multi huge array to find.
 * @return {Array<number?>} The path to the needle in the haystack, false if
 *                          not found.
 */
DebugHelper.searchArray = function(needle, haystack) {
    if (!DebugHelper.isArray(haystack)) {
        return false;
    }
    for (var i = 0; i < haystack.length; i++) {
        var currentValue = haystack[i];
        if (DebugHelper.isArray(currentValue)) {
          path = DebugHelper.searchArray(needle, currentValue);
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
 * @param {string} a The first text to compare.
 * @param {string} b The second text to compare
 * @return {number?} The index of the convergence otherwise false if equal.
 */
DebugHelper.firstDifference = function(a, b) {
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
DebugHelper.assertEquals = function(expected, actual) {
  if (DebugHelper.isArray(expected)) {
    expected = expected.join(',');
  }
  if (DebugHelper.isArray(actual)) {
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

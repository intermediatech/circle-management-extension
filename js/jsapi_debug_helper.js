DebugHelper = function() {
};

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

DebugHelper.isArray = function(obj) {
    if (!obj) {
        return false;
    }
    return obj.constructor == Array;
};

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

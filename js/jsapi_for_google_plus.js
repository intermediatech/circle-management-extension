/**
 * Unofficial Google Plus API. It mainly supports user and circle management.
 * 
 * Mohamed Mansour (http://mohamedmansour.com)
 */
GooglePlusAPI = function() {
  var
  
	//------------------------ Constants --------------------------
  // Implemented API
  CIRCLE_API              = 'https://plus.google.com/u/0/_/socialgraph/lookup/circles/?m=true',
  FOLLOWERS_API           = 'https://plus.google.com/u/0/_/socialgraph/lookup/followers/?m=1000000',
  FIND_PEOPLE_API         = 'https://plus.google.com/u/0/_/socialgraph/lookup/find_more_people/?m=10000',
  MODIFYMEMBER_MUTATE_API = 'https://plus.google.com/u/0/_/socialgraph/mutate/modifymemberships/',
  REMOVEMEMBER_MUTATE_API = 'https://plus.google.com/u/0/_/socialgraph/mutate/removemember/',
  CREATE_MUTATE_API       = 'https://plus.google.com/u/0/_/socialgraph/mutate/create/',
  PROPERTIES_MUTATE_API   = 'https://plus.google.com/u/0/_/socialgraph/mutate/properties/',
  DELETE_MUTATE_API       = 'https://plus.google.com/u/0/_/socialgraph/mutate/delete/',
  SORT_MUTATE_API         = 'https://plus.google.com/u/0/_/socialgraph/mutate/sortorder/',
 
  INITIAL_DATA_API       = 'https://plus.google.com/u/0/_/initialdata?key=14',
  
  PROFILE_GET_API         = 'https://plus.google.com/u/0/_/profiles/get/',
  PROFILE_SAVE_API        = 'https://plus.google.com/u/0/_/profiles/save?_reqid=0',
 
  // Not Yet Implemented API
  CIRCLE_ACTIVITIES_API   = 'https://plus.google.com/u/0/_/stream/getactivities/', // ?sp=[1,2,null,"7f2150328d791ede",null,null,null,"social.google.com",[]]
  SETTINGS_API            = 'https://plus.google.com/u/0/_/socialgraph/lookup/settings/',
  INCOMING_API            = 'https://plus.google.com/u/0/_/socialgraph/lookup/incoming/?o=[null,null,"116805285176805120365"]&n=1000000',
  SOCIAL_API              = 'https://plus.google.com/u/0/_/socialgraph/lookup/socialbar/',
  INVITES_API             = 'https://plus.google.com/u/0/_/socialgraph/get/num_invites_remaining/',
  HOVERCARD_API           = 'https://plus.google.com/u/0/_/socialgraph/lookup/hovercard/', // ?m=[null,null,"111048918866742956374"]
  SEARCH_API              = 'https://plus.google.com/complete/search?ds=es_profiles&client=es-sharebox&partnerid=es-profiles&q=test',
  PROFILE_PHOTOS_API      = 'https://plus.google.com/_/profiles/getprofilepagephotos/116805285176805120365',
  PLUS_API                = 'https://plus.google.com/_/plusone',
  COMMENT_API             = 'https://plus.google.com/_/stream/comment/',
  MEMBER_SUGGESTION_API   = 'https://plus.google.com/_/socialgraph/lookup/circle_member_suggestions/', // s=[[[null, null, "116805285176805120365"]]]&at=

	//------------------------ Private Fields --------------------------
  session = null,
  info = null,
  circles = null,
  people_in_my_circles = null,
  people_who_added_me = null,
  people_to_discover = null,

	//------------------------ Private Functions --------------------------
  /**
   * Parse JSON string in a clean way by removing a bunch of commas and brackets. These should only
   * be used in Google post requests.
   *
   * @param {string} input The irregular JSON string to parse.
   */
  parseJSON = function(input) {
    var jsonString = input.replace(/\[,/g, '[null,');
    jsonString = jsonString.replace(/,\]/g, ',null]');
    jsonString = jsonString.replace(/,,/g, ',null,');
    jsonString = jsonString.replace(/,,/g, ',null,');
    return JSON.parse(jsonString);
  },
  
  /**
   * Sends a request to Google+ through the extension. Does some parsing to fix
   * the data when retrieved.
   *
   * @param {Function<string>} callback
   * @param {string} url The URL to request.
   * @param {string} postData If specified, it will do a POST with the data.
   */
  requestService = function(callback, url, postData) {
    /*
    // This somehow doesn't work perhaps missing some headers :< Use jQuery to make this portion easier.
    var xhr = new XMLHttpRequest();
    xhr.open(postData ? 'POST' : 'GET', url, false);
    xhr.overrideMimeType('application/json; charset=UTF-8');
    xhr.send(postData || null);
    */
    var success = function(data, textStatus, jqXHR) {
      if (data.status != 200) {
        callback({
          error: data.status,
          text: data.statusText
        });
      }
      else {
        var text = data.responseText;
        var results = data.responseText.substring(4);
        callback(parseJSON(results));
      }
    };
    var xhr = $.ajax({
      type: postData ? 'POST' : 'GET',
      url: url,
      data: postData || null,
      dataType: 'json',
      async: true,
      complete: success
    });
  },
  
  /**
   * Parse out the user object since it is mangled data which majority of the
   * entries are not needed.
   *
   * @param {Object<Array>} element Google datastructure.
   * @param {boolean} extractCircles Extract circle information as well..
   * @return {personObject} The parsed person.
   */
  parseUser = function(element, extractCircles) {
    var email = element[0][0];
    var id = element[0][2];
    var name = element[2][0];
    var score = element[2][3];
    var photo = element[2][8];
    var location = element[2][11];
    var employment = element[2][13];
    var occupation = element[2][14];
    var added = !(element[2].length < 20);
    
    // Only store what we need, saves memory but takes a tiny bit more time.
    var user = {}
    if (email) user.email = email;
    if (name) user.name = name;
    if (score) user.score = score;
    if (photo) user.photo = photo;
    if (location) user.location = location;
    if (employment) user.employment = employment;
    if (occupation) user.occupation = occupation;
    if (added) user.added = added;
    
    // Circle information for the user wanted.
    if (extractCircles) {
      var dirtyCircles = element[3];
      var cleanCircles = [];
      dirtyCircles.forEach(function(element, index) {
        cleanCircles.push(element[2][0]);
      });
      user.circles = cleanCircles;
    }
    
    return [id, user];
  },
  
  /**
   * Fire callback safely.
   *
   * @param {Function<Object>} callback The callback to fire back.
   * @param {Object} The data to send in the callback.
   */
  fireCallback = function(callback, data) {
    if (callback) {
      callback(data);
    }
  },
  
  /**
   * Each Google+ user has their own unique session, fetch it and store
   * it. The only way getting that session is from their Google+ pages
   * since it is embedded within the page.
   */
  getSession = function() {
    if (!session) {
      var xhr = $.ajax({
        type: 'GET',
        url: 'https://plus.google.com',
        data: null,
        async: false
      });
      var match = xhr.responseText.match(',"([^\W_,]+_?[^\W_,]+:[\\d]+)+",');
      session = (match && match[1]) || null;
    }
    return session;
  };
  
  //----------------------- Public Functions ------------------------
  return {
  
    // Requests.
    
    /**
     * Does the first prefetch.
     */
    init: function() {
      getSession();
    },
    
    /**
     * Invalidate the circles and people in my circles cache and rebuild it.
     */
    refreshCircles: function(callback) {
      requestService(function(response) {
        var dirtyCircles = response[1];
        circles = {};
        dirtyCircles.forEach(function(element, index) {
          if (index < dirtyCircles.length - 1) {
            var id = element[0][0];
            var name = element[1][0];
            var position = element[1][12];
            circles[id] = {
              name: name,
              position: position
            };
          }
        });
        var dirtyUsers = response[2];
        people_in_my_circles = {};
        dirtyUsers.forEach(function(element, index) {
          userTuple = parseUser(element, true);
          people_in_my_circles[userTuple[0]] = userTuple[1];
        });
        fireCallback(callback, {
          circles: circles,
          people_in_my_circles: people_in_my_circles
        });
      }, CIRCLE_API);
    },

    /**
     * Invalidate the people who added me cache and rebuild it.
     */
    refreshFollowers: function(callback) {
      requestService(function(response) {
        dirtyFollowers = response[2];
        people_who_added_me = {};
        dirtyFollowers.forEach(function(element, index) {
          userTuple = parseUser(element);
          people_who_added_me[userTuple[0]] = userTuple[1];
        });
        fireCallback(callback, people_who_added_me);
      }, FOLLOWERS_API);
    },
    
    /**
     * Invalidate the people to discover cache and rebuild it.
     */
    refreshFindPeople: function(callback) {
      requestService(function(response) {
        var dirtyUsers = response[1];
        people_to_discover = {};
        dirtyUsers.forEach(function(element, index) {
          userTuple = parseUser(element[0]);
          people_to_discover[userTuple[0]] = userTuple[1];
        });
        fireCallback(callback, people_to_discover);
      }, FIND_PEOPLE_API);
    },

    /**
     * Gets the initial data from the user to recognize their ACL to be used in other requests.
     * especially in the profile requests.
     *
     * You can get more stuff from this such as:
     *   - circles (not ordered)
     *   - identities (facebook, twitter, linkedin, etc)
     *
     * @param {Function<boolean>} callback
     */
    refreshInfo: function(callback) {
      requestService(function(response) {
        var responseMap = parseJSON(response[1]);
        info = {};
        // Just get the fist result of the Map.
        for (var i in responseMap) {
          var detail = responseMap[i];
          var emailParse = detail[20].match(/(.+) <(.+)>/);
          info.full_email = emailParse[0];
          info.name = emailParse[1];
          info.email = emailParse[2];
          info.id = detail[0];
          info.acl = '"' + (detail[1][14][0][0]).replace(/"/g, '\\"') + '"';
          break;
        }
        fireCallback(callback, info);
      }, INITIAL_DATA_API);
    },

    /**
     * Add people to a circle in your account.
     *
     * @param {Function<string>} callback The ids of the people added.
     * @param {string} circle the Circle to add the people to.
     * @param {{Array.<string>}} users The people to add.
     */
    addPeople: function(callback, circle, users) {
      var usersArray = [];
      users.forEach(function(element, index) {
        usersArray.push('[[null,null,"' + element + '"],null,[]]');
      });
      var data = 'a=[[["' + circle + '"]]]&m=[[' + usersArray.join(',') + ']]&at=' + getSession();
      requestService(function(response) {
        var result = [];
        var dirtyPeople = response[2];
        dirtyPeople.forEach(function(element, index) {
          userTuple = parseUser(element);
          people_in_my_circles[userTuple[0]] = userTuple[1];
          result.push(userTuple[0]);
        });
        fireCallback(callback, result);
      }, MODIFYMEMBER_MUTATE_API, data);
    },
    
    /**
     * Remove people from a circle in your account.
     *
     * @param {Function<string>} callback
     * @param {string} circle the Circle to remove people from.
     * @param {{Array.<string>}} users The people to add.
     */
    removePeople: function(callback, circle, users) {
      var usersArray = [];
      users.forEach(function(element, index) {
        usersArray.push('[null,null,"' + element + '"]');
      });
      var data = 'c=["' + circle + '"]&m=[[' + usersArray.join(',') + ']]&at=' + getSession();
      requestService(function(response) {
        users.forEach(function(element, index) {
          delete people_in_my_circles[element];
        });
        fireCallback(callback, true);
      }, REMOVEMEMBER_MUTATE_API, data);
    },

    /**
     * Create a new empty circle in your account.
     *
     * @param {Function<string>} callback The ID of the circle.
     * @param {string} name The circle names.
     * @param {string} opt_description Optional description.
     */
    createCircle: function(callback, name, opt_description) {
      var data = 't=2&n=' + encodeURIComponent(name) + '&m=[[]]';
      if (opt_description) {
        data += '&d=' + encodeURIComponent(description);
      }
      data += '&at=' + getSession();
      requestService(function(response) {
        var id = response[1][0];
        var position = response[2];
        circles[id] = {
          name: name,
          position: position
        };
        fireCallback(callback, id);
      }, CREATE_MUTATE_API, data);
    },

    /**
     * Removes a circle from your profile.
     *
     * @param {Function<boolean>} callback.
     * @param {string} id The circle ID.
     */
    removeCircle: function(callback, id) {
      var data = 'c=["' + id + '"]&at=' + getSession();
      requestService(function(response) {
        delete circles[id];
        fireCallback(callback, true);
      }, DELETE_MUTATE_API, data);
    },

    /**
     * Modify a circle circle given their ID.
     *
     * @param {Function<boolean>} callback 
     * @param {string} id The circle ID.
     * @param {string} opt_name Optional name
     * @param {string} opt_description Optional description.
     */
    modifyCircle: function(callback, id, opt_name, opt_description) {
      var requestParams = '?c=["' + id + '"]';
      if (opt_name) {
        requestParams += '&n=' + encodeURIComponent(opt_name);
      }
      if (opt_description) {
        requestParams += '&d=' + encodeURIComponent(opt_description);
      } 
      var data = 'at=' + getSession();
      requestService(function(response) {
        fireCallback(callback, true);
      }, PROPERTIES_MUTATE_API + requestParams, data);
    },

    /**
     * Sorts the circle based on some index.
     *
     * @param {Function<boolean>} callback
     * @param {string} id The circle ID
     * @param {number} index The index to move that circle to. Must be > 0.
     */
    sortCircle: function(callback, id, index) {
      index = index > 0 || 0;
      var requestParams = '?c=["' + id + '"]&i=' + parseInt(index);
      var data = 'at=' + getSession();
      requestService(function(response) {
        fireCallback(callback, true);
      }, SORT_MUTATE_API + requestParams, data);
    },

    /**
     * Gets access to the entire profile for a specific user.
     *
     * @param {Function<boolean>} callback
     * @param {string} id The profile ID
     */
    getProfile: function(callback, id) {
      if (isNaN(id)) {
        return {};
      }
      requestService(function(response) {
        var obj = {
          introduction: response[1][2][14][1]
        };
        fireCallback(callback, obj);
      }, PROFILE_GET_API + id);
    },
    
    /**
     * Saves the profile information back to the current logged in user.
     *
     * TODO: complete this for the entire profile. This will just persist the introduction portion
     *       not everything else. It is pretty neat how Google is doing this side. kudos.
     *
     * @param {Function<boolean>} callback
     * @param {string} introduction The content.
     */
    saveProfile: function(callback, introduction) {
      if (introduction) {
        introduction = introduction.replace(/"/g, '\\"');
      }
      else {
        introduction = 'null';
      }

      var acl = this.getInfo().acl;
      var data = 'profile=' + encodeURIComponent('[null,null,null,null,null,null,null,null,null,null,null,null,null,null,[[' + 
          acl + ',null,null,null,[],1],"' + introduction + '"]]') + '&at=' + getSession();

      requestService(function(response) {
        fireCallback(callback, response.error ? true : false);
      }, PROFILE_SAVE_API, data);
    },

    // Non Requests.
    
    /**
     * @return {Object<string, string>} The information from the user.
     *                                    - id
     *                                    - name
     *                                    - email
     *                                    - acl                    
     */
    getInfo: function() {
      return info;
    },
    
    /**
     * @return {Object<string, circleObject>} All the current users circles.
     */
    getCircles: function() {
      return circles;
    },
    
    /**
     * @param {string} id The circle ID.
     * @return {circleObject} circle detail that was found.
     */
    getCircle: function(id) {
      return circles[id];
    },
    
    /**
     * @param {number} id The person ID.
     * @return {personObject} a person who is connected to me.
     */
    getPerson: function(id) {
      var person = this.getPersonWhoAddedMe(id);
      if (!person) {
        person = this.getPersonInMyCircle(id);
      }
      if (!person) {
        person = this.getPersonToDiscover(id);
      }
      return person;
    },

    /**
     * @return {Object<String, personObject>} A map of everyone in my circles.
     */
    getPeopleInMyCircles: function() {
      return people_in_my_circles;
    },
    
    /**
     * @param {number id The person ID.
     * @return {personObject} The person who is in my circle.
     */
    getPersonInMyCircle: function(id) {
      return people_in_my_circles[id];
    },
    
    /**
     * @return {Object<String, personObject>} A map of people who added me.
     */
    getPeopleWhoAddedMe: function() {
      return people_who_added_me;
    },
    
    /**
     * @param {number} id The person ID.
     * @return {personObject} The person who added me.
     */
    getPersonWhoAddedMe: function(id) {
      return people_who_added_me[id];
    },
    
    /**
     * @return {Object<String, personObject>} All the discovered users.
     */
    getPeopleToDiscover: function() {
      return people_to_discover;
    },
    
    /**
     * @param {number} id The Google Account ID.
     * @return a person that was discovered.
     */
    getPersonToDiscover: function(id) {
      return people_to_discover[id];
    },
    
  };
};
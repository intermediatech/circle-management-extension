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
  db = new PlusDB(),
  
  session = null,
  info = null,
  
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
    
    // Only store what we need, saves memory but takes a tiny bit more time.
    var user = {}
    if (id) user.id = id;
    if (email) user.email = email;
    if (name) user.name = name;
    if (score) user.score = score;
    if (photo) {
      if (photo.indexOf('http') != 0) {
        photo = 'https:' + photo;
      }
      user.photo = photo;
    }
    if (location) user.location = location;
    if (employment) user.employment = employment;
    if (occupation) user.occupation = occupation;
    
    // Circle information for the user wanted.
    var cleanCircles = [];
    if (extractCircles) {
      var dirtyCircles = element[3];
      dirtyCircles.forEach(function(element, index) {
        cleanCircles.push(element[2][0]);
      });
    }
    
    return [user, cleanCircles];
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
      var match = xhr.responseText.match(',"([^\\W_,]+_?[^\\W_,]+:[\\d]+)+",');
      session = (match && match[1]) || null;
    }
    return session;
  };
  
  //----------------------- Constructor ---- ------------------------
  db.open();
  
  
  
  //----------------------- Public Functions ------------------------
  return {

    // Requests.

    /**
     * @return Get the pointer to the native database entities.
     */
    getDatabase: function() {
      return db;
    },
    
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
        db.getCircleEntity().clear(function(res) {
          if (!res.status) {
            fireCallback(callback, false);
          }
          else {
            var dirtyUsers = response[2];

            var circleEntity = db.getCircleEntity();
            var personEntity = db.getPersonEntity();
            var personCircleEntity = db.getPersonCircleEntity();
            
            // Batch variable.s
            var batchRemaining = [dirtyCircles.length, dirtyUsers.length, 0];
            var batchInserts = [[], [], []];
            var batchCounter = [0, 0, 0];
            var batchEntity = [circleEntity, personEntity, personCircleEntity];
            var batchNames = ['CircleEntity', 'PeopleEntity', 'PersonCircleEntity'];

            // Counter till we are done.
            var remaining = batchRemaining[0] + batchRemaining[1];
            var onComplete = function(result) {
              if (--remaining == 0) {
                fireCallback(callback, true);
              }
            };

            var onRecord = function(type, data) {
              batchCounter[type]++;
              batchInserts[type].push(data);
              if (batchCounter[type] % 1000 == 0 || batchCounter[type] == batchRemaining[type]) {
                batchEntity[type].save(batchInserts[type], onComplete);
                console.log('Persisting ' + batchNames[type], batchInserts[type].length);
                batchInserts[type] = [];
              }
            };

            // Persist Circles.
            dirtyCircles.forEach(function(element, index) {
              var id = element[0][0];
              var name = element[1][0];
              var description = element[1][2];
              var position = element[1][12];
              onRecord(0, {
                id: id,
                name: name,
                position: position,
                description: description
              });
            });

            // Persist People in your circles. Count number of total circles as well.
            dirtyUsers.forEach(function(element, index) {
              var userTuple = parseUser(element, true);
              var user = userTuple[0];
              user.in_my_circle = 'Y';
              var userCircles = userTuple[1];
              remaining += userCircles.length;
              batchRemaining[2] += userCircles.length;
              onRecord(1, user);
            });
            
            // For each person, persist them in their circles.
            dirtyUsers.forEach(function(element, index) {
              var userTuple = parseUser(element, true);
              var user = userTuple[0];
              var userCircles = userTuple[1];
              userCircles.forEach(function(element, index) {
                onRecord(2, {
                  circle_id: element,
                  person_id: user.id
                });
              });
            });
          }
        });
      }, CIRCLE_API);
    },

    /**
     * Invalidate the people who added me cache and rebuild it.
     */
    refreshFollowers: function(callback) {
      requestService(function(response) {
        dirtyFollowers = response[2];

        // Counter till we are done.
        var remaining = dirtyFollowers.length;
        var onComplete = function(result) {
          if (--remaining == 0) {
            fireCallback(callback, true);
          }
        };

        var batchInserts = [], batchCounter = 0;
        var onRecord = function(entity, user) {
          batchCounter++;
          batchInserts.push(user);
          if (batchCounter % 1000 == 0 || batchCounter == remaining) {
            entity.save(batchInserts, onComplete);
            console.log('Persisting Followers', batchInserts.length);
            batchInserts = [];
          }
        };

        var personEntity = db.getPersonEntity();
        dirtyFollowers.forEach(function(element, index) {
          var userTuple = parseUser(element);
          var user = userTuple[0];
          user.added_me = 'Y';
          onRecord(personEntity, user);
        });
      }, FOLLOWERS_API);
    },
    
    /**
     * Invalidate the people to discover cache and rebuild it.
     */
    refreshFindPeople: function(callback) {
      requestService(function(response) {
        var dirtyUsers = response[1];

        // Counter till we are done.
        var remaining = dirtyUsers.length;
        var onComplete = function(result) {
          if (--remaining == 0) {
            fireCallback(callback, true);
          }
        };

        var batchInserts = [], batchCounter = 0;
        var onRecord = function(entity, user) {
          batchCounter++;
          batchInserts.push(user);
          if (batchCounter % 1000 == 0 || batchCounter == remaining) {
            entity.save(batchInserts, onComplete);
            console.log('Persisting Find People', batchInserts.length);
            batchInserts = [];
          }
        };

        var personEntity = db.getPersonEntity();
        dirtyUsers.forEach(function(element, index) {
          var userTuple = parseUser(element[0]);
          var user = userTuple[0];
          onRecord(personEntity, user);
        });
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
        fireCallback(callback, true);
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
        var dirtyPeople = response[2];
        
        // Counter till we are done.
        var remaining = dirtyPeople.length;
        var onComplete = function(result) {
          if (--remaining == 0) {
            fireCallback(callback, true);
          }
        };
        dirtyPeople.forEach(function(element, index) {
          userTuple = parseUser(element);
          var user = userTuple[0];
          user.in_my_circle = 'Y';
          db.getPersonEntity().save(user, function(result) {
            db.getPersonCircleEntity().save({
              circle_id: circle,
              person_id: user.id
            }, onComplete)
          });
        });
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
        // Counter till we are done.
        var remaining = users.length;
        var onComplete = function(result) {
          if (--remaining == 0) {
            fireCallback(callback, true);
          }
        };
        users.forEach(function(element, index) {
          db.getPersonEntity().remove(element, onComplete);
        });
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
        data += '&d=' + encodeURIComponent(opt_description);
      }
      data += '&at=' + getSession();
      requestService(function(response) {
        var id = response[1][0];
        var position = response[2];
        db.getCircleEntity().persist({
          id: id,
          name: name,
          position: position,
          description: opt_description
        }, callback);
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
        db.getCircleEntity().remove(id, callback);
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
        db.getCircleEntity().update({
          id: id,
          name: opt_name,
          description: opt_description
        }, callback);
      }, PROPERTIES_MUTATE_API + requestParams, data);
    },

    /**
     * Sorts the circle based on some index.
     * TODO: We need to refresh the circles entity since positions will be changed.
     * @param {Function<boolean>} callback
     * @param {string} id The circle ID
     * @param {number} index The index to move that circle to. Must be > 0.
     */
    sortCircle: function(callback, circle_id, index) {
      index = index > 0 || 0;
      var requestParams = '?c=["' + circle_id + '"]&i=' + parseInt(index);
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
     * @param {Function<Object>} callback All the circles.
     */
    getCircles: function(callback) {
      db.getCircleEntity().find({}, callback);
    },
    
    /**
     * @param {number} id The circle ID to query.
     * @param {Function<Object>} callback All the circles.
     */
    getCircle: function(id, callback) {
      db.getCircleEntity().find({id: id}, callback);
    },

    /**
     * @param {Function<Object>} callback All the circles.
     */
    getPeople: function(callback) {
      db.getPersonEntity().eagerFind({}, callback);
    },

    /**
     * @param {number} id The person ID.
     * @param {Function<Object>} callback The person involved.
     */
    getPerson: function(id, callback) {
      db.getPersonEntity().find({id: id}, callback);
    },

    /**
     * @param {Function<Object>} callback People in my circles.
     */
    getPeopleInMyCircles: function(callback) {
      db.getPersonEntity().find({in_my_circle: 'Y'}, callback);
    },
    
    /**
     * @param {number id The person ID.
     * @param {Function<Object>} callback The person in my circle.
     */
    getPersonInMyCircle: function(id, callback) {
      db.getPersonEntity().find({in_my_circle: 'Y', id: id}, callback);
    },
    
    /**
     * @param {Function<Object>} callback The people who added me.
     */
    getPeopleWhoAddedMe: function(callback) {
      db.getPersonEntity().find({added_me: 'Y'}, callback);
    },
    
    /**
     * @param {number} id The person ID.
     * @param {Function<Object>} callback The person who added me.
     */
    getPersonWhoAddedMe: function(id, callback) {
      db.getPersonEntity().find({added_me: 'Y', id: id}, callback);
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
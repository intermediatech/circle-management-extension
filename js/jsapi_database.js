/**
 * Storage class responsible for managing the database tansactions for Google+
 *
 * @constructor
 */
PlusDB = function () {
  this.db = null;
  this.circleEntity = null;
  this.personEntity = null;
  this.personCircleEntity = null;
};

/**
 * Initialize the entities so we can have accessible tables in a fake ORM way.
 */
PlusDB.prototype.initializeEntities = function() {
  this.circleEntity = new CircleEntity(this.db);
  this.personEntity = new PersonEntity(this.db);
  this.personCircleEntity = new PersonCircleEntity(this.db);
};

/**
 * Opens a connection to Web SQL table.
 */
PlusDB.prototype.open = function() {
  // 10MB should fit around 100K otherwise would take time to expand array.
  var db_size = 10 * 1024 * 1024;
  this.db = openDatabase('Circle Management', '1.0', 'circle-manager', db_size);
  this.createTable();
  this.initializeEntities();
};

/**
 * For simplicity, just show an alert when crazy error happens.
 */
PlusDB.prototype.onError = function(tx, e) {
  console.log('Error: ', e);
  alert('Something unexpected happened: ' + e.message );
};

/**
 * Creates a table structure for Circle Management.
 */
PlusDB.prototype.createTable = function() {
  var self = this;
  this.db.transaction(function(tx) {
    tx.executeSql('CREATE TABLE IF NOT EXISTS person(' +
      'id TEXT PRIMARY KEY, ' +
      'email TEXT, ' +
      'name TEXT NOT NULL, ' +
      'photo TEXT, ' +
      'location TEXT, ' +
      'employment TEXT, ' +
      'occupation TEXT, ' +
      'score REAL, ' +
      'in_my_circle CHAR DEFAULT "N", ' +
      'added_me CHAR DEFAULT "N", ' +
      'UNIQUE (id)' +
    ')', [], null,  self.onError);
    tx.executeSql('CREATE TABLE IF NOT EXISTS circle(' +
      'id TEXT PRIMARY KEY, ' +
      'name TEXT NOT NULL, ' +
      'position TEXT, ' +
      'description TEXT, ' +
      'UNIQUE (id)' +
    ')', [], null,  self.onError);
    tx.executeSql('CREATE TABLE IF NOT EXISTS circle_person(' +
      'id INTEGER PRIMARY KEY AUTOINCREMENT,' +
      'circle_id TEXT, ' +
      'person_id TEXT, ' +
      'FOREIGN KEY (circle_id) REFERENCES circle (id), ' +
      'FOREIGN KEY (person_id) REFERENCES person (id), ' +
      'UNIQUE (circle_id, person_id)' +
    ')', [], null,  self.onError);
  });
};

/**
 * Removes every row from the table.
 */
PlusDB.prototype.clearAll = function(callback) {
  var self = this;
  self.db.transaction(function(tx) {
    tx.executeSql('DROP TABLE circle_person', [], function() {
      tx.executeSql('DROP TABLE circle', [], function() {
        tx.executeSql('DROP TABLE person', [], function() {
          self.createTable();
          callback();
        }, self.onError);
      }, self.onError);
    }, self.onError);
  });
};

PlusDB.prototype.getCircleEntity = function() {
  return this.circleEntity;
};

PlusDB.prototype.getPersonEntity = function() {
  return this.personEntity;
};

PlusDB.prototype.getPersonCircleEntity = function() {
  return this.personCircleEntity;
};
// ---[ AbstractEntity ]---------------------------------------------------

/**
 * Represents a table entity.
 *
 * @param {PlusDB} db The active database.
 * @param {string} name The entity name.
 * @constructor
 */
AbstractEntity = function(db, name) {
  if (!db || !name) throw new Error('Invalid AbstractEntity: ' + db + ' - ' + name);
  this.db = db;
  this.name = name;
};

/**
 * The entity name.
 *
 * @return {string} The name of the entity.
 */
AbstractEntity.prototype.getName = function() {
  return this.name;
};

/**
 * Logging object.
 */
AbstractEntity.prototype.log = function(msg, obj_opt) {
  var obj = obj_opt || '';
  //console.log(msg, obj);
};

/**
 * Deletes everything from the table.
 *
 * @param {function(!Object)} callback The listener to call when completed.
 */
AbstractEntity.prototype.clear = function(callback) {
  var sql = 'DELETE FROM ' + this.name;
  this.log(sql);
  this.db.transaction(function(tx) {
    tx.executeSql(sql, [], function(tx, rs) {
        callback({status: true, data: rs});
      }, function(tx, e) {
        callback({status: false, data: e.message});
      }
    );
  });
};

/**
 *
 * @param {function(!Object)} callback The listener to call when completed.
 */
AbstractEntity.prototype.persist = function(obj, callback) {
  var self = this;
  if (!JSAPIHelper.isArray(obj)) {
    obj = [obj];
  }
  this.db.transaction(function(tx) {
    for (var i = 0; i < obj.length; i++) {
      var element = obj[i];
      var parameterized = [];
      var keys = [];
      var values = [];
      for (var key in element) {
        if (element.hasOwnProperty(key)) {
          keys.push(key);
          values.push(element[key]);
          parameterized.push('?');
        }
      }
      var id = element.id;
      var sql = 'INSERT INTO ' + self.name + '(' + keys.join(', ') + ') VALUES(' + parameterized.join(', ') + ')';
      self.log(sql, values);

      tx.executeSql(sql, values, function(tx, rs) {
          if (!id) id = rs.insertId;
          callback({status: true, data: rs, id: id});
        }, function(tx, e) {
          callback({status: false, data: e.message});
        }
      );
    }
  });
};

/**
 *
 * @param {function(!Object)} callback The listener to call when completed.
 */
AbstractEntity.prototype.remove = function(id, callback) {
  var sql = 'DELETE FROM ' + this.name + ' WHERE id = ?';
  this.log(sql, id);
  this.db.transaction(function(tx) {
    tx.executeSql(sql, [id], function(tx, rs) {
        callback({status: true, data: rs});
      }, function(tx, e) {
        callback({status: false, data: e.message});
      }
    );
  });
};

/**
 *
 * @param {function(!Object)} callback The listener to call when completed.
 */
AbstractEntity.prototype.update = function(obj, callback) {
  var self = this;
  if (!JSAPIHelper.isArray(obj)) {
    obj = [obj];
  }

  this.db.transaction(function(tx) {
    for (var i = 0; i < obj.length; i++) {
      var element = obj[i];
      if (!element.id) {
        callback({status: false, data: 'No ID present for ' + self.name});
        continue;
      }

      // Make sure we have at least two keys in the object.
      var keyCount = 0;
      var update = [];
      var data = [];
      for (var key in element) {
        if (element.hasOwnProperty(key)) {
          keyCount++;
          if (key != 'id') {
            update.push(key + ' = ?')
            data.push(element[key]);
          }
        }
      }
      data.push(element.id)

      if (keyCount < 1) {
        callback({status: false, data: 'No keys to update for ' + self.name});
        continue;
      }

      var sql = 'UPDATE ' + self.name + ' SET ' + update.join(', ') + ' WHERE id = ?';
      self.log(sql, data);
      tx.executeSql(sql, data, function(tx, rs) {
          callback({status: true, data: rs});
        }, function(tx, e) {
          callback({status: false, data: e.message});
        }
      );
    }
  });
};

/**
 *
 * @param {function(!Object)} callback The listener to call when completed.
 */
AbstractEntity.prototype.find = function(obj, callback) {
  var keys = [];
  var values = [];
  for (var key in obj) {
    if (obj.hasOwnProperty(key)) {
      keys.push(key + ' = ?');
      values.push(obj[key]);
    }
  }
  if (values.length == 0) {
    keys.push('1 = 1');
  }
  var sql = 'SELECT * FROM ' + this.name + ' WHERE ' + keys.join(' AND ');
  this.log(sql);
  this.db.readTransaction(function(tx) {
    tx.executeSql(sql, values, function (tx, rs) {
        var data = [];
        for (var i = 0; i < rs.rows.length; i++) {
          data.push(rs.rows.item(i));
        }
        callback({status: true, data: data});
      }, function(e) {
        console.error('Find', e.message);
        callback({status: false, data: e.message});
      }
    );
  });
};

/**
 *
 * @param {function(!Object)} callback The listener to call when completed.
 */
AbstractEntity.prototype.count = function(obj, callback) {
  var keys = [];
  var values = [];
  for (var key in obj) {
    if (obj.hasOwnProperty(key)) {
      keys.push(key + ' = ?');
      values.push(obj[key]);
    }
  }
  if (values.length == 0) {
    keys.push('1 = 1');
  }
  var sql = 'SELECT count(*) as count FROM ' + this.name + ' WHERE ' + keys.join(' AND ');
  this.log(sql);
  this.db.readTransaction(function(tx) {
    tx.executeSql(sql, values, function (tx, rs) {
        var count = rs.rows.item(0).count;
        callback({status: true, data: count});
      }, function(e) {
        console.error('Count', e.message);
        callback({status: false, data: e.message});
      }
    );
  });
};

/**
 * @param {Object.<string, !Object>} obj The object to save.
 * @param {function(!Object)} callback The listener to call when completed.
 */
AbstractEntity.prototype.save = function(obj, callback) {
  var self = this;
  self.count({id: obj.id}, function(result) {
    if (result.data == 0) {
      self.persist(obj, callback);
    }
    else {
      self.update(obj, callback);
    }
  });
};
// ---[ End AbstractEntity ]------------------------------------------------------------


// ---[ Begin Defining AbstractEntity ]-------------------------------------------------
/**
 * @constructor
 */
PersonEntity = function(db) {
  AbstractEntity.call(this, db, 'person');
};
JSAPIHelper.inherits(PersonEntity, AbstractEntity);

PersonEntity.prototype.eagerFind = function(obj, callback) {
  this.db.readTransaction(function(tx) {
    var keys = [];
    var values = [];
    for (var key in obj) {
      if (obj.hasOwnProperty(key)) {
        keys.push(key + ' = ?');
        values.push(obj[key]);
      }
    }
    if (values.length == 0) {
      keys.push('1 = 1');
    }

    var sql = 'SELECT person.id as id, person.email as email, person.name as name, person.photo as photo, ' +
        'person.location as location, person.employment as employment, person.occupation as occupation, ' +
        'person.score as score, person.in_my_circle as in_my_circle, person.added_me as added_me, ' +
        'circle.id as circle_id, circle.description as circle_description, circle.name as circle_name ' +
        'FROM person LEFT JOIN circle_person ON person.id = circle_person.person_id LEFT JOIN circle ON circle.id = circle_person.circle_id WHERE ' +
        keys.join(' AND ');
    tx.executeSql(sql, values, function (tx, rs) {
        var data = [];
        var prevID = null;
        for (var i = 0; i < rs.rows.length; i++) {
          var item = rs.rows.item(i);
          if (!item.id) {
            continue;
          }
          if (prevID == item.id) {
            data[data.length - 1].circles.push({
              id: item.circle_id,
              name: item.circle_name,
              description: item.circle_description
            });
          }
          else {
            prevID = item.id;
            data.push(item);
            data[data.length - 1].circles = [];
            if (item.circle_id) {
              data[data.length - 1].circles.push({
                id: item.circle_id,
                name: item.circle_name,
                description: item.circle_description
              });
            }
          }
        }
        callback({status: true, data: data});
    }, function(e) {
      console.error('eagerFind', e);
    });
  });
};

/**
 * @constructor
 */
PersonCircleEntity = function(db) {
  AbstractEntity.call(this, db, 'circle_person');
};
JSAPIHelper.inherits(PersonCircleEntity, AbstractEntity);

/**
 * @constructor
 */
CircleEntity = function(db) {
  AbstractEntity.call(this, db, 'circle');
};
JSAPIHelper.inherits(CircleEntity, AbstractEntity);
// ---[ End Defining AbstractEntity ]-------------------------------------------------

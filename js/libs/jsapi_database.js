/**
 * Storage class responsible for managing the database tansactions for Google+
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
PlusDB.prototype.clearAll = function() {
  var self = this;
  self.db.transaction(function(tx) {
    tx.executeSql('DROP TABLE circle_person', [], null,  self.onError);
    tx.executeSql('DROP TABLE circle', [], null,  self.onError);
    tx.executeSql('DROP TABLE person', [], null,  self.onError);
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
// ---[ Entity ]---------------------------------------------------

/**
 * Represents a table entity.
 *
 * @param {PlusDB} db The active database.
 * @param {string} name The entity name.
 */
Entity = function(db, name) {
  if (!db || !name) throw new Error('Invalid Entity: ' + db + ' - ' + name);
  this.db = db;
  this.name = name;
};

/**
 * The entity name.
 *
 * @return {string} The name of the entity.
 */
Entity.prototype.getName = function() {
  return this.name;
};

/**
 * Logging object.
 */
Entity.prototype.log = function(msg, obj_opt) {
  var obj = obj_opt || '';
  //console.log(msg, obj);
};

/**
 * Deletes everything from the table.
 *
 * @param {Function<Object>} callback The listener to call when completed.
 */
Entity.prototype.clear = function(callback) {
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
 * @param {Function<Object>} callback The listener to call when completed.
 */
Entity.prototype.persist = function(obj, callback) {
  var parameterized = [];
  var keys = [];
  var values = [];
  for (var key in obj) {
    if (obj.hasOwnProperty(key)) {
      keys.push(key);
      values.push(obj[key]);
      parameterized.push('?');
    }
  }
  var id = obj.id;
  var sql = 'INSERT INTO ' + this.name + '(' + keys.join(', ') + ') VALUES(' + parameterized.join(', ') + ')';
  this.log(sql, values);
  this.db.transaction(function(tx) {
    tx.executeSql(sql, values, function(tx, rs) {
        if (!id) id = rs.insertId;
        callback({status: true, data: rs, id: id});
      }, function(tx, e) {
        callback({status: false, data: e.message});
      }
    );
  });
};

/**
 *
 * @param {Function<Object>} callback The listener to call when completed.
 */
Entity.prototype.remove = function(id, callback) {
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
 * @param {Function<Object>} callback The listener to call when completed.
 */
Entity.prototype.update = function(obj, callback) {
  if (!obj.id) {
    callback({status: false, data: 'No ID present for ' + this.name});
    return;
  }

  // Make sure we have at least two keys in the object.
  var keyCount = 0;
  var update = [];
  var data = [];
  for (var key in obj) {
    if (obj.hasOwnProperty(key)) {
      keyCount++;
      if (key != 'id') {
        update.push(key + ' = ?')
        data.push(obj[key]);
      }
    }
  }
  data.push(obj.id)

  if (keyCount < 1) {
    callback({status: false, data: 'No keys to update for ' + this.name});
    return;
  }

  var sql = 'UPDATE ' + this.name + ' SET ' + update.join(', ') + ' WHERE id = ?';
  this.log(sql, data);
  this.db.transaction(function(tx) {
    tx.executeSql(sql, data, function(tx, rs) {
        callback({status: true, data: rs});
      }, function(tx, e) {
        callback({status: false, data: e.message});
      }
    );
  });
};

/**
 *
 * @param {Function<Object>} callback The listener to call when completed.
 */
Entity.prototype.find = function(obj, callback) {
  var keys = [];
  var values = [];
  for (var key in obj) {
    if (obj.hasOwnProperty(key)) {
      keys.push(key + ' = ?');
      values.push(obj[key]);
    }
  }
  if (values.length == 0) {
    values = '1 = 1';
  }
  var sql = 'SELECT * FROM ' + this.name + ' WHERE ' + keys.join(' AND ');
  this.log(sql);
  this.db.transaction(function(tx) {
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
 * @param {Function<Object>} callback The listener to call when completed.
 */
Entity.prototype.count = function(obj, callback) {
  var keys = [];
  var values = [];
  for (var key in obj) {
    if (obj.hasOwnProperty(key)) {
      keys.push(key + ' = ?');
      values.push(obj[key]);
    }
  }
  if (values.length == 0) {
    values = '1 = 1';
  }
  var sql = 'SELECT count(*) as count FROM ' + this.name + ' WHERE ' + keys.join(' AND ');
  this.log(sql);
  this.db.transaction(function(tx) {
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
 *
 * @param {Function<Object>} callback The listener to call when completed.
 */
Entity.prototype.save = function(obj, callback) {
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
// ---[ End Entity ]------------------------------------------------------------


// ---[ Begin Defining Entity ]-------------------------------------------------
PersonEntity = function(db) {
  Entity.call(this, db, 'person');
};
DebugHelper.inherits(PersonEntity, Entity);

PersonCircleEntity = function(db) {
  Entity.call(this, db, 'circle_person');
};
DebugHelper.inherits(PersonCircleEntity, Entity);

CircleEntity = function(db) {
  Entity.call(this, db, 'circle');
};
DebugHelper.inherits(CircleEntity, Entity);
// ---[ End Defining Entity ]-------------------------------------------------
/*!
 * Express Session RethinkDB
 * MIT Licensed
 */

module.exports = function (session, con, r) {
  var Store = session.Store;

  function RethinkStore(options) {
    options = options || {};
    //options.connectOptions = options.connectOptions || {};
    Store.call(this, options);

    this.emit('connect');
    this.sessionTimeout = options.sessionTimeout || 86400000; // 1 day
    this.table = options.table || 'session';
    setInterval( function() {
      var now = new Date().getTime();
      try {
        r.table(this.table).filter(r.row('expires').lt(now)).delete().run(con);
      } 
      catch (error) {
        console.error( error );
      }
    }.bind( this ), options.flushInterval || 60000 );
  }
  
  RethinkStore.prototype = new Store();

  // Get Session
  RethinkStore.prototype.get = function (sid, fn) {
    r.table(this.table).get(sid).run(con).then(function (data) {
      fn( null, data ? JSON.parse(data.session) : null ); 
    }).error( function (err) {
      fn(err);
    });
  };

  // Set Session
  RethinkStore.prototype.set = function (sid, sess, fn) {
    var sessionToStore = {
      id: sid,
      expires: new Date().getTime() + (sess.cookie.originalMaxAge || this.sessionTimeout),
      session: JSON.stringify(sess)
    };
    r.table(this.table).insert(sessionToStore, { conflict: 'replace' }).run(con).then(function (data) {
      if (typeof fn == 'function'){
        fn();
      }
    }).error( function (err) {
      fn(err);
    });
  };

  // Destroy Session
  RethinkStore.prototype.destroy = function (sid, fn) {
    r.table(this.table).get(sid).delete().run(con).then(function (data) {
      if (typeof fn == 'function'){
        fn();
      }
    }).error( function (err) {
      fn(err);
    });
  };

  return RethinkStore;
};

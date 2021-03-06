var async = require('async');

module.exports = function(self, options) {
  self.route('post', 'versions-editor', function(req, res) {
    var _id = self.apos.launder.id(req.body._id);
    var doc;
    var versions;
    return async.series({
      findDoc: function(callback) {
        return self.apos.docs.find(req, { _id: _id }).published(null).permission('edit').toObject(function(err, _doc) {
          if (err) {
            return callback(err);
          }
          if (!_doc) {
            return callback('notfound');
          }
          doc = _doc;
          return callback(null);
        });
      },
      findVersions: function(callback) {
        return self.find(req, { docId: doc._id }, {}, function(err, _versions) {
          if (err) {
            return callback(err);
          }
          var i;
          versions = _versions;
          for (i = 0; (i < versions.length - 1); i++) {
            // Something to diff against
            versions[i]._previous = versions[i + 1];
          }
          return callback(null);
        });
      }
    }, function(err) {
      if (err) {
        console.error(err);
        res.statusCode = 404;
        return res.send('notfound');
      }
      return res.send(self.render(req, 'versions', { doc: doc, versions: versions }));
    });
  });

  self.route('post', 'compare', function(req, res) {
    var oldId = self.apos.launder.id(req.body.oldId);
    var currentId = self.apos.launder.id(req.body.currentId);
    var current;
    return async.series({
      findVersions: function(callback) {
        return self.find(req, { _id: { $in: [ oldId, currentId ] } }, { changes: true }, function(err, versions) {
          if (err) {
            return callback(err);
          }
          if (versions.length !== 2) {
            return callback('notfound');
          }
          current = versions[0];
          return callback(null);
        });
      }
    }, function(err) {
      if (err) {
        console.error(err);
        res.statusCode = 404;
        return res.send('notfound');
      }
      return res.send(self.render(req, 'version', { doc: current._doc, version: current }));
    });
  });

  self.route('post', 'revert', function(req, res) {
    var version;
    return async.series({
      fetch: function(callback) {
        return self.find(req, { _id: self.apos.launder.id(req.body._id) }, {}, function(err, versions) {
          if (err) {
            return callback(err);
          }
          if (!versions[0]) {
            return callback('notfound');
          }
          version = versions[0];
          return callback(null);
        });
      },
      revert: function(callback) {
        return self.revert(req, version, callback);
      }
    }, function(err) {
      if (err) {
        return res.send({ status: (typeof (err) === 'string') ? err : 'error' });
      }
      return res.send({ status: 'ok' });
    });
  });
};

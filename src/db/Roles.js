const MongoClient = require('mongodb').MongoClient;
const Promise = require('bluebird');

Promise.promisifyAll(MongoClient);

var connectionUrl = `mongodb://${process.env.database_username}:${process.env.database_password}@${process.env.database_connection_string}`;

module.exports = {
  RoleGet: roleGet,
  RolesGet: rolesGet,
  RoleUpsert: roleUpsert
}

/**
 * Opens and closes the connection to a remote mongodb instance.
 * @param {*string} url - The connection string.
 */
function getMongoConnection(url) {
  return MongoClient.connect(url, { promiseLibrary: Promise })
    .disposer(conn => conn.close());
}

function roleGet(role){
  return new Promise.using(getMongoConnection(connectionUrl), conn => {
    var query = { roleID : role.id };
    var values = { roleID: role.id, roleName: role.name };
    
    return conn.collection('roles').findOne(query);
  });
}

function rolesGet() {
  return new Promise.using(getMongoConnection(connectionUrl), conn => {
    var query = {};
    return conn.collection('roles').find(query).toArray();
  });
}


function roleUpsert(role){
  return new Promise.using(getMongoConnection(connectionUrl), conn => {
    var query = { roleID: role.id };
    var values = { roleID: role.id, roleName: role.name, rolDependency: role.id };
    var options = { upsert: true };

    return conn.collection('roles').updateOne(query, values, options);
  });
}

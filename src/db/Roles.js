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

function roleGet(guild, role){
  return new Promise.using(getMongoConnection(connectionUrl), conn => {
    var query = { guildID: guild.id, roleID : role.id };
    var values = { guildID: guild.id, roleID: role.id, roleName: role.name };
    
    return conn.collection('roles').findOne(query);
  });
}

function rolesGet(guild) {
  return new Promise.using(getMongoConnection(connectionUrl), conn => {
    var query = { guildID: guild.id };
    return conn.collection('roles').find(query).toArray();
  });
}


function roleUpsert(guild, role){
  return new Promise.using(getMongoConnection(connectionUrl), conn => {
    var query = { guildID: guild.id, roleID: role.id };
    var values = { guildID: guild.id, roleID: role.id, roleName: role.name, rolDependency: role.id };
    var options = { upsert: true };

    return conn.collection('roles').updateOne(query, values, options);
  });
}

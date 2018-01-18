const MongoClient = require('mongodb').MongoClient;
const Promise = require('bluebird');

Promise.promisifyAll(MongoClient);

var connectionUrl = `mongodb://${process.env.database_username}:${process.env.database_password}@${Config.database_connection_string}`;

module.exports = {
  UserGet: userGet,
  UsersGet: usersGet,
  UserUpsert: userUpsert
}

/**
 * Opens and closes the connection to a remote mongodb instance.
 * @param {*string} url - The connection string.
 */
function getMongoConnection(url) {
  return MongoClient.connect(url, { promiseLibrary: Promise })
    .disposer(conn => conn.close());
}

/**
 * Gets a given guildMember's data from the database.
 * @param {*Discordjs.GuildMember} guildMember - The guild member to get.
 */
function userGet(guildMember){
  return new Promise.using(getMongoConnection(connectionUrl), conn => {
    var query = { userID: guildMember.id, guildID: guildMember.guild.id };
    return conn.collection('users').findOne(query);
  });
}

/**
 * Gets all members from a given guild.
 * @param {*Discordjs.Guild} guild - The guild to get members from.
 */
function usersGet(guild) {
  return new Promise.using(getMongoConnection(connectionUrl), conn => {
    var query = { guildID: guild.id };
    return conn.collection('users').find(query).toArray();
  });
}

/**
 * Stores a given object in the database for guildMember.  For storing ccp auth data.
 * @param {*Discordjs.GuildMember} guildMember - The guildmember to retrieve.
 * @param {*object} data - The data to store.
 */
function userUpsert(guildMember, data){
  return new Promise.using(getMongoConnection(connectionUrl), conn => {
    var query = { userID: guildMember.id, guildID: guildMember.guild.id };
    var values = { userID: guildMember.id, guildID: guildMember.guild.id, data: data };
    var options = { upsert: true };

    conn.collection('users').updateOne(query, values, options);
    return data;
  });
}
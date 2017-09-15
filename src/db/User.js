const MongoClient = require('mongodb').MongoClient;
const Promise = require('bluebird');
const Config = require(`./../../config.json`);
Promise.promisifyAll(MongoClient);

var connectionUrl = `mongodb://${Config.database_username}:${Config.database_password}@ds135364.mlab.com:35364/iondiscordtest`;

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
  var query = { userID: guildMember.id, guildID: guildMember.guild.id };

  return new Promise.using(getMongoConnection(connectionUrl), conn => {
    return conn.collection('users').findOne(query);
  });
}

/**
 * Gets all members from a given guild.
 * @param {*Discordjs.Guild} guild - The guild to get members from.
 */
function usersGet(guild) {
    var query = { guildID: guild.id };

  return new Promise.using(getMongoConnection(connectionUrl), conn => {
    return conn.collection('users').find(query);
  });
}

/**
 * Stores a given object in the database for guildMember.  For storing ccp auth data.
 * @param {*Discordjs.GuildMember} guildMember - The guildmember to retrieve.
 * @param {*object} data - The data to store.
 */
function userUpsert(guildMember, data){
  var query = { userID: guildMember.id, guildID: guildMember.guild.id };
  var values = { userID: guildMember.id, guildID: guildMember.guild.id, data: data };
  var options = { upsert: true };

  return new Promise.using(getMongoConnection(connectionUrl), conn => {
    conn.collection('users').updateOne(query, values, options);
    return data;
  });
}
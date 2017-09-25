const MongoClient = require('mongodb').MongoClient;
const Promise = require('bluebird');
const Config = require(`./../../config.json`);
Promise.promisifyAll(MongoClient);

var connectionUrl = `mongodb://${Config.database_username}:${Config.database_password}@${Config.database_connection_string}`;

module.exports = {
  GuildGet: guildGet,
  GuildUpsert: guildUpsert
}

/**
 * Opens and closes a connection to a remote mongodb database.
 * @param {*string} url - The connection string for mongodb.
 */
function getMongoConnection(url) {
  return MongoClient.connect(url, { promiseLibrary: Promise })
    .disposer(conn => conn.close());
}

/**
 * Gets the given guild from the database.
 * @param {*Discord.Guild} guild - The guild to find.
 */
function guildGet(guild) {
  return new Promise.using(getMongoConnection(connectionUrl), conn => {
    var query = { guildID: guild.id };

    return conn.collection('guilds').findOne(query);
  });
}

/**
 * Updates the given guild in the database.
 * @param {*Discord.Guild} guild - The guild to find. 
 */
function guildUpsert(guild) {
  return new Promise.using(getMongoConnection(connectionUrl), conn => {
    var query = { guildID: guild.guildID };
    var values = { guildID: guild.guildID, guildInformation: guild.guildInformation };
    var options = { upsert: true };
    
    return conn.collection('guilds').updateOne(query, values, options);
  });
}
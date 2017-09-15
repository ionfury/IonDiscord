const MongoClient = require('mongodb').MongoClient;
const Promise = require('bluebird');
const Config = require(`./../../config.json`);
var connectionUrl = `mongodb://${Config.database_username}:${Config.database_password}@ds135364.mlab.com:35364/iondiscordtest`;

Promise.promisifyAll(MongoClient);

module.exports = {
  GuildInformationGet: guildInformationGet,
  GuildInformationUpsert: guildInformationUpsert
}

function getMongoConnection(url) {
  return MongoClient.connect(url, { promiseLibrary: Promise })
    .disposer(conn => conn.close());
}

function guildInformationGet(guild) {
  var query = { guildID: guild.id };
  return new Promise.using(getMongoConnection(connectionUrl), conn => {
    return conn.collection('guilds').findOne(query);
  });
}

function guildInformationUpsert(guild) {
  var query = { guildID: guild.guildID };
  var values = { guildID: guild.guildID, guildInformation: guild.guildInformation };
  var options = { upsert: true };

  return new Promise.using(getMongoConnection(connectionUrl), conn => {
    return conn.collection('guilds').updateOne(query, values, options);
  });
}
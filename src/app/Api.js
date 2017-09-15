const RequestPromise = require('request-promise');
const User = require(`../db/User.js`);
const Config = require(`./../../config.json`);

module.exports = {
  AuthToken: authToken,
  VerifyToken: verifyToken
}

/**
 * Attempts to get a verification token.
 * @param {*Discordjs.Message} msg - The message which triggered this action.
 * @param {*string} code - The verification token.
 */
function authToken(guildMember, token){
  var options = {
    method: 'POST',
    url: "https://login.eveonline.com/oauth/token",
    headers: {
      "authorization": "Basic " + Buffer.from(Config.client_id+":"+Config.client_secret).toString('base64'),
      "content-type": "application/json"
    },
    json: {
      "grant_type":"authorization_code",
      "code":token
    }
  };

  return RequestPromise(options);
}

function verifyToken(record) {
  var options = {
    method: 'GET',
    url: "https://login.eveonline.com/oauth/verify",
    headers: {
      "authorization" : "Bearer " + record.access_token
    }
  };

  return RequestPromise(options);
}



/// Updates the roles for the guildmember in the guild using accesstoken and responds in channel.
function updateRoles(guildMember, guild, accessToken, channel) {
  console.log(`\nUpdating Roles for user: ${guildMember.nickname} in guild ${guild.name}, with access token: ${accessToken}...`);
  var options = {
    method: 'GET',
    url: "https://login.eveonline.com/oauth/verify",
    headers: {
      "authorization" : "Bearer " + accessToken
    }
  };
}
/*
  Request.get(options, function(err, res, body) {
    if(res && (res.statusCode === 200 || res.statusCode === 201)) {
      var data = JSON.parse(body);
      var characterName = data.CharacterName;
      var defaultRole = Config.role_mappings.default;
      var role = guild.roles.find(x => x.name === defaultRole);

      //Check default role
      guildMember
        .addRole(role)
        .catch(err => { channel.send(`:x: Failed to add ${role} to user ${guildMember}.`) });

      //Check corp roles
      ESI.characters(data.CharacterID).info()
      .then(result => {
        var corp = result.corporation_id;
        var corpRoles = Config.role_mappings.corp;

        corpRoles.forEach(function(corpRole) {
          var role = guild.roles.find(x => x.name === corpRole.role_name);

          if(corpRole.corporation_id === corp) {
            guildMember
              .addRole(role)
              .catch(err => { channel.send(`:x: Failed to add ${role} to user ${guildMember}.`) });
          } else {
            guildMember
              .removeRole(role)
              .catch(err => { channel.send(`:x: Failed to remove ${role} from user ${guildMember}.`) });
          }
        });

        //Check alliance roles
        ESI.corporations(result.corporation_id).info()
        .then(result => {
          var ticker = result.ticker;
          var newName = `[${ticker}] ${characterName}`;

          guildMember
            .setNickname(newName)
            .then(res => { channel.send(`:white_check_mark: Renamed ${guildMember}.`)})
            .catch(err => { channel.send(`:x: Failed to update ${guildMember}'s name to \"${newName}\".`) });
          
          var alliance = result.alliance_id;
          var allianceRoles = Config.role_mappings.alliance;
          
          allianceRoles.forEach(function(allianceRole) {
            var role = guild.roles.find(x => x.name === allianceRole.role_name);
            if(allianceRole.alliance_id === alliance){
              guildMember
                .addRole(role)
                .catch(err => { channel.send(`:x: Failed to add ${role} to user ${guildMember}.`) });
            } else {
              guildMember
                .removeRole(role)
                .catch(err => { channel.send(`:x: Failed to remove ${role} from user ${guildMember}.`) });
            }
          });
        })
        .catch(err => {
          console.log(`Failed to retrieve ESI Alliances: ${err}`);
          channel.send(`:x: Failed to retrieve ESI Alliances.`);
        });
      })
      .catch(err => {
        console.log(`Failed to retrieve ESI Corps: ${err}`);
        channel.send(`:x: Failed to retrieve ESI Corporations.`);
      });
    } else if(res) {
      console.log(`\nError: ${res.statusCode}: ${JSON.stringify(body)}`);
    } else {
      console.log(`\nERROR: Nothing returned.`);
    }
  });
}*/

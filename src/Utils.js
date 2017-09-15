const discord = require(`discord.js`);
const Config = require(`./../config.json`);
const Guild = require(`./db/Guild.js`);
const ESI = require('eve-swagger');

module.exports = {
  CheckHasRoleByName: checkHasRoleByName,
  UpdateRoles: updateRoles
};

/**
 * Checks a given guildMember for a role given it's name.
 * @param {*Discordjs.GuildMember} guildMember - The guildMember to check for the role. 
 * @param {*string} roleName - The roleName
 */
function checkHasRoleByName(guildMember, roleName) {
  var guild = guildMember.guild;
  var role = guild.roles.find(x => x.name === roleName);

  return guildMember.roles.has(role.id);
}

/**
 * Updates roles for a given guildMember based on character data and guild data by querying ESI endpoints for character and corporation.
 * @param {*Discordjs.Channel} channel - The channel to reply in.
 * @param {*Discordjs.GuildMember} guildMember - The guildmember.
 * @param {*json} characterData - The character data json blob.
 * @param {*json} guildData - The guild data json blob.
 */
function updateRoles(channel, guildMember, characterData, guildData) {
  var guild = guildMember.guild;
  var data = JSON.parse(characterData);
  var characterName = data.CharacterName;
  var corpRoles = guildData.guildInformation.corp_roles;
  var allianceRoles = guildData.guildInformation.alliance_roles;
  var defaultRoleName = guildData.guildInformation.default_role;
  var defaultRole = guild.roles.find(x => x.name === defaultRoleName);

  //Check default role
  guildMember
    .addRole(defaultRole)
    .catch(err => { channel.send(`:x: Failed to add default role ${defaultRole} to user ${guildMember}.`) });
    
  //Check corp roles
  ESI.characters(data.CharacterID).info()
    .then(result => {
      var corp = result.corporation_id;
      corpRoles.forEach(corpRole => {
        
        var role = guild.roles.find(x => x.name === corpRole.role_name);

        if(corpRole.corp_id == corp) {
          guildMember
            .addRole(role)
            .catch(err => { channel.send(`:x: Failed to add ${role} to user ${guildMember}.`) });
        } else {
          guildMember
            .removeRole(role)
            .catch(err => { channel.send(`:x: Failed to remove ${role} from user ${guildMember}.`) });
        }

        //Check alliance roles
        ESI.corporations(corp).info()
          .then(result => {
            var ticker = result.ticker;
            var newName = `[${ticker}] ${characterName}`;

            guildMember
              .setNickname(newName)
              .then(res => { channel.send(`:white_check_mark: Renamed ${guildMember}.`)})
              .catch(err => { channel.send(`:x: Failed to update ${guildMember}'s name to \"${newName}\".`) });
            
            var alliance = result.alliance_id;
            
            allianceRoles.forEach(function(allianceRole) {
              var role = guild.roles.find(x => x.name === allianceRole.role_name);
              if(allianceRole.alliance_id == alliance){
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
            console.log(`Failed to retrieve ESI Corporations: ${err}`);
            channel.send(`:x: Failed to retrieve ESI Corporations.`);
          });
      });
    })
    .catch(err => {
      console.log(`Failed to retrieve ESI Corps: ${err}`);
      channel.send(`:x: Failed to retrieve ESI Characters.`);
    });
}
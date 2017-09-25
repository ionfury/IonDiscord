const Discord = require(`discord.js`);
const ESI = require('eve-swagger');
const Promise = require('bluebird');

const Guild = require(`../db/Guild.js`);
const User = require(`../db/User.js`);
const Api = require(`../remote/Api.js`);

const Config = require(`./../../config.json`);

module.exports = {
  CheckHasRoleByName: checkHasRoleByName,
  UpdateRoles: updateRoles,
  DisplayDefaultRole: displayDefaultRole,
  SetDefaultRole: setDefaultRole,
  DisplayAllianceRoles : displayAllianceRoles,
  AddAllianceToRole: addAllianceToRole,
  RemoveAllianceFromRole: removeAllianceFromRole,
  DisplayCorpRoles: displayCorpRoles,
  AddCorpToRole: addCorpToRole,
  RemoveCorpFromRole: removeCorpFromRole,
  NotifyUnauthenticatedUsers: notifyUnauthenticatedUsers,
  Authorize: authorize,
  Purge: purgeUnauthenticatedUsers,
  RefreshUserRoles: refreshUserRoles,
  RefreshAllUserRoles: refreshAllUserRoles
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
            .catch(err => { channel.send(`:x:${err}: Failed to add ${role} to user ${guildMember}.`) });
        } else {
          guildMember
            .removeRole(role)
            .catch(err => { channel.send(`:x:${err}: Failed to remove ${role} from user ${guildMember}.`) });
        }

        //Check alliance roles
        ESI.corporations(corp).info()
          .then(result => {
            var ticker = result.ticker;
            var newName = `[${ticker}] ${characterName}`;

            if(guildMember.nickname != newName)
              guildMember
                .setNickname(newName)
                .then(res => { channel.send(`:white_check_mark: Renamed ${guildMember}.`)})
                .catch(err => { channel.send(`:x:${err}: Failed to update ${guildMember}'s name to \"${newName}\".`) });
            
            var alliance = result.alliance_id;
            
            allianceRoles.forEach(function(allianceRole) {
              var role = guild.roles.find(x => x.name === allianceRole.role_name);
              if(allianceRole.alliance_id == alliance){
                guildMember
                  .addRole(role)
                  .catch(err => { channel.send(`:x:${err}: Failed to add ${role} to user ${guildMember}.`) });
              } else {
                guildMember
                  .removeRole(role)
                  .catch(err => { channel.send(`:x:${err}: Failed to remove ${role} from user ${guildMember}.`) });
              }
            });
          })
          .catch(err => {
            console.log(`Failed to retrieve ESI Corporations: ${err}`);
          });
      });
    })
    .catch(err => {
      console.log(`Failed to retrieve ESI Corps: ${err}`);
      channel.send(`:x: Failed to retrieve ESI Characters.`);
    });
}

/**
 * Respond in msg.channel with a list of alliance role associations.
 * @param {*Discordjs.Message} msg - The message which triggered this action.
 * @param {*Discordjs.Guild} guild - The guild to display alliances for.
 */
function displayAllianceRoles(msg, guild) {
  Guild.GuildGet(guild)
    .then(out => {
      var message = `Alliance role mappings:\n`

      message += out.guildInformation.alliance_roles
      .map(allianceRole => {
        var role = guild.roles.find(role => role.name === allianceRole.role_name);
        return `\t${allianceRole.alliance_id}: ${role}`;
      }).join(`\n`);
      
      msg.channel.send(`${message}`);
    })
    .catch(err => {
      msg.channel.send(`:x: ${err}`);
    });
}

/**
 * Attempts to add the alliance/role association to guild and replies in msg.channel with the result.
 * @param {*Discordjs.Message} msg - The message which triggered this action.
 * @param {*int} allianceID - The allianceID to add.
 * @param {*string} roleName - The role name to add.
 * @param {*Discordjs.Guild} guild - The guild to add the alliance and role to.
 */
function addAllianceToRole(msg, allianceID, roleName, guild) {
  Guild.GuildGet(guild)
    .then(out => {
      var recordExists = out.guildInformation.alliance_roles.some(kvp => (kvp.role_name === roleName || kvp.alliance_id === corpID));
      var roleExists = msg.channel.guild.roles.some(role => role.name === roleName);
      
      if(recordExists) {
        throw new Error (`**Role Name** or **Alliance ID** is already registered.`);
      } else if (!roleExists) {
        throw new Error (`Role **${roleName}** does not exists.`);
      } else {
        out.guildInformation.alliance_roles.push({ "alliance_id" : allianceID, "role_name" : roleName });
      } 

      return out;
    })
    .then(Guild.GuildUpsert)
    .then(modified => { if(modified) msg.channel.send(`:white_check_mark: Record added!`) })
    .catch(err => {
      msg.channel.send(`:x: ${err}`);
    });
}

/**
 * Attempts to remove the alliance/role association to the guild and replies in msg.channel with the result.
 * @param {*Discordjs.Message} msg - The message which triggered this action.
 * @param {*int} allianceID - The allianceID to add.
 * @param {*string} roleName - The role name to add.
 * @param {*Discordjs.Guild} guild - The guild to remove the alliance and role from.
 */
function removeAllianceFromRole(msg, allianceID, roleName, guild) {
  Guild.GuildGet(guild)
    .then(out => {
      var recordExists = out.guildInformation.alliance_roles.some(kvp => (kvp.role_name === roleName || kvp.alliance_id === allianceID));

      if(!recordExists) {
        throw new Error (`**Role Name** or **Alliance ID** has not been registered.`);
      } else {
        out.guildInformation.alliance_roles = out.guildInformation.alliance_roles.filter(kvp => !(kvp.role_name === roleName || kvp.alliance_id === allianceID));
      }

      return out;
    })
    .then(Guild.GuildUpsert)
    .then(modified => { if(modified) msg.channel.send(`:white_check_mark: Record removed!`) })
    .catch(err => {
      msg.channel.send(`:x: ${err}`);
    });
}

/**
 * Respond in msg.channel with a list of corp role associations.
 * @param {*Discordjs.Message} msg - The message which triggered this action.
 * @param {*Discordjs.Guild} guild - The guild to display alliances for.
 */
function displayCorpRoles(msg, guild) {
  Guild.GuildGet(guild)
    .then(out => {
      var message = `Corporation role mappings:\n`;

      message += out.guildInformation.corp_roles
      .map(corpRole => {
        var role = guild.roles.find(role => role.name === corpRole.role_name);
        return `\t${corpRole.corp_id}: ${role}`;
      }).join(`\n`);
      
      msg.channel.send(`${message}`);
    })
    .catch(err => {
      msg.channel.send(`:x: ${err}`);
    });
}

/**
 * Attempts to add the corp/role association to guild and replies in msg.channel with the result.
 * @param {*Discordjs.Message} msg - The message which triggered this action.
 * @param {*int} corpID - The corpID to add.
 * @param {*string} roleName - The role name to add.
 * @param {*Discordjs.Guild} guild - The guild to add the corp and role to.
 */
function addCorpToRole(msg, corpID, roleName, guild) {
  Guild.GuildGet(guild)
    .then(out => {
      var recordExists = out.guildInformation.corp_roles.some(kvp => (kvp.role_name === roleName || kvp.corp_id === corpID));
      var roleExists = msg.channel.guild.roles.some(role => role.name === roleName);
      
      if(recordExists) {
        throw new Error (`**Role Name** or **Corp ID** is already registered.`);
      } else if (!roleExists) {
        throw new Error (`Role **${roleName}** does not exists.`);
      } else {
        out.guildInformation.corp_roles.push({ "corp_id" : corpID, "role_name" : roleName });
      } 

      return out;
    })
    .then(Guild.GuildUpsert)
    .then(modified => { if(modified) msg.channel.send(`:white_check_mark: Record added!`) })
    .catch(err => {
      msg.channel.send(`:x: ${err}`);
    });
}

/**
 * Attempts to remove the corp/role association from the guild and replies in msg.channel with the result.
 * @param {*Discordjs.Message} msg - The message which triggered this action.
 * @param {*int} corpID - The corpID to add.
 * @param {*string} roleName - The role name to add.
 * @param {*Discordjs.Guild} guild - The guild to remove the corp and role from.
 */
function removeCorpFromRole(msg, corpID, roleName, guild) {
  Guild.GuildGet(guild)
    .then(out => {
      var recordExists = out.guildInformation.corp_roles.some(kvp => (kvp.role_name === roleName || kvp.corp_id === corpID));

      if(!recordExists) {
        throw new Error (`**Role Name** or **Corp ID** has not been registered.`);
      } else {
        out.guildInformation.corp_roles = out.guildInformation.corp_roles.filter(kvp => !(kvp.role_name === roleName || kvp.corp_id === corpID));
      }

      return out;
    })
    .then(Guild.GuildUpsert)
    .then(modified => { if(modified) msg.channel.send(`:white_check_mark: Record removed!`) })
    .catch(err => {
      msg.channel.send(`:x: ${err}`);
    });
}

/**
 * Respond in msg.channel with the default role.
 * @param {*Discordjs.Message} msg - The message which triggered this action.
 * @param {*Discordjs.Guild} guild - The guild to display alliances for.
 */
function displayDefaultRole(msg, guild) {
  Guild.GuildGet(guild)
    .then(out => {
      console.log(out);
      var message = `Default role: `;
      message += guild.roles.find(role => role.name === out.guildInformation.default_role);

      msg.channel.send(`${message}`);
    })
    .catch(err => {
      msg.channel.send(`:x: ${err}`);
    });
}

/**
 * Attempts to set the default role and replies in msg.channel with the result.
 * @param {*Discordjs.Message} msg - The message which triggered this action.
 * @param {*string} roleName - The role name to add.
 * @param {*Discordjs.Guild} guild - The guild to remove the corp and role from.
 */
function setDefaultRole(msg, roleName, guild) {
  Guild.GuildGet(guild)
    .then(out => {
      var roleExists = msg.channel.guild.roles.some(role => role.name === roleName);

      if(!roleExists) {
        throw new Error (`Role **${roleName}** does not exists.`);
      } else {
        out.guildInformation.default_role = roleName;
        console.log(out);
      }

      return out;
    })
    .then(Guild.GuildUpsert)
    .then(modified => { if(modified) msg.channel.send(`:white_check_mark: Default role updated!`)})
    .catch(err => {
      msg.channel.send(`:x: ${err}`);
    });
}

function notifyUnauthenticatedUsers(msg, guild) {
  User.UsersGet(guild)
    .then(users => {
      var members = guild.members.map(member => {
        member.isAuthenticated = users.some(user => user.userID == member.id);
        return member;
      });
      var unAuthenticated = members.filter(member => member.isAuthenticated == false);

      var message = `\nusers:`;
      unAuthenticated.forEach((member, index) => {
        message += `\n\t`;
        message += member.isAuthenticated ? ':white_check_mark:' : ':x:';
        message += ` ${member}`

        if(index % 20 === 0) {
          msg.channel.send(message);
          message = ``;
        }
      });

      msg.channel.send(message);
    })
    .catch(err => {
      msg.channel.send(`:x: ${err}`);
    });
}

function purgeUnauthenticatedUsers(msg, guild) {
  User.UsersGet(guild)
    .then(users => {
      var members = guild.members.map(member => {
        member.isAuthenticated = users.some(user => user.userID == member.id);
        return member;
      });
      var unAuthenticated = members.filter(member => member.isAuthenticated == false);

      Promise.each(unAuthenticated, member => {
        member.setRoles([])
          .catch(err => {
            msg.channel.send(`:x: ${err} for user ${member}`);
          });
      })
    })
    .catch(err => {
      msg.channel.send(`:x: ${err}`);
    });
}

function refreshUserRoles(msg, guildMember) {
  User.UserGet(guildMember)
    .then(user => {
      if(user) {
        refreshToken(msg, guildMember, user);
      } else {
        throw new Error (`${guildMember} has not yet authenticated.`)
      }
    })
    .catch(err => {
      msg.channel.send(`:x: ${err}`);
    });
}


function refreshAllUserRoles(msg, guild) {
  User.UsersGet(guild)
    .then(users => {
      Promise.each(users, user => {
        var guildMember = guild.members.find(x => x.id == user.userID);
        
        refreshToken(msg, guildMember, user);
      });
    });
}

function refreshToken(msg, guildMember, user) {
  Api.RefreshToken(user)
    .then(res => {
      return [guildMember, res];
    })
    .spread(User.UserUpsert)
    .then(res => {
      Promise.join(
        Api.VerifyToken(res),
        Guild.GuildGet(guildMember.guild),
        function(verifyData,guildData) {
          return updateRoles(msg.channel, guildMember, verifyData, guildData);
        }
      );
    })
    .catch(err => {
      msg.channel.send(`:x: ${err}`);
    });
}

/**
 * Takes an auth token and auths against ESI, then updates guildMember's name and permissions from EVE.
 * @param {*Discordjs.Message} msg - The message which triggered this action.
 * @param {*Discordjs.GuildMember} guildMember - The guildMember.
 * @param {*string} token - The auth token.
 */
function authorize(msg, guildMember, token) {
  Api.AuthToken(token)
    .then(res => {
      return [guildMember, res];
    })
    .spread(User.UserUpsert)
    .then(res => {
      Promise.join(
        Api.VerifyToken(res),
        Guild.GuildGet(guildMember.guild),
        function(verifyData,guildData) {
          return updateRoles(msg.channel, guildMember, verifyData, guildData);
        }
      )
      .then(res => {
        msg.channel.send(`:white_check_mark: Authenticated ${guildMember}.`)
      })
      .catch(err => {
        msg.channel.send(`:x: ${guildMember}: ${err}`);
      });

    })
    .catch(err => {
      msg.channel.send(`:x: ${err}`);
    });
}
const Discord = require(`discord.js`);
const ESI = require('eve-swagger');
const Promise = require('bluebird');

const Guild = require(`../db/Guild.js`);
const User = require(`../db/User.js`);
const Api = require(`../remote/Api.js`);

const Config = require(`./../../config.json`);

module.exports = {
  AddAllianceToRole: addAllianceToRole,
  AddCorpToRole: addCorpToRole,
  Authorize: authorize,
  CheckHasRoleByName: checkHasRoleByName,
  DisplayAllianceRoles : displayAllianceRoles,
  DisplayCorpRoles: displayCorpRoles,
  DisplayDefaultRole: displayDefaultRole,
  RefreshUserRoles: refreshUserRoles,
  RemoveAllianceFromRole: removeAllianceFromRole,
  RemoveCorpFromRole: removeCorpFromRole,
  NotifyUnauthenticatedUsers: notifyUnauthenticatedUsers,
  Purge: purgeUnauthenticatedUsers,
  SetDefaultRole: setDefaultRole,
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
      var recordExists = out.guildInformation.alliance_roles.some(kvp => (kvp.role_name === roleName || kvp.alliance_id === allianceID));
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
        if(index % 20 === 0) {
          msg.channel.send(message);
          message = `\`...\`\n`;
        }

        message += `\n\t`;
        message += member.isAuthenticated ? ':white_check_mark:' : ':x:';
        message += ` ${member}`
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

/**
 * Refreshes roles for a user if they have already authenticated, otherwise reports it to Channel.
 * @param {Message} msg The 
 * @param {GuildMember} guildMember The GuildMember.
 */
function refreshUserRoles(msg, guildMember) {
  User.UserGet(guildMember)
    .then(user => {
      if(user) {
        authorize(msg, guildMember, user.data.refresh_token, 'refresh');
      } else {
        throw new Error (`${guildMember} has not yet authenticated.`);
      }
    })
    .catch(err => {
      msg.channel.send(`:x: ${err}`);
    });
}

/**
 * Takes an auth token and auths against ESI, then updates guildMember's name and permissions from EVE.
 * @param {Message} msg The message which triggered this action.
 * @param {GuildMember} guildMember The guildMember.
 * @param {string} token The auth token.
 * @param {string} type Either "auth" or "refresh". 
 */
function authorize(msg, guildMember, token, type) {
  if(type !== 'auth' && type !== 'refresh') 
    throw new Error (`Invalid type parameter: "${type}.`);

  var channel = msg.channel;

  var guild = Guild.GuildGet(guildMember.guild);
  var auth = type === 'auth' ? 
    Api.AuthToken(token).then(x => {return [guildMember, x];}) :
    Api.RefreshToken(token).then(x => {return [guildMember, x];});
  var access = auth.spread(User.UserUpsert).then(x => {return x.access_token;});
  var verify = access.then(Api.VerifyToken).then(parseCharacterID);
  var character = verify.then(x => {return ESI.characters(x).info();});
  var corp = character.then(x => {return x.corporation_id;}).then(x => {return ESI.corporations(x).info();});
  
  Promise.join(guild, auth, access, verify, character, corp, (guild, auth, access, verify, character, corp) => {
    var guildMember = auth[0];
    var authInfo = auth[1];
    var newName = `[${corp.ticker}] ${character.name}`;

    updateName(guildMember, newName, channel);
    updateDefaultRole(guildMember, guild.guildInformation.default_role, channel);
    updateCorpRoles(guildMember, character.corporation_id, guild.guildInformation.corp_roles, channel);
    updateAllianceRoles(guildMember, character.alliance_id, guild.guildInformation.alliance_roles, channel);

    return guildMember;
  })
  .then(x => {
    msg.channel.send(`:white_check_mark: ${type === 'auth' ? 'Authenticated' : 'Refreshed'} ${x}.`);
  })
  .catch(err => {
    msg.channel.send(`:x:Failed to ${type === 'auth' ? 'authenticate' : 'refresh'} ${guildMember}: ${err}.`);
  });
}

/**
 * Updates the name of guildMember to name, reporting errors to channel.
 * @param {GuildMember} guildMember The GuildMember.
 * @param {string} name The guildmember's new name. 
 * @param {Channel} channel The channel.
 */
function updateName(guildMember, name, channel) {
  guildMember
    .setNickname(name)
    .catch(err => { channel.send(`:x:${err}: Failed to update ${guildMember}'s name to **${name}**.`) });
}

/**
 * Updates roles for guildMember where corpID matches corpRoles, reporting errors to channel.
 * @param {GuildMember} guildMember The GuildMember.
 * @param {int} corporationID The guildmember's corp's id.
 * @param {array} corpRoles An array of type [int, string].
 * @param {Channel} channel The channel.
 */
function updateCorpRoles(guildMember, corporationID, corpRoles, channel) {
  corpRoles.forEach(corpRole => {
    var role = guildMember.guild.roles.find(x => x.name === corpRole.role_name);

    if(corpRole.corp_id == corporationID) {
      guildMember.addRole(role)
        .catch(err => { channel.send(`:x:${err}: Failed to add ${role ? role : corpRole.role_name} to user ${guildMember}.`) });
    } else {
      guildMember.removeRole(role)
        .catch(err => { channel.send(`:x:${err}: Failed to remove ${role ? role : corpRole.role_name} from user ${guildMember}.`) });
    }
  });
}

/**
 * Updates roles for guildMember where allianceID matches allianceRoles, reporting errors to channel.
 * @param {GuildMember} guildMember The GuildMember.
 * @param {int} allianceID The guildmember's alliance's id.
 * @param {array} allianceRoles An array of type [int,string].
 * @param {Channel} channel The channel.
 */
function updateAllianceRoles(guildMember, allianceID, allianceRoles, channel) {
  allianceRoles.forEach(allianceRole => {
    var role = guildMember.guild.roles.find(x => x.name === allianceRole.role_name);

    if(allianceRole.alliance_id == allianceID) {
      guildMember.addRole(role)
        .catch(err => { channel.send(`:x:${err}: Failed to add ${role ? role : allianceRole.role_name} to user ${guildMember}.`) });
    } else {
      guildMember.removeRole(role)
        .catch(err => { channel.send(`:x:${err}: Failed to remove ${role ? role : allianceRole.role_name} from user ${guildMember}.`) });
    }
  });
}

/**
 * Looks up the roleName and adds it to guildMember, reporting errors into channel.
 * @param {GuildMember} guildMember The GuildMember.
 * @param {string} roleName The role name.
 * @param {Channel} channel The channel.
 */
function updateDefaultRole(guildMember, roleName, channel) {
  var defaultRole = guildMember.guild.roles.find(x => x.name === roleName);

  guildMember
    .addRole(defaultRole)
    .catch(err => { channel.send(`:x:${err}: Failed to add default role ${defaultRole ? defaultRole : roleName} to user ${guildMember}.`) });
}

/**
 * Parses a characterID from a string.
 * 
 * @param {json} res The json object/string containing an attribute "CharacterID".
 * @returns The characterId.
 */
function parseCharacterID(res) {
  if(!res.CharacterID) 
    res = JSON.parse(res);

  characterID = res.CharacterID;
  return res.CharacterID;
}
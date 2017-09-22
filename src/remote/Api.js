const RequestPromise = require('request-promise');
const User = require(`../db/User.js`);
const Config = require(`./../../config.json`);

module.exports = {
  AuthToken: authToken,
  VerifyToken: verifyToken,
  RefreshToken: refreshToken
}

/**
 * Returns an auth promise.
 * @param {*Discordjs.Message} msg - The message which triggered this action.
 * @param {*string} code - The verification token.
 */
function authToken(token){
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

function refreshToken(record) {
  var options = {
    method: 'POST',
    url: "https://login.eveonline.com/oauth/token",
    headers: {
      "Authorization": "Basic " + Buffer.from(Config.client_id+":"+Config.client_secret).toString('base64'),
      "content-type": "application/json"
    },
    json: {
      "grant_type":"refresh_token",
      "refresh_token": record.data.refresh_token
    }
  };

  return RequestPromise(options);  
}


/**
 * Returns a verification promise.
 * @param {*} record 
 */
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
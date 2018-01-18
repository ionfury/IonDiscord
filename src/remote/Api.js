const RequestPromise = require('request-promise');
const User = require(`../db/User.js`);

module.exports = {
  AuthToken: authToken,
  VerifyToken: verifyToken,
  RefreshToken: refreshToken
}

/**
 * Authroizes a token through ESI. 
 * @param {string} token The code.
 * @returns A RequestPromise.
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

/**
 * Refreshes a token through ESI.
 * @param {string} token The refresh_token.
 * @returns a RequestPromise.
 */
function refreshToken(token) {
  var options = {
    method: 'POST',
    url: "https://login.eveonline.com/oauth/token",
    headers: {
      "Authorization": "Basic " + Buffer.from(Config.client_id+":"+Config.client_secret).toString('base64'),
      "content-type": "application/json"
    },
    json: {
      "grant_type":"refresh_token",
      "refresh_token": token
    }
  };

  return RequestPromise(options);  
}


/**
 * Verifies a token through ESI.
 * @param {string} token Verification token
 * @returns a RequestPromise.
 */
function verifyToken(token) {
  var options = {
    method: 'GET',
    url: "https://login.eveonline.com/oauth/verify",
    headers: {
      "authorization" : "Bearer " + token
    }
  };

  return RequestPromise(options);
}
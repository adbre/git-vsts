'use strict';

const request = require('request');
const extend = require('lodash').assign;
const util = require('util');

class VisualStudioTeamServices {
    constructor(instance, accessToken) {
        this._instance = instance;
        this._auth = 'Basic ' + new Buffer('Personal Access Token:'+accessToken).toString('base64');
    }

    getRepositories(project) {
        return this._request(util.format('https://%s/DefaultCollection/%s/_apis/git/repositories', this._instance, project));
    }

    createPullRequest(repository, pullRequest) {
        return this._request(util.format('https://%s/defaultcollection/_apis/git/repositories/%s/pullRequests', this._instance, repository.id), {
            method: 'POST',
            json: pullRequest
        })
    }

    _request(uri, options) {
        let defaultOptions = {
            qs: { 'api-version': '3.0-preview' },
            headers: { 'Authorization': this._auth },
            json: true
        };
        options = extend(defaultOptions, options);

        return new Promise((resolve, reject) => {
            request(uri, options, (error, response, body) => {
                if (error) {
                    reject(error);
                }
                else if (response.statusCode < 200 || response.statusCode >= 300) {
                    reject({
                        error: 'Server did not respond with OK',
                        response: response,
                        body: body
                    });
                }
                else {
                    resolve({response: response, body: body});
                }
            });
        });
    }
}

module.exports = VisualStudioTeamServices;

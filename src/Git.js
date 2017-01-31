'use strict';
const simpleGit = require('simple-git');

class Git {
    constructor(repository) {
        this._git = simpleGit(repository);
    }

    revparse(options) { return new Promise((resolve, reject) => this._git.revparse(options, this._makeHandlerFn(resolve, reject))); }
    fetch(options) { return new Promise((resolve, reject) => this._git.fetch(options, this._makeHandlerFn(resolve, reject))); }
    getRemotes(verbose) { return new Promise((resolve, reject) => this._git.getRemotes(verbose, this._makeHandlerFn(resolve, reject))); }
    push(remote, branch, options) { return new Promise((resolve, reject) => this._git.push(remote, branch, options, this._makeHandlerFn(resolve, reject))); }
    log(options) { return new Promise((resolve, reject) => this._git.log(options, this._makeHandlerFn(resolve, reject))); }
    raw(options) { return new Promise((resolve, reject) => this._git.raw(options, this._makeHandlerFn(resolve, reject))); }

    config(name) {
        return this.raw(['config',name])
            .then(value => {
                value = (value || '').trim();
                if (value.length < 1) {
                    return Promise.reject('Git configuration value either does not exists or is empty: '+name);
                }
                else {
                    return Promise.resolve(value);
                }
            });
    }

    _makeHandlerFn(resolve, reject) {
        return (error, result) => {
            if (error) {
                reject(error);
            }
            else {
                resolve(result);
            }
        };
    }
}

module.exports = Git;

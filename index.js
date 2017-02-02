#!/usr/bin/env node
'use strict';

const util = require('util');
const url = require('url');
const path = require('path');
const Git = require('./src/Git');
const VisualStudioTeamServices = require('./src/VisualStudioTeamServices');

let config = {};
let git = new Git(process.cwd());
let vsts;

if (process.argv.length < 3) {
    console.log('USAGE', 'git-vsts', 'create-pr|create-pull-request');
    process.exit(1);
}

git.getRemotes(true)
    .then(remotes => {
        let origin = remotes.filter(r => r.name === 'origin')[0];
        if (!origin) {
            return Promise.reject('Cannot find remote origin');
        }

        let uri = url.parse(origin.refs.fetch);
        config.instance = uri.host;
        config.project = path.basename(uri.pathname);
    })
    .then(() => git.config('vsts.access-token'))
    .then(value => config.accessToken = value)
    .then(() => {
        vsts = new VisualStudioTeamServices(config.instance, config.accessToken);
    })
    .then(() => {
        console.log('Fetching latest from server to avoid conflicts...');
        return git.fetch()
            .then(() => console.log('Done fetching'));
    })
    .then(() => {
        return git.raw(['rev-list','HEAD'])
            .then(out => {
                let commits = out.split('\n').map(l => l.trim());
                return git.revparse(['origin/master'])
                    .then(out => out.trim())
                    .then(masterCommitHash => {
                        let isDescendant = commits.indexOf(masterCommitHash) >= 0;
                        if (!isDescendant) {
                            return Promise.reject('Current branch is not a descendant of origin/master. Please rebase onto origin/master first.');
                        }
                        else {
                            return Promise.resolve();
                        }
                    });
            });
    })
    .then(() => {
        return git.revparse(['--abbrev-ref','HEAD'])
            .then(out => out.trim())
            .then(branchName => git.log(['HEAD...origin/master']).then(log => {
                return {
                    commits: log.all.map(commit => {
                        commit.title = commit.message.split('\n')[0].trim();
                        commit.title = commit.title.replace(/(.*) \((HEAD -> )?(.+(\/.+)*)\)$/i, '$1');
                        return commit;
                    }),
                    branchName: branchName
                };
            }));
    })
    .then(data => {
        // the commits are in reverse chronological order (newest first)
        let oldestCommit = data.commits[data.commits.length - 1];
        console.log(util.format('pushing first commit %s...', oldestCommit.hash));
        return git.push(['origin', oldestCommit.hash + ':refs/heads/' + data.branchName, '--force-with-lease'])
            .then(() => Promise.resolve(data));
    })
    .then(data => {
        let pullRequest = {
            title: util.format('Merge %s into master', data.branchName),
            description: data.commits.slice().reverse().reduce((str, commit) => {
                return str + util.format(' - %s\n', commit.title);
            }, ''),
            sourceRefName: 'refs/heads/'+ data.branchName,
            targetRefName: 'refs/heads/master',
            reviewers: []
        };

        return vsts.getRepositories(config.project)
            .then(response => {
                let repositories = response.body.value;
                if (!repositories)
                    return Promise.reject('Could not get any repositories. Check your access token.');
                if (repositories.length > 1)
                    return Promise.reject('There is more than one repository in the project.');
                else if (repositories.length < 0)
                    return Promise.reject('There is no repositories in the project.');
                else
                    return Promise.resolve(repositories[0]);
            })
            .then(repository => {
                console.log('Creating pull request...');
                return vsts.createPullRequest(repository, pullRequest);
            })
            .then(() => Promise.resolve(data));
    })
    .then(data => data.commits.reverse().slice(1).reduce((p, commit) => p.then(() => {
            console.log(util.format('pushing %s...', commit.hash));
            return git.push(['origin', commit.hash + ':' + data.branchName, '--force-with-lease']);
    }), Promise.resolve()).then(Promise.resolve(data)))
    .then(data => {
        return git.raw(['branch','-u', 'origin', data.branchName])
            .then(out => console.log(out.trim()));
    })
    .then(() => console.log('All done!'))
    .catch(error => console.error('ERROR', error));
/**/
# git-vsts
Command line tool to create pull requests in Visual Studio Team Services,
pushing each commit seperatly to intentionally create multiple update sets.

# Install

    npm install -g

# Setup

1. Create a personal access token in Visual Studio.
2. Configure your git workspace with your access token


    git config vsts.access-token your-secret-access-token

# Usage

    git-vsts create-pr
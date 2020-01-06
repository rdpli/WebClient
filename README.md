# ProtonMail Web Client

[![CircleCI](https://circleci.com/gh/ProtonMail/Angular.svg?style=svg&circle-token=d960b54918d5375b4e7639ca505d14a0e131dc21)](https://circleci.com/gh/ProtonMail/Angular) 

Official AngularJS web client for the [ProtonMail secure email service](https://protonmail.com). ProtonMail also makes use of [OpenPGPjs](https://github.com/openpgpjs/openpgpjs) as our message cryptography is PGP compliant.

## Translation

[![Crowdin](https://d322cqt584bo4o.cloudfront.net/protonmail/localized.svg)](https://crowdin.com/project/protonmail)

We are currently working with our community to localize ProtonMail from English to most of the world's major languages. If you're interested in being part of this translation project, send us an email to contact@protonmail.com with the subject line "ProtonMail Translation Project [Your Language]" and we will offer you more information about it.



>**⚠ If you use Windows plz follow this document before anything else [how to prepare Windows](https://github.com/ProtonMail/proton-shared/wiki/setup-windows)**



## Basic Installation

- `npm install`
- `npm start`

> To run the app without babel `npm run start:raw`

### dependencies
  - Node.js >= v8
  - npm 6
  - git

### Error with Mac

You need to install a few dep in order to be able to deploy
```sh
brew install libpng
```
> or `brew upgrade libpng` if you already have the lib

### For Windows

If you use Windows, you will need to have bash on your computer in order to execute everything ex:
- run tests
- deploy
- etc.

1. Install bash then check the path of bash ex: `C:\\Program Files\\git\\bin\\bash.exe"`
2. `npm config set script-shell "C:\\Program Files\\git\\bin\\bash.exe"`
3. :popcorn:

[More informations](https://stackoverflow.com/questions/23243353/how-to-set-shell-for-npm-run-scripts-in-windows)

## Development

We are very open to bug reports via Issues as well as Pull Requests.

### Config

To build the app with settings and contacts, you need a file `.env`;
ex:

```shell
ROOT_DIR=/home/dhoko/dev/taf
WEBCLIENT_APP=Angular
SETTINGS_APP=settings
CONTACTS_APP=contacts
CALENDAR_APP=calendar
``` 

- **ROOT_DIR**: _mandatory_ Direcotory where your apps are cf [Where should I clone them](https://github.com/ProtonMail/protonmail-settings#where-should-i-should-i-clone-them-) 
- **WEBCLIENT_APP**: Current directory where the Webclient is (_by default `Angular`_)
- **SETTINGS_APP**: Current directory where protonmail-settings is (_by default `protonmail-settings`_)
- **CONTACTS_APP**: Current directory where proton-contacts is (_by default `proton-contacts`_)
- **CALENDAR_APP**: Current directory where proton-calendar is (_by default `proton-calendar`_)


### CI build - no minify

`npm run build`

> Same as `npm start` use --api to change the default api

### CI build for e2e

`npm run build:ci`

> Same as `npm start` use --api to change the default api


### Custom command

```
npx appComponent
npm run create
npm run create:test
```
cf [Component Generator](https://github.com/ProtonMail/componentGenerator)

## Deploy

1. Create a new version + tag => `npm version (patch|minor|major)`.
2. Deploy via npm `npm run deploy -- --api=X --branch=Y`.
    - `X` is the API version available in `API_TARGETS` in the `env/config.js` file
    - `Y` can be `deploy-dev`, `deploy-beta`, `deploy-prod-a` or `deploy-prod-b`.

Each `deploy-<NAME>` will be available at `<NAME>.protonmail.com`.


> `npm run deployProd` will deploy the bundle for both prod, old, dev and tor

### CLI Flags

- `--branch` : Deploy branch dest
- `--api` : Set an API for the app (_dev, live, etc._)
- `--debug`: turn on debug mode for the command (default false)
- `--i18n`: Force sync translations (default false)
- `--no-calendar`: Do not build the subproject proton-calendar
- `--no-contacts`: Do not build the subproject proton-contacts
- `--no-settings`: Do not build the subproject protonmail-settings
- `--remote-pm-settings`: Build protonmail-settings from the git repository (_no need to have a local copy_)
- `--remote-calendar`: Build proton-calendar from the git repository (_no need to have a local copy_)
- `--remote-contacts`: Build proton-contacts from the git repository (_no need to have a local copy_)

## I18n à la demande

> Extract translation keys

```sh
npm run i18n:extract
```

> We build i18n when we create a build for beta or prod

```sh
npm run i18n:build
```

It will do everything you need. Import new translations first for a better result ;)

## Release notes

### Generate the file CHANGELOG.md

The command is going to generate a new entry inside the file `./CHANGELOG.md`. It works with [semver](https://semver.org/). You set which kind of entry you want (_patch_, _minor_ or _major_) and it's going to add it inside the file.

```sh
npm run releaser:unshift <patch|minor|major>
```

> :information_source:  It won't create a new version/git tag


ex: today version 3.16.5
```md
# [3.16.5] - 2019-10-01

[...]
``` 

`$ npm run releaser:unshift minor`

Output:
```md
# [3.17.0] - 2019-10-01

[...]

# [3.16.5] - 2019-10-01

[...]
``` 

### Extract markdown

*NOTE: In order to generate the release notes you need to set the `RELEASER_GH_TOKEN` environment variable.*

To generate release notes for the latest version (tag), run the following command:
```sh
npm run releaser:extract
```

To generate release notes for a specific version (tag), run:
```sh
npm run releaser:extract -- --tag v3.12.24
```

The release notes are outputted to `stdout`. Those notes have to be manually inserted to `CHANGELOG.md`.

It is also possible to run the following command to automatically unshift the output from releaser into `CHANGELOG.md`
```sh
npm run releaser:unshift
```

### Generate HTML file
The HTML file from the `CHANGELOG.md` file is automatically generated when running `start -- --debug` or `dist`. It takes the markdown file and generates the HTML file at `${build}/assets/changelog.tpl.html` which will be dynamically fetched when the modal opens.


## Commit naming conventions
For a fix linked to an issue number:
- `(Fix|Close|Resolve) #ISSUENUMBER` (multiple allowed, separated by comma)

For a hotfix not linked to any issue:
- `Hotfix - Description`

Any commits that follow this convention will be included in the release notes generator.

For fixes linked to an issue, the description will be taken from GitHub and grouped according to if it has the `Bug` or `Feature` label.

For hotfixes, the description in the commit name will be included in the release notes under the group `Others`.


## Branch naming conventions

For a fix
- `fix/<your feature>`

For a feature
- `feat/<your feature>`
- or `feature/<your feature>`

## Tests

```shell
npm test
```

> To edit test it's better to run `npm run testwatch` (_tests with a watcher_)

## End to end testing for AngularJS

Based on [The Amazing Cypress](https://www.cypress.io).

Dev:
`npx cypress open` or `npm run cypress:open`

CI:
```shell
npm run e2e
```


## License

Copyright (c) 2013-2020

Proton Technologies A.G. (Switzerland)

Email: contact@protonmail.com

License: https://github.com/ProtonMail/WebClient/blob/public/LICENSE

const extend = require('lodash/extend');
const { execSync } = require('child_process');
const argv = require('minimist')(process.argv.slice(2));
const CONFIG_DEFAULT = require('./configDefault');

const {
    STATS_CONFIG,
    STATS_ID,
    NO_STAT_MACHINE,
    API_TARGETS,
    AUTOPREFIXER_CONFIG,
    SENTRY_CONFIG,
    SECURED_IFRAME,
    TOR_URL
} = require('./config.constants');

const getBranch = (branch = argv.branch) => {
    return (Array.isArray(branch) ? branch[0] : branch) || '';
};

const ARG_BRANCH = getBranch();

const isWebClient = () => {
    try {
        const origin = execSync('git remote get-url origin');
        return !/ProtonMail\/A/.test((origin || '').toString());
    } catch (e) {
        return true;
    }
};

const getBuildCommit = () => {
    try {
        const origin = execSync('git rev-parse HEAD');
        return origin.toString().trim();
    } catch (e) {
        return '';
    }
};

const hasEnv = () => Object.keys(SENTRY_CONFIG).length;
const isProdBranch = (branch = process.env.NODE_ENV_BRANCH) => /-prod/.test(branch);
const isTorBranch = (branch = process.env.NODE_ENV_BRANCH) => /-tor$/.test(branch);
const typeofBranch = (branch = process.env.NODE_ENV_BRANCH) => {
    const [, type] = (branch || '').match(/deploy-(\w+)/) || [];
    if (/dev|beta|prod|old/.test(type)) {
        return type;
    }

    if (isTorBranch(branch)) {
        return 'prod';
    }

    if (type === 'alpha') {
        return 'red';
    }

    if (type) {
        return 'blue';
    }
    return 'dev';
};

const getStatsConfig = (deployBranch = '') => {
    const branch = Array.isArray(deployBranch) ? deployBranch[0] : deployBranch;
    const [, host = 'dev', subhost = 'a'] = branch.split('-');
    return extend({}, STATS_CONFIG[host], STATS_ID[subhost]) || NO_STAT_MACHINE;
};

const getDefaultApiTarget = (defaultType = 'dev') => {
    if (isWebClient() || !hasEnv()) {
        return 'prod';
    }

    if (process.env.NODE_ENV === 'dist') {
        const [, type] = ARG_BRANCH.match(/\w+-(beta|prod)/) || [];
        if (type) {
            return type;
        }

        return 'build';
    }

    return defaultType;
};

const isDistRelease = () => {
    return ['prod', 'beta'].includes(argv.api) || process.env.NODE_ENV === 'dist';
};

const getSingleArgument = (argument) => {
    // Many flags creates an array, take the last one.
    if (Array.isArray(argument)) {
        const { length, [length - 1]: last, first } = argument;
        return last || first;
    }
    return argument;
};

const getFeatureFlags = () => {
    return getSingleArgument(argv.featureFlags) || '';
};

const getEnv = () => {
    if (isDistRelease()) {
        return argv.api || getDefaultApiTarget();
    }
    return argv.api || 'local';
};

const apiUrl = (type = getDefaultApiTarget(), branch = '') => {
    // Cannot override the branch when you deploy to live
    if (isProdBranch(branch) || isTorBranch(branch)) {
        return API_TARGETS.build;
    }
    return API_TARGETS[type] || API_TARGETS.dev;
};

/**
 * Get correct sentry UR/releaseL config for the current env
 * release can be undefined if we don't have a release available
 * - on dev it's based on the API you specify
 * - on deploy it's based on the branch name
 * @return {String}
 */
const sentryConfig = (branch) => {
    if (process.env.NODE_ENV === 'dist') {
        const env = typeofBranch(branch || ARG_BRANCH);
        process.env.NODE_ENV_SENTRY = env;

        // For production the release is the version else the hash where we ran the build
        const release = env === 'prod' ? CONFIG_DEFAULT.app_version : getBuildCommit();

        return {
            ...SENTRY_CONFIG[env],
            release
        };
    }
    return {};
};

const getHostURL = (encoded) => {
    const url = `/assets/host.png`;

    if (encoded) {
        const encoder = (input) => (input !== ':' ? `%${input.charCodeAt(0).toString(16)}` : ':');
        return url.split('/').reduce((acc, chunk, i) => {
            if (!chunk) {
                return acc;
            }

            const val = chunk
                .split('')
                .map(encoder)
                .join('');

            return `${acc}/${val}`;
        }, '');
    }
    return url;
};

const getEnvDeploy = ({ env = process.env.NODE_ENV, config = true } = {}) => {
    const opt = {
        debug: env === 'dist' ? false : 'debug-app' in argv ? argv['debug-app'] : true,
        securedIframe: SECURED_IFRAME[argv.api],
        apiUrl: apiUrl(argv.api, ARG_BRANCH),
        app_version: argv['app-version'] || CONFIG_DEFAULT.app_version,
        api_version: `${argv['api-version'] || CONFIG_DEFAULT.api_version}`,
        articleLink: argv.article || CONFIG_DEFAULT.articleLink,
        changelogPath: CONFIG_DEFAULT.changelogPath,
        statsConfig: getStatsConfig(ARG_BRANCH),
        sentry: sentryConfig(),
        featureFlags: getFeatureFlags()
    };

    if (!config) {
        opt.branch = ARG_BRANCH;
    }
    return opt;
};

const getConfig = (env = process.env.NODE_ENV, branch) => ({
    ...CONFIG_DEFAULT,
    ...getEnvDeploy(),
    sentry: sentryConfig(branch),
    commit: getBuildCommit()
});

module.exports = {
    AUTOPREFIXER_CONFIG,
    getHostURL,
    getConfig,
    isDistRelease,
    getEnvDeploy,
    getStatsConfig,
    argv,
    getEnv,
    getHostURL,
    hasEnv,
    isWebClient
};

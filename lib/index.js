const ValidUrl = require('valid-url');
const Path = require('path');
const FileSystem = require('fs');
const Axios = require('axios');
const Cache = require('./Cache');
const Logger = require('./Logger');
const exec = require('util').promisify(require('child_process').exec);

// Hack: Using Symbols to make methods and fields on the object private

// Methods
const checkForConflictAndInstall = Symbol();
const load = Symbol();
const downloadFromURL = Symbol();
const getDependencies = Symbol();
const installDependency = Symbol();
const isObjectEmpty = Symbol();

// Fields
const localPackageJSONPath = Symbol();
const cache = Symbol();

class RequireUrl {
    REQUIRE_DEPENDENCIES = 1;
    REQUIRE_DEV_DEPENDENCIES = 2;
    REQUIRE_BOTH = 3;

    constructor(config) {
        let cachePath;
        let cacheExpiration;

        if (config) {
            if (!config.CACHE_PATH)
                throw new Error('The CACHE_PATH field is not defined on the configuration object!');

            if (!config.CACHE_EXPIRATION)
                throw new Error('The CACHE_EXPIRATION field is not defined on the configuration object!');

            if (typeof config.CACHE_PATH !== 'string')
                throw new Error('The CACHE_PATH field on the configuration object must be a string!');

            if (config.CACHE_PATH.length === 0)
                throw new Error('The CACHE_PATH field on the configuration object can not be empty!');

            if (!Number.isInteger(config.CACHE_EXPIRATION))
                throw new Error('The CACHE_EXPIRATION field on the configuration object must be an integer!');

            if (!config.PACKAGE_JSON)
                throw new Error('The PACKAGE_JSON field is not defined on the configuration object!');

            if (typeof config.PACKAGE_JSON !== 'string')
                throw new Error('The PACKAGE_JSON field on the configuration object must be a string!');

            if (typeof config.PACKAGE_JSON.length === 0)
                throw new Error('The PACKAGE_JSON field on the configuration object can not be empty!');

            cachePath = config.CACHE_PATH;
            cacheExpiration = config.CACHE_EXPIRATION;
            this[localPackageJSONPath] = config.PACKAGE_JSON;

            if (config.SUPPRESS_MESSAGES) {
                if (!(typeof config.SUPPRESS_MESSAGES === 'boolean' || typeof config.SUPPRESS_MESSAGES === 'number'))
                    throw new Error('The SUPPRESS_MESSAGES field on the configuration object must be either a boolean or a number!');

                Logger.setSuppress(config.SUPPRESS_MESSAGES);
            }
        } else {
            cachePath = Path.resolve(process.cwd(), 'cached_modules');
            cacheExpiration = 86400; // 86400 seconds = 1 day
        }

        this[cache] = new Cache(cachePath, cacheExpiration);
    }

    async from(url) {
        try {
            if (!url || !ValidUrl.isUri(url)) {
                Logger.error('The provided URL is invalid!');
                throw new Error('The provided URL is invalid!');
            }

            let path = this[cache].formatPath(url);

            if (this[cache].isCached(url))
                return this[load](url, path);

            await this[downloadFromURL](url, path);
            this[cache].cacheUrl(url, path);

            return this[load](url, path);
        } catch (error) {
            throw error;
        }
    }

    async installFromRemotePackageJSON(url, option = this.REQUIRE_DEPENDENCIES) {
        let path;
        let count;

        try {
            if (!url || !ValidUrl.isUri(url)) {
                Logger.error('The provided URL is invalid!');
                throw new Error('The provided URL is invalid!');
            }

            const fileName = url.split('/').pop();
            const temporaryFileName = fileName.concat('.tmp');
            path = Path.resolve(process.cwd(), temporaryFileName);

            await this[downloadFromURL](url, path);

            const localDependencies = this[getDependencies](this[localPackageJSONPath], option);
            const remoteDependencies = this[getDependencies](path, option);

            if (option == this.REQUIRE_DEPENDENCIES || option == this.REQUIRE_BOTH) {
                if (!localDependencies.dependencies && remoteDependencies.dependencies) {
                    for (let [remoteDependencyName, remoteDependencyVersion] of Object.entries(remoteDependencies.dependencies))
                        await this[installDependency](remoteDependencyName, remoteDependencyVersion);
                } else if (localDependencies.dependencies && remoteDependencies.dependencies) // Otherwise
                    await this[checkForConflictAndInstall](localDependencies.dependencies, remoteDependencies.dependencies);
            }

            if (option == this.REQUIRE_DEV_DEPENDENCIES || option == this.REQUIRE_BOTH) {
                if (!localDependencies.devDependencies && remoteDependencies.devDependencies) {
                    for (let [remoteDependencyName, remoteDependencyVersion] of Object.entries(remoteDependencies.devDependencies))
                        await this[installDependency](remoteDependencyName, remoteDependencyVersion, true);
                } else if (localDependencies.devDependencies && remoteDependencies.devDependencies) // Otherwise
                    await this[checkForConflictAndInstall](localDependencies.devDependencies, remoteDependencies.devDependencies, true);
            }
        } catch (error) {
            throw error;
        } finally {
            if (path) {
                if (FileSystem.existsSync(path))
                    FileSystem.unlinkSync(path);
            }
        }
    }

    async [checkForConflictAndInstall](localDependencies, remoteDependencies, dev = false) {
        let conflict = false;
        let alreadyInstalled = false;

        for (let [remoteDependencyName, remoteDependencyVersion] of Object.entries(remoteDependencies)) {
            for (let [localDependencyName, localDependencyVersion] of Object.entries(localDependencies)) {
                if (localDependencyName === remoteDependencyName) {
                    if (localDependencyVersion !== remoteDependencyVersion) {
                        Logger.warn(`Local dependency '${localDependencyName}' version: '${localDependencyVersion}' 
                            clashes with remote version: '${remoteDependencyVersion}', you must resovle the conflict manually, 
                            skipping installation!`);

                        conflict = true;
                    } else alreadyInstalled = true;

                    break;
                }
            }

            if (!conflict || alreadyInstalled)
                await this[installDependency](remoteDependencyName, remoteDependencyVersion, dev)

            conflict = false;
            alreadyInstalled = false;
        }
    }

    async [installDependency](name, version, dev = false) {
        Logger.info(`Installing remote ${dev ? 'dev ' : ''}dependency '${name}', version: '${version}', locally...`);

        const { stdout, stderr } = await exec(`npm install ${name}@${version} --save${dev ? '-dev' : ''}`.trim());

        if (stdout)
            Logger.info(`NPM output: ${stdout}`);

        if (stderr)
            Logger.error(`NPM error: ${stderr}`);
    }

    [load](url, path) {
        const source = FileSystem.readFileSync(path, 'utf8').toString();

        if (source.length === 0) {
            Logger.error(`The provided module from '${url}' (On the disk: '${path}') is empty!`);
            throw new Error(`The provided module from '${url}' (On the disk: '${path}') is empty!`);
        }

        const _module_ = new module.constructor();

        _module_.filename = path;
        _module_._compile(source, path);

        return _module_.exports;
    }

    async [downloadFromURL](url, path) {
        const writer = FileSystem.createWriteStream(path);
        const response = await Axios({
            url,
            method: 'GET',
            responseType: 'stream'
        });

        response.data.pipe(writer);

        return new Promise((resolve, reject) => {
            writer.on('finish', resolve);
            writer.on('error', reject);
        });
    };

    [getDependencies](packageJsonPath, option) {
        const content = FileSystem.readFileSync(packageJsonPath, 'utf8').toString();

        if (content.length === 0) {
            Logger.error(`The provided file (On the disk: '${packageJsonPath}') is empty!`);
            throw new Error(`The provided file (On the disk: '${packageJsonPath}') is empty!`);
        }

        try {
            const packageJSON = JSON.parse(content);

            if (!packageJSON) {
                Logger.error(`The provided file (On the disk: '${packageJsonPath}') does not contain an object!`);
                throw new Error(`The provided file (On the disk: '${packageJsonPath}') does not contain an object!`);
            }

            if ((option == this.REQUIRE_DEPENDENCIES || option == this.REQUIRE_BOTH) && (!packageJSON.dependencies || this[isObjectEmpty](packageJSON.dependencies)))
                Logger.warn(`The provided file (On the disk: '${packageJsonPath}') does not contain any dependencies!`);

            if (option == this.REQUIRE_DEV_DEPENDENCIES || option == this.REQUIRE_BOTH) {
                if (!packageJSON.devDependencies || this[isObjectEmpty](packageJSON.devDependencies)) {
                    Logger.warn(`The provided file (On the disk: '${packageJsonPath}') does not contain any dev dependencies!`);
                    return { dependencies: packageJSON.dependencies };
                }

                return {
                    dependencies: packageJSON.dependencies,
                    devDependencies: packageJSON.devDependencies
                };
            }

            return { dependencies: packageJSON.dependencies };
        } catch (error) {
            throw error;
        }
    }

    [isObjectEmpty](object) {
        for (let propperty in object) {
            if (object.hasOwnProperty(propperty))
                return false;
        }

        return JSON.stringify(object) === JSON.stringify({});
    }
}

module.exports = RequireUrl;
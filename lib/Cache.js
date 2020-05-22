// Modules
const Path = require('path');
const FileSystem = require('fs');

// Hack: Using Symbols for private methods and fileds in the class

// Methods
const loadCache = Symbol();
const saveCache = Symbol();
const deleteCache = Symbol();
const buildCacheFilePath = Symbol();

// Fields
const cacheObject = Symbol();
const cachePath = Symbol();
const cacheExpiration = Symbol();

class Cache {
    constructor(path, expiration) {
        this[cachePath] = path;
        this[cacheExpiration] = expiration;

        if (!FileSystem.existsSync(this[cachePath]))
            FileSystem.mkdirSync(this[cachePath]);
    }

    isCached(url) {
        if (!this[cacheObject]) {
            if (!this[loadCache]())
                return false;
        }

        for (let item of this[cacheObject].cachedModules) {
            if (!item || !item.url || !item.path)
                continue;

            if (item.url === url)
                return item;
        }

        return false;
    }

    cacheUrl(url, path) {
        if (this.isCached(url))
            return false;

        if (!this[cacheObject]) {
            this[cacheObject] = {
                expiration: new Date().getTime() + this[cacheExpiration],
                cachedModules: new Array()
            };
        }

        this[cacheObject].cachedModules.push({
            url,
            path
        });

        this[saveCache]();
        return true;
    }

    formatPath(url) {
        let lastPart = url.split('/').pop();
        return Path.resolve(this[cachePath], lastPart.endsWith('.js') ? lastPart : lastPart.concat('.js'));
    }

    [loadCache]() {
        const cacheFilePath = this[buildCacheFilePath]();

        if (!FileSystem.existsSync(cacheFilePath))
            return false;

        let cache;

        try {
            const source = FileSystem.readFileSync(cacheFilePath, 'utf8').toString();
            cache = JSON.parse(source);
        } catch (error) {
            this[deleteCache]();
            return false;
        }

        if (!cache || !cache.cachedModules || !cache.expiration || !Array.isArray(cache.cachedModules)) {
            this[deleteCache]();
            return false;
        }

        if (cache.expiration <= new Date().getTime()) {
            this[deleteCache]();
            return false;
        }

        this[cacheObject] = cache;
        return true;
    }

    [saveCache]() {
        const cache = this[cacheObject];

        if (!cache || !cache.cachedModules || !cache.expiration || !Array.isArray(cache.cachedModules)) {
            this[deleteCache]();
            return false;
        }

        this[deleteCache](true);

        const cacheFilePath = this[buildCacheFilePath]();

        FileSystem.open(cacheFilePath, 'w', (error, file) => {
            if (error)
                throw error;

            cache.expiration = new Date().getTime() + this[cacheExpiration];
            FileSystem.writeFileSync(cacheFilePath, JSON.stringify(cache));
        });

        return true;
    }

    [deleteCache](onlyFile = false) {
        const cacheFilePath = this[buildCacheFilePath]();

        if (!onlyFile) {
            if (this[cacheObject] && this[cacheObject].cachedModules) {
                for (let item of this[cacheObject].cachedModules) {
                    if (!item || !item.url || !item.path)
                        continue;

                    // Delete the cached file if exists
                    if (FileSystem.existsSync(item.path))
                        FileSystem.unlinkSync(item.path);
                }

                delete this[cacheObject];
            }
        }

        if (FileSystem.existsSync(cacheFilePath))
            FileSystem.unlinkSync(cacheFilePath);
    }

    [buildCacheFilePath]() {
        return Path.resolve(this[cachePath], 'cache.json');
    }
}

module.exports = Cache;
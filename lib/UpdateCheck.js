const UpdateNotifier = require('update-notifier')({ pkg: require('../package.json') });
const Colors = require('colors');

module.exports = {
    CheckForUpdates: () => {
        if (UpdateNotifier.update) {
            console.log(`[Require-URL] New version ${UpdateNotifier.update.latest} is avaliable!`.bgMagenta.white);
            console.log(`[Require-URL] Please read the changelog before updating!`.bgRed.white);
        }
    }
}
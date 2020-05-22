require('colors');

class Logger {
    static setSuppress(suppress) {
        Logger.suppress = suppress;
    }

    static info(message) {
        if (Logger.suppress)
            return;

        console.log(`${message}`.bgGreen.gray);
    }

    static warn(message) {
        if (Logger.suppress)
            return;

        console.log(`${message}`.bgYellow.red);
    }

    static error(message) {
        if (Logger.suppress)
            return;

        console.log(`${message}`.bgRed.white);
    }
}

module.exports = Logger;
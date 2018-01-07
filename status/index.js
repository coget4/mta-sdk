import dgram from 'dgram';
import Util from './util';
import Protocol from './ase';

const activeQueries = [];
const debug = process.env.NODE_ENV === 'dev';
const udpSocket = dgram.createSocket('udp4');
udpSocket.unref();
udpSocket.bind(21943)

udpSocket.on('message', (buffer, rinfo) => {
    if (debug) console.log(`${rinfo.address}:${rinfo.port} <--UDP\n`, Util.debugDump(buffer));
    for (const query of activeQueries) {
        if (
            query.options.address !== rinfo.address &&
            query.options.altaddress !== rinfo.address
        ) continue;
        if (query.options.port_query !== rinfo.port) continue;
        query._udpResponse(buffer);
        break;
    }
});

udpSocket.on('listening', () => {
    const address = udpSocket.address();
    if (debug) console.log(`Server listening ${address.address}:${address.port}`);
});

udpSocket.on('error', err => {
    console.log(`Server error:\n${err.stack}`);
    udpSocket.close();
});

class Server {
    static query(options, callback) {
        const promise = new Promise((resolve, reject) => {
            for (const key of Object.keys(options)) {
                if (['port_query', 'port'].includes(key)) {
                    options[key] = parseInt(options[key]);
                }
            }

            options.callback = state => {
                if (state.error) reject(state.error);
                else resolve(state);
            };

            let query;

            try {
                query = this.lookup();
            } catch (e) {
                process.nextTick(() => {
                    options.callback({
                        error: e
                    });
                });
                return;
            }

            query.debug = debug;
            query.udpSocket = udpSocket;
            query.type = options.type;

            for (const key of Object.keys(options)) {
                query.options[key] = options[key];
            }

            activeQueries.push(query);

            query.on('finished', () => {
                const i = activeQueries.indexOf(query);
                if (i >= 0) activeQueries.splice(i, 1);
            });

            process.nextTick(() => {
                query.start();
            });
        });

        if (callback && typeof callback === 'function') {
            if (callback.length === 2) {
                promise
                    .then(state => callback(null, state))
                    .catch(error => callback(error));
            } else if (callback.length === 1) {
                promise
                    .then(state => callback(state))
                    .catch(error => callback({
                        error: error
                    }));
            }
        }

        return promise;
    }

    static lookup() {
        const query = this.createProtocolInstance();
        query.pretty = 'Multi Theft Auto: San Andreas';
        query.options['port'] = 22003;
        query.options['port_query_offset'] = 123;

        return query;
    }

    static createProtocolInstance() {
        return new Protocol();
    }
}

export default Server;
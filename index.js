import fetch from 'isomorphic-fetch';
import promise from 'es6-promise';
import btoa from 'btoa';

class MTA {
    constructor(host, port, username, password) {
        this.host = host || 'localhost';
        this.port = port || 22005;
        this.username = username || '';
        this.password = password || '';
    }
    call(resource, func, args) {
        return new Promise((resolve, reject) => {
            if (!resource || typeof resource !== 'string' || resource === '') reject(this.error('Invalid argument supplied for resource.'));
            if (!func || typeof func !== 'string' || func === '') reject(this.error('Invalid argument supplied for function.'));
            if (typeof args === 'object' || Array.isArray(args)) {
                if (!JSON.stringify(args)) {
                    reject(this.error('Could not convert the arguments to JSON.'));
                } else {
                    args = JSON.stringify(args);
                }
            }

            const credentials = `${this.username}:${this.password}`;

            fetch(`http://${this.host}:${this.port}/${resource}/call/${func}`, {
                    method: 'POST',
                    headers: {
                        'Content-Type': 'application/json',
                        'Content-Length': args.length,
                        'Authorization': `Basic ${btoa(credentials)}`
                    },
                    body: args
                }).then(res => {
                    if (res.status !== 200) {
                        switch (res.status) {
                            case 401:
                                reject(this.error('Access Denied. This server requires authentication. Please ensure that a valid username and password combination is provided.'));
                                break;
                            case 404:
                                reject(this.error('There was a problem with the request. Ensure that the resource exists and that the name is spelled correctly.'));
                            default:
                                reject(this.error(`Unexpected response status | ${res.status} - ${res.statusText}`));
                        }
                    }

                    res.json().then(data => {
                            resolve(data);
                        })
                        .catch(err => {
                            reject(this.error('Fetch Error :-S', err));
                        });
                })
                .catch(err => {
                    reject(this.error('Fetch Error :-S', err));
                });
        })
    }

    test() {
        return new Promise((resolve, reject) => {
            const data = {
                asd: 'asd'
            };
            resolve(data);
        });
    }

    getInput() {
        const input = this.convertToObjects(JSON.parse(this.getJsonFromUrl()));
        return Array.isArray(input) ? input : false;
    }

    getJsonFromUrl() {
        var query = location.search.substr(1);
        var result = {};
        query.split("&").forEach(function (part) {
            var item = part.split("=");
            result[item[0]] = decodeURIComponent(item[1]);
        });
        return result;
    }

    doReturn() {
        let array = [];

        for (let i = 0; i < arguments.length; i++) {
            array[i] = arguments[i];
        }

        array = this.convertFromObjects(array);
        return JSON.stringify(array);
    }

    convertToObjects(item) {
        if (Array.isArray(item)) {
            for (let value of item) {
                value = this.convertToObjects(value);
            }
        } else if (typeof item === 'string' || typeof item === 'number') {
            if (typeof item === 'number') item = item.toString();
            if (item.substring(0, 3) === "^E^") {
                item = new Element(item.substring(3));
            } else if (item.substring(0, 3) === "^R^") {
                item = new Resource(item.substring(3));
            }
        }

        return item;
    }

    convertFromObjects(item) {
        if (Array.isArray(item)) {
            for (let value of item) {
                value = this.convertFromObjects(value);
            }
        } else if (typeof item === 'object') {
            if (item.constructor.toString() == Element.toString() || item.constructor.toString() == Resource.toString()) {
                item = item.stringify();
            }
        }

        return item;
    }

    error(msg) {
        new Error(`Failed to execute call on MTA: ${msg}`);
    }
}

class Element {
    constructor(id) {
        this.id = id;
    }

    stringify() {
        return `^E^${this.id}`;
    }
}


class Resource {
    constructor(name) {
        this.name = name;
    }

    stringify() {
        return `^R^${this.name}`;
    }
}

export default MTA;
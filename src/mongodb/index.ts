import { Collection, MongoClient } from "mongodb";
import readline from 'readline-sync';
import base64 from "base-64";
import * as uuid from 'uuid';

import express from 'express';

export class TokensDB implements ITokenDB {
    constructor() {
        this.config = require('../config.json');
    }

    private _client: MongoClient;
    private _collection: Collection;
    private _secret: string;
    readonly config: BridgeConfig;

    get collection() {
        return this._collection;
    }

    get expirationTime() {
        return this.config.tokenExpirationTime * 1000 * 60;
    }

    async connect() {
        this._secret = this.config.secret;

        const username = this.config.mongo.username ? this.config.mongo.username : readline.question("MongoDB user: ");
        const password = this.config.mongo.password ? this.config.mongo.password : readline.question("MongoDB password: ", {
            hideEchoBack: true
        });
        const credentials = username && password ? `${username}:${password}@` : '';

        const connectionString = `mongodb://${credentials}${this.config.mongo.server}/${this.config.mongo.database}`;

        this._client = await new MongoClient(connectionString).connect();
        this._collection = this._client.db().collection(this.config.mongo.tokensCollection);

        setInterval(async () => {
            await this._deleteOld();
        }, this.expirationTime)
    }

    async createNewToken(req: express.Request) {
        const address = `${req.socket.remoteAddress}:${req.socket.remotePort}`;
        if (!address) {
            return false
        }
        const tokenExists = await this.collection.findOne({
            associatedAddress: address
        });
        if (tokenExists) {
            await this.collection.deleteOne(tokenExists);
        }
        const now = new Date();
        const tokenValue = base64.encode(uuid.v4());
        const newToken: BridgeToken = {
            associatedAddress: address,
            created: now,
            lastUsed: now,
            maxUsage: 1000,
            timesUsed: 0,
            value: base64.encode(this._xor(tokenValue, this._secret))
        };
        await this.collection.insertOne(newToken);
        newToken.value = this._xor(base64.decode(newToken.value), this._secret);
        return newToken;
    }

    async requestTokenStatus(req: express.Request): Promise<TokenStatus> {
        if (!req.headers.cookie) {
            return TokenStatus.EMPTY;
        }
        const address = `${req.socket.remoteAddress}:${req.socket.remotePort}`;
        const sessionToken = req.cookies["session_token"];
        if (address && sessionToken) {
            const token = await this.collection.findOne({
                associatedAddress: address,
                value: base64.encode(this._xor(sessionToken, this._secret))
            }) as BridgeToken;
            if (token) {
                if (token.maxUsage <= token.timesUsed) {
                    return TokenStatus.REACHED_LIMIT;
                }
                const expirationInMS = this.expirationTime;
                if (+token.lastUsed < Date.now() - expirationInMS) {
                    return TokenStatus.EXPIRED;
                }
                return TokenStatus.VALID;
            } else {
                return TokenStatus.INVALID;
            }
        }
        return TokenStatus.EMPTY;
    }

    async useToken(token: string) {
        await this.collection.updateOne({
            value: base64.encode(this._xor(token, this._secret))
        }, {
            $inc: { timesUsed: 1 },
            $set: {
                lastUsed: new Date()
            }
        });
    }

    private async _deleteOld() {
        const expiredDate = new Date(Date.now() - this.expirationTime);
        this.collection.deleteMany({
            lastUsed: { $lt: expiredDate }
        });
    }

    /**
     * XORing between 2 strings
     */
    private _xor(str: string, key: string) {
        let result = '';

        for (let i = 0; i < str.length; i++) {
            result += String.fromCharCode(str.charCodeAt(i) ^ key.charCodeAt(i % key.length));
        }

        return result;
    }

    static async connect() {
        const client = new TokensDB();
        await client.connect();
        return client;
    }
}
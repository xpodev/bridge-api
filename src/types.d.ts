interface BridgeConfig {
    /** The url where all requests will be redirected after token validation */
    redirectUrl: string;
    /** The token that can access the resource API server */
    resourceServerToken: string;

    /** MongoDB config */
    mongo?: {
        /** The server where the mongo client is */
        server: string;
        /** The username used to connect to MongoDB.
         * If empty it'll prompt at the beginning of the server execution
         */
        username?: string;
        /** The password used to connect to MongoDB.
         * If empty it'll prompt at the beginning of the server execution
         */
        password?: string;
        /** The database's name used to store the tokens */
        database: string;
        /** The collection's name used to store the tokens */
        tokensCollection: string;
    };
    /** The token's lifetime after creation - in minutes */
    tokenExpirationTime: number;
    /** Server secret */
    secret: string;
}

interface BridgeToken {
    /** The actual value of the token */
    value: string;
    /** When the token was created */
    created: Date;
    /** The current number of requests the token has been used for */
    timesUsed: number;
    /** Maximum number of requests that the token can be used for */
    maxUsage: number;
    /** The last time the token was used for a request */
    lastUsed: Date;
    /** The IP address associated with the token */
    associatedAddress: string;
}

interface ITokenDB {
    /**
     * Connects to a server, not necessary if there's not a database.
     */
    connect?(): Promise<void> | void;
    /**
     * Creating and return new sessionToken if possible. 
     * 
     * Will return `false` if the request is not valid for token creation (e.g. no remote address)
     * @param req The request object
     */
    createNewToken(req: Express.Request): Promise<BridgeToken | false> | BridgeToken | false;
    /**
     * Returns the given request token status.
     * @param req The request object
     */
    requestTokenStatus(req: Express.Request): Promise<TokenStatus> | TokenStatus;
    /**
     * Updating the token `lastUsed` and `timesUsed`.
     * @param token The session_token cookie string
     */
    useToken(token: string): Promise<void> | void;
}

declare const enum TokenStatus {
    VALID,
    EXPIRED,
    REACHED_LIMIT,
    INVALID,
    EMPTY
}
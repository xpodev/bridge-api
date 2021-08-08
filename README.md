# bridge-api
Simple bridge API server to verify identities of requests while keeping resource server safe.

## Config
`config.json` file includes some configurations to setup the api bridge server.
```jsonc
{
    "redirectUrl": "", // The resource url to redirect all the requests after token is verified
    "resourceServerToken": "", // The token that can access the resource API server
    "mongo": { // Optional, MongoDB config object
        "server": "localhost:27017", // The server where the mongo server is
        "username": "", // The username used to connect to MongoDB. If empty it'll prompt at the beginning of the server execution
        "password": "", // The password used to connect to MongoDB. If empty it'll prompt at the beginning of the server execution
        "database": "bridge_api", // The database's name used to store the tokens
        "tokensCollection": "tokens" // The collection's name used to store the tokens
    },
    "tokenExpirationTime": 5, // The token's lifetime after creation - in minutes
    "secret": "SUPER SECRET KEY" // Server secret
}
```

## Custom TokensDB
A custom TokensDB class should implement the ITokensDB interface.
```ts
interface ITokenDB {
    /**
     * Connects to a server, not necessary if there's not a database.
     */
    connect?(): Promise<void> | void;
    /**
     * Creating and return new sessionToken if possible. 
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
```

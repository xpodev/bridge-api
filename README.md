# bridge-api
Simple bridge API server to verify identities of requests while keeping resource server safe.


## Usage
To get new token from the server the client should send a request to the API bridge server.
default is `GET /identity` which sets a cookie named `session_token` with the new token.
A token will not be generated if the server can not get the remote address of the request and the client will recieve a 400 status code.

After a token was successfully generated and sent to the client, the client can now send any request to the API bridge server and will
recieve the data from the resource server, while the API bridge server is the one with the actual access to the resource server.


## Config
`config.json` file includes some configurations to setup the API bridge server.
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

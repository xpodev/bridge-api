import express from 'express';
import { TokensDB } from './mongodb';
import cookieParser from 'cookie-parser';
import { processRequest } from './process-request';
const config: BridgeConfig = require('./config.json');

const app = express();
const PORT = process.env.PORT ?? 3746;

app.use(cookieParser());
app.use(express.raw({
    type: '*/*'
}));

TokensDB.connect().then((tokensDB) => {
    app.get("/identity", async (req, res) => {
        const token = await tokensDB.createNewToken(req);
        if (token) {
            res.cookie("session_token", token.value).sendStatus(201);
        } else {
            res.status(400).send("No address in header");
        }
    });

    app.use("*", async (req, res) => {
        const tokenStatus = await tokensDB.requestTokenStatus(req);
        switch (tokenStatus) {
            case TokenStatus.VALID:
                processRequest(req, res);
                tokensDB.useToken(req.cookies.session_token);
                break;
            case TokenStatus.EXPIRED:
                res.status(401).send("Session expired");
                break;
            case TokenStatus.REACHED_LIMIT:
                res.status(403).send("Reached max usage of this token");
                break;
            case TokenStatus.INVALID:
            case TokenStatus.EMPTY:
            default:
                res.sendStatus(401);
                break;
        }
    });

    const server = app.listen(PORT, () => {
        console.log("API Bridge service is running on port " + PORT);
    });

    server.keepAliveTimeout = config.tokenExpirationTime * 1000 * 60;
});

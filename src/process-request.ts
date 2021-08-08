import express from "express";
import fetch, { RequestInit } from 'node-fetch';
const config: BridgeConfig = require('./config.json');

const requestsWithBody = [
    "post",
    "put",
    "delete",
    "patch"
];

export async function processRequest(req: express.Request, res: express.Response) {
    const headers = req.headers;
    headers.authorization = config.resourceServerToken;
    const requestOptions: RequestInit = {
        headers: headers as any,
        method: req.method
    }
    if (requestsWithBody.includes(req.method.toLowerCase())) {
        requestOptions.body = req.body;
    }
    const response = await (fetch(`${config.redirectUrl}${req.originalUrl}`, requestOptions));
    res.status(response.status).send(await response.text());
}
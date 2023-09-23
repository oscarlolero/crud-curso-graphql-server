import {ApolloServer} from '@apollo/server';
import express from 'express';
import {PubSub} from 'graphql-subscriptions';
import { ApolloServerPluginDrainHttpServer } from '@apollo/server/plugin/drainHttpServer';

import './db.js';
import User from './models/user.js';
import jwt from 'jsonwebtoken';
import {resolvers} from "./resolvers.js";
import {typeDefs} from "./typeDefs.js";
import {expressMiddleware} from "@apollo/server/express4";
import cors from "cors";
import http from "http";
import bodyParser from "body-parser";

const pubsub = new PubSub();

const JWT_SECRET = `TESTING`;

const SUBSCRIPTIONS_EVENTS = {
  PERSON_ADDED: 'PERSON_ADDED'
}

// Required logic for integrating with Express
const app = express();
// Our httpServer handles incoming requests to our Express app.
// Below, we tell Apollo Server to "drain" this httpServer,
// enabling our servers to shut down gracefully.
const httpServer = http.createServer(app);

const server = new ApolloServer({
  typeDefs,
  resolvers,
  plugins: [ApolloServerPluginDrainHttpServer({ httpServer })],
});

await server.start();

app.use('/graphql', cors(), bodyParser.json(), expressMiddleware(server, {
  context: async ({req}) => { // se ejecuta cada que recibe una peticion
    const auth = req ? req.headers.authorization : null;
    if (auth && auth.toLowerCase().startsWith('bearer ')) {
      const decodedToken = jwt.verify(auth.substring(7), JWT_SECRET);
      const currentUser = await User.findById(decodedToken.id).populate('friends');
      return {currentUser};
    }
  }
}));

// Modified server startup
await new Promise((resolve) => httpServer.listen({ port: 4000 }, resolve));

console.log(`🚀 Server ready at http://localhost:4000/`);

/*
const {url} = await startStandaloneServer(server, {
  listen: {
    port: 4000,
  },
  context: async ({req}) => { // se ejecuta cada que recibe una peticion
    const auth = req ? req.headers.authorization : null;
    if (auth && auth.toLowerCase().startsWith('bearer ')) {
      const decodedToken = jwt.verify(auth.substring(7), JWT_SECRET);
      const currentUser = await User.findById(decodedToken.id).populate('friends');
      return {currentUser};
    }
  }
});
*/
// console.log(`🚀  Server ready at ${url}`);

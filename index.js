import {ApolloServer} from '@apollo/server';
import express from 'express';
import { ApolloServerPluginDrainHttpServer } from '@apollo/server/plugin/drainHttpServer';

//WS
import { makeExecutableSchema } from '@graphql-tools/schema';
import { WebSocketServer } from 'ws';
import { useServer } from 'graphql-ws/lib/use/ws';

import './db.js';
import User from './models/user.js';
import jwt from 'jsonwebtoken';
import {resolvers} from "./resolvers.js";
import {typeDefs} from "./typeDefs.js";
import {expressMiddleware} from "@apollo/server/express4";
import cors from "cors";
import http from "http";
import bodyParser from "body-parser";

const JWT_SECRET = `TESTING`;

// Required logic for integrating with Express
const app = express();
// Our httpServer handles incoming requests to our Express app.
// Below, we tell Apollo Server to "drain" this httpServer,
// enabling our servers to shut down gracefully.
const httpServer = http.createServer(app);

const schema = makeExecutableSchema({ typeDefs, resolvers });

// Creating the WebSocket server
const wsServer = new WebSocketServer({
  // This is the `httpServer` we created in a previous step.
  server: httpServer,
  // Pass a different path here if app.use
  // serves expressMiddleware at a different path
  path: '/graphql',
});

// Hand in the schema we just created and have the
// WebSocketServer start listening.
const serverCleanup = useServer({ schema }, wsServer);

const server = new ApolloServer({
  schema,
  plugins: [
    // Proper shutdown for the HTTP server.
    ApolloServerPluginDrainHttpServer({ httpServer }),

    // Proper shutdown for the WebSocket server.
    {
      async serverWillStart() {
        return {
          async drainServer() {
            await serverCleanup.dispose();
          },
        };
      },
    },
  ],
});

await server.start();

app.use(cors());
app.use('/graphql', bodyParser.json(), expressMiddleware(server, {
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
//Most Express applications call app.listen(...), but for your setup change this to httpServer.listen(...) using the same arguments. This way, the server starts listening on the HTTP and WebSocket transports simultaneously.
const PORT = 4000;
await new Promise((resolve) => httpServer.listen({ port: PORT }, resolve));

console.log(`🚀 Server ready at http://localhost:${PORT}/graphql`);

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

import Person from "./models/person.js";
import User from "./models/user.js";

import jwt from "jsonwebtoken";
import {GraphQLError} from "graphql";
import {PubSub} from "graphql-subscriptions";

const pubsub = new PubSub();

const SUBSCRIPTIONS_EVENTS = {
  PERSON_ADDED: 'PERSON_ADDED'
}

export const resolvers = {
  Query: {
    me: (root, args, context) => {
      return context.currentUser;
    },
    personCount: () => Person.collection.countDocuments(),
    allPersons: async (root, args) => {

      if (!args.phone) return Person.find({});

      return Person.find({phone: {$exists: args.phone === 'YES'}});

      // // const {data: personsFromRestAPI} = await axios.get('http://localhost:3000/persons')
      //
      // if (!args.phone) return persons;
      //
      // return persons
      //   .filter(person => {
      //     return args.phone === "YES" ? person.phone : !person.phone;
      //   });
      // // const byPhone = person => args.phone === "YES" ? person.phone : !person.phone
      // //
      // // return persons.filter(byPhone)
    },
    findPerson: async (root, args) => {
      return Person.findOne({name: args.name});
      // return persons.find(p => p.name === args.name);
    }
  },
  Mutation: {
    clearPersonsAndUsers: async (root, args) => {
      await Person.deleteMany({});
      await User.deleteMany({});

      return true;
    },
    clearFriends: async (root, args, {currentUser}) => {
      if (!currentUser) throw new GraphQLError("not authenticated", {extensions: {code: "UNAUTHENTICATED"}});

      currentUser.friends = [];

      await currentUser.save();

      return currentUser;
    },
    addAsFriend: async (root, args, {currentUser}) => {
      if (!currentUser) throw new AuthenticationError("not authenticated");

      if (currentUser.friends.find(friend => friend.name === args.name)) {
        throw new GraphQLError("Person is already a friend", {extensions: {code: "ALREADY_FRIEND"}});
      }

      const newFriend = await Person.findOne({name: args.name});

      if (!newFriend) {
        throw new GraphQLError("Person not found", {extensions: {code: "PERSON_NOT_FOUND"}});
      }

      currentUser.friends = currentUser.friends.concat(newFriend);

      await currentUser.save();

      return currentUser;
    },
    addPerson: async (root, args, context) => {

      const {currentUser} = context;
      if (!currentUser) throw new AuthenticationError("not authenticated");

      const person = new Person({...args});

      try {
        //guardar la persona creada
        await person.save();

        //agregar la persona creada a la lista de amigos del usuario
        currentUser.friends = currentUser.friends.concat(person);
        await currentUser.save();

      } catch (error) {
        throw new GraphQLError(error.message, {extensions: {code: "ERROR_WHILE_SAVING_PERSON"}});
      }

      await pubsub.publish(SUBSCRIPTIONS_EVENTS.PERSON_ADDED, {personAdded: person});
      return person;
      // if (persons.find(p => p.name === args.name)) {
      //   throw new UserInputError("Name must be unique", {
      //     invalidArgs: args.name
      //   });
      // }
      //
      // const person = {...args, id: uuid()};
      // persons.push(person);
      // console.log('agregado');
      // return person;
    },
    editPhone: async (root, args) => {

      const person = await Person.findOne({name: args.name});
      if (!person) return null;

      person.phone = args.phone;

      try {
        await person.save();
      } catch (error) {
        throw new GraphQLError(error.message, {extensions: {code: "ERROR_WHILE_SAVING_PERSON"}});
      }

      return person;
      // const personIndex = persons.findIndex(person => person.name === args.name);
      // if (personIndex === -1) return null;
      // persons[personIndex].phone = args.phone;
      // return persons[personIndex];
    },
    createUser: (root, args) => {
      const user = new User({username: args.username});

      return user.save()
        .catch(error => {
          throw new GraphQLError(error.message, {extensions: {code: "ERROR_WHILE_SAVING_USER"}});
        });
    },
    login: async (root, args) => {
      const user = await User.findOne({username: args.username});

      //ver clase jwt, midudev
      if (!user || args.password !== 'secret') {
        throw new GraphQLError("wrong credentials", {extensions: {code: "WRONG_CREDENTIALS"}});
      }

      const userForToken = {
        username: user.username,
        id: user._id
      };

      return {value: jwt.sign(userForToken, JWT_SECRET)};
    }
  },
  Person: {
    address: (root) => {
      return {
        street: root.street,
        city: root.city
      };
    }
  },
  Subscription: {
    personAdded: {
      subscribe: () => pubsub.asyncIterator([SUBSCRIPTIONS_EVENTS.PERSON_ADDED])
    }
  }
};

import {ApolloServer, UserInputError, gql, AuthenticationError} from 'apollo-server';
import './db.js';
import Person from './models/person.js';
import User from './models/user.js';
import jwt from 'jsonwebtoken';

const JWT_SECRET = `TESTING`;

const typeDefs = gql`
    enum YesNo {
        YES
        NO
    }

    type Address {
        street: String!,
        city: String!,
    }

    type Person {
        name: String!
        city: String!
        street: String!
        age: Int!
        phone: String,
        budget: Int!
        address: Address,
        id: ID!
    }

    type User {
        username: String!
        friends: [Person!]
        id: ID!
    }
    
    type Token {
        value: String!
    }
    
    type Query {
        personCount: Int!
        allPersons(phone: YesNo): [Person!]!
        findPerson(name: String!): Person,
        me: User
    }

    type Mutation {
        login(
            username: String!
            password: String!
        ): Token,
        createUser(
            username: String!
        ): User,
        addPerson(
            name: String!
            city: String!
            age: Int!
            phone: String!
            budget: Int!
            street: String!
        ): Person,
        editPhone(
            name: String!
            phone: String!
        ): Person,
        addAsFriend(
            name: String!
        ): User,
        clearFriends: User,
        clearPersonsAndUsers: Boolean
    }
`;

const resolvers = {
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
    findPerson: (root, args) => {
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
      if (!currentUser) throw new AuthenticationError("not authenticated");

      currentUser.friends = [];

      await currentUser.save();

      return currentUser;
    },
    addAsFriend: async (root, args, {currentUser}) => {
      if (!currentUser) throw new AuthenticationError("not authenticated");

      if (currentUser.friends.find(friend => friend.name === args.name)) {
        throw new UserInputError("Person is already a friend", {
          invalidArgs: args.name
        });
      }

      const newFriend = await Person.findOne({name: args.name});

      if (!newFriend) {
        throw new UserInputError("Person not found", {
          invalidArgs: args.name
        });
      }

      currentUser.friends = currentUser.friends.concat(newFriend);

      await currentUser.save();

      return currentUser;
    },
    addPerson: async (root, args, context) => {

      const { currentUser } = context;
      if (!currentUser) throw new AuthenticationError("not authenticated");

      const person = new Person({...args});

      try {
        //guardar la persona creada
        await person.save();

        //agregar la persona creada a la lista de amigos del usuario
        currentUser.friends = currentUser.friends.concat(person);
        await currentUser.save();

      } catch (error) {
        throw new UserInputError(error.message, {
          invalidArgs: args
        });
      }

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
        throw new UserInputError(error.message, {
          invalidArgs: args
        });
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
          throw new UserInputError(error.message, {
            invalidArgs: args
          });
        });
    },
    login: async (root, args) => {
      const user = await User.findOne({username: args.username});

      //ver clase jwt, midudev
      if(!user || args.password !== 'secret') {
        throw new UserInputError("Wrong credentials");
      }

      const userForToken = {
        username: user.username,
        id: user._id
      }

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
  }
};

const server = new ApolloServer({
  typeDefs,
  resolvers,
  context: async ({req}) => { // se ejecuta cada que recibe una peticion
    const auth = req ? req.headers.authorization : null;
    console.log(auth)
    if(auth && auth.toLowerCase().startsWith('bearer ')) {
      const decodedToken = jwt.verify(auth.substring(7), JWT_SECRET);
      const currentUser = await User.findById(decodedToken.id).populate('friends');
      return {currentUser};
    }
  }
});

server.listen().then(({url}) => {
  console.log(`Server ready at ${url}`);
});

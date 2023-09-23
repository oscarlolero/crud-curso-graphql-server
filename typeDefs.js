import gql from "graphql-tag";

export const typeDefs = gql`
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

    type Subscription {
        personAdded: Person!
    }
`;

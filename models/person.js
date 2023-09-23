import mongoose from "mongoose";
import uniqueValidator from "mongoose-unique-validator";

//create schema for person
const personSchema = new mongoose.Schema({
  name: {
    type: String,
    required: true,
    unique: true,
  },
  phone: {
    type: String,
    required: true,
    minLength: 5,
  },
  street: {
    type: String,
    required: true,
  },
  city: {
    type: String,
    required: true,
  },
  age: {
    type: Number,
    required: true,
  },
  budget: {
    type: Number,
    required: true,
  },
});

personSchema.plugin(uniqueValidator);

export default mongoose.model('Person', personSchema);
// type Person {
//   name: String!
//     city: String!
//     street: String!
//     age: Int!
//     phone: String,
//     budget: Int!
//     address: Address,
//     id: ID!
// }

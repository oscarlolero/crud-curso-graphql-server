import mongoose from "mongoose";

// ofc these credentials are not valid dumbass
const MONGODB_URI = `mongodb+srv://oscarlolero:lol123@clusterlol.3g44jaq.mongodb.net/?retryWrites=true&w=majority`;

mongoose.connect(MONGODB_URI, {
  useNewUrlParser: true,
  useUnifiedTopology: true,
}).then(() => {
  console.log("connected to MongoDB");
}).catch(error => {
  console.log("error connecting to MongoDB:", error.message);
});

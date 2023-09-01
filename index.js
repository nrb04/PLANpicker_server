const express = require("express");
const app = express();
const bodyParser = require("body-parser");
const { ObjectId } = require("mongodb");
const jwt = require('jsonwebtoken');
require('dotenv').config()
const cors = require("cors");
const port = process.env.PORT || 5000;

app.use(cors());
app.use(express());
app.use(express.json());

//middleware
const verifyJWT = (req, res, next) => {
  const authorization = req.headers.authorization;
  if (!authorization) {
    return res.status(401).send({ error: true, message: "unauthorized access" })
  }
  const token = authorization.split(' ')[1]

  jwt.verify(token, process.env.ACCESS_TOKEN_SECRET, (err, decoded) => {
    if (err) {
      return res.status(401).send({ error: true, message: "unauthorized access" })
    }
    req.decoded = decoded;
    next();
  })

}


const { MongoClient, ServerApiVersion } = require('mongodb');
const uri = "mongodb+srv://planPicker:YcfhIhEj7NsAhwYZ@cluster0.4mtnldq.mongodb.net/?retryWrites=true&w=majority";

// Create a MongoClient with a MongoClientOptions object to set the Stable API version
const client = new MongoClient(uri, {
  serverApi: {
    version: ServerApiVersion.v1,
    strict: true,
    deprecationErrors: true,
  }
});

async function run() {
  try {
    // Connect the client to the server	(optional starting in v4.7)
    await client.connect();

    //collection Name
    const usersCollection = client.db('PlanPickerDb').collection('users')



    //JWT
    app.post('/jwt', (req, res) => {
      const user = req.body;
      console.log(user)
      const token = jwt.sign(user, process.env.ACCESS_TOKEN_SECRET, { expiresIn: "7d" })
      console.log(token)
      res.send({ token })
    })

    const verifyAdmin = async (req, res, next) => {
      const email = req.decoded.email;
      const query = { email: email }
      const user = await usersCollection.findOne(query)
      if (user?.role !== 'admin') {
        return res.status(403).send({ error: true, message: 'forbidden access' })
      }
      next()
    }


    // users related apis
    //get user
    app.get('/users', verifyJWT, verifyAdmin, async (req, res) => {
      const result = await usersCollection.find().toArray()
      res.send(result)
    })

    //email user
    app.get('/users/:email', async (req, res) => {
      console.log(req.params.email);
      const result = await usersCollection.find({ email: req.params.email }).toArray()
      return res.send(result)
    })
    //id
    app.get('/users/:id', async (req, res) => {
      const id = req.params.id;
      const query = { _id: new ObjectId(id) }
      console.log(query);
      const result = await usersCollection.findOne(query)
      res.send(result)
    })

    //post user
    app.post('/users', async (req, res) => {
      const user = req.body;
      console.log(user);
      const query = { email: user?.email }
      const existingUser = await usersCollection.findOne(query)
      console.log("existingUser", existingUser);
      if (existingUser) {
        return res.send({ message: 'user already exist' })
      }
      const result = await usersCollection.insertOne(user)
      res.send(result)
    })

    //security layer:verifyJWT
    //same email
    //check admin
    app.get('/users/admin/:email', verifyJWT, async (req, res) => {
      const email = req.params.email;
      if (req.decoded.email !== email) {
        res.send({ admin: false })
      }

      const query = { email: email }
      const user = await usersCollection.findOne(query);
      const result = { admin: user?.role === 'admin' }
      res.send(result);
    })

    //make admin
    app.patch('/users/admin/:id', async (req, res) => {
      const id = req.params.id;
      const filter = { _id: new ObjectId(id) }
      const updatedDoc = {
        $set: {
          role: "admin"
        }
      }
      const result = await usersCollection.updateOne(filter, updatedDoc)
      res.send(result)
    })


    //delete
    app.delete('/deleteuser/:id', async (req, res) => {
      const id = req.params.id;
      const query = { _id: new ObjectId(id) }
      const result = await usersCollection.deleteOne(query)
      res.send(result)
    })





    //profile information
    //update
    app.put('/updateuser/:email', async (req, res) => {
      const email = req.params.email;
      const user = req.body;
      const filter = { email: email }
      const options = { upsert: true };
      const users = {
        $set: {
          ...user
        },
      };
      const result = await usersCollection.updateOne(filter, users, options)
    const eventCollection = client.db('planpicker').collection('eventData') ;
    const userCollection = client.db('planpicker').collection('userData') ;
    const userEventCollection = client.db('planpicker').collection('userEventData') ;
    const blogsCollection = client.db('planpicker').collection('blog') ;


    app.get('/events', async(req, res)=> {
      const result = await eventCollection.find().toArray()
      res.send(result)

    })

    app.get('/blogs', async(req, res)=> {
      const result = await blogsCollection.find().toArray()
      res.send(result)

    })

    app.get('/blogs/:id', async(req, res)=> {
      const id = req.params.id ;
      const query = {_id : id}
      const result = await blogsCollection.findOne(query)
      res.send(result)

    })

    app.get('/users', async(req, res)=> {
      const result = await userCollection.find().toArray()
      res.send(result)

    })

    app.get('/users-event', async(req, res)=> {
      const result = await userEventCollection.find().toArray()
      res.send(result)
    })

    // Send a ping to confirm a successful connection
    
    await client.db("admin").command({ ping: 1 });
    console.log("Pinged your deployment. You successfully connected to MongoDB!");
  } finally {
    // Ensures that the client will close when you finish/error
    // await client.close();
  }
}
run().catch(console.dir);









app.get("/", (req, res) => {
  res.send("red horse is running");
});

app.listen(port, () => {
  console.log(`Server is running on port: ${port}`);
});


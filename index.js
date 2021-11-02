const express = require('express');
const app = express();
const cors = require('cors');
const { MongoClient } = require('mongodb');
require('dotenv').config();
var admin = require("firebase-admin");




//FIREBASE ADMIN AUTHORIZATION:
var serviceAccount = require("./ema-john-authentication-c5078-firebase-adminsdk-bbj82-e279f7c45e.json");

admin.initializeApp({
  credential: admin.credential.cert(serviceAccount)
});



//MIDDLEWARE:
app.use(cors());
app.use(express.json());
 
//DB:
const uri = `mongodb+srv://${process.env.DB_USER}:${process.env.DB_PASS}@cluster0.a65gj.mongodb.net/myFirstDatabase?retryWrites=true&w=majority`;
const client = new MongoClient(uri, { useNewUrlParser: true, useUnifiedTopology: true });

//VERIFY USER TOKEN:
async function verifyToken(req, res, next){
    if(req?.headers?.authorization?.startsWith('Bearer ')){
        const idToken = req.headers.authorization.split('Bearer ')[1];
        // console.log('under verification', idToken);
        try{
            const decodedUser = await admin.auth().verifyIdToken(idToken);
            req.decodedUserEmail = decodedUser.email;
        }
        finally{

        }
    }
    next();
}


async function run(){
    try{
        await client.connect();
        // console.log('database is connected');

        const database = client.db('emaJohn');
        const productsCollection = database.collection('products');
        const ordersCollection = database.collection('orders');

        //GET ALL PRODUCTS FROM DB:
        app.get('/products', async(req, res) =>{
            console.log(req.query)
            const {page, content} = req.query;
            const cursor = productsCollection.find({});
            const count = await cursor.count();
            let products;
            if(page){
                products = await cursor.skip(page*content).limit(parseInt(content)).toArray();
            }
            else{
                products = await cursor.toArray() ;
            }
            res.send({
                count,
                products
            });
        })

        //POST CART UPDATE BY KEYS:
        app.post('/products/byKeys', async(req, res) =>{
            const productKeys = req.body;
            const query = {key : {$in : productKeys}};
            const products = await productsCollection.find(query).toArray();
            res.json(products);
        })

        //GET ORDERS:
        app.get('/products/orders', verifyToken, async(req, res) =>{
            const email = req.query.email;
            if(req.decodedUserEmail === email){
                const query = {email};
                const cursor = ordersCollection.find(query);
                const orders = await cursor.toArray();
                res.send(orders);
            }
            else{
                res.status(401).json({
                    'message': 'user not authorized yet'
                })
            }
        })

        //POST ORDER:
        app.post('/products/orders', async(req, res) =>{
            const orderInfo = req.body;
            const result = await ordersCollection.insertOne(orderInfo);
            console.log(orderInfo);
            res.json(result);
        })
    }
    finally{
        // await client.close();
    }
}

run().catch(console.dir);

const port = process.env.PORT || 5000;


app.get('/', (req, res) =>{
    res.send('ema john server');
})

app.listen(port, () =>{
    console.log('running ema john server at port ', port);
})



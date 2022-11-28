const express = require('express');
const cors = require('cors');
const { MongoClient, ServerApiVersion } = require('mongodb');
require('dotenv').config();

const app = express();
const port = process.env.PORT || 5000;

app.use(cors());
app.use(express.json());



const uri = `mongodb+srv://${process.env.DB_USER}:${process.env.DB_PASSWORD}@cluster0.awyxyaj.mongodb.net/?retryWrites=true&w=majority`;
console.log(uri)
const client = new MongoClient(uri, { useNewUrlParser: true, useUnifiedTopology: true, serverApi: ServerApiVersion.v1 });

async function run() {
    try {
        const ProductCategory = client.db('ResaleBD').collection('ProductCategory');
        const ProductCollection = client.db('ResaleBD').collection('ProductCollection');
        const BookedProductCollection = client.db('ResaleBD').collection('BookedProductCollection');


        app.get('/category', async (req, res) => {
            const query = {}
            const cursor = ProductCategory.find(query);
            const category = await cursor.toArray();
            res.send(category);
        });

        app.get('/category/:id', async (req, res) => {
            const id = req.params.id;
            const query = { category_id: id }
            const cursor = ProductCollection.find(query);
            const products = await cursor.toArray();
            res.send(products);
        });

        app.get('/bookings', async (req, res) => {
            const email = req.query.email;
            const query = { email: email };
            const bookings = await BookedProductCollection.find(query).toArray();
            res.send(bookings);
        })


        app.post('/bookings', async (req, res) => {
            const booking = req.body
            console.log(booking);
            const query = {
                product_id: booking.product_id,
                email: booking.email,
            }

            const alreadyBooked = await BookedProductCollection.find(query).toArray();

            if (alreadyBooked.length) {
                const message = `You already have booked this`
                return res.send({ acknowledged: false, message })
            }
            const result = await BookedProductCollection.insertOne(booking);
            res.send(result);

        })
    }
    finally {

    }

}
run().catch(err => console.error(err));



app.get('/', (req, res) => {
    res.send('ReasleBD server is running')
})

app.listen(port, () => {
    console.log(`ResaleBD server running on ${port}`);
})
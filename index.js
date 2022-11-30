const express = require('express');
const cors = require('cors');
const { MongoClient, ServerApiVersion, ObjectId } = require('mongodb');
const jwt = require('jsonwebtoken');
const { query } = require('express');
require('dotenv').config();

const app = express();
const port = process.env.PORT || 5000;

app.use(cors());
app.use(express.json());



const uri = `mongodb+srv://${process.env.DB_USER}:${process.env.DB_PASSWORD}@cluster0.awyxyaj.mongodb.net/?retryWrites=true&w=majority`;
console.log(uri)
const client = new MongoClient(uri, { useNewUrlParser: true, useUnifiedTopology: true, serverApi: ServerApiVersion.v1 });

function verifyJWT(req, res, next) {
    const authHeader = req.headers.authorization;
    if (!authHeader) {
        return res.status(401).send('unauthorized access');
    }

    const token = authHeader.split(' ')[1];

    jwt.verify(token, process.env.ACCESS_TOKEN, function (err, decoded) {
        if (err) {
            return res.status(403).send({ message: 'forbidden access' })
        }
        req.decoded = decoded;
        next();
    })

}

async function run() {
    try {
        const ProductCategory = client.db('ResaleBD').collection('ProductCategory');
        const ProductCollection = client.db('ResaleBD').collection('ProductCollection');
        const BookedProductCollection = client.db('ResaleBD').collection('BookedProductCollection');
        const WishlistedProductCollection = client.db('ResaleBD').collection('WishlistedProductCollection');
        const usersCollection = client.db('ResaleBD').collection('users');

        const verifySeller = async (req, res, next) => {
            const decodedEmail = req.decoded.email;
            const query = { email: decodedEmail };
            const user = await usersCollection.findOne(query);

            if (user?.user_role !== 'Seller') {
                return res.status(403).send({ message: 'forbidden access' })
            }
            next();
        }


        app.get('/categoryOptions', async (req, res) => {
            const query = {}
            const result = await ProductCategory.find(query).project({ category_name: 1, category_id: 1 }).toArray();
            res.send(result);
        }
        )

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

        app.post('/products', async (req, res) => {
            const product = req.body;
            console.log(product)
            const result = await ProductCollection.insertOne(product);
            res.send(result);
        })

        app.get('/bookings', verifyJWT, async (req, res) => {
            const email = req.query.email;
            const decodedEmail = req.decoded.email;

            if (email !== decodedEmail) {
                return res.status(403).send({ message: 'forbidden access' });
            }
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

        app.get('/wishlists', verifyJWT, async (req, res) => {
            const email = req.query.email;
            const decodedEmail = req.decoded.email;

            if (email !== decodedEmail) {
                return res.status(403).send({ message: 'forbidden access' });
            }
            const query = { email: email };
            const wishlists = await WishlistedProductCollection.find(query).toArray();
            res.send(wishlists);
        })

        app.post('/wishlists', async (req, res) => {
            const wishlist = req.body
            console.log(wishlist);
            const query = {
                product_id: wishlist.product_id,
                email: wishlist.email,
            }

            const alreadyAddedToWishlist = await WishlistedProductCollection.find(query).toArray();

            if (alreadyAddedToWishlist.length) {
                const message = `Already added to wishlist`
                return res.send({ acknowledged: false, message })
            }
            const result = await WishlistedProductCollection.insertOne(wishlist);
            res.send(result);

        })

        app.get('/jwt', async (req, res) => {
            const email = req.query.email;
            const query = { email: email };
            const user = await usersCollection.findOne(query);
            if (user) {
                const token = jwt.sign({ email }, process.env.ACCESS_TOKEN, { expiresIn: '30d' })
                console.log(user)
                return res.send({ accessToken: token });
            }
            res.status(403).send({ accessToken: '' })

        });

        app.get('/users/sellers', async (req, res) => {
            const query = { user_role: 'Seller' };
            const cursor = usersCollection.find(query);
            const sellers = await cursor.toArray();
            res.send(sellers);
        });

        app.get('/users/buyers', async (req, res) => {
            const query = { user_role: 'Buyer' };
            const cursor = usersCollection.find(query);
            const buyers = await cursor.toArray();
            res.send(buyers);
        });

        app.get('/sellers/:id', async (req, res) => {
            const id = req.params.id;
            const query = { _id: ObjectId(id) }
            const user = await usersCollection.findOne(query);
            res.send(user);
        })

        app.put('/sellers/:id', async (req, res) => {
            const id = req.params.id;
            const filter = { _id: ObjectId(id) }
            const options = { upsert: true };
            const updatedDoc = {
                $set: {
                    seller_status: 'Verified'
                }
            }
            const result = await usersCollection.updateOne(filter, updatedDoc, options);
            res.send(result);
        })

        app.get('/users/admin/:email', async (req, res) => {
            const email = req.params.email;
            const query = { email }
            const user = await usersCollection.findOne(query);
            res.send({ isAdmin: user?.user_role === 'Admin' });
        })

        app.get('/users/sellers/:email', async (req, res) => {
            const email = req.params.email;
            const query = { email }
            const user = await usersCollection.findOne(query);
            res.send({ isSeller: user?.user_role === 'Seller' });
        })

        app.get('/users/buyers/:email', async (req, res) => {
            const email = req.params.email;
            const query = { email }
            const user = await usersCollection.findOne(query);
            res.send({ isBuyer: user?.user_role === 'Buyer' });
        })



        app.get('/users', async (req, res) => {
            const query = {};
            const users = await usersCollection.find(query).toArray();
            res.send(users);
        });

        app.post('/users', async (req, res) => {
            const user = req.body;
            //console.log(user);
            const result = await usersCollection.insertOne(user);
            res.send(result);
        });

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
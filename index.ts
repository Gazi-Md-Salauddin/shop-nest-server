import express, { type Express, type Request, type Response, type NextFunction } from 'express';
import cors from "cors";
import dotenv from "dotenv";
import { MongoClient, ServerApiVersion, ObjectId } from 'mongodb';
import { createRemoteJWKSet, jwtVerify } from "jose";

dotenv.config();

// Extend Express Request interface
declare global {
  namespace Express {
    interface Request {
      user?: any;
    }
  }
}

const app: Express = express();
app.use(cors());
app.use(express.json());

const port = Number(process.env.PORT || 5000);

const uri = process.env.MONGODB_URI;
if (!uri) {
  throw new Error("Please define the MONGODB_URI environment variable inside .env");
}

const client = new MongoClient(uri, {
  serverApi: {
    version: ServerApiVersion.v1,
    strict: true,
    deprecationErrors: true,
  }
});

const authUrl = process.env.NEXT_PUBLIC_BETTER_AUTH_URL || "http://localhost:3000";
const JWKS = createRemoteJWKSet(
    new URL(`${authUrl}/api/auth/jwks`)
);

const verifyToken = async (
  req: Request,
  res: Response,
  next: NextFunction
): Promise<void> => {
    const authHeader = req?.headers.authorization;
    if (!authHeader) {
         res.status(401).json({ message: "Unauthorised" });
         return;
    }
    const token = authHeader.split(" ")[1];
    if (!token) {
         res.status(401).json({ message: "Unauthorised" });
         return;
    }
    try {
        const { payload } = await jwtVerify(token, JWKS);
        req.user = payload; 
        next();
    } catch (error) {
         res.status(403).json({ message: "Forbidden" });
         return;
    }
};


const db = client.db("shopNest_db");
const productCollection = db.collection("products");
const orderCollection = db.collection("orders");


app.get('/api/products', async (req: Request, res: Response) => {
  try {
    const result = await productCollection.find({}).toArray();
    res.send(result);
  } catch (error: any) {
    res.status(500).json({ success: false, message: error.message });
  }
});

app.get("/api/products/:id", async (req: Request, res: Response): Promise<void> => {
  try {
    const id = req.params.id as string; 
    if (!ObjectId.isValid(id)) {
      res.status(400).json({ success: false, message: "Invalid Product ID" });
      return;
    }
    const product = await productCollection.findOne({ _id: new ObjectId(id) });
    if (!product) {
      res.status(404).json({ success: false, message: "Product not found" });
      return;
    }
    res.status(200).json(product);
  } catch (error) {
    res.status(500).json({ success: false, message: "Internal Server Error" });
  }
});

app.post("/api/products", async (req: Request, res: Response) => {
  try {
    const product = req.body;
    const result = await productCollection.insertOne(product);
    res.status(201).json({
      success: true,
      message: "Product added successfully",
      insertedId: result.insertedId,
    });
  } catch (error: any) {
    res.status(500).json({ success: false, message: error.message });
  }
});

app.patch("/api/products/:id", async (req: Request, res: Response): Promise<void> => {
  try {
    const id = req.params.id as string;
    if (!ObjectId.isValid(id)) {
      res.status(400).json({ success: false, message: "Invalid Product ID" });
      return;
    }
    const updatedProduct = req.body;
    const result = await productCollection.updateOne(
      { _id: new ObjectId(id) },
      {
        $set: {
          name: updatedProduct.name,
          brand: updatedProduct.brand,
          category: updatedProduct.category,
          price: updatedProduct.price,
          stock: updatedProduct.stock,
          image: updatedProduct.image,
          description: updatedProduct.description,
          inStock: updatedProduct.inStock,
        },
      }
    );
    if (result.matchedCount === 0) {
      res.status(404).json({ success: false, message: "Product not found" });
      return;
    }
    res.status(200).json({ success: true, message: "Product updated successfully" });
  } catch (error) {
    res.status(500).json({ success: false, message: "Internal Server Error" });
  }
});

app.delete("/api/products/:id", async (req: Request, res: Response): Promise<void> => {
  try {
    const id = req.params.id as string;
    if (!ObjectId.isValid(id)) {
      res.status(400).json({ success: false, message: "Invalid Product ID" });
      return;
    }
    const result = await productCollection.deleteOne({ _id: new ObjectId(id) });
    if (result.deletedCount === 0) {
      res.status(404).json({ success: false, message: "Product not found" });
      return;
    }
    res.status(200).json({ success: true, message: "Product deleted successfully" });
  } catch (error) {
    res.status(500).json({ success: false, message: "Internal Server Error" });
  }
});

app.get("/api/orders", async (req: Request, res: Response): Promise<void> => {
  try {
    const orders = await orderCollection.find({}).toArray();
    res.status(200).json(orders);
  } catch (error) {
    res.status(500).json({ success: false, message: "Failed to fetch orders" });
  }
});

app.get("/api/orders/:email", async (req: Request, res: Response) => {
  try {
    const email = req.params.email;
    const result = await orderCollection.find({ userEmail: email }).toArray();
    res.json(result);
  } catch (error: any) {
    res.status(500).json({ success: false, message: error.message });
  }
});

app.post("/api/orders", async (req: Request, res: Response) => {
  try {
    const order = req.body;
    const result = await orderCollection.insertOne(order);
    res.json({ success: true, insertedId: result.insertedId });
  } catch (error: any) {
    res.status(500).json({ success: false, message: error.message });
  }
});

app.patch("/api/orders/:id", async (req: Request, res: Response): Promise<void> => {
  try {
    const id = req.params.id as string;
    if (!ObjectId.isValid(id)) {
      res.status(400).json({ success: false, message: "Invalid Order ID" });
      return;
    }
    const { status } = req.body;
    const result = await orderCollection.updateOne(
      { _id: new ObjectId(id) },
      { $set: { status } }
    );
    if (result.matchedCount === 0) {
      res.status(404).json({ success: false, message: "Order not found" });
      return;
    }
    res.status(200).json({ success: true, message: "Order updated successfully" });
  } catch (error) {
    res.status(500).json({ success: false, message: "Internal Server Error" });
  }
});

app.delete("/api/orders/:id", async (req: Request, res: Response): Promise<void> => {
  try {
    const id = req.params.id as string;
    if (!ObjectId.isValid(id)) {
      res.status(400).json({ success: false, message: "Invalid Order ID" });
      return;
    }
    const result = await orderCollection.deleteOne({ _id: new ObjectId(id) });
    if (result.deletedCount === 0) {
      res.status(404).json({ success: false, message: "Order not found" });
      return;
    }
    res.status(200).json({ success: true, message: "Order deleted successfully" });
  } catch (error) {
    res.status(500).json({ success: false, message: "Internal Server Error" });
  }
});

app.get('/', (req: Request, res: Response) => {
  res.send('Hello World!');
});

// ----------------------------------------------------
// Database connection and server listen
// ----------------------------------------------------
async function connectDB() {
  try {
    
    await client.connect();
    console.log("Connected successfully to MongoDB");
  } catch (error) {
    console.error("Database connection error:", error);
  }
}

connectDB();

app.listen(port, () => {
  console.log(`Example app listening on port ${port}`);
});

// For vercel export
export default app;

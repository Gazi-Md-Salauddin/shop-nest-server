import express, { type Express, type Request, type Response } from 'express';
import cors from "cors";
import dotenv from "dotenv";
dotenv.config();
import { MongoClient, ServerApiVersion, ObjectId } from 'mongodb';

const app: Express = express();
app.use(cors());
app.use(express.json());

const port = process.env.NEXT_PUBLIC_BASE_URL;

const uri = process.env.MONGODB_URI

const client = new MongoClient(uri, {
  serverApi: {
    version: ServerApiVersion.v1,
    strict: true,
    deprecationErrors: true,
  }
});


async function run() {
  try {
    await client.connect()
    const db = client.db("shopNest_db")
    const productCollection = db.collection("products")


    //get products from database
    app.get('/api/products', async (req: Request, res: Response) => {
      const result = await productCollection.find({}).toArray();
      res.send(result)
    })


    // For product details page
    app.get("/api/products/:id", async (req: Request, res: Response): Promise<void> => {
    try {
      const { id } = req.params;

      if (!ObjectId.isValid(id)) {
        res.status(400).json({
          success: false,
          message: "Invalid Product ID",
        });
        return;
      }

      const product = await productCollection.findOne({
        _id: new ObjectId(id),
      });

      if (!product) {
        res.status(404).json({
          success: false,
          message: "Product not found",
        });
        return;
      }

      res.status(200).json(product);
    } catch (error) {
      console.error(error);

      res.status(500).json({
        success: false,
        message: "Internal Server Error",
      });
    }
  }
);

    

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
        res.status(500).json({
          success: false,
          message: error.message || "Failed to add product",
        });
      }
    });


    //For delete product
    app.delete("/api/products/:id", async (req: Request, res: Response): Promise<void> => {
    try {
      const { id } = req.params;

      if (!ObjectId.isValid(id)) {
        res.status(400).json({
          success: false,
          message: "Invalid Product ID",
        });
        return;
      }

      const result = await productCollection.deleteOne({
        _id: new ObjectId(id),
      });

      if (result.deletedCount === 0) {
        res.status(404).json({
          success: false,
          message: "Product not found",
        });
        return;
      }

      res.status(200).json({
        success: true,
        message: "Product deleted successfully",
      });
    } catch (error) {
      console.error("Delete Product Error:", error);

      res.status(500).json({
        success: false,
        message: "Internal Server Error",
      });
    }
  }
);




    
  }catch (error) {
    console.error("Database connection error:", error);
  }
}

run().catch(console.dir);

app.get('/', (req: Request, res: Response) => {
  res.send('Hello World!');
});



app.listen(port, () => {
  console.log(`Example app listening on port ${port}`);
});
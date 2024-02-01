const dotenv = require("dotenv").config();
const express = require('express');
const bodyParser = require('body-parser');
const mongoose = require("mongoose");
const cors = require("cors");
const cookieParser = require("cookie-parser");
const userRoute = require('./routes/userRoute');
const productRoute = require('./routes/productRoute');
const contactRoute = require("./routes/contactRoute");
const errorHandler = require("./middleware/errorMiddleware");
const app = express();
const path = require("path");
// Middlewares
app.use(express.json());
app.use(cookieParser());
app.use(express.urlencoded({ extended: false }));
app.use(bodyParser.json());
app.use(cors({
    origin: ["http://localhost:3000", "https://pinvent-app.vercel.app"],
    credentials: true,
  }));
app.use("/uploads", express.static(path.join(__dirname, "uploads")));

//Route Middleware
app.use("/api/users", userRoute);
app.use("/api/products", productRoute);
app.use("/api/contactus", contactRoute);

// Routes
app.get("/", (req, res) => {
  res.send("Home Page");
});

const PORT = process.env.PORT || 5000;

// Error Middleware
app.use(errorHandler);

mongoose
.connect(process.env.DATABASE_URL)
.then(()=>{
    app.listen(PORT, ()=>{
        console.log(`server running port ${PORT}`);
    })
})
.catch((error)=>{
    console.log(error);
})
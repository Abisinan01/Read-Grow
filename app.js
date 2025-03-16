import express from "express"
import connectDb from './db/dbConnection.js';
import dotenv from "dotenv"//env file
import path from "path";
import session from "express-session";
import cors from "cors"
dotenv.config()//env file loading
import morgan from "morgan";
// import passport from "passport"; 
import { Strategy as GoogleStrategy } from "passport-google-oauth20";
import passport from "./utils/passportAuth.js";
import MongoStore from "connect-mongo"


import adminRoutes from "./routes/adminRoute.js"
import userRoute from "./routes/userRoute.js"
import otpRoute from "./routes/otpRoute.js"

// import { errorHandling } from "./middlewares/error_handling.js";
import nocache from "nocache";
import { fileURLToPath } from "url";
import { error } from "console";
import AppError from "./utils/errorHandler.js";
import cookieParser from "cookie-parser";
import methodOverride from "method-override"
import User from "./models/userSchema.js";
 
 
const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

//========database 
const PORT = process.env.PORT || 4000 
connectDb().catch((error) => {
    console.log(`Database connection failed : ${error.message}`)
    process.exit(1)  
})  

const app = express()//express
app.set("views", path.resolve("views"))//view engine set up
app.set("view engine", "ejs")
app.use(express.static(path.join(__dirname, "public")))
 
app.use(cookieParser())
app.use(express.json())//parsing json data
app.use(express.urlencoded({ extended: true })) 
app.use(nocache())
app.use(session({
    secret: process.env.SESSION_SCERET,
resave: false,
    saveUninitialized: true,
    cookie: { secure: false },
    store: MongoStore.create({
        mongoUrl: process.env.DB_CONNECTION, // MongoDB URL
        collectionName: 'sessions', // Collection where sessions will be stored
        ttl: 1 * 60 * 60 // Session expiration time in seconds (14 days)
    }),
})) 
app.use(cors())
app.use(morgan("dev"))
app.use(passport.initialize())
app.use(passport.session())

app.use("/admin", adminRoutes)
app.use("/read-and-grow", userRoute)
app.use("/otp",otpRoute)
app.use(methodOverride('_method'))

 
app.use((err, req, res, next) => {
    const statusCode = err.statusCode || 500;
    const message = err.message || "Internal Server error";
    console.error(`Error: ${message}, statusCode :${statusCode}`);
    
    return res.status(statusCode).json({
        success:false, 
        message:"Something went wrong" }); 
}); 
   
// console.log("process Id ",process.pid)
process.on('SIGINT', () => {
    console.log("Closing server..."); 
    process.exit();
});



app.get('/',(req,res)=>{
    res.redirect('/read-and-grow/home')
})
app.listen(PORT, () => console.log(`Server started running with ${PORT}`));//Listening the port
// require ('dotenv').config({path:'./env'})
import dotenv from "dotenv";
import {app} from  "./app.js";

import mongoose from "mongoose";
// import { DB_NAME } from "./constants.js";
import connectDb from "./db/index.js";

dotenv.config({
    path: './env'
});

connectDb()
.then(()=>{
    app.listen(process.env.PORT || 8000, ()=>{
        console.log(`Server is running atr Port : ${process.env.PORT}`)
    })
})
.catch((err)=>{
        console.log("MONGO db Connection failed ",err)
        app.on("error",(error)=>{
            console.error("Server error:", error);
            // process.exit(1);
            throw error;
        })
})


















/** 
 * one approach to connect with our dataBase
import express from "express"
const app = express();
( async () => {
    try {
        await mongoose.connect(`${process.env.MONGODB_URI}/${DB_NAME}`)
        app.on("error",(error)=>{
            console.error("Database connection error:", error);
            // process.exit(1);
            throw error;
        })
        
        app.listen(process.env.PORT)
        
    } catch(error){
        console.error("Error connecting to the database:", error);
        // process.exit(1);
        throw error;
    }
    
})()
*/
import mongoose from "mongoose";
import { DB_NAME } from "./constants";
import connectDb from "./db";

connectDb()


















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
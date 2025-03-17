import dotenv from "dotenv";
import {app} from  "./app.js";
import mongoose from "mongoose";
import connectDb from "./db/index.js";

dotenv.config({
    path: './env'
});

const startServer = async () => {
    try {
        await connectDb();
        
        const port = process.env.PORT || 3000; // Changed to port 3000 which usually doesn't require elevation
        
        const server = app.listen(port, () => {
            console.log(`Server is running at Port: ${port}`);
        });

        server.on('error', (error) => {
            if (error.code === 'EACCES') {
                const fallbackPort = 5000;
                console.log(`Port ${port} requires elevated privileges. Trying port ${fallbackPort}...`);
                server.listen(fallbackPort);
            } else if (error.code === 'EADDRINUSE') {
                const fallbackPort = 5000;
                console.log(`Port ${port} is already in use. Trying port ${fallbackPort}...`);
                server.listen(fallbackPort);
            } else {
                console.error('Server error:', error);
                throw error;
            }
        });

    } catch (err) {
        console.log("MONGO db Connection failed ", err);
        process.exit(1);
    }
};

startServer();
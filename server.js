const express=require('express')
const app= express();
const env=require("dotenv").config();
const db=require("./config/dbs");
db();


app.listen(process.env.PORT,()=>{
    console.log("server running")
});
module.exports=app;
const express=require('express')
const app= express();
const path=require("path");
const env=require("dotenv").config();
const db=require("./config/dbs");
const userRouter=require('./routes/userRouter');
const adminRouter=require('./routes/adminRouter');
const session=require('express-session');
const passport=require('./config/passport');
const nocache = require('nocache');
db();
app.use(nocache());
app.use(express.json());
app.use(express.urlencoded({extended:true}))

app.set("view engine","ejs");
app.set("views",[path.join(__dirname,'views/user'),path.join(__dirname,'views/admin')]);
app.use(express.static(path.join(__dirname, 'public')));
app.use(session({
    secret:process.env.SESSION_SECRET,
    resave:false,
    saveUninitialized:true,
    cookie:{
        secure:false,
        httpOnly:true,
        maxAge:1000*60*60*24
    }
}))

app.use(passport.initialize());
app.use(passport.session());

app.use('/',userRouter);

app.use('/admin',adminRouter);

// 404 Error Page Route
// app.use((req, res, next) => {
//     res.status(404).render('pageNotFound', { title: 'Page Not Found' }); // Replace '404' with your view file name
// });

app.listen(process.env.PORT,()=>{
    console.log("server running")
});  
module.exports=app;
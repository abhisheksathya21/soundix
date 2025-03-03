const express=require('express')
const app= express();
const path=require("path");
const env=require("dotenv").config();
const db=require("./config/dbs");
const userRouter=require('./routes/userRouter');
const adminRouter=require('./routes/adminRouter');
const session=require('express-session');
const nocache = require('nocache');
const passport=require('./config/passport');
const cartCountMiddleware=require('./middlewares/cartcount');
const wishlistCountMiddleware=require('./middlewares/wislistcount');

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
}));

app.use(cartCountMiddleware);
app.use(wishlistCountMiddleware);
app.use('/',userRouter);

app.use('/admin',adminRouter);

app.use(passport.initialize());
app.use(passport.session());
app.listen(process.env.PORT,()=>{
    console.log("server running on 3002");
});  
module.exports=app;
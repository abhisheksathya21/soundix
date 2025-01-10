  const passport=require('passport');
const GoogleStrategy=require('passport-google-oauth20').Strategy;
const  User=require('../models/userSchema');
const env=require("dotenv").config();


passport.use(new GoogleStrategy({
    clientID:process.env.GOOGLE_CLIENT_ID,
    clientSecret:process.env.GOOGLE_CLIENT_SECRET,
    callbackURL:'/auth/google/callback'
},
async (accessToken,refreshToken,profile,done)=>{
    try{
        let user= await User.findOne({googleId:profile.id});
        if(user){
            return done(null,user);
        }
        else{
            user= await new User({
                fullname:profile.displayName,
                email:profile.emails[0].value,
                googleId:profile.id,

            });
            await user.save();
            return done(null,user);
        }
    }
    catch(error){
        return done(error,null)
    }
}


));
passport.serializeUser((user, done) => {
    // Store only the user ID in the session
     console.log("Serialized user:", user);
    done(null, user.id);
});

passport.deserializeUser((id, done) => {
    // Retrieve the user object from the database using the stored ID
    console.log("Deserializing user with ID:", id);
    User.findById(id)
        .then(user => {
            console.log("Deserialized user:", user);
            done(null, user);
        })
        .catch(err => {
             console.error("Error deserializing user:", err);
            done(err, null);
        });
});

module.exports = passport;
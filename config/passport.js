const passport=require('passport');
const GoogleStrategy=require('passport-google-oauth20').Strategy;
const User=require('../models/userSchema');
const env=require('dotenv').config();

passport.use(new GoogleStrategy({
    clientID:process.env.GOOGLE_CLIENT_ID,
    clientSecret:process.env.GOOGLE_CLIENT_SECRET,
callbackURL: process.env.GOOGLE_CALLBACK_URL || 'http://beats4u.bar/auth/google/callback',    
},
        async(accessToken,refreshToken,profile,done)=>{
            try{
                let user=await User.findOne({googleId:profile.id});
                if(user){
                    return done(null,user); 
                }
                else{
                    let newUser=new User({ 
                        googleId:profile.id,
                        fullname:profile.displayName,
                        email:profile.emails[0].value,
                    });
                    await newUser.save();
                   return done(null,newUser);

            }
        }
            catch(err){
               return done(err);
            }

        }

));
passport.serializeUser((user,done)=>{
    done(null,user.id);
});
passport.deserializeUser((id, done) => {
  User.findById(id)
    .then((user) => done(null, user))
    .catch((err) => done(err));
});

module.exports=passport;

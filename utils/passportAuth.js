import dotenv from "dotenv";
import passport from "passport";
import { Strategy as GoogleStrategy } from "passport-google-oauth20";
import User from "../models/userSchema.js";

dotenv.config();

passport.use(
    new GoogleStrategy(
        {
            clientID: process.env.GOOGLE_CLIENT_ID,
            clientSecret: process.env.GOOGLE_CLIENT_SECRET,
            callbackURL: "https://readandgrow.space/read-and-grow/auth/google/callback",
            passReqToCallback: true,
        },


        async function (request, accessToken, refreshToken, profile, done) {
 

            const exist = await User.findOne({ email: profile["emails"][0].value });
            if (exist) {
                console.log('googleId is exists')
                return done(null,exist)
            }
            
            await User.create({
                username: profile.displayName,
                email: profile.emails[0].value,
                googleId: profile.id,
                isBlocked: false,
                isEmailVerfied: true,
                role: 'user'
            });
            const user = await User.findOne({ email: profile["emails"][0].value });
            return done(null, user);

            //    return done(null, profile);
        }
    )
);


passport.serializeUser(function (user, done) {
    done(null, user);
});


passport.deserializeUser(function (user, done) {
    done(null, user);
});

export default passport 
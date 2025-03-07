import express from "express"
const router = express.Router()
import userAuth from "../middlewares/userAuth.js"
import {

    productDetails,
    userLoginGet,
    userLoginPost,
    userSignUpGet,
    userSignUpPost,
    homePage,
    shop, 
    emailVerify,
    resetPassword,
    requestPasswordReset,
    resetPasswordGet,
    profile,
    changePassword,
    logout,
    changePasswordRequest,

} from "../controllers/userController.js"
import passport from "passport"
import jwt from "jsonwebtoken"
 


router.get('/login', userLoginGet)
router.post('/login', userLoginPost)
 
router.get("/signup", userSignUpGet)
router.post('/signup', userSignUpPost)

router.get('/email-verify',emailVerify)
router.post('/requestPasswordReset',requestPasswordReset)
router.get('/resetPassword',resetPasswordGet)
router.post('/resetPassword',resetPassword)

router.get('/home', userAuth, homePage)

router.get('/product-details/:id',userAuth,productDetails)

router.get("/shop",userAuth,shop)

router.get('/profile/:id',userAuth,profile)


router.get('/change-password/:id',userAuth,changePassword)
router.post('/change-password',userAuth,changePasswordRequest)
 

router.post('/logout',logout)

 

// ================google auth setting for signup======================
router.get('/auth/google', passport.authenticate('google', { scope: ['profile', 'email'] }));

router.get('/auth/google/callback',
    passport.authenticate('google', { failureRedirect: '/signup' }),
    (req, res) => {

        if (!req.user) {
            console.error("Google OAuth failed: No user found");
            return res.redirect('/signup');
        }else if(req.user.googleId)

        req.session.user = req.user._id;

        req.session.save((err) => {
            if (err) {
                console.error('Session save error:', err);
                return res.redirect('/signup');
            }
        });

        //JWT token setting
        const token = jwt.sign({ id: req.user._id }, process.env.JWT_SECRET, {
            expiresIn: process.env.JWT_EXPIRES
        });
 

        res.cookie('jwt', token, {
            httpOnly: true,
            maxAge: 24 * 60 * 60 * 1000
        });

        console.log(`Google signup done`);

        return res.redirect('/home');
    }
);

// ================for handling random routes===============
// router.get('/notFound', (req, res) => {
//     res.render('admin/notFound')
// })
// router.get('*', (req, res) => {
//     res.status(404).redirect("/notFound")
// })

//export routes
export default router
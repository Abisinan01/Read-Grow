import express from "express"
const router = express.Router()
import userAuth from "../middlewares/userAuth.js"
import {
 
    resetPassword,
    requestPasswordReset,
    logout,
    changePasswordRequest,
    handleLoginPage,
    renderLoginPage,
    renderSignPage,
    handleSignupPage,
    renderEmailVerify,
    renderResetPassword,
    renderHomePage,
    renderProductDetails,
    renderShopPage,
    renderProfilePage,
    renderChangePassword,
    editProfile,
    changeEmailRequest,
    renderChangeEmail,
    renderUpdateMail,
    updateNewMail,
    
    
} from "../controllers/userController.js"
import passport from "passport"
import jwt from "jsonwebtoken"
 


router.get('/login', renderLoginPage)
router.post('/login', handleLoginPage)

router.get("/signup", renderSignPage )
router.post('/signup', handleSignupPage)

router.get('/email-verify',renderEmailVerify)
router.post('/requestPasswordReset',requestPasswordReset) 
router.get('/resetPassword',renderResetPassword)
router.post('/resetPassword',resetPassword)

router.get('/home', renderHomePage)

router.get('/product-details/:id',userAuth,renderProductDetails)

router.get("/shop",userAuth,renderShopPage)

router.get('/profile/:id',userAuth,renderProfilePage)
router.patch('/profile/:id',userAuth,editProfile)

router.get('/change-password/:id',userAuth,renderChangePassword)
router.post('/change-password',userAuth,changePasswordRequest)

router.get('/change-email/:id',userAuth,renderChangeEmail)
router.post('/change-email',userAuth,changeEmailRequest)
router.get('/new-email/:id',userAuth,renderUpdateMail)
router.post('/new-email',userAuth,updateNewMail)


router.post('/logout',logout) 



// ================google auth setting for signup======================
router.get('/auth/google', passport.authenticate('google', { scope: ['profile', 'email'] }));

router.get('/auth/google/callback',
    passport.authenticate('google', { failureRedirect: '/read-and-grow/signup' }),
    (req, res) => {

        if (!req.user) {
            console.error("Google OAuth failed: No user found");
            return res.redirect('/read-and-grow/signup');
        }else if(req.user.googleId)
            
            req.session.user = req.user._id;
            
            req.session.save((err) => {
                if (err) {
                    console.error('Session save error:', err);
                return res.redirect('/read-and-grow/signup');
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
        
        return res.redirect('/read-and-grow/home');
    }
);


// ================for handling random routes===============
router.get('/notFound', (req, res) => {
    res.render('admin/notFound')
})
router.get('*', (req, res) => {
    res.status(404).render('admin/notFound')    
}) 

// export routes
export default router 
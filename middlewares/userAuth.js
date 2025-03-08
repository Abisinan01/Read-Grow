import jwt from "jsonwebtoken"
import User from "../models/userSchema.js"

 const userAuth =async (req,res,next)=>{
    try {
        const token = req.cookies.jwt // take data from login post

        if(!token){
            return res.redirect("/read-and-grow/login")
        }
        
        const decodeToken = jwt.verify(token,process.env.JWT_SECRET)
        
        if(!decodeToken){
            return res.status(403).send("Access denied : user")
        }
        
        req.user = decodeToken
        const isBlocked = await User.findById(req.user.id)
        // console.log(isBlocked)
        if(isBlocked && isBlocked.isBlocked){
             res.clearCookie("jwt")
             return res.status(404).redirect('/read-and-grow/login')
        }
        next()

    } catch (error) {
        console.error("admin auth failed",error.message)
        return res.status(500).redirect('/')
    }
}  

export default userAuth 
import jwt from "jsonwebtoken"

 const userAuth =async (req,res,next)=>{
    try {
        const token = req.cookies.jwt // take data from login post

        if(!token){
            return res.redirect("/login")
        }
        
        const decodeToken = jwt.verify(token,process.env.JWT_SECRET)

        if(!decodeToken){
            return res.status(403).send("Access denied : user")
        }
        
        req.user = decodeToken
        // console.log(req.user)
        next()

    } catch (error) {

        console.error("admin auth failed",error.message)
        res.status(500).json({ message: "Something went wrong. Please try again later." });
    }
}  

export default userAuth
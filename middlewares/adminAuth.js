import jwt from "jsonwebtoken"

 const adminAuth =async (req,res,next)=>{
    try {
        const token = req.cookies.jwt // take data from login post

        if(!token){
            return res.status(400).redirect("/admin/login")
        }
        
        const decodeToken = jwt.verify(token,process.env.JWT_SECRET)

        if(!decodeToken){
            return res.status(403).json({success:false, message:"Access denied : Admin"})
        }
        
        if(decodeToken.role === 'admin'){
            req.admin = decodeToken
        }
        
        console.log(req.admin)
        next()

    } catch (error) {

        console.error("admin auth failed",error.message)
        res.redirect("/admin/login")
    }
}  

export default adminAuth
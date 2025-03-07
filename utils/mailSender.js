import nodemailer from "nodemailer"

const mailSender = async (email, title, body) => {
    try{
        let transporter = nodemailer.createTransport({
            host:'smtp.gmail.com',
            port:587,
            secure:false,
            auth:{
                user:process.env.MAIL_USER,
                pass:process.env.MAIL_PASS
            }
        })

        let info = await transporter.sendMail({
            from : process.env.MAIL_USER,
            to : email,
            subject : title,
            html : body
        })

        console.log(`Email info : ${info}`)
    }catch(error){
        console.log(`Error mailSender ${error.message}`)
    }
}

export default mailSender
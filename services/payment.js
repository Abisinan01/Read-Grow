import Razorpay from "razorpay";
import path from 'path'
import fs from 'fs'

export const razorpay = new Razorpay({
    key_id: process.env.KEY_ID,
    key_secret: process.env.KEY_SECRET
})

export const readData = () =>{
        if(fs.existsSync('orders.json')){
            const data = fs.readFileSync('orders.json')
            return JSON.parse(data)
        }
        return []
}

export const writeData  = (data) => {
    fs.writeFileSync('orders.json',JSON.stringify(data,2,null));
}

if(!fs.existsSync('orders.json')){
    writeData([])
}


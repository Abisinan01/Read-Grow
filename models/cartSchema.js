
import mongoose, { Schema, Types } from "mongoose";
import AppError from "../utils/errorHandler.js";
const cartSchema = new Schema({
    userId: {
        type: Types.ObjectId,
        required: true
    },
    items: [
        {
            productId: {
                type: Types.ObjectId,
                required: true
            },
            quantity: {
                type: Number,
                required: true, 
                min: 1
            },
            stock: {
                type: Number,
                required: true 
            }
        }
    ]
}, { timestamps: true })


cartSchema.pre('save',function (next){
    this.items.forEach(item=>{
        if(item.quantity>item.stock){
            return next(new AppError(`Out of stock`,500))
        }
    })
    next()
})

const Cart = mongoose.model('carts',cartSchema)
export default Cart 
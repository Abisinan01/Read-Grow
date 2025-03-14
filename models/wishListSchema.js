import mongoose, { Schema, Types } from "mongoose";

const wishListSchema = new Schema({
    userId:{
        type:Types.ObjectId,
        required:true,
        ref:"User"
    },
    items:[{
        productId:{
            type:Types.ObjectId,
            required:true,
            ref:'Product'
        },

    }]
},{timestamps:true})

const Wishlist = mongoose.model('Wishlist',wishListSchema)
export default Wishlist
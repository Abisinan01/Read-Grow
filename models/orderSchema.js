import mongoose, { Schema } from "mongoose";

const orderSchema = new Schema({
    userId:{
        type: mongoose.Types.ObjectId,
        required:true,
    },
    orderId:{
        type:String
        ,required:true
    },
    addressId:{
        type:mongoose.Types.ObjectId,
        required:true
    },
    status:{
        type:String,
        default:'Pending'
    },
    payment:{
        type:String,
        default:"COD"
    },
    items:[{
        productId : String,
        quantity:Number,
        price:Number
    }],
    totalAmount:{type:Number,required:true},
    isCancelled:{
        type:Boolean,
        default:false
    },
    isReturned:{
        type:Boolean,
        default:false
    }
},{timestampsL:true})

const Order = mongoose.model('Order',orderSchema)
export default Order
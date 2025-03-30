
import mongoose from "mongoose";
import { Schema } from "mongoose";
const addressSchema = new Schema({
    street: { type: String, required: true, trim: true },
    city: { type: String, required: true, trim: true },
    state: { type: String, required: true, trim: true },
    postalCode: { type: String, required: true, trim: true },
    country: { type: String, required: true, trim: true, default: "India" },
})

let lastUser=100//for custome id setting

const userSchema = new Schema({
    id:{
        type:String,
        unique:true

    },
    username: {
        type: String,
        trim: true,
        // required: true,// if i on this show error
    },
    email: {
        type: String,
        trim: true,
        lowercase: true,
        unique: true,
        required: true,
        match: [/^\w+([\.-]?\w+)*@\w+([\.-]?\w+)*(\.\w{2,3})+$/, 'Please fill a valid email address']
    },
    password: {
        type: String,
        required: false,
        minlength: 6,
        select: true
    },
    phoneNumber: {
        type: String,
        required: false,
        unique:true,
        sparse:true,
        default:null
    },
    googleId:{
        type:String,
        unique:true
    }, 
    address: addressSchema,
    role: {
        type: String,
        default: "user"
    },
    isBlocked: {
        type: Boolean,
        default:false
    },
    isEmailVerfied: {
        type: Boolean,
        default: false
    },
    profileImage:{
        type:String
    },
    
}, { timestamps: true })



userSchema.pre('save',async function(next){
    if(!this.id){
        this.id=`${lastUser++}`
    }
    next()
})

const User = mongoose.model('Users', userSchema)
export default User 
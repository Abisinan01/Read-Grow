
import mongoose, { Schema } from "mongoose"

const categorySchema = new Schema({
    categoryName:{
        type:String,
        required:true,
        trim:true,
    },
    description:{
        type:String
    },
    status:{    
        type:String,
        default:"Active"
    } ,
    offers: [{ type: mongoose.Schema.Types.ObjectId, ref: "Offer" }] 
},{timestamps:true})

const Category = mongoose.model('Category', categorySchema);
export default Category
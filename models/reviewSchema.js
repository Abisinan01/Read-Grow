import mongoose from "mongoose";

const reviewSchema = new mongoose.Schema({
  user: {
    type: mongoose.Schema.Types.ObjectId,
    ref: 'User',
    required: true
  },
  product: {
    type: mongoose.Schema.Types.ObjectId,
    ref: 'Product', 
    required: true
  },
  rating: {
    type: Number,
  },
  comment: {
    type: String,
    trim: true,
    maxlength: 500
  },
},{timestamps:true});

const Review = mongoose.model('Review', reviewSchema);

export default Review

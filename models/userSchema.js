const mongoose = require('mongoose');

const userSchema = new mongoose.Schema({
  fullname: { 
      type: String,
      required: true 
    },
  email: {
     type: String, 
     required: true, 
     unique: true 
    },
  password: { 
    type: String, 
    required: false 
  },
  phone: { 
    type: String, 
    required: false, 
    unique: true, 
    sparse:true,
    default:null,
    match: [/^\d{10}$/, 'Please enter a valid 10-digit phone number'] // Validation regex for 10 digits
  },
  googleId: {
     type: String, 
     unique: true, 
     sparse: true 
    },
    isAdmin:{
      type:Boolean,
      default:false,

    },
    isBlocked:{
      type:Boolean,
      default:false,
    },
    



});

module.exports = mongoose.model('User', userSchema);




// const userSchema=new Schema({
//     name:{
//         type:String,
//         required:true
//     },
//     email:{
//         type:String,
//         required:true,
//         unique:true,
//     },
//     phone:{
//         type:String,
//         required:false,
//         unique:true,
//         sparse:true,
         
//     },
//     googleId:{
//         type:String,
//         unique:true,

//     },
//     password:{
//         type:String,
//         required:false,
//     },
//     // isBlocked:{
//     //     type:Boolean,
//     //     default:false,
//     // },
//     // isAdmin:{
//     //     type:Boolean,
//     //     default:false,
//     // },
//     // cart:[{
//     //     type:Schema.Types.ObjectId,
//     //     ref:'Cart',

//     // }],
//     // Wallet:{
//     //     type:Number,
//     //     default:0,
//     // },
//     // Wishlist:[{
//     //     type:Schema.Types.ObjectId,
//     //     ref:'Wishlist'
//     // }],
//     // OrderHistory:[{
//     //     type:Schema.Types.ObjectId,
//     //     ref:'Order',
//     // }],
//     // CreatedOn:{
//     //     type:Date,
//     //     default:Date.now,
//     // },
//     // referalCode:{
//     //     type:String,
//     // },
//     // redeemed:{
//     //     type:Boolean
//     // },


    
// })

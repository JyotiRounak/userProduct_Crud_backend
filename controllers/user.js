const asyncHandler = require("express-async-handler");
const User = require('../models/user');
const jwt = require("jsonwebtoken");
const bcrypt = require('bcrypt');
const sendEmail = require("../utils/sendEmail");
const Token = require("../models/tokenModel");
const crypto = require("crypto");
const generateToken = (id) =>{
  return jwt.sign({id}, process.env.secretKey, {expiresIn: '1d'});
}
// Register User
const registerUser = asyncHandler(async(req, res)=>{
    const{name, email, password} = req.body;
    
     // Validation
  if (!name || !email || !password) {
    res.status(400);
    throw new Error("Please fill in all required fields");
  }
  if (password.length < 6) {
    res.status(400);
    throw new Error("Password must be up to 6 characters");
  }

  // check if user exist
  const userExists = await User.findOne({email});

  if (userExists){
    res.status(400);
    throw new Error("Email has already been registered");
  }

   // Create new user
  const user = await User.create({
    name,
    email,
    password,
  });
  
  // genrate token
  const token = generateToken(user._id);
  
  // send http-only-cookie to the client or frontend
  res.cookie("token", token, {
    path: "/",
    httpOnly: true,
    expires: new Date(Date.now() + 1000* 86400),
    sameSite: "none",
    secure: true
  });

  if(user){
    const { _id, name, email, phone, photo, bio } = user;
    res.status(201).json({
        _id,
        name,
        email,
        phone,
        photo,
        bio,
        token
      });
  }else {
    res.status(400);
    throw new Error("Invalid user data");
  }

  
});

// login user
const loginUser = asyncHandler(async(req, res)=>{
  const {email, password} = req.body;
  if(!email || !password){
   res.status(400);
   throw new Error("Please add email and password");
  }
  // if user exists in the db
  const user = await User.findOne({email});

  if(!user){
    res.status(400);
    throw new Error("invalid user please signup");
   }

   // user exists now check if password is correct
   const passwordIsCorrect = await bcrypt.compare(password, user.password);


    // genrate token
  const token = generateToken(user._id);
  
  // send http-only-cookie to the client or frontend
  res.cookie("token", token, {
    path: "/",
    httpOnly: true,
    expires: new Date(Date.now() + 1000* 86400),
    sameSite: "none",
    secure: true
  });

   if(user && passwordIsCorrect){
    const { _id, name, email, phone, photo, bio } = user;
    res.status(200).json({
      _id,
      name,
      email,
      phone,
      photo,
      bio,
      token
    });
   }
   else{
    res.status(400);
    throw new Error("invalid email or password");
   }
   
});

// logout User
const logoutUser = asyncHandler(async(req, res)=>{
   // expires the cookie to logout
  res.cookie("token", "", {
    path: "/",
    httpOnly: true,
    expires: new Date(0),
    sameSite: "none",
    secure: true
  });
  return res.status(200).json({
    message: "succefully logout"
  });
});

// get user data/profile
const getUser = asyncHandler(async(req, res)=>{

 const user = await User.findById(req.user._id);
 if (user) {
  const { _id, name, email, phone, photo, bio} = user;
  res.status(200).json({
    _id,
    name,
    email,
    phone,
    photo, 
    bio
  });
} else {
  res.status(400);
  throw new Error("User Not Found");
}
});

// login status of the user
const loginStatus = asyncHandler(async(req, res)=>{
  
  const token = req.cookies.token;

  if(!token){
   return  res.json(false);
  }
  //verify token
  const verified = jwt.verify(token, process.env.secretKey);

  //if the user has verfied token
  if(verified){
   return res.json(true)
  }
  return  res.json(false);
});

// update the user details except the email id

const updateUser = asyncHandler(async(req, res)=>{
  
  const user = await User.findById(req.user._id);
  if(user){
    const {name, email, phone, photo, bio} = user;
     user.email = email;
     user.name = req.body.name || name;
     user.phone = req.body.phone || phone;
     user.photo = req.body.photo || photo;
     user.bio = req.body.bio || bio;

     const updateUser = await user.save();
     res.status(200).json({
      _id: updateUser._id,
      name: updateUser.name,
      email: updateUser.email,
      photo: updateUser.photo,
      phone: updateUser.phone,
      bio: updateUser.bio,
     });
  }else{
    res.status(404);
    throw new Error("User not found");
  }
});

// change password

const changePassword = asyncHandler(async(req, res)=>{
  const user = await User.findById(req.user._id);

  const {oldPassword, password} = req.body;

  if(!user){
    res.status(400);
    throw new Error("User not found please signup");
  }

  if(!oldPassword || !password){
    res.status(400);
    throw new Error("Please add old and new password");
  }

  // check if oldpassword matches with db password
   
  const passwordIsCorrect = await bcrypt.compare(oldPassword, user.password);

  // save new password

  if(user && passwordIsCorrect){
    user.password = password
    await user.save();
    res.status(200).send("password change succesfully");
  }
  else{
    res.status(400);
    throw new Error("old password is incorrect");
  }
  
});
// forgot password 

const forgetPassword = asyncHandler(async(req, res)=>{
   const {email} = req.body;

   const user = await User.findOne({email});

   if(!user){
    res.status(404);
    throw new Error("User does not exist");
   }
   // Delete token if it exists in DB
   let token = await Token.findOne({ userId: user._id });
   if (token) {
     await token.deleteOne();
   }
  // create reset token4

  let resetToken = crypto.randomBytes(32).toString("hex") + user._id;
  //console.log(resetToken);

  // hash token before saving to db
  const hashedToken = crypto.createHash("sha256").update(resetToken).digest("hex");
  //console.log(hashedToken);

  // save token to db
  await new Token({
    userId: user._id,
    token: hashedToken,
    createdAt: Date.now(),
    expiresAt: Date.now() + 30 * (60 * 1000), // Thirty minutes
  }).save();

  // Construct Reset Url
  const resetUrl = `${process.env.FRONTEND_URL}/resetpassword/${resetToken}`;

  //reset Email
  const message = `
  <h1>Hello ${user.name}<h1>
  <p>Please use the url below to reset your password</p>  
  <p>This reset link is valid for only 30minutes.</p>
  <a href=${resetUrl} clicktracking=off>${resetUrl}</a>  
  <p>Regards...</p>
  <p>Jyoti Team</p>`;
  
  const subject = "Password Reset Request";
  const send_to = user.email;
  const send_from = process.env.EMAIL_USER;


  try {
    await sendEmail(subject, message, send_to, send_from);
      res.status(200).json({success: true, message: "Reset Email Sent"});
  } catch (error) {
    res.status(500);
    throw new Error("Email not sent, please try again");
  }

  //res.send("forgot password");
});

// reset password
const resetPassword = asyncHandler(async(req, res)=>{
   const { password } = req.body;
   const { resetToken } = req.params;

     // Hash token, then compare to Token in DB
  const hashedToken = crypto
  .createHash("sha256")
  .update(resetToken)
  .digest("hex");


  //find the token in DB

  const userToken = await Token.findOne({
    token: hashedToken,
    expiresAt: { $gt: Date.now() }
  })
  
  if(!userToken){
    res.status(404);
    throw new Error("Invalid or Expired Token");
  }

  // find the user
  const user = await User.findOne({_id: userToken.userId});
  user.password = password;
  await user.save();
  res.status(200).json({
    message: "Password Reset Successful, Please Login",
  });
});


module.exports = {
    registerUser,
    loginUser,
    logoutUser,
    getUser,
    loginStatus,
    updateUser,
    changePassword,
    forgetPassword,
    resetPassword
}
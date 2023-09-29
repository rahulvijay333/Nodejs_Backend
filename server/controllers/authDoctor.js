const jwt = require("jsonwebtoken");
const bcrypt = require("bcryptjs");
const Doctor = require("../models/doctor");
const transporter = require("../utils/emailHelper");
const Notification = require("../models/notification");
const Admin = require("../models/admin");

let temporaryDoctor = null;



//testing functions

const registerDoctor = async (req, res) => {
  const { name, email, password } = req.body;
  try {
    // ... (input validation and error handling)

    const doctor = await Doctor.findOne({ email: email });
    console.log(doctor);
    if (!name || !email || !password) {
      return res.status(400).json({
        errorInfo: "Please provide all required fields",
      });
    }
    if (doctor) {
      return res
        .status(409)
        .json({ errorInfo: "user already exist with this email" });
    } else {

      // const hashPassword = await bcrypt.hash(password, 10);

      const otp = 1000 + Math.floor(Math.random() * 9000);
      const otpExpiry = Date.now() + 5 * 60 * 1000;
      console.log(otp);



      temporaryDoctor = Doctor({
        name: name,
        email: email,
        password: password,
        isVerified: false,
        otp: otp, // Initialize OTP as null
        otpExpiry: otpExpiry, // Initialize OTP expiry as null
      });

      const mailOptions = {
        from: "admin@gmail.com",
        to: `${email}`,
        subject: "OTP VERIFICATION",
        html: `<p>Enter <b> ${otp} </b> in the app to verify your email address and complete the signup process. This code expires in 5 minutes</p>`,
      };

      await transporter.sendMail(mailOptions);

      // temporaryDoctor.password = undefined;
      // temporaryDoctor.verifyToken = undefined;

      const admin = await Admin.findOne({});

      const newNotification = await Notification.create({
        recipient: admin._id,
        recipientType: "Admin",
        sender: temporaryDoctor._id,
        senderType: "Doctor",
        message: "New Doctor registered",
      });

      // Generate and send OTP to the doctor's email
      // ... (send OTP logic)

      res.status(200).json({
        success: true,
        message: "OTP sent successfully",
      });

    }




  } catch (error) {
    console.error(error);
    res.status(500).json({
      success: false,
      message: "Internal server error",
    });
  }
};


const doctorVerifyController = async (req, res) => {
  const { email, otp } = req.body;
  

  try {
    if (!temporaryDoctor) {
      console.log(temporaryDoctor);
      return res.status(404).json({
        success: false,
        message: "Doctor details not found",
      });
    }

    if (temporaryDoctor.email !== email) {
      return res.status(400).json({
        success: false,
        message: "Email mismatch",
      });
    }

    if (parseInt(otp) === temporaryDoctor.otp) {
      if (Date.now() < temporaryDoctor.otpExpiry) {
        // OTP verification successful, update doctor status to "verified"
        temporaryDoctor.isVerified = true;

        // Now, save the doctor to the database
        const hashPassword = await bcrypt.hash(temporaryDoctor.password, 10);

        const newDoctor = await Doctor.create({
          name: temporaryDoctor.name,
          email: temporaryDoctor.email,
          password: hashPassword,
          isVerified: true, // Set as verified in the database
        });

        // Clear the temporaryDoctor variable
        temporaryDoctor = null;

        res.status(200).json({
          success: true,
          message: "OTP verified successfully, doctor registered",
         
        });
      } else {
        res.status(400).json({
          success: false,
          message: "OTP has already expired",
        });
      }
    } else {
      res.status(400).json({
        success: false,
        message: "Invalid OTP",
      });
    }
  } catch (error) {
    console.error(error);
    res.status(500).json({
      success: false,
      message: "Internal server error",
    });
  }
};


//---<<<<<<<<<<<<<<<-----------------------------------------------testing


//----------------------------------------------------uncomment here
// const registerDoctor = async (req, res) => {
//   const { name, email, password } = req.body;
//   console.log(email);
//   try {
//     const doctor = await Doctor.findOne({ email: email });
//     console.log(doctor);
//     if (!name || !email || !password) {
//       return res.status(400).json({
//         errorInfo: "Please provide all required fields",
//       });
//     }
//     if (doctor) {
//       return res
//         .status(409)
//         .json({ errorInfo: "user already exist with this email" });
//     } else {
//       const hashPassword = await bcrypt.hash(password, 10);

//       const otp = 1000 + Math.floor(Math.random() * 9000);
//       const otpExpiry = Date.now() + 5 * 60 * 1000;



//       const newDoctor = await Doctor.create({
//         name: name,
//         email: email,
//         password: hashPassword,
//         otp: otp,
//         otpExpiry: otpExpiry,
//       });


//       const mailOptions = {
//         from: "admin@gmail.com",
//         to: `${email}`,
//         subject: "OTP VERIFICATION",
//         html: `<p>Enter <b> ${otp} </b> in the app to verify your email address and complete the signup process. This code expires in 5 minutes</p>`,
//       };

//       await transporter.sendMail(mailOptions);

//       newDoctor.password = undefined;
//       newDoctor.verifyToken = undefined;

//       const admin = await Admin.findOne({});

//       const newNotification = await Notification.create({
//         recipient: admin._id,
//         recipientType: "Admin",
//         sender: newDoctor._id,
//         senderType: "Doctor",
//         message: "New Doctor registered",
//       });

//       return res.status(201).json({
//         user: newDoctor,
//       });
//     }
//   } catch (err) {
//     console.log(err);
//     res.status(500).json({
//       errorInfo: "Internal server error",
//     });
//   }
// };

// const verifyDoctorEmail = async (req, res) => {
//   const { token } = req.params;
//   try {
//     let decodeInfo = jwt.verify(token, process.env.SECRET_KEY);
//     const email = decodeInfo.email;
//     const doctor = await Doctor.find({ email: email });

//     if (doctor[0].isVerified) {
//       return res.status(409).json({
//         message: "Email is alredy verified",
//       });
//     } else {
//       if (doctor[0].verifyToken === token) {
//         doctor[0].isVerified = true;
//         doctor[0].verifyToken = undefined;
//         await doctor[0].save();
//         return res.status(200).json({
//           message: "Email is succesfully verified",
//         });
//       } else {
//         return res.status(400).json({
//           errorInfo: "Token expired or wrong token",
//         });
//       }
//     }
//   } catch (err) {
//     res.status(400).json({
//       error: "Token expired wrong token",
//     });
//   }
// };


//uncomment this function
// const doctorVerifyController = async (req, res) => {
//   const { email, otp } = req.body;
//   console.log(otp);
//   try {
//     const doctor = await Doctor.find({ email: email });
//     console.log(doctor[0]);
//     if (doctor.length > 0) {
//       if (parseInt(otp) === doctor[0].otp) {
//         if (Date.now() < doctor[0].otpExpiry) {
//           //   await Patient.findOneAndUpdate(
//           //     { email: email },
//           //     { $set: { isVerified: true } }
//           //   );
//           doctor[0].isVerified = true;
//           doctor[0].otp = undefined;
//           doctor[0].otpExpiry = undefined;
//           await doctor[0].save();
//           res.status(200).json({
//             success: true,
//             message: "Otp verified success",
//           });
//         } else {
//           res.status(400).json({
//             success: false,
//             message: "Otp is already expired",
//           });
//         }
//       } else {
//         res.status(400).json({
//           success: false,
//           message: "Invalid OTP",
//         });
//       }
//     } else {
//       res.status(404).json({
//         success: false,
//         message: "No Doctors found",
//       });
//     }
//   } catch (e) {
//     console.log(e);
//   }
// };

const loginDoctor = async (req, res) => {
  const { email, password } = req.body;

  try {
    const doctor = await Doctor.findOne({ email: email });
    if (doctor) {
      // if (!doctor.isVerified) {
      //   return res.status(401).json({
      //     errorInfo: "Email is not verified",
      //   });
      // }

      // if (!doctor.isAdminVerified) {
      //   return res.status(401).json({
      //     errorInfo: "Admin verification required",
      //   });
      // }

      let isCorrectPassword = await bcrypt.compare(password, doctor.password);
      if (isCorrectPassword) {
        const token = jwt.sign(
          { userId: doctor._id, email: email },

          process.env.SECRET_KEY,

          {
            expiresIn: "30d",
          }
        );

        doctor.password = undefined;
        doctor.token = token;

        const options = {
          expires: new Date(Date.now() + 3 * 24 * 60 * 60 * 1000),
          httpOnly: true,
        };

        return res.status(200).cookie("token", token, options).json({
          success: true,
          user: doctor,
        });
      } else {
        return res.status(400).json({
          errorInfo: "Incorrect password",
        });
      }
    } else {
      return res.status(404).json({
        errorInfo: `We didn't recoganize this email`,
      });
    }
  } catch (err) {
    res.status(500).json({
      errorInfo: "Internal server error",
    });
  }
};

// const resetPasswordDoctor = async (req, res) => {
//   const { email } = req.body;
//   try {
//     const doctor = await Doctor.findOne({ email: email });
//     if (doctor) {
//       const token = jwt.sign(
//         { email: email },

//         process.env.SECRET_KEY,
//         {
//           expiresIn: "5m",
//         }
//       );

//       doctor.forgotPasswordToken = token;
//       await doctor.save();

//       const mailOptions = {
//         from: "admin@gmail.com",
//         to: `${email}`,
//         subject: "Password reset",
//         text: `Hi! Please follow the given link to change your password http://localhost:3000/doctor/reset/password/${token}`,
//       };

//       await transporter.sendMail(mailOptions);

//       res.status(200).json({
//         message: "Check the email for resetting password",
//       });
//     } else {
//       res.status(404).json({
//         errorInfo: `User doesn't exist with this email`,
//       });
//     }
//   } catch (err) {
//     res.status(500).json({
//       errorInfo: "Internal Server error",
//     });
//   }
// };

// const newPasswordDoctor = async (req, res) => {
//   const { password, confirmPassword, passwordToken } = req.body;
//   if (password === confirmPassword) {
//     try {
//       let decodeInfo = jwt.verify(passwordToken, process.env.SECRET_KEY);
//       const email = decodeInfo.email;
//       const doctor = await Doctor.findOne({ email: email });
//       if (doctor) {
//         if (doctor.forgotPasswordToken === passwordToken) {
//           const hashPassword = await bcrypt.hash(password, 10);

//           doctor.password = hashPassword;
//           doctor.forgotPasswordToken = undefined;

//           await doctor.save();

//           return res.status(200).json({
//             message: "Password updated success",
//           });
//         } else {
//           return res.status(400).json({
//             errorInfo: "Token expired or wrong token",
//           });
//         }
//       } else {
//         return res.status(404).json({
//           errorInfo: "User Not found",
//         });
//       }
//     } catch (err) {
//       return res.status(400).json({
//         error: "Token expired or wrong token",
//       });
//     }
//   } else {
//     return res.status(400).json({
//       errorInfo: `Please confirm your password`,
//     });
//   }
// };

const resetPasswordDoctor = async (req, res) => {
  const { email } = req.body;
  try {
    const doctor = await Doctor.findOne({ email: email });
    if (doctor) {
      const token = jwt.sign(
        { email: email },

        process.env.SECRET_KEY,
        {
          expiresIn: "5m",
        }
      );

      doctor.forgotPasswordToken = token;
      await doctor.save();

      // const mailOptions = {
      //   from: "admin@gmail.com",
      //   to: `${email}`,
      //   subject: "Password reset",
      //   text: `Hi! Please follow the given link to change your password http://localhost:3000/doctor/reset/password/${token}`,
      // };

      // await transporter.sendMail(mailOptions);

      res.status(200).json({
        success: true,
        token,
      });
    } else {
      res.status(404).json({
        errorInfo: `User doesn't exist with this email`,
      });
    }
  } catch (err) {
    res.status(500).json({
      errorInfo: "Internal Server error",
    });
  }
};




const newPasswordDoctor = async (req, res) => {
  const { password, confirmPassword, passwordToken } = req.body;
  console.log(password);
  console.log(confirmPassword);
  if (password === confirmPassword) {
    try {
      let decodeInfo = jwt.verify(passwordToken, process.env.SECRET_KEY);
      const email = decodeInfo.email;
      const doctor = await Doctor.findOne({ email: email });
      if (doctor) {
        if (doctor.forgotPasswordToken === passwordToken) {
          const hashPassword = await bcrypt.hash(password, 10);

          doctor.password = hashPassword;
          doctor.forgotPasswordToken = undefined;

          await doctor.save();

          return res.status(200).json({
            message: "Password updated success",
          });
        } else {
          return res.status(400).json({
            errorInfo: "Token expired or wrong token",
          });
        }
      } else {
        return res.status(404).json({
          errorInfo: "User Not found",
        });
      }
    } catch (err) {
      return res.status(400).json({
        error: "Token expired or wrong token",
      });
    }
  } else {
    return res.status(400).json({
      errorInfo: `Please confirm your password`,
    });
  }
};


const logoutDoctor = (req, res) => {
  res
    .status(200)
    .cookie("token", null, {
      expires: new Date(Date.now()),
      httpOnly: true,
    })
    .json({
      success: true,
      message: "Logout Success",
    });
};

const getDoctorDetails = async (req, res) => {
  try {
    const doctor = await Doctor.findOne({ _id: req.userId });
    res.status(200).json({ doctor });
  } catch (err) {
    res.status(400).json({
      errorInfo: "Internal Server Error",
    });
  }
};

module.exports = {
  registerDoctor,
  doctorVerifyController,
  loginDoctor,
  resetPasswordDoctor,
  newPasswordDoctor,
  getDoctorDetails,
  logoutDoctor,
};

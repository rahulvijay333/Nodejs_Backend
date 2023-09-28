const jwt = require("jsonwebtoken");
const bcrypt = require("bcryptjs");
const Patient = require("../models/patient");
const transporter = require("../utils/emailHelper");
const Admin = require("../models/admin");
const Notification = require("../models/notification");

const registerPatient = async (req, res) => {
  const { name, email, password } = req.body;
  try {
    const patient = await Patient.findOne({ email: email });
    if (!name || !email || !password) {
      return res.status(400).json({
        errorInfo: "Please provide all required fields",
      });
    }
    if (patient) {
      return res
        .status(400)
        .json({ errorInfo: "user already exist with this email" });
    } else {
      const hashPassword = await bcrypt.hash(password, 10);

      const otp = 1000 + Math.floor(Math.random() * 9000);
      const otpExpiry = Date.now() + 2 * 60 * 1000;

      // creating a new patient in the db
      const newPatient = await Patient.create({
        name: name,
        email: email,
        password: hashPassword,
        otp: otp,
        otpExpiry: otpExpiry,
      });

      const mailOptions = {
        from: "admin@gmail.com",
        to: `${email}`,
        subject: "OTP VERIFICATION",
        html: `<p>Enter <b> ${otp} </b> in the app to verify your email address and complete the signup process. This code expires in 5 minutes</p>`,
      };

      await transporter.sendMail(mailOptions);

      newPatient.password = undefined;
      newPatient.verifyToken = undefined;

      const admin = await Admin.findOne({});

      const newNotification = await Notification.create({
        recipient: admin._id,
        recipientType: "Admin",
        sender: newPatient._id,
        senderType: "Patient",
        message: "New Patient registered",
      });

      return res.status(201).json({
        user: newPatient,
      });
    }
  } catch (err) {
    res.status(500).json({
      errorInfo: `Internal server error`,
    });
  }
};


// // Express route handler for resending OTP
// app.post('/resend-otp', resendOtpController);

const resendOtpController = async (req, res) => {
  const { email } = req.body;

  try {
    const patient = await Patient.findOne({ email: email });

    if (!patient) {
      return res.status(404).json({
        success: false,
        message: "No patient found with this email",
      });
    }

    if (patient.isVerified) {
      return res.status(400).json({
        success: false,
        message: "User is already verified",
      });
    }

    // Generate a new OTP
    const newOtp = 1000 + Math.floor(Math.random() * 9000);
    const newOtpExpiry = Date.now() + 2 * 60 * 1000;

    // Update the patient's OTP and OTP expiry
    patient.otp = newOtp;
    patient.otpExpiry = newOtpExpiry;

    // Save the updated patient
    await patient.save();

    // Send the new OTP to the user's email
    const mailOptions = {
      from: "admin@gmail.com",
      to: `${email}`,
      subject: "Resend OTP",
      html: `<p>Your new OTP is <b>${newOtp}</b>. This code expires in 5 minutes.</p>`,
    };

    await transporter.sendMail(mailOptions);

    res.status(200).json({
      success: true,
      message: "New OTP sent successfully",
    });
  } catch (error) {
    console.error(error);
    res.status(500).json({
      success: false,
      message: "Internal server error",
    });
  }
};


const patientVerifyController = async (req, res) => {
  const { email, otp } = req.body;
  console.log(otp);
  try {
    const patient = await Patient.find({ email: email });
    console.log(patient[0]);
    if (patient.length > 0) {
      if (parseInt(otp) === patient[0].otp) {
        if (Date.now() < patient[0].otpExpiry) {
          //   await Patient.findOneAndUpdate(
          //     { email: email },
          //     { $set: { isVerified: true } }
          //   );
          patient[0].isVerified = true;
          patient[0].otp = undefined;
          patient[0].otpExpiry = undefined;
          await patient[0].save();
          res.status(200).json({
            success: true,
            message: "Otp verified success",
          });
        } else {
          res.status(400).json({
            success: false,
            message: "Otp is already expired",
          });
        }
      } else {
        res.status(400).json({
          success: false,
          message: "Invalid OTP",
        });
      }
    } else {
      res.status(404).json({
        success: false,
        message: "No Doctors found",
      });
    }
  } catch (e) {
    console.log(e);
  }
};

// const emailVerifcationPatient = async (req, res) => {
//   const { token } = req.params;
//   try {
//     let decodeInfo = jwt.verify(token, process.env.SECRET_KEY);
//     const email = decodeInfo.email;
//     const patient = await Patient.find({ email: email });
//     if (patient[0].isVerified) {
//       return res.status(409).json({
//         message: "Email is alredy verified",
//       });
//     } else {
//       if (patient[0].verifyToken === token) {
//         patient[0].isVerified = true;
//         patient[0].verifyToken = undefined;
//         await patient[0].save();
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
//       error: "Token expired",
//     });
//   }
// };

const loginPatient = async (req, res) => {
  const { email, password } = req.body;

  try {
    const patient = await Patient.findOne({ email: email });
    if (patient) {
      // if (!patient.isVerified) {
      //     return res.status(401).json({
      //         errorInfo: 'Email is not verified'
      //     })
      // }

      // if (!patient.isAdminVerified) {
      //     return res.status(401).json({
      //         errorInfo: 'Admin verification required'
      //     })
      // }

      let isCorrectPassword = await bcrypt.compare(password, patient.password);
      if (isCorrectPassword) {
        const token = jwt.sign(
          {
            userId: patient._id,
            email: email,
          },

          process.env.SECRET_KEY,

          {
            expiresIn: "30d",
          }
        );

        patient.password = undefined;

        const options = {
          expires: new Date(Date.now() + 3 * 24 * 60 * 60 * 1000),
          httpOnly: true,
        };

        patient.token = token;

        return res.status(200).cookie("token", token, options).json({
          success: true,
          user: patient,
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
      message: "Internal Server error",
    });
  }
};

// const resetPasswordPatient = async (req, res) => {
//   const { email } = req.body;
//   try {
//     const patient = await Patient.findOne({ email: email });
//     if (patient) {
//       const token = jwt.sign(
//         { email: email },

//         process.env.SECRET_KEY,
//         {
//           expiresIn: "5m",
//         }
//       );

//       patient.forgotPasswordToken = token;
//       await patient.save();

//       const mailOptions = {
//         from: "admin@gmail.com",
//         to: `${email}`,
//         subject: "Password reset",
//         text: `Hi! Please follow the given link to change your password http://localhost:4000/patient/reset/password/${token}`,
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

// const newPasswordPatient = async (req, res) => {
//   const { password, confirmPassword, passwordToken } = req.body;
//   if (password === confirmPassword) {
//     try {
//       let decodeInfo = jwt.verify(passwordToken, process.env.SECRET_KEY);
//       const email = decodeInfo.email;
//       const patient = await Patient.findOne({ email: email });
//       if (patient) {
//         if (patient.forgotPasswordToken === passwordToken) {
//           const hashPassword = await bcrypt.hash(password, 10);

//           patient.password = hashPassword;
//           patient.forgotPasswordToken = undefined;

//           await patient.save();

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

const resetPasswordPatient = async (req, res) => {
  const { email } = req.body;
  try {
    const patient = await Patient.findOne({ email: email });
    if (patient) {
      const token = jwt.sign(
        { email: email },

        process.env.SECRET_KEY,
        {
          expiresIn: "5m",
        }
      );

      patient.forgotPasswordToken = token;
      await patient.save();

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

const newPasswordPatient = async (req, res) => {
  const { password, confirmPassword, passwordToken } = req.body;
  if (password === confirmPassword) {
    try {
      let decodeInfo = jwt.verify(passwordToken, process.env.SECRET_KEY);
      const email = decodeInfo.email;
      const patient = await Patient.findOne({ email: email });
      if (patient) {
        if (patient.forgotPasswordToken === passwordToken) {
          const hashPassword = await bcrypt.hash(password, 10);

          patient.password = hashPassword;
          patient.forgotPasswordToken = undefined;

          await patient.save();

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
        errorInfo: "Token expired or wrong token",
      });
    }
  } else {
    return res.status(400).json({
      errorInfo: `Please confirm your password`,
    });
  }
};

const logoutPatient = (req, res) => {
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

const getPatientDetails = async (req, res) => {
  try {
    const patient = await Patient.findOne({ _id: req.userId });
    res.status(200).json({ patient });
  } catch (err) {
    res.status(400).json({
      errorInfo: "Internal Server Error",
    });
  }
};

module.exports = {
  registerPatient,
  //   emailVerifcationPatient,
  patientVerifyController,
  loginPatient,
  resetPasswordPatient,
  newPasswordPatient,
  logoutPatient,
  getPatientDetails,
};

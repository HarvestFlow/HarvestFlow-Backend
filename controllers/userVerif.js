

import bcrypt from "bcryptjs";
import User from "../models/user.js";
import { auth, invalidateRefreshToken } from '../middlewares/auth.js';
import { signAccessToken, signRefreshToken , verifyRefreshToken} from "../middlewares/auth.js";
import nodemailer from "nodemailer";



export async function VerifyAnswers(req, res, next) {
    try {
      const { email, questions } = req.body;
  
      const user = await User.findOne({ email: email.toLowerCase() });
  
      if (!user) {
        return res.status(202).json({
          message: "email not found",
        });
      }
  
      // Récupération des réponses aux questions de sécurité enregistrées pour cet utilisateur
      const securityQuestions = user.securityQuestions;
  
      // Vérification que les réponses fournies par l'utilisateur correspondent à celles enregistrées dans la base de données
      const isAnswersMatch = securityQuestions.every((question, index) => {
        // Comparaison insensible à la casse des réponses
        return question === questions[index];
      });
  
      if (isAnswersMatch) {
        // Réponses correctes
        return res.status(200).json({
          message: "Réponses correctes aux questions de sécurité",
        });
      } else {
        // Réponses incorrectes
        return res.status(401).json({
          message: "Réponses incorrectes aux questions de sécurité",
        });
      }
    } catch (error) {
      console.error("Erreur lors de la vérification des réponses:", error);
      return res.status(500).json({
        message: "Erreur lors de la vérification des réponses",
        error: error,
      });
    }
}





let mailTransporter = nodemailer.createTransport({
    host: "smtp.gmail.com",
    port: 587,
    secure: false, // true pour TLS
    auth: {
      user: "briki.houda12345@gmail.com",
      pass: "ttpvdaxpzonxgasq",
    },
  });
    
    async function sendWelcomeEmail(user) {
    
      
        // Définir les options d'e-mail
        let mailOptions = {
          from: "TEKTAI",
          to: user.email,
          subject: "Welcome to Our Application!",
          text: `Dear , ${user.firstname}!`,
          html: `<!doctype html>
      <html lang="en-US">
      <head>
          <meta content="text/html; charset=utf-8" http-equiv="Content-Type" />
          <title>Welcome Email Template</title>
          <meta name="description" content="Welcome Email Template.">
          <style type="text/css">
              a:hover {text-decoration: underline !important;}
          </style>
      </head>
      <body marginheight="0" topmargin="0" marginwidth="0" style="margin: 0px; background-color: #ffffff;" leftmargin="0">
          <!--100% body table-->
          <table cellspacing="0" border="0" cellpadding="0" width="100%" bgcolor="#ffffff"
              style="@import url(https://fonts.googleapis.com/css?family=Rubik:300,400,500,700|Open+Sans:300,400,600,700); font-family: 'Open Sans', sans-serif;">
              <tr>
                  <td>
                      <table style="background-color: #ffffff; max-width:670px;  margin:0 auto;" width="100%" border="0"
                          align="center" cellpadding="0" cellspacing="0">
                          <tr>
                              <td style="height:80px;">&nbsp;</td>
                          </tr>
                          <tr>
                              <td style="text-align:center;">
                                  <h1 style="color:#2a4d69; font-weight:500; margin:0;font-size:32px;font-family:'Rubik',sans-serif;">Welcome to Our Platform</h1>
                                  <span style="display:inline-block; vertical-align:middle; margin:29px 0 26px; border-bottom:1px solid #cecece; width:100px;"></span>
                                  <p style="color:#455056; font-size:15px;line-height:24px; margin:0;">
                                      Thank you for joining our platform. We are excited to have you as a member of our community.
                                  </p>
                                  <a href="#" style="background:#0dcaf0;text-decoration:none !important; font-weight:500; margin-top:35px; color:#fff;text-transform:uppercase; font-size:14px;padding:10px 24px;display:inline-block;border-radius:50px;">Get Started</a>
                              </td>
                          </tr>
                          <tr>
                              <td style="height:40px;">&nbsp;</td>
                          </tr>
                          <tr>
                              <td style="text-align:center;">
                                  <p style="font-size:14px; color:#a0aec0; line-height:18px; margin:0 0 0;">&copy; <strong>www.tektai.com</strong></p>
                              </td>
                          </tr>
                          <tr>
                              <td style="height:80px;">&nbsp;</td>
                          </tr>
                      </table>
                  </td>
              </tr>
          </table>
          <!--/100% body table-->
      </body>
      </html>
      `,
        };
      
        // Envoyer l'e-mail
        let info = await mailTransporter.sendMail(mailOptions);
      
        console.log("Message sent: %s", info.messageId);
      }
    
      let codeExpected = ""; // Déclaration d'une variable globale pour stocker le code attendu
    










      export async function VerifyAndSendCode(req, res, next) {
        try {
            const { email, questions } = req.body;
            const user = await User.findOne({ email: email.toLowerCase() });
    
            if (!user) {
                return res.status(202).json({ message: "Email not found" });
            }
    
            // Vérification des réponses aux questions de sécurité
            const securityQuestions = user.securityQuestions;
            const isAnswersMatch = securityQuestions.every((question, index) => 
                question.toLowerCase() === questions[index].toLowerCase()
            );
    
            if (!isAnswersMatch) {
                return res.status(401).json({ message: "Réponses incorrectes aux questions de sécurité" });
            }
    
            const RandomXCode = Math.floor(1000 + Math.random() * 9000);
            console.log(RandomXCode);
            codeExpected = RandomXCode.toString();
        
            // Préparer les options de l'email
            const mailOptions = {
              from: 'HARVESTFLOW',
              to: email,
              text: 'Verif Email?',
              subject: 'Verif Email',
              html: `<!DOCTYPE html PUBLIC "-//W3C//DTD XHTML 1.0 Transitional//EN" "http://www.w3.org/TR/xhtml1/DTD/xhtml1-transitional.dtd">
              <html dir="ltr" xmlns="http://www.w3.org/1999/xhtml" xmlns:o="urn:schemas-microsoft-com:office:office" lang="en">
               <head>
                <meta charset="UTF-8">
                <meta content="width=device-width, initial-scale=1" name="viewport">
                <meta name="x-apple-disable-message-reformatting">
                <meta http-equiv="X-UA-Compatible" content="IE=edge">
                <meta content="telephone=no" name="format-detection">
                <title>New Message</title><!--[if (mso 16)]>
                  <style type="text/css">
                  a {text-decoration: none;}
                  </style>
                  <![endif]--><!--[if gte mso 9]><style>sup { font-size: 100% !important; }</style><![endif]--><!--[if gte mso 9]>
              <xml>
                  <o:OfficeDocumentSettings>
                  <o:AllowPNG></o:AllowPNG>
                  <o:PixelsPerInch>96</o:PixelsPerInch>
                  </o:OfficeDocumentSettings>
              </xml>
              <![endif]--><!--[if !mso]><!-- -->
                <link href="https://fonts.googleapis.com/css2?family=Orbitron&display=swap" rel="stylesheet"><!--<![endif]-->
                <style type="text/css">
              #outlook a {
                padding:0;
              }
              .es-button {
                mso-style-priority:100!important;
                text-decoration:none!important;
              }
              a[x-apple-data-detectors] {
                color:inherit!important;
                text-decoration:none!important;
                font-size:inherit!important;
                font-family:inherit!important;
                font-weight:inherit!important;
                line-height:inherit!important;
              }
              .es-desk-hidden {
                display:none;
                float:left;
                overflow:hidden;
                width:0;
                max-height:0;
                line-height:0;
                mso-hide:all;
              }
              .es-button-border:hover a.es-button, .es-button-border:hover button.es-button {
                background:#58dfec!important;
              }
              .es-button-border:hover {
                border-color:#26C6DA #26C6DA #26C6DA #26C6DA!important;
                background:#58dfec!important;
                border-style:solid solid solid solid!important;
              }
              @media only screen and (max-width:600px) {p, ul li, ol li, a { line-height:150%!important } h1, h2, h3, h1 a, h2 a, h3 a { line-height:120% } h1 { font-size:30px!important; text-align:center } h2 { font-size:24px!important; text-align:left } h3 { font-size:20px!important; text-align:left } .es-header-body h1 a, .es-content-body h1 a, .es-footer-body h1 a { font-size:30px!important; text-align:center } .es-header-body h2 a, .es-content-body h2 a, .es-footer-body h2 a { font-size:24px!important; text-align:left } .es-header-body h3 a, .es-content-body h3 a, .es-footer-body h3 a { font-size:20px!important; text-align:left } .es-menu td a { font-size:14px!important } .es-header-body p, .es-header-body ul li, .es-header-body ol li, .es-header-body a { font-size:14px!important } .es-content-body p, .es-content-body ul li, .es-content-body ol li, .es-content-body a { font-size:14px!important } .es-footer-body p, .es-footer-body ul li, .es-footer-body ol li, .es-footer-body a { font-size:14px!important } .es-infoblock p, .es-infoblock ul li, .es-infoblock ol li, .es-infoblock a { font-size:12px!important } *[class="gmail-fix"] { display:none!important } .es-m-txt-c, .es-m-txt-c h1, .es-m-txt-c h2, .es-m-txt-c h3 { text-align:center!important } .es-m-txt-r, .es-m-txt-r h1, .es-m-txt-r h2, .es-m-txt-r h3 { text-align:right!important } .es-m-txt-l, .es-m-txt-l h1, .es-m-txt-l h2, .es-m-txt-l h3 { text-align:left!important } .es-m-txt-r img, .es-m-txt-c img, .es-m-txt-l img { display:inline!important } .es-button-border { display:inline-block!important } a.es-button, button.es-button { font-size:18px!important; display:inline-block!important } .es-adaptive table, .es-left, .es-right { width:100%!important } .es-content table, .es-header table, .es-footer table, .es-content, .es-footer, .es-header { width:100%!important; max-width:600px!important } .es-adapt-td { display:block!important; width:100%!important } .adapt-img { width:100%!important; height:auto!important } .es-m-p0 { padding:0px!important } .es-m-p0r { padding-right:0px!important } .es-m-p0l { padding-left:0px!important } .es-m-p0t { padding-top:0px!important } .es-m-p0b { padding-bottom:0!important } .es-m-p20b { padding-bottom:20px!important } .es-mobile-hidden, .es-hidden { display:none!important } tr.es-desk-hidden, td.es-desk-hidden, table.es-desk-hidden { width:auto!important; overflow:visible!important; float:none!important; max-height:inherit!important; line-height:inherit!important } tr.es-desk-hidden { display:table-row!important } table.es-desk-hidden { display:table!important } td.es-desk-menu-hidden { display:table-cell!important } .es-menu td { width:1%!important } table.es-table-not-adapt, .esd-block-html table { width:auto!important } table.es-social { display:inline-block!important } table.es-social td { display:inline-block!important } .es-desk-hidden { display:table-row!important; width:auto!important; overflow:visible!important; max-height:inherit!important } }
              @media screen and (max-width:384px) {.mail-message-content { width:414px!important } }
              </style>
               </head>
               <body style="width:100%;font-family:arial, 'helvetica neue', helvetica, sans-serif;-webkit-text-size-adjust:100%;-ms-text-size-adjust:100%;padding:0;Margin:0">
                <div dir="ltr" class="es-wrapper-color" lang="en" style="background-color:#07023C"><!--[if gte mso 9]>
                    <v:background xmlns:v="urn:schemas-microsoft-com:vml" fill="t">
                      <v:fill type="tile" color="#07023c"></v:fill>
                    </v:background>
                  <![endif]-->
                 <table class="es-wrapper" width="100%" cellspacing="0" cellpadding="0" role="none" style="mso-table-lspace:0pt;mso-table-rspace:0pt;border-collapse:collapse;border-spacing:0px;padding:0;Margin:0;width:100%;height:100%;background-repeat:repeat;background-position:center top;background-color:#07023C">
                   <tr>
                    <td valign="top" style="padding:0;Margin:0">
                     <table class="es-content" cellspacing="0" cellpadding="0" align="center" role="none" style="mso-table-lspace:0pt;mso-table-rspace:0pt;border-collapse:collapse;border-spacing:0px;table-layout:fixed !important;width:100%">
                       <tr>
                        <td align="center" style="padding:0;Margin:0">
                         <table class="es-content-body" style="mso-table-lspace:0pt;mso-table-rspace:0pt;border-collapse:collapse;border-spacing:0px;background-color:#ffffff;background-repeat:no-repeat;width:600px;background-image:url(https://efxsvyb.stripocdn.email/content/guids/CABINET_0e8fbb6adcc56c06fbd3358455fdeb41/images/vector_0Ia.png);background-position:center center" cellspacing="0" cellpadding="0" bgcolor="#ffffff" align="center" background="https://efxsvyb.stripocdn.email/content/guids/CABINET_0e8fbb6adcc56c06fbd3358455fdeb41/images/vector_0Ia.png" role="none">
                           <tr>
                            <td align="left" style="Margin:0;padding-bottom:10px;padding-top:20px;padding-left:20px;padding-right:20px">
                             <table cellpadding="0" cellspacing="0" width="100%" role="none" style="mso-table-lspace:0pt;mso-table-rspace:0pt;border-collapse:collapse;border-spacing:0px">
                               <tr>
                                <td class="es-m-p0r" valign="top" align="center" style="padding:0;Margin:0;width:560px">
                                 <table cellpadding="0" cellspacing="0" width="100%" role="presentation" style="mso-table-lspace:0pt;mso-table-rspace:0pt;border-collapse:collapse;border-spacing:0px">
                                   <tr>
                                    <td align="center" style="padding:0;Margin:0;font-size:0px"><a target="_blank" href="https://viewstripo.email" style="-webkit-text-size-adjust:none;-ms-text-size-adjust:none;mso-line-height-rule:exactly;text-decoration:underline;color:#26C6DA;font-size:14px"><img src="https://img.freepik.com/vecteurs-libre/vecteur-degrade-logo-colore-oiseau_343694-1365.jpg" alt="Logo" style="display:block;border:0;outline:none;text-decoration:none;-ms-interpolation-mode:bicubic" title="Logo" height="105"></a></td>
                                   </tr>
                                 </table></td>
                               </tr>
                             </table></td>
                           </tr>
                           <tr>
                            <td align="left" style="Margin:0;padding-left:20px;padding-right:20px;padding-top:30px;padding-bottom:30px">
                             <table width="100%" cellspacing="0" cellpadding="0" role="none" style="mso-table-lspace:0pt;mso-table-rspace:0pt;border-collapse:collapse;border-spacing:0px">
                               <tr>
                                <td class="es-m-p0r es-m-p20b" valign="top" align="center" style="padding:0;Margin:0;width:560px">
                                 <table width="100%" cellspacing="0" cellpadding="0" role="presentation" style="mso-table-lspace:0pt;mso-table-rspace:0pt;border-collapse:collapse;border-spacing:0px">
                                   <tr>
                                    <td align="center" style="padding:0;Margin:0"><h1 style="Margin:0;line-height:53px;mso-line-height-rule:exactly;font-family:Orbitron, sans-serif;font-size:44px;font-style:normal;font-weight:bold;color:#10054D">Welcome To TEKTAI&nbsp;<br></h1></td>
                                   </tr>
                                   <tr>
                                    <td align="center" style="padding:0;Margin:0;padding-bottom:10px;padding-top:15px;font-size:0px"><a target="_blank" href="https://viewstripo.email" style="-webkit-text-size-adjust:none;-ms-text-size-adjust:none;mso-line-height-rule:exactly;text-decoration:underline;color:#26C6DA;font-size:14px"><img class="adapt-img" src="https://efxsvyb.stripocdn.email/content/guids/CABINET_b0acaa6517477956e8f5a273acd40d02be26db03936a3371097894c6a6836992/images/image_20240402_165339903.png" alt style="display:block;border:0;outline:none;text-decoration:none;-ms-interpolation-mode:bicubic" height="300"></a></td>
                                   </tr>
                                   <tr>
                                    <td align="center" style="padding:0;Margin:0;padding-top:10px;padding-bottom:10px"><p style="Margin:0;-webkit-text-size-adjust:none;-ms-text-size-adjust:none;mso-line-height-rule:exactly;font-family:arial, 'helvetica neue', helvetica, sans-serif;line-height:21px;color:#333333;font-size:14px">Let's verify your email<br></p></td>
                                   </tr>
                                   <tr>
                                   <td align="center" style="padding: 0; Margin: 0; padding-top: 15px; padding-bottom: 15px;">
                                   <!-- Génère un carré pour chaque chiffre du code aléatoire -->
                                   ${RandomXCode.toString().split('').map((digit) => `
                                   <div class="code-container" style="border: 2px solid #26C6DA; border-radius: 10px; width: 40px; height: 40px; display: inline-block; margin-right: 5px; text-align: center; font-size: 20px; font-weight: bold; color: #26C6DA;">${digit}</div>
                                   `).join('')}
                                 </td>
                                                            </tr>
                                   <tr>
                                    <td align="center" style="padding:0;Margin:0;padding-top:10px;padding-bottom:10px"><p style="Margin:0;-webkit-text-size-adjust:none;-ms-text-size-adjust:none;mso-line-height-rule:exactly;font-family:arial, 'helvetica neue', helvetica, sans-serif;line-height:21px;color:#333333;font-size:14px">If you ignore this message, your email won't be verifed.</p></td>
                                   </tr>
                                 </table></td>
                               </tr>
                             </table></td>
                           </tr>
                         </table></td>
                       </tr>
                     </table>
                     <table cellpadding="0" cellspacing="0" class="es-content" align="center" role="none" style="mso-table-lspace:0pt;mso-table-rspace:0pt;border-collapse:collapse;border-spacing:0px;table-layout:fixed !important;width:100%">
                       <tr>
                        <td align="center" style="padding:0;Margin:0">
                         <table bgcolor="#10054D" class="es-content-body" align="center" cellpadding="0" cellspacing="0" style="mso-table-lspace:0pt;mso-table-rspace:0pt;border-collapse:collapse;border-spacing:0px;background-color:#10054d;width:600px" role="none">
                           <tr>
                            <td align="left" background="https://efxsvyb.stripocdn.email/content/guids/CABINET_0e8fbb6adcc56c06fbd3358455fdeb41/images/vector_sSY.png" style="Margin:0;padding-left:20px;padding-right:20px;padding-top:35px;padding-bottom:35px;background-image:url(https://efxsvyb.stripocdn.email/content/guids/CABINET_0e8fbb6adcc56c06fbd3358455fdeb41/images/vector_sSY.png);background-repeat:no-repeat;background-position:left center"><!--[if mso]><table style="width:560px" cellpadding="0" cellspacing="0"><tr><td style="width:69px" valign="top"><![endif]-->
                             <table cellpadding="0" cellspacing="0" class="es-left" align="left" role="none" style="mso-table-lspace:0pt;mso-table-rspace:0pt;border-collapse:collapse;border-spacing:0px;float:left">
                               <tr>
                                <td class="es-m-p20b" align="left" style="padding:0;Margin:0;width:69px">
                                 <table cellpadding="0" cellspacing="0" width="100%" role="presentation" style="mso-table-lspace:0pt;mso-table-rspace:0pt;border-collapse:collapse;border-spacing:0px">
                                   <tr>
                                    <td align="center" class="es-m-txt-l" style="padding:0;Margin:0;font-size:0px"><a target="_blank" href="https://viewstripo.email" style="-webkit-text-size-adjust:none;-ms-text-size-adjust:none;mso-line-height-rule:exactly;text-decoration:underline;color:#26C6DA;font-size:14px"><img src="https://efxsvyb.stripocdn.email/content/guids/CABINET_dee64413d6f071746857ca8c0f13d696/images/group_118_lFL.png" alt style="display:block;border:0;outline:none;text-decoration:none;-ms-interpolation-mode:bicubic" width="69"></a></td>
                                   </tr>
                                 </table></td>
                               </tr>
                             </table><!--[if mso]></td><td style="width:20px"></td><td style="width:471px" valign="top"><![endif]-->
                             <table cellpadding="0" cellspacing="0" class="es-right" align="right" role="none" style="mso-table-lspace:0pt;mso-table-rspace:0pt;border-collapse:collapse;border-spacing:0px;float:right">
                               <tr>
                                <td align="left" style="padding:0;Margin:0;width:471px">
                                 <table cellpadding="0" cellspacing="0" width="100%" role="presentation" style="mso-table-lspace:0pt;mso-table-rspace:0pt;border-collapse:collapse;border-spacing:0px">
                                   <tr>
                                    <td align="left" style="padding:0;Margin:0"><h3 style="Margin:0;line-height:34px;mso-line-height-rule:exactly;font-family:Orbitron, sans-serif;font-size:28px;font-style:normal;font-weight:bold;color:#ffffff"><b>Real people. Here to help.</b></h3></td>
                                   </tr>
                                   <tr>
                                    <td align="left" style="padding:0;Margin:0;padding-bottom:5px;padding-top:10px"><p style="Margin:0;-webkit-text-size-adjust:none;-ms-text-size-adjust:none;mso-line-height-rule:exactly;font-family:arial, 'helvetica neue', helvetica, sans-serif;line-height:21px;color:#ffffff;font-size:14px">Have a question? Please end us an email tektaicontact@gmail.com</p></td>
                                   </tr>
                                 </table></td>
                               </tr>
                             </table><!--[if mso]></td></tr></table><![endif]--></td>
                           </tr>
                         </table></td>
                       </tr>
                     </table>
                   </tr>
                 </table>
                </div>
               </body>
              </html>`,
              };
    
            // Envoi de l'email
            let info = await mailTransporter.sendMail(mailOptions);
            console.log("Message sent: %s", info.messageId);
    
            // Retourner une réponse HTTP 200 OK après succès
            return res.status(200).json({ message: "Code envoyé avec succès" });
    
        } catch (error) {
            console.error("Erreur lors du traitement de la requête:", error);
            return res.status(500).json({ message: "Erreur interne du serveur", error });
        }
    }
    










    export async function VerifyAnswersAndSendCode(req, res, next) {
      try {
        const { email, questions } = req.body;
    
        // Step 1: Verify security answers
        const user = await User.findOne({ email: email.toLowerCase() });
    
        if (!user) {
          return res.status(202).json({
            message: "Email not found",
          });
        }
    
        // Retrieve the stored security questions and answers
        const securityQuestions = user.securityQuestions;
    
        // Verify the answers
        const isAnswersMatch = securityQuestions.every((question, index) => {
          return question === questions[index];
        });
    
        if (!isAnswersMatch) {
          return res.status(401).json({
            message: "Incorrect answers to security questions",
          });
        }
    
        // Step 2: If answers are correct, send verification code email
        const RandomXCode = Math.floor(1000 + Math.random() * 9000);
        const codeExpected = RandomXCode.toString();
    
        // Send the verification code via email
        const mailOptions = {
          from: 'HARVESTFLOW',
          to: email,
          subject: 'Email Verification',
          html: `
            <p>Your verification code is: <strong>${codeExpected}</strong></p>
          `,
        };
    
        // Send the email
        mailTransporter.sendMail(mailOptions, function (error, info) {
          if (error) {
            return res.json({ message: "Error sending email" });
          } else {
            // Update the user with the verification code
            User.findOneAndUpdate(
              { email: email.toLowerCase() },
              { codeForget: RandomXCode },
              { new: true }
            )
              .then((updatedUser) => {
                console.log(updatedUser); // Log the updated user document
                return res.status(200).json({
                  message: "Verification email sent successfully",
                });
              })
              .catch((err) => {
                console.log(err);
                return res.status(500).json({
                  message: "Error updating user with code",
                  error: err,
                });
              });
          }
        });
    
      } catch (error) {
        console.error("Error during answer verification or email sending:", error);
        return res.status(500).json({
          message: "An error occurred during verification and email sending",
          error: error,
        });
      }
    }
    











      export async function SendCodeVerif(req, res, next) {
        const email = req.body.email.toLowerCase(); // Convertir l'email en minuscules
      
        // Générer un code de réinitialisation aléatoire
        const RandomXCode = Math.floor(1000 + Math.random() * 9000);
        console.log(RandomXCode);
        codeExpected = RandomXCode.toString();
    
        // Préparer les options de l'email
        const mailOptions = {
          from: 'HARVESTFLOW',
          to: email,
          text: 'Verif Email?',
          subject: 'Verif Email',
          html: `<!DOCTYPE html PUBLIC "-//W3C//DTD XHTML 1.0 Transitional//EN" "http://www.w3.org/TR/xhtml1/DTD/xhtml1-transitional.dtd">
          <html dir="ltr" xmlns="http://www.w3.org/1999/xhtml" xmlns:o="urn:schemas-microsoft-com:office:office" lang="en">
           <head>
            <meta charset="UTF-8">
            <meta content="width=device-width, initial-scale=1" name="viewport">
            <meta name="x-apple-disable-message-reformatting">
            <meta http-equiv="X-UA-Compatible" content="IE=edge">
            <meta content="telephone=no" name="format-detection">
            <title>New Message</title><!--[if (mso 16)]>
              <style type="text/css">
              a {text-decoration: none;}
              </style>
              <![endif]--><!--[if gte mso 9]><style>sup { font-size: 100% !important; }</style><![endif]--><!--[if gte mso 9]>
          <xml>
              <o:OfficeDocumentSettings>
              <o:AllowPNG></o:AllowPNG>
              <o:PixelsPerInch>96</o:PixelsPerInch>
              </o:OfficeDocumentSettings>
          </xml>
          <![endif]--><!--[if !mso]><!-- -->
            <link href="https://fonts.googleapis.com/css2?family=Orbitron&display=swap" rel="stylesheet"><!--<![endif]-->
            <style type="text/css">
          #outlook a {
            padding:0;
          }
          .es-button {
            mso-style-priority:100!important;
            text-decoration:none!important;
          }
          a[x-apple-data-detectors] {
            color:inherit!important;
            text-decoration:none!important;
            font-size:inherit!important;
            font-family:inherit!important;
            font-weight:inherit!important;
            line-height:inherit!important;
          }
          .es-desk-hidden {
            display:none;
            float:left;
            overflow:hidden;
            width:0;
            max-height:0;
            line-height:0;
            mso-hide:all;
          }
          .es-button-border:hover a.es-button, .es-button-border:hover button.es-button {
            background:#58dfec!important;
          }
          .es-button-border:hover {
            border-color:#26C6DA #26C6DA #26C6DA #26C6DA!important;
            background:#58dfec!important;
            border-style:solid solid solid solid!important;
          }
          @media only screen and (max-width:600px) {p, ul li, ol li, a { line-height:150%!important } h1, h2, h3, h1 a, h2 a, h3 a { line-height:120% } h1 { font-size:30px!important; text-align:center } h2 { font-size:24px!important; text-align:left } h3 { font-size:20px!important; text-align:left } .es-header-body h1 a, .es-content-body h1 a, .es-footer-body h1 a { font-size:30px!important; text-align:center } .es-header-body h2 a, .es-content-body h2 a, .es-footer-body h2 a { font-size:24px!important; text-align:left } .es-header-body h3 a, .es-content-body h3 a, .es-footer-body h3 a { font-size:20px!important; text-align:left } .es-menu td a { font-size:14px!important } .es-header-body p, .es-header-body ul li, .es-header-body ol li, .es-header-body a { font-size:14px!important } .es-content-body p, .es-content-body ul li, .es-content-body ol li, .es-content-body a { font-size:14px!important } .es-footer-body p, .es-footer-body ul li, .es-footer-body ol li, .es-footer-body a { font-size:14px!important } .es-infoblock p, .es-infoblock ul li, .es-infoblock ol li, .es-infoblock a { font-size:12px!important } *[class="gmail-fix"] { display:none!important } .es-m-txt-c, .es-m-txt-c h1, .es-m-txt-c h2, .es-m-txt-c h3 { text-align:center!important } .es-m-txt-r, .es-m-txt-r h1, .es-m-txt-r h2, .es-m-txt-r h3 { text-align:right!important } .es-m-txt-l, .es-m-txt-l h1, .es-m-txt-l h2, .es-m-txt-l h3 { text-align:left!important } .es-m-txt-r img, .es-m-txt-c img, .es-m-txt-l img { display:inline!important } .es-button-border { display:inline-block!important } a.es-button, button.es-button { font-size:18px!important; display:inline-block!important } .es-adaptive table, .es-left, .es-right { width:100%!important } .es-content table, .es-header table, .es-footer table, .es-content, .es-footer, .es-header { width:100%!important; max-width:600px!important } .es-adapt-td { display:block!important; width:100%!important } .adapt-img { width:100%!important; height:auto!important } .es-m-p0 { padding:0px!important } .es-m-p0r { padding-right:0px!important } .es-m-p0l { padding-left:0px!important } .es-m-p0t { padding-top:0px!important } .es-m-p0b { padding-bottom:0!important } .es-m-p20b { padding-bottom:20px!important } .es-mobile-hidden, .es-hidden { display:none!important } tr.es-desk-hidden, td.es-desk-hidden, table.es-desk-hidden { width:auto!important; overflow:visible!important; float:none!important; max-height:inherit!important; line-height:inherit!important } tr.es-desk-hidden { display:table-row!important } table.es-desk-hidden { display:table!important } td.es-desk-menu-hidden { display:table-cell!important } .es-menu td { width:1%!important } table.es-table-not-adapt, .esd-block-html table { width:auto!important } table.es-social { display:inline-block!important } table.es-social td { display:inline-block!important } .es-desk-hidden { display:table-row!important; width:auto!important; overflow:visible!important; max-height:inherit!important } }
          @media screen and (max-width:384px) {.mail-message-content { width:414px!important } }
          </style>
           </head>
           <body style="width:100%;font-family:arial, 'helvetica neue', helvetica, sans-serif;-webkit-text-size-adjust:100%;-ms-text-size-adjust:100%;padding:0;Margin:0">
            <div dir="ltr" class="es-wrapper-color" lang="en" style="background-color:#07023C"><!--[if gte mso 9]>
                <v:background xmlns:v="urn:schemas-microsoft-com:vml" fill="t">
                  <v:fill type="tile" color="#07023c"></v:fill>
                </v:background>
              <![endif]-->
             <table class="es-wrapper" width="100%" cellspacing="0" cellpadding="0" role="none" style="mso-table-lspace:0pt;mso-table-rspace:0pt;border-collapse:collapse;border-spacing:0px;padding:0;Margin:0;width:100%;height:100%;background-repeat:repeat;background-position:center top;background-color:#07023C">
               <tr>
                <td valign="top" style="padding:0;Margin:0">
                 <table class="es-content" cellspacing="0" cellpadding="0" align="center" role="none" style="mso-table-lspace:0pt;mso-table-rspace:0pt;border-collapse:collapse;border-spacing:0px;table-layout:fixed !important;width:100%">
                   <tr>
                    <td align="center" style="padding:0;Margin:0">
                     <table class="es-content-body" style="mso-table-lspace:0pt;mso-table-rspace:0pt;border-collapse:collapse;border-spacing:0px;background-color:#ffffff;background-repeat:no-repeat;width:600px;background-image:url(https://efxsvyb.stripocdn.email/content/guids/CABINET_0e8fbb6adcc56c06fbd3358455fdeb41/images/vector_0Ia.png);background-position:center center" cellspacing="0" cellpadding="0" bgcolor="#ffffff" align="center" background="https://efxsvyb.stripocdn.email/content/guids/CABINET_0e8fbb6adcc56c06fbd3358455fdeb41/images/vector_0Ia.png" role="none">
                       <tr>
                        <td align="left" style="Margin:0;padding-bottom:10px;padding-top:20px;padding-left:20px;padding-right:20px">
                         <table cellpadding="0" cellspacing="0" width="100%" role="none" style="mso-table-lspace:0pt;mso-table-rspace:0pt;border-collapse:collapse;border-spacing:0px">
                           <tr>
                            <td class="es-m-p0r" valign="top" align="center" style="padding:0;Margin:0;width:560px">
                             <table cellpadding="0" cellspacing="0" width="100%" role="presentation" style="mso-table-lspace:0pt;mso-table-rspace:0pt;border-collapse:collapse;border-spacing:0px">
                               <tr>
                                <td align="center" style="padding:0;Margin:0;font-size:0px"><a target="_blank" href="https://viewstripo.email" style="-webkit-text-size-adjust:none;-ms-text-size-adjust:none;mso-line-height-rule:exactly;text-decoration:underline;color:#26C6DA;font-size:14px"><img src="https://img.freepik.com/vecteurs-libre/vecteur-degrade-logo-colore-oiseau_343694-1365.jpg" alt="Logo" style="display:block;border:0;outline:none;text-decoration:none;-ms-interpolation-mode:bicubic" title="Logo" height="105"></a></td>
                               </tr>
                             </table></td>
                           </tr>
                         </table></td>
                       </tr>
                       <tr>
                        <td align="left" style="Margin:0;padding-left:20px;padding-right:20px;padding-top:30px;padding-bottom:30px">
                         <table width="100%" cellspacing="0" cellpadding="0" role="none" style="mso-table-lspace:0pt;mso-table-rspace:0pt;border-collapse:collapse;border-spacing:0px">
                           <tr>
                            <td class="es-m-p0r es-m-p20b" valign="top" align="center" style="padding:0;Margin:0;width:560px">
                             <table width="100%" cellspacing="0" cellpadding="0" role="presentation" style="mso-table-lspace:0pt;mso-table-rspace:0pt;border-collapse:collapse;border-spacing:0px">
                               <tr>
                                <td align="center" style="padding:0;Margin:0"><h1 style="Margin:0;line-height:53px;mso-line-height-rule:exactly;font-family:Orbitron, sans-serif;font-size:44px;font-style:normal;font-weight:bold;color:#10054D">Welcome To TEKTAI&nbsp;<br></h1></td>
                               </tr>
                               <tr>
                                <td align="center" style="padding:0;Margin:0;padding-bottom:10px;padding-top:15px;font-size:0px"><a target="_blank" href="https://viewstripo.email" style="-webkit-text-size-adjust:none;-ms-text-size-adjust:none;mso-line-height-rule:exactly;text-decoration:underline;color:#26C6DA;font-size:14px"><img class="adapt-img" src="https://efxsvyb.stripocdn.email/content/guids/CABINET_b0acaa6517477956e8f5a273acd40d02be26db03936a3371097894c6a6836992/images/image_20240402_165339903.png" alt style="display:block;border:0;outline:none;text-decoration:none;-ms-interpolation-mode:bicubic" height="300"></a></td>
                               </tr>
                               <tr>
                                <td align="center" style="padding:0;Margin:0;padding-top:10px;padding-bottom:10px"><p style="Margin:0;-webkit-text-size-adjust:none;-ms-text-size-adjust:none;mso-line-height-rule:exactly;font-family:arial, 'helvetica neue', helvetica, sans-serif;line-height:21px;color:#333333;font-size:14px">Let's verify your email<br></p></td>
                               </tr>
                               <tr>
                               <td align="center" style="padding: 0; Margin: 0; padding-top: 15px; padding-bottom: 15px;">
                               <!-- Génère un carré pour chaque chiffre du code aléatoire -->
                               ${RandomXCode.toString().split('').map((digit) => `
                               <div class="code-container" style="border: 2px solid #26C6DA; border-radius: 10px; width: 40px; height: 40px; display: inline-block; margin-right: 5px; text-align: center; font-size: 20px; font-weight: bold; color: #26C6DA;">${digit}</div>
                               `).join('')}
                             </td>
                                                        </tr>
                               <tr>
                                <td align="center" style="padding:0;Margin:0;padding-top:10px;padding-bottom:10px"><p style="Margin:0;-webkit-text-size-adjust:none;-ms-text-size-adjust:none;mso-line-height-rule:exactly;font-family:arial, 'helvetica neue', helvetica, sans-serif;line-height:21px;color:#333333;font-size:14px">If you ignore this message, your email won't be verifed.</p></td>
                               </tr>
                             </table></td>
                           </tr>
                         </table></td>
                       </tr>
                     </table></td>
                   </tr>
                 </table>
                 <table cellpadding="0" cellspacing="0" class="es-content" align="center" role="none" style="mso-table-lspace:0pt;mso-table-rspace:0pt;border-collapse:collapse;border-spacing:0px;table-layout:fixed !important;width:100%">
                   <tr>
                    <td align="center" style="padding:0;Margin:0">
                     <table bgcolor="#10054D" class="es-content-body" align="center" cellpadding="0" cellspacing="0" style="mso-table-lspace:0pt;mso-table-rspace:0pt;border-collapse:collapse;border-spacing:0px;background-color:#10054d;width:600px" role="none">
                       <tr>
                        <td align="left" background="https://efxsvyb.stripocdn.email/content/guids/CABINET_0e8fbb6adcc56c06fbd3358455fdeb41/images/vector_sSY.png" style="Margin:0;padding-left:20px;padding-right:20px;padding-top:35px;padding-bottom:35px;background-image:url(https://efxsvyb.stripocdn.email/content/guids/CABINET_0e8fbb6adcc56c06fbd3358455fdeb41/images/vector_sSY.png);background-repeat:no-repeat;background-position:left center"><!--[if mso]><table style="width:560px" cellpadding="0" cellspacing="0"><tr><td style="width:69px" valign="top"><![endif]-->
                         <table cellpadding="0" cellspacing="0" class="es-left" align="left" role="none" style="mso-table-lspace:0pt;mso-table-rspace:0pt;border-collapse:collapse;border-spacing:0px;float:left">
                           <tr>
                            <td class="es-m-p20b" align="left" style="padding:0;Margin:0;width:69px">
                             <table cellpadding="0" cellspacing="0" width="100%" role="presentation" style="mso-table-lspace:0pt;mso-table-rspace:0pt;border-collapse:collapse;border-spacing:0px">
                               <tr>
                                <td align="center" class="es-m-txt-l" style="padding:0;Margin:0;font-size:0px"><a target="_blank" href="https://viewstripo.email" style="-webkit-text-size-adjust:none;-ms-text-size-adjust:none;mso-line-height-rule:exactly;text-decoration:underline;color:#26C6DA;font-size:14px"><img src="https://efxsvyb.stripocdn.email/content/guids/CABINET_dee64413d6f071746857ca8c0f13d696/images/group_118_lFL.png" alt style="display:block;border:0;outline:none;text-decoration:none;-ms-interpolation-mode:bicubic" width="69"></a></td>
                               </tr>
                             </table></td>
                           </tr>
                         </table><!--[if mso]></td><td style="width:20px"></td><td style="width:471px" valign="top"><![endif]-->
                         <table cellpadding="0" cellspacing="0" class="es-right" align="right" role="none" style="mso-table-lspace:0pt;mso-table-rspace:0pt;border-collapse:collapse;border-spacing:0px;float:right">
                           <tr>
                            <td align="left" style="padding:0;Margin:0;width:471px">
                             <table cellpadding="0" cellspacing="0" width="100%" role="presentation" style="mso-table-lspace:0pt;mso-table-rspace:0pt;border-collapse:collapse;border-spacing:0px">
                               <tr>
                                <td align="left" style="padding:0;Margin:0"><h3 style="Margin:0;line-height:34px;mso-line-height-rule:exactly;font-family:Orbitron, sans-serif;font-size:28px;font-style:normal;font-weight:bold;color:#ffffff"><b>Real people. Here to help.</b></h3></td>
                               </tr>
                               <tr>
                                <td align="left" style="padding:0;Margin:0;padding-bottom:5px;padding-top:10px"><p style="Margin:0;-webkit-text-size-adjust:none;-ms-text-size-adjust:none;mso-line-height-rule:exactly;font-family:arial, 'helvetica neue', helvetica, sans-serif;line-height:21px;color:#ffffff;font-size:14px">Have a question? Please end us an email tektaicontact@gmail.com</p></td>
                               </tr>
                             </table></td>
                           </tr>
                         </table><!--[if mso]></td></tr></table><![endif]--></td>
                       </tr>
                     </table></td>
                   </tr>
                 </table>
               </tr>
             </table>
            </div>
           </body>
          </html>`,
          };
      
          mailTransporter.sendMail(mailOptions, function (error, info) {
            if (error) {
              res.json({ message: "error sending" });
              console.log(error);
            } else {
              res.status(200).json({
                message: "haw el mail wselek jawk behi erfess",
              });
              User.findOneAndUpdate(
                { email: req.body.email },
                { codeForget: RandomXCode },
                { new: true }
              )
                .then((updatedUser) => {
                  console.log(updatedUser); // log the updated user document
                })
                .catch((err) => {
                  console.log(err);
                });
            }
          });
        }
  
      
      export async function VerifCodeForgot(req, res, next) {
        const { email, codeForget } = req.body;
        if (!email || !codeForget) {
          return res.status(400).json({ error: "Something is missing" });
        } else {
          const user = await User.findOne({ email: req.body.email });
          console.log(req.body.email);
          console.log("Code enter by the User ==> " + req.body.codeForget);
          console.log("Code ons the Database ==> " + user.codeForget);
          //////////////////////////////////////////////////////
          if (req.body.codeForget == user.codeForget && user.codeForget != "") {
            return res.status(200).json({ message: "Code Has been verified!" });
          }
          //////////////////////////////////////////////////////////
          if (req.body.codeForget != user.codeForget && user.codeForget != "") {
            console.log("Sorry! The code is incorrect!");
            return res.status(402).json({ message: "Sorry! The code is incorrect!" });
          }
          if (user.codeForget == "") {
            return res
              .status(401)
              .json({ message: "Sorry! There is no code in Database!" });
          }
        }
      }
      export function VerifNewUser(req, res, next) {
        const { email, codeForget } = req.body;
        if (!email || !codeForget) {
            return res.status(400).json({ error: "Something is missing" });
        } else {
            if (codeForget === codeExpected && codeExpected !== "") {
                // Réinitialiser le code attendu après la vérification réussie
                codeExpected = "";
                return res.status(200).json({ message: "Code has been verified!" });
            } else {
                console.log("Sorry! The code is incorrect!");
                return res.status(402).json({ message: "Sorry! The code is incorrect!" });
            }
        }
    }
    export async function SendCodeForgot(req, res, next) {
      const userMail = await User.findOne({ email: req.body.email.toLowerCase() });
      console.log(userMail);
    
      if (!userMail) {
        res.status(202).json({
          message: "email not found",
        });
      } else {
        var RandomXCode = Math.floor(1000 + Math.random() * 9000);
        console.log(RandomXCode);
        //
    
        var mailOptions = {
          from: "TEKTAI",
          to: req.body.email,
          text: "Forget Password?",
          subject: "Password Reset",
          html: `<!DOCTYPE html PUBLIC "-//W3C//DTD XHTML 1.0 Transitional//EN" "http://www.w3.org/TR/xhtml1/DTD/xhtml1-transitional.dtd">
          <html dir="ltr" xmlns="http://www.w3.org/1999/xhtml" xmlns:o="urn:schemas-microsoft-com:office:office" lang="en">
           <head>
            <meta charset="UTF-8">
            <meta content="width=device-width, initial-scale=1" name="viewport">
            <meta name="x-apple-disable-message-reformatting">
            <meta http-equiv="X-UA-Compatible" content="IE=edge">
            <meta content="telephone=no" name="format-detection">
            <title>New Message</title><!--[if (mso 16)]>
              <style type="text/css">
              a {text-decoration: none;}
              </style>
              <![endif]--><!--[if gte mso 9]><style>sup { font-size: 100% !important; }</style><![endif]--><!--[if gte mso 9]>
          <xml>
              <o:OfficeDocumentSettings>
              <o:AllowPNG></o:AllowPNG>
              <o:PixelsPerInch>96</o:PixelsPerInch>
              </o:OfficeDocumentSettings>
          </xml>
          <![endif]--><!--[if !mso]><!-- -->
            <link href="https://fonts.googleapis.com/css2?family=Orbitron&display=swap" rel="stylesheet"><!--<![endif]-->
            <style type="text/css">
          #outlook a {
            padding:0;
          }
          .es-button {
            mso-style-priority:100!important;
            text-decoration:none!important;
          }
          a[x-apple-data-detectors] {
            color:inherit!important;
            text-decoration:none!important;
            font-size:inherit!important;
            font-family:inherit!important;
            font-weight:inherit!important;
            line-height:inherit!important;
          }
          .es-desk-hidden {
            display:none;
            float:left;
            overflow:hidden;
            width:0;
            max-height:0;
            line-height:0;
            mso-hide:all;
          }
          .es-button-border:hover a.es-button, .es-button-border:hover button.es-button {
            background:#58dfec!important;
          }
          .es-button-border:hover {
            border-color:#26C6DA #26C6DA #26C6DA #26C6DA!important;
            background:#58dfec!important;
            border-style:solid solid solid solid!important;
          }
          @media only screen and (max-width:600px) {p, ul li, ol li, a { line-height:150%!important } h1, h2, h3, h1 a, h2 a, h3 a { line-height:120% } h1 { font-size:30px!important; text-align:center } h2 { font-size:24px!important; text-align:left } h3 { font-size:20px!important; text-align:left } .es-header-body h1 a, .es-content-body h1 a, .es-footer-body h1 a { font-size:30px!important; text-align:center } .es-header-body h2 a, .es-content-body h2 a, .es-footer-body h2 a { font-size:24px!important; text-align:left } .es-header-body h3 a, .es-content-body h3 a, .es-footer-body h3 a { font-size:20px!important; text-align:left } .es-menu td a { font-size:14px!important } .es-header-body p, .es-header-body ul li, .es-header-body ol li, .es-header-body a { font-size:14px!important } .es-content-body p, .es-content-body ul li, .es-content-body ol li, .es-content-body a { font-size:14px!important } .es-footer-body p, .es-footer-body ul li, .es-footer-body ol li, .es-footer-body a { font-size:14px!important } .es-infoblock p, .es-infoblock ul li, .es-infoblock ol li, .es-infoblock a { font-size:12px!important } *[class="gmail-fix"] { display:none!important } .es-m-txt-c, .es-m-txt-c h1, .es-m-txt-c h2, .es-m-txt-c h3 { text-align:center!important } .es-m-txt-r, .es-m-txt-r h1, .es-m-txt-r h2, .es-m-txt-r h3 { text-align:right!important } .es-m-txt-l, .es-m-txt-l h1, .es-m-txt-l h2, .es-m-txt-l h3 { text-align:left!important } .es-m-txt-r img, .es-m-txt-c img, .es-m-txt-l img { display:inline!important } .es-button-border { display:inline-block!important } a.es-button, button.es-button { font-size:18px!important; display:inline-block!important } .es-adaptive table, .es-left, .es-right { width:100%!important } .es-content table, .es-header table, .es-footer table, .es-content, .es-footer, .es-header { width:100%!important; max-width:600px!important } .es-adapt-td { display:block!important; width:100%!important } .adapt-img { width:100%!important; height:auto!important } .es-m-p0 { padding:0px!important } .es-m-p0r { padding-right:0px!important } .es-m-p0l { padding-left:0px!important } .es-m-p0t { padding-top:0px!important } .es-m-p0b { padding-bottom:0!important } .es-m-p20b { padding-bottom:20px!important } .es-mobile-hidden, .es-hidden { display:none!important } tr.es-desk-hidden, td.es-desk-hidden, table.es-desk-hidden { width:auto!important; overflow:visible!important; float:none!important; max-height:inherit!important; line-height:inherit!important } tr.es-desk-hidden { display:table-row!important } table.es-desk-hidden { display:table!important } td.es-desk-menu-hidden { display:table-cell!important } .es-menu td { width:1%!important } table.es-table-not-adapt, .esd-block-html table { width:auto!important } table.es-social { display:inline-block!important } table.es-social td { display:inline-block!important } .es-desk-hidden { display:table-row!important; width:auto!important; overflow:visible!important; max-height:inherit!important } }
          @media screen and (max-width:384px) {.mail-message-content { width:414px!important } }
          </style>
           </head>
           <body style="width:100%;font-family:arial, 'helvetica neue', helvetica, sans-serif;-webkit-text-size-adjust:100%;-ms-text-size-adjust:100%;padding:0;Margin:0">
            <div dir="ltr" class="es-wrapper-color" lang="en" style="background-color:#07023C"><!--[if gte mso 9]>
                <v:background xmlns:v="urn:schemas-microsoft-com:vml" fill="t">
                  <v:fill type="tile" color="#07023c"></v:fill>
                </v:background>
              <![endif]-->
             <table class="es-wrapper" width="100%" cellspacing="0" cellpadding="0" role="none" style="mso-table-lspace:0pt;mso-table-rspace:0pt;border-collapse:collapse;border-spacing:0px;padding:0;Margin:0;width:100%;height:100%;background-repeat:repeat;background-position:center top;background-color:#07023C">
               <tr>
                <td valign="top" style="padding:0;Margin:0">
                 <table class="es-content" cellspacing="0" cellpadding="0" align="center" role="none" style="mso-table-lspace:0pt;mso-table-rspace:0pt;border-collapse:collapse;border-spacing:0px;table-layout:fixed !important;width:100%">
                   <tr>
                    <td align="center" style="padding:0;Margin:0">
                     <table class="es-content-body" style="mso-table-lspace:0pt;mso-table-rspace:0pt;border-collapse:collapse;border-spacing:0px;background-color:#ffffff;background-repeat:no-repeat;width:600px;background-image:url(https://efxsvyb.stripocdn.email/content/guids/CABINET_0e8fbb6adcc56c06fbd3358455fdeb41/images/vector_0Ia.png);background-position:center center" cellspacing="0" cellpadding="0" bgcolor="#ffffff" align="center" background="https://efxsvyb.stripocdn.email/content/guids/CABINET_0e8fbb6adcc56c06fbd3358455fdeb41/images/vector_0Ia.png" role="none">
                       <tr>
                        <td align="left" style="Margin:0;padding-bottom:10px;padding-top:20px;padding-left:20px;padding-right:20px">
                         <table cellpadding="0" cellspacing="0" width="100%" role="none" style="mso-table-lspace:0pt;mso-table-rspace:0pt;border-collapse:collapse;border-spacing:0px">
                           <tr>
                            <td class="es-m-p0r" valign="top" align="center" style="padding:0;Margin:0;width:560px">
                             <table cellpadding="0" cellspacing="0" width="100%" role="presentation" style="mso-table-lspace:0pt;mso-table-rspace:0pt;border-collapse:collapse;border-spacing:0px">
                               <tr>
                                <td align="center" style="padding:0;Margin:0;font-size:0px"><a target="_blank" href="https://viewstripo.email" style="-webkit-text-size-adjust:none;-ms-text-size-adjust:none;mso-line-height-rule:exactly;text-decoration:underline;color:#26C6DA;font-size:14px"><img src="https://efxsvyb.stripocdn.email/content/guids/CABINET_b0acaa6517477956e8f5a273acd40d02be26db03936a3371097894c6a6836992/images/image_20240402_164020011.png" alt="Logo" style="display:block;border:0;outline:none;text-decoration:none;-ms-interpolation-mode:bicubic" title="Logo" height="105"></a></td>
                               </tr>
                             </table></td>
                           </tr>
                         </table></td>
                       </tr>
                       <tr>
                        <td align="left" style="Margin:0;padding-left:20px;padding-right:20px;padding-top:30px;padding-bottom:30px">
                         <table width="100%" cellspacing="0" cellpadding="0" role="none" style="mso-table-lspace:0pt;mso-table-rspace:0pt;border-collapse:collapse;border-spacing:0px">
                           <tr>
                            <td class="es-m-p0r es-m-p20b" valign="top" align="center" style="padding:0;Margin:0;width:560px">
                             <table width="100%" cellspacing="0" cellpadding="0" role="presentation" style="mso-table-lspace:0pt;mso-table-rspace:0pt;border-collapse:collapse;border-spacing:0px">
                               <tr>
                                <td align="center" style="padding:0;Margin:0"><h1 style="Margin:0;line-height:53px;mso-line-height-rule:exactly;font-family:Orbitron, sans-serif;font-size:44px;font-style:normal;font-weight:bold;color:#10054D">&nbsp;We got a request to reset your&nbsp;password<br></h1></td>
                               </tr>
                               <tr>
                                <td align="center" style="padding:0;Margin:0;padding-bottom:10px;padding-top:15px;font-size:0px"><a target="_blank" href="https://viewstripo.email" style="-webkit-text-size-adjust:none;-ms-text-size-adjust:none;mso-line-height-rule:exactly;text-decoration:underline;color:#26C6DA;font-size:14px"><img class="adapt-img" src="https://efxsvyb.stripocdn.email/content/guids/CABINET_b0acaa6517477956e8f5a273acd40d02be26db03936a3371097894c6a6836992/images/image_20240402_165213543.png" alt style="display:block;border:0;outline:none;text-decoration:none;-ms-interpolation-mode:bicubic" height="300"></a></td>
                               </tr>
                               <tr>
                                <td align="center" style="padding:0;Margin:0;padding-top:10px;padding-bottom:10px"><p style="Margin:0;-webkit-text-size-adjust:none;-ms-text-size-adjust:none;mso-line-height-rule:exactly;font-family:arial, 'helvetica neue', helvetica, sans-serif;line-height:21px;color:#333333;font-size:14px">&nbsp;Forgot your password? No problem - it happens to everyone!<br></p></td>
                               </tr>
                               <tr>
                               <td align="center" style="padding: 0; Margin: 0; padding-top: 15px; padding-bottom: 15px;">
                               <!-- Génère un carré pour chaque chiffre du code aléatoire -->
                               ${RandomXCode.toString().split('').map((digit) => `
                               <div class="code-container" style="border: 2px solid #26C6DA; border-radius: 10px; width: 40px; height: 40px; display: inline-block; margin-right: 5px; text-align: center; font-size: 20px; font-weight: bold; color: #26C6DA;">${digit}</div>
                               `).join('')}
                             </td>
                                                          </tr>
                               <tr>
                                <td align="center" style="padding:0;Margin:0;padding-top:10px;padding-bottom:10px"><p style="Margin:0;-webkit-text-size-adjust:none;-ms-text-size-adjust:none;mso-line-height-rule:exactly;font-family:arial, 'helvetica neue', helvetica, sans-serif;line-height:21px;color:#333333;font-size:14px">If you ignore this message, your password won't be changed.</p></td>
                               </tr>
                             </table></td>
                           </tr>
                         </table></td>
                       </tr>
                     </table></td>
                   </tr>
                 </table>
                 <table cellpadding="0" cellspacing="0" class="es-content" align="center" role="none" style="mso-table-lspace:0pt;mso-table-rspace:0pt;border-collapse:collapse;border-spacing:0px;table-layout:fixed !important;width:100%">
                   <tr>
                    <td align="center" style="padding:0;Margin:0">
                     <table bgcolor="#10054D" class="es-content-body" align="center" cellpadding="0" cellspacing="0" style="mso-table-lspace:0pt;mso-table-rspace:0pt;border-collapse:collapse;border-spacing:0px;background-color:#10054d;width:600px" role="none">
                       <tr>
                        <td align="left" background="https://efxsvyb.stripocdn.email/content/guids/CABINET_0e8fbb6adcc56c06fbd3358455fdeb41/images/vector_sSY.png" style="Margin:0;padding-left:20px;padding-right:20px;padding-top:35px;padding-bottom:35px;background-image:url(https://efxsvyb.stripocdn.email/content/guids/CABINET_0e8fbb6adcc56c06fbd3358455fdeb41/images/vector_sSY.png);background-repeat:no-repeat;background-position:left center"><!--[if mso]><table style="width:560px" cellpadding="0" cellspacing="0"><tr><td style="width:69px" valign="top"><![endif]-->
                         <table cellpadding="0" cellspacing="0" class="es-left" align="left" role="none" style="mso-table-lspace:0pt;mso-table-rspace:0pt;border-collapse:collapse;border-spacing:0px;float:left">
                           <tr>
                            <td class="es-m-p20b" align="left" style="padding:0;Margin:0;width:69px">
                             <table cellpadding="0" cellspacing="0" width="100%" role="presentation" style="mso-table-lspace:0pt;mso-table-rspace:0pt;border-collapse:collapse;border-spacing:0px">
                               <tr>
                                <td align="center" class="es-m-txt-l" style="padding:0;Margin:0;font-size:0px"><a target="_blank" href="https://viewstripo.email" style="-webkit-text-size-adjust:none;-ms-text-size-adjust:none;mso-line-height-rule:exactly;text-decoration:underline;color:#26C6DA;font-size:14px"><img src="https://efxsvyb.stripocdn.email/content/guids/CABINET_dee64413d6f071746857ca8c0f13d696/images/group_118_lFL.png" alt style="display:block;border:0;outline:none;text-decoration:none;-ms-interpolation-mode:bicubic" width="69"></a></td>
                               </tr>
                             </table></td>
                           </tr>
                         </table><!--[if mso]></td><td style="width:20px"></td><td style="width:471px" valign="top"><![endif]-->
                         <table cellpadding="0" cellspacing="0" class="es-right" align="right" role="none" style="mso-table-lspace:0pt;mso-table-rspace:0pt;border-collapse:collapse;border-spacing:0px;float:right">
                           <tr>
                            <td align="left" style="padding:0;Margin:0;width:471px">
                             <table cellpadding="0" cellspacing="0" width="100%" role="presentation" style="mso-table-lspace:0pt;mso-table-rspace:0pt;border-collapse:collapse;border-spacing:0px">
                               <tr>
                                <td align="left" style="padding:0;Margin:0"><h3 style="Margin:0;line-height:34px;mso-line-height-rule:exactly;font-family:Orbitron, sans-serif;font-size:28px;font-style:normal;font-weight:bold;color:#ffffff"><b>Real people. Here to help.</b></h3></td>
                               </tr>
                               <tr>
                                <td align="left" style="padding:0;Margin:0;padding-bottom:5px;padding-top:10px"><p style="Margin:0;-webkit-text-size-adjust:none;-ms-text-size-adjust:none;mso-line-height-rule:exactly;font-family:arial, 'helvetica neue', helvetica, sans-serif;line-height:21px;color:#ffffff;font-size:14px">Have a question? Please end us an email tektaicontact@gmail.com</p></td>
                               </tr>
                             </table></td>
                           </tr>
                         </table><!--[if mso]></td></tr></table><![endif]--></td>
                       </tr>
                     </table></td>
                   </tr>
                 </table>
               </tr>
             </table>
            </div>
           </body>
          </html>`,
        };
    
        mailTransporter.sendMail(mailOptions, function (error, info) {
          if (error) {
            res.json({ message: "error sending" });
            console.log(error);
          } else {
            res.status(200).json({
              message: "haw el mail wselek jawk behi erfess",
            });
            User.findOneAndUpdate(
              { email: req.body.email },
              { codeForget: RandomXCode },
              { new: true }
            )
              .then((updatedUser) => {
                console.log(updatedUser); // log the updated user document
              })
              .catch((err) => {
                console.log(err);
              });
          }
        });
      }
    }
    export async function ChangePasswordForgot(req, res, next) {
      const { email, codeForget, password } = req.body;
      if (!email || !codeForget || !password) {
        return res.status(422).json({ error: "Something is missing" });
  
      }
    
      try {
        const user = await User.findOne({ email });
        if (!user) {
          return res.status(404).json({ message: "User not found" });
        }
    
        if (codeForget === user.codeForget && user.codeForget !== "") {
          // Hash the new password
          bcrypt.hash(password, 10, async (err, hash) => {
            if (err) {
              return res.status(400).json({ error: "Error hashing password" });
            }
            // Update user's password and clear codeForget
            user.password = hash;
            user.codeForget = "";
            await user.save();
    
            // Generate access token
            const accessToken = await signAccessToken(user.id);
            // Generate refresh token
            const refreshToken = await signRefreshToken(user.id);
    
            return res.status(200).json({
              message: "Password changed successfully",
              accessToken,
              refreshToken,
              role: user.role,
            });
          });
        } else {
          return res.status(402).json({ message: "Incorrect code" });
        }
      } catch (error) {
        console.error('Error changing password:', error);
        return res.status(500).json({ error: "Internal server error" });
      }
    }
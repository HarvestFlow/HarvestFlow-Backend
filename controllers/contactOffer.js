import nodemailer from 'nodemailer';

const mailTransporter = nodemailer.createTransport({
  host: "smtp.gmail.com",
  port: 587,
  secure: false,
  auth: {
    user: "briki.houda12345@gmail.com",
    pass: "ttpvdaxpzonxgasq",
  },
});

export async function sendContactOffer(req, res, next) {
  const { firstname, email, company, toEmail, offerTitle } = req.body;

  if (!firstname || !email || !toEmail || !offerTitle) {
    const error = new Error('All fields are required');
    error.status = 400;
    return next(error);
  }

  const mailOptions = {
    from: 'HarvestFlow <briki.houda12345@gmail.com>',
    to: toEmail,
    subject: 'Interest in Your Offer',
    html: `
      <!DOCTYPE html PUBLIC "-//W3C//DTD XHTML 1.0 Transitional//EN" "http://www.w3.org/TR/xhtml1/DTD/xhtml1-transitional.dtd">
      <html dir="ltr" xmlns="http://www.w3.org/1999/xhtml" xmlns:o="urn:schemas-microsoft-com:office:office" lang="en">
      <head>
        <meta charset="UTF-8">
        <meta content="width=device-width, initial-scale=1" name="viewport">
        <meta name="x-apple-disable-message-reformatting">
        <meta http-equiv="X-UA-Compatible" content="IE=edge">
        <meta content="telephone=no" name="format-detection">
        <title>Interest in Your Offer</title>
        <!--[if (mso 16)]>
        <style type="text/css">
          a {text-decoration: none;}
        </style>
        <![endif]-->
        <!--[if gte mso 9]><style>sup { font-size: 100% !important; }</style><![endif]-->
        <!--[if gte mso 9]>
        <xml>
          <o:OfficeDocumentSettings>
            <o:AllowPNG></o:AllowPNG>
            <o:PixelsPerInch>96</o:PixelsPerInch>
          </o:OfficeDocumentSettings>
        </xml>
        <![endif]-->
        <link href="https://fonts.googleapis.com/css2?family=Roboto:wght@400;700&display=swap" rel="stylesheet">
        <style type="text/css">
          #outlook a { padding:0; }
          .es-button { mso-style-priority:100!important; text-decoration:none!important; }
          a[x-apple-data-detectors] { color:inherit!important; text-decoration:none!important; font-size:inherit!important; font-family:inherit!important; font-weight:inherit!important; line-height:inherit!important; }
          .es-desk-hidden { display:none; float:left; overflow:hidden; width:0; max-height:0; line-height:0; mso-hide:all; }
          .es-button-border:hover a.es-button, .es-button-border:hover button.es-button { background:#4CAF50!important; }
          .es-button-border:hover { border-color:#4CAF50 #4CAF50 #4CAF50 #4CAF50!important; background:#4CAF50!important; border-style:solid solid solid solid!important; }
          @media only screen and (max-width:600px) {
            p, ul li, ol li, a { line-height:150%!important; }
            h1, h2, h3, h1 a, h2 a, h3 a { line-height:120%; }
            h1 { font-size:28px!important; text-align:center; }
            h2 { font-size:22px!important; text-align:left; }
            h3 { font-size:18px!important; text-align:left; }
            .es-content-body p, .es-content-body ul li, .es-content-body ol li, .es-content-body a { font-size:14px!important; }
            .es-footer-body p, .es-footer-body ul li, .es-footer-body ol li, .es-footer-body a { font-size:14px!important; }
            .es-infoblock p, .es-infoblock ul li, .es-infoblock ol li, .es-infoblock a { font-size:12px!important; }
            *[class="gmail-fix"] { display:none!important; }
            .es-m-txt-c, .es-m-txt-c h1, .es-m-txt-c h2, .es-m-txt-c h3 { text-align:center!important; }
            .es-m-txt-r, .es-m-txt-r h1, .es-m-txt-r h2, .es-m-txt-r h3 { text-align:right!important; }
            .es-m-txt-l, .es-m-txt-l h1, .es-m-txt-l h2, .es-m-txt-l h3 { text-align:left!important; }
            .es-button-border { display:inline-block!important; }
            a.es-button, button.es-button { font-size:16px!important; display:inline-block!important; }
            .es-adaptive table, .es-left, .es-right { width:100%!important; }
            .es-content table, .es-header table, .es-footer table, .es-content, .es-footer, .es-header { width:100%!important; max-width:600px!important; }
            .es-adapt-td { display:block!important; width:100%!important; }
            .adapt-img { width:100%!important; height:auto!important; }
            .es-m-p0 { padding:0px!important; }
            .es-m-p0r { padding-right:0px!important; }
            .es-m-p0l { padding-left:0px!important; }
            .es-m-p0t { padding-top:0px!important; }
            .es-m-p0b { padding-bottom:0!important; }
            .es-m-p20b { padding-bottom:20px!important; }
            .es-mobile-hidden, .es-hidden { display:none!important; }
            tr.es-desk-hidden, td.es-desk-hidden, table.es-desk-hidden { width:auto!important; overflow:visible!important; float:none!important; max-height:inherit!important; line-height:inherit!important; }
            tr.es-desk-hidden { display:table-row!important; }
            table.es-desk-hidden { display:table!important; }
            td.es-desk-menu-hidden { display:table-cell!important; }
            .es-menu td { width:1%!important; }
            table.es-table-not-adapt, .esd-block-html table { width:auto!important; }
            table.es-social { display:inline-block!important; }
            table.es-social td { display:inline-block!important; }
            .es-desk-hidden { display:table-row!important; width:auto!important; overflow:visible!important; max-height:inherit!important; }
          }
        </style>
      </head>
      <body style="width:100%;font-family:Roboto, sans-serif;-webkit-text-size-adjust:100%;-ms-text-size-adjust:100%;padding:0;Margin:0;background-color:#f4f4f4">
        <div dir="ltr" class="es-wrapper-color" lang="en" style="background-color:#f4f4f4">
          <table class="es-wrapper" width="100%" cellspacing="0" cellpadding="0" role="none" style="mso-table-lspace:0pt;mso-table-rspace:0pt;border-collapse:collapse;border-spacing:0px;padding:0;Margin:0;width:100%;height:100%;background-color:#f4f4f4">
            <tr>
              <td valign="top" style="padding:0;Margin:0">
                <table class="es-content" cellspacing="0" cellpadding="0" align="center" role="none" style="mso-table-lspace:0pt;mso-table-rspace:0pt;border-collapse:collapse;border-spacing:0px;table-layout:fixed !important;width:100%">
                  <tr>
                    <td align="center" style="padding:0;Margin:0">
                      <table class="es-content-body" style="mso-table-lspace:0pt;mso-table-rspace:0pt;border-collapse:collapse;border-spacing:0px;background-color:#ffffff;width:600px" cellspacing="0" cellpadding="0" bgcolor="#ffffff" align="center" role="none">
                        <tr>
                          <td align="left" style="Margin:0;padding-bottom:10px;padding-top:20px;padding-left:20px;padding-right:20px">
                            <table cellpadding="0" cellspacing="0" width="100%" role="none" style="mso-table-lspace:0pt;mso-table-rspace:0pt;border-collapse:collapse;border-spacing:0px">
                              <tr>
                                <td align="center" style="padding:0;Margin:0;width:560px">
                                  <table cellpadding="0" cellspacing="0" width="100%" role="presentation" style="mso-table-lspace:0pt;mso-table-rspace:0pt;border-collapse:collapse;border-spacing:0px">
                                    <tr>
                                      <td align="center" style="padding:0;Margin:0;font-size:0px">
                                        <img src="https://img.freepik.com/vecteurs-libre/vecteur-degrade-logo-colore-oiseau_343694-1365.jpg" alt="HarvestFlow Logo" style="display:block;border:0;outline:none;text-decoration:none;-ms-interpolation-mode:bicubic" title="HarvestFlow Logo" height="80">
                                      </td>
                                    </tr>
                                    <tr>
                                      <td align="center" style="padding:0;Margin:0;padding-top:20px;padding-bottom:20px">
                                        <h1 style="Margin:0;line-height:36px;mso-line-height-rule:exactly;font-family:Roboto, sans-serif;font-size:30px;font-style:normal;font-weight:bold;color:#2e7d32">Interest in Your Offer</h1>
                                      </td>
                                    </tr>
                                  </table>
                                </td>
                              </tr>
                            </table>
                          </td>
                        </tr>
                        <tr>
                          <td align="left" style="Margin:0;padding-left:20px;padding-right:20px;padding-top:20px;padding-bottom:20px;background-color:#f9f9f9">
                            <table cellpadding="0" cellspacing="0" width="100%" role="none" style="mso-table-lspace:0pt;mso-table-rspace:0pt;border-collapse:collapse;border-spacing:0px">
                              <tr>
                                <td align="center" style="padding:0;Margin:0;width:560px">
                                  <table cellpadding="0" cellspacing="0" width="100%" role="presentation" style="mso-table-lspace:0pt;mso-table-rspace:0pt;border-collapse:collapse;border-spacing:0px">
                                    <tr>
                                      <td align="left" style="padding:0;Margin:0;padding-bottom:15px">
                                        <p style="Margin:0;-webkit-text-size-adjust:none;-ms-text-size-adjust:none;mso-line-height-rule:exactly;font-family:Roboto, sans-serif;line-height:21px;color:#333333;font-size:14px">
                                          Dear Supplier,
                                        </p>
                                        <p style="Margin:0;-webkit-text-size-adjust:none;-ms-text-size-adjust:none;mso-line-height-rule:exactly;font-family:Roboto, sans-serif;line-height:21px;color:#333333;font-size:14px;padding-top:10px">
                                          I am interested in your offer titled "${offerTitle}". Below are my details:
                                        </p>
                                      </td>
                                    </tr>
                                    <tr>
                                      <td align="left" style="padding:0;Margin:0;padding-bottom:15px">
                                        <table cellpadding="0" cellspacing="0" width="100%" role="none" style="mso-table-lspace:0pt;mso-table-rspace:0pt;border-collapse:collapse;border-spacing:0px">
                                          <tr>
                                            <td align="left" style="padding:0;Margin:0;padding-bottom:5px">
                                              <p style="Margin:0;-webkit-text-size-adjust:none;-ms-text-size-adjust:none;mso-line-height-rule:exactly;font-family:Roboto, sans-serif;line-height:21px;color:#333333;font-size:14px"><strong>Name:</strong> ${firstname}</p>
                                            </td>
                                          </tr>
                                          <tr>
                                            <td align="left" style="padding:0;Margin:0;padding-bottom:5px">
                                              <p style="Margin:0;-webkit-text-size-adjust:none;-ms-text-size-adjust:none;mso-line-height-rule:exactly;font-family:Roboto, sans-serif;line-height:21px;color:#333333;font-size:14px"><strong>Email:</strong> ${email}</p>
                                            </td>
                                          </tr>
                                          <tr>
                                            <td align="left" style="padding:0;Margin:0;padding-bottom:5px">
                                              <p style="Margin:0;-webkit-text-size-adjust:none;-ms-text-size-adjust:none;mso-line-height-rule:exactly;font-family:Roboto, sans-serif;line-height:21px;color:#333333;font-size:14px"><strong>Company:</strong> ${company}</p>
                                            </td>
                                          </tr>
                                        </table>
                                      </td>
                                    </tr>
                                    <tr>
                                      <td align="left" style="padding:0;Margin:0;padding-bottom:15px">
                                        <h3 style="Margin:0;line-height:24px;mso-line-height-rule:exactly;font-family:Roboto, sans-serif;font-size:20px;font-style:normal;font-weight:bold;color:#2e7d32">Contact Information</h3>
                                        <p style="Margin:0;-webkit-text-size-adjust:none;-ms-text-size-adjust:none;mso-line-height-rule:exactly;font-family:Roboto, sans-serif;line-height:21px;color:#333333;font-size:14px;padding-top:10px">
                                        </p>
                                        <p style="Margin:0;-webkit-text-size-adjust:none;-ms-text-size-adjust:none;mso-line-height-rule:exactly;font-family:Roboto, sans-serif;line-height:21px;color:#333333;font-size:14px;padding-top:5px">
                                          Show more contact information
                                        </p>
                                      </td>
                                    </tr>
                                    <tr>
                                      <td align="left" style="padding:0;Margin:0;padding-bottom:15px">
                                        <p style="Margin:0;-webkit-text-size-adjust:none;-ms-text-size-adjust:none;mso-line-height-rule:exactly;font-family:Roboto, sans-serif;line-height:21px;color:#333333;font-size:14px">
                                          Please contact me to discuss further details about this offer.
                                        </p>
                                      </td>
                                    </tr>
                                    <tr>
                                      <td align="left" style="padding:0;Margin:0">
                                        <p style="Margin:0;-webkit-text-size-adjust:none;-ms-text-size-adjust:none;mso-line-height-rule:exactly;font-family:Roboto, sans-serif;line-height:21px;color:#333333;font-size:14px">
                                          Best regards,<br>${firstname}
                                        </p>
                                      </td>
                                    </tr>
                                  </table>
                                </td>
                              </tr>
                            </table>
                          </td>
                        </tr>
                        <tr>
                          <td align="left" style="Margin:0;padding-left:20px;padding-right:20px;padding-top:20px;padding-bottom:20px;background-color:#2e7d32">
                            <table cellpadding="0" cellspacing="0" width="100%" role="none" style="mso-table-lspace:0pt;mso-table-rspace:0pt;border-collapse:collapse;border-spacing:0px">
                              <tr>
                                <td align="center" style="padding:0;Margin:0;width:560px">
                                  <table cellpadding="0" cellspacing="0" width="100%" role="presentation" style="mso-table-lspace:0pt;mso-table-rspace:0pt;border-collapse:collapse;border-spacing:0px">
                                    <tr>
                                      <td align="center" style="padding:0;Margin:0;padding-top:10px;padding-bottom:10px">
                                        <h3 style="Margin:0;line-height:24px;mso-line-height-rule:exactly;font-family:Roboto, sans-serif;font-size:20px;font-style:normal;font-weight:bold;color:#ffffff">Need Help?</h3>
                                        <p style="Margin:0;-webkit-text-size-adjust:none;-ms-text-size-adjust:none;mso-line-height-rule:exactly;font-family:Roboto, sans-serif;line-height:21px;color:#ffffff;font-size:14px;padding-top:5px">
                                          Have a question? Reach out to our support team at <a href="mailto:briki.houda12345@gmail.com" style="color:#ffffff;text-decoration:underline;">briki.houda12345@gmail.com</a>
                                        </p>
                                      </td>
                                    </tr>
                                  </table>
                                </td>
                              </tr>
                            </table>
                          </td>
                        </tr>
                      </table>
                    </td>
                  </tr>
                </table>
              </td>
            </tr>
          </table>
        </div>
      </body>
      </html>
    `,
  };

  try {
    await mailTransporter.sendMail(mailOptions);
    res.status(200).json({ message: 'Email sent successfully' });
  } catch (error) {
    console.error('Error sending email:', error);
    error.status = 500;
    error.message = 'Failed to send email';
    next(error);
  }
}
import nodemailer from "nodemailer";

export default async function handler(req, res) {
  if (req.method !== "POST") {
    return res.status(405).json({ message: "Method not allowed" });
  }

  const { name, email, subject, message, type } = req.body;

  // Validate required fields
  if (!name || !email || !subject || !message) {
    return res.status(400).json({ message: "Missing required fields" });
  }

  try {
    // Create nodemailer transporter using environment variables
    const transporter = nodemailer.createTransport({
      host: process.env.EMAIL_SERVER,
      port: parseInt(process.env.EMAIL_PORT),
      secure: false, // true for 465, false for other ports
      auth: {
        user: process.env.EMAIL_USER,
        pass: process.env.EMAIL_PASS,
      },
    });

    // Format message type for better readability
    const formatMessageType = (type) => {
      const typeMap = {
        general: "General Inquiry",
        bug: "Bug Report",
        feature: "Feature Request",
        partnership: "Partnership",
        support: "Technical Support",
      };
      return typeMap[type] || "General Inquiry";
    };

    // Email content for admin
    const adminEmailContent = `
New Contact Form Message - EcoLafaek

Message Details:
━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━
• Name: ${name}
• Email: ${email}
• Subject: ${subject}
• Type: ${formatMessageType(type)}

Message:
━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━
${message}

Contact Details:
━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━
• Submitted: ${new Date().toLocaleString()}
• Reply to: ${email}
• Message Type: ${formatMessageType(type)}

Next Steps:
━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━
1. Review the message and determine appropriate response
2. Reply directly to: ${email}
3. If it's a bug report, check the system for issues
4. If it's a feature request, consider for roadmap

EcoLafaek Contact System
    `;

    // Send email to admin
    await transporter.sendMail({
      from: process.env.EMAIL_USER,
      to: process.env.EMAIL_USER, // Send to yourself
      subject: `📧 EcoLafaek Contact: ${subject}`,
      text: adminEmailContent,
      html: `
        <div style="font-family: 'Segoe UI', Tahoma, Geneva, Verdana, sans-serif; line-height: 1.6; color: #333; max-width: 600px; margin: 0 auto;">
          <div style="background: linear-gradient(135deg, #059669 0%, #047857 100%); color: white; padding: 20px; border-radius: 10px 10px 0 0;">
            <h1 style="margin: 0; font-size: 24px;">📧 New Contact Message</h1>
            <p style="margin: 10px 0 0 0; opacity: 0.9;">EcoLafaek Contact System</p>
          </div>
          
          <div style="background: #f9fafb; padding: 30px; border-radius: 0 0 10px 10px;">
            <div style="background: white; padding: 25px; border-radius: 8px; margin-bottom: 20px; border-left: 4px solid #059669;">
              <h2 style="color: #059669; margin: 0 0 20px 0; font-size: 18px;">Contact Details</h2>
              <table style="width: 100%; border-collapse: collapse;">
                <tr><td style="padding: 8px 0; font-weight: bold; color: #374151;">Name:</td><td style="padding: 8px 0;">${name}</td></tr>
                <tr><td style="padding: 8px 0; font-weight: bold; color: #374151;">Email:</td><td style="padding: 8px 0;"><a href="mailto:${email}" style="color: #059669; text-decoration: none;">${email}</a></td></tr>
                <tr><td style="padding: 8px 0; font-weight: bold; color: #374151;">Subject:</td><td style="padding: 8px 0; font-weight: bold;">${subject}</td></tr>
                <tr><td style="padding: 8px 0; font-weight: bold; color: #374151;">Type:</td><td style="padding: 8px 0;"><span style="background: #dcfce7; color: #166534; padding: 2px 8px; border-radius: 4px; font-size: 12px; font-weight: bold;">${formatMessageType(
                  type
                )}</span></td></tr>
              </table>
            </div>
            
            <div style="background: white; padding: 25px; border-radius: 8px; margin-bottom: 20px; border-left: 4px solid #3b82f6;">
              <h3 style="color: #3b82f6; margin: 0 0 15px 0; font-size: 16px;">Message</h3>
              <div style="background: #f8fafc; padding: 15px; border-radius: 6px; color: #374151; white-space: pre-wrap;">${message}</div>
            </div>
            
            <div style="background: white; padding: 25px; border-radius: 8px; border-left: 4px solid #f59e0b;">
              <h3 style="color: #f59e0b; margin: 0 0 15px 0; font-size: 16px;">Recommended Actions</h3>
              <ul style="margin: 0; padding-left: 20px; color: #6b7280;">
                <li style="margin-bottom: 8px;">Reply directly to <a href="mailto:${email}" style="color: #059669;">${email}</a></li>
                <li style="margin-bottom: 8px;">Review message type: ${formatMessageType(
                  type
                )}</li>
                <li style="margin-bottom: 8px;">Expected response time: Within 24 hours</li>
                <li style="margin-bottom: 8px;">Follow up if technical support is needed</li>
              </ul>
            </div>
            
            <div style="text-align: center; margin-top: 30px; padding: 20px; background: white; border-radius: 8px;">
              <p style="margin: 0 0 15px 0; color: #6b7280; font-size: 14px;">Message received on ${new Date().toLocaleString()}</p>
              <a href="mailto:${email}" style="display: inline-block; background: #059669; color: white; padding: 12px 24px; text-decoration: none; border-radius: 6px; font-weight: bold;">📧 Reply to Message</a>
            </div>
          </div>
        </div>
      `,
    });

    // Send confirmation email to sender
    await transporter.sendMail({
      from: process.env.EMAIL_USER,
      to: email,
      subject: "✅ Message Received - EcoLafaek Team",
      html: `
        <div style="font-family: 'Segoe UI', Tahoma, Geneva, Verdana, sans-serif; line-height: 1.6; color: #333; max-width: 600px; margin: 0 auto;">
          <div style="background: linear-gradient(135deg, #059669 0%, #047857 100%); color: white; padding: 30px; text-align: center; border-radius: 10px 10px 0 0;">
            <h1 style="margin: 0; font-size: 28px;">✅ Message Received</h1>
            <p style="margin: 15px 0 0 0; opacity: 0.9; font-size: 16px;">Thank you for contacting EcoLafaek</p>
          </div>
          
          <div style="background: #f9fafb; padding: 40px; border-radius: 0 0 10px 10px;">
            <div style="background: white; padding: 30px; border-radius: 12px; text-align: center; margin-bottom: 25px;">
              <div style="width: 60px; height: 60px; background: #dcfce7; border-radius: 50%; margin: 0 auto 20px auto; display: flex; align-items: center; justify-content: center;">
                <span style="font-size: 24px;">📧</span>
              </div>
              <h2 style="color: #059669; margin: 0 0 15px 0; font-size: 22px;">Hi ${name}!</h2>
              <p style="color: #6b7280; margin: 0; font-size: 16px;">We've received your message and will get back to you as soon as possible.</p>
            </div>
            
            <div style="background: white; padding: 25px; border-radius: 8px; margin-bottom: 25px; border-left: 4px solid #059669;">
              <h3 style="color: #059669; margin: 0 0 15px 0;">What Happens Next?</h3>
              <ul style="margin: 0; padding-left: 20px; color: #6b7280;">
                <li style="margin-bottom: 10px;"><strong>Review:</strong> Our team will review your message carefully</li>
                <li style="margin-bottom: 10px;"><strong>Response Time:</strong> We typically respond within 24 hours</li>
                <li style="margin-bottom: 10px;"><strong>Follow-up:</strong> We'll contact you at ${email} with our response</li>
              </ul>
            </div>
            
            <div style="background: white; padding: 25px; border-radius: 8px; margin-bottom: 25px;">
              <h3 style="color: #374151; margin: 0 0 15px 0;">Your Message Summary</h3>
              <table style="width: 100%; border-collapse: collapse;">
                <tr><td style="padding: 8px 0; font-weight: bold; color: #6b7280;">Subject:</td><td style="padding: 8px 0;">${subject}</td></tr>
                <tr><td style="padding: 8px 0; font-weight: bold; color: #6b7280;">Type:</td><td style="padding: 8px 0;">${formatMessageType(
                  type
                )}</td></tr>
                <tr><td style="padding: 8px 0; font-weight: bold; color: #6b7280;">Submitted:</td><td style="padding: 8px 0;">${new Date().toLocaleString()}</td></tr>
              </table>
            </div>
            
            <div style="background: #fef3c7; padding: 20px; border-radius: 8px; margin-bottom: 25px; border-left: 4px solid #f59e0b;">
              <h4 style="color: #92400e; margin: 0 0 10px 0; font-size: 16px;">💡 While You Wait</h4>
              <p style="color: #92400e; margin: 0; font-size: 14px;">Check out our <a href="https://ecolafaek.com" style="color: #059669;">live dashboard</a> or <a href="https://ecolafaek.com/download" style="color: #059669;">download our mobile app</a> to start making a difference in Timor-Leste!</p>
            </div>
            
            <div style="text-align: center; color: #6b7280; font-size: 14px;">
              <p>Need immediate assistance? Check our <a href="https://ecolafaek.com/about" style="color: #059669;">about page</a> for more information</p>
              <p style="margin-top: 20px; padding-top: 20px; border-top: 1px solid #e5e7eb;">
                <strong>EcoLafaek Team</strong><br>
                Making Timor-Leste cleaner and healthier together 🇹🇱
              </p>
            </div>
          </div>
        </div>
      `,
    });

    res.status(200).json({ message: "Message sent successfully" });
  } catch (error) {
    console.error("Error sending email:", error);
    res.status(500).json({ message: "Error sending message" });
  }
}
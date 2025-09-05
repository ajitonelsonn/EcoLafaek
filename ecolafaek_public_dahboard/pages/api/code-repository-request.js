import nodemailer from "nodemailer";

export default async function handler(req, res) {
  if (req.method !== "POST") {
    return res.status(405).json({ message: "Method not allowed" });
  }

  const { name, email, githubUsername, role, purpose, message } = req.body;

  // Validate required fields
  if (!name || !email || !githubUsername || !role || !purpose) {
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

    // Format role and purpose for better readability
    const formatRole = (role) => {
      const roleMap = {
        judge: "Judge",
        event_organizer: "Event Organizer",
        sponsor: "Sponsor",
        researcher: "Researcher",
        developer: "Developer",
        student: "Student",
        other: "Other",
      };
      return roleMap[role] || role;
    };

    const formatPurpose = (purpose) => {
      const purposeMap = {
        judging: "Code Review & Judging",
        collaboration: "Collaboration & Contribution",
        research: "Research & Learning",
        sponsorship: "Sponsorship Evaluation",
        competition: "Competition Organization",
        other: "Other",
      };
      return purposeMap[purpose] || purpose;
    };

    // Email content
    const emailContent = `
New Code Repository Access Request

Requester Details:
━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━
• Name: ${name}
• Email: ${email}
• GitHub Username: ${githubUsername}
• Role: ${formatRole(role)}
• Purpose: ${formatPurpose(purpose)}

Additional Message:
━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━
${message || "No additional message provided."}

Request Details:
━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━
• Submitted: ${new Date().toLocaleString()}
• Repository: EcoLafaek (Private)
• GitHub Profile: https://github.com/${githubUsername}

Next Steps:
━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━
1. Review the requester's GitHub profile
2. Verify their role and purpose
3. Add them as a collaborator if approved
4. Send confirmation email to: ${email}

Repository URL: https://github.com/ajitonelsonn/EcoLafaek
    `;

    // Send email to admin
    await transporter.sendMail({
      from: process.env.EMAIL_USER,
      to: process.env.EMAIL_USER, // Send to yourself
      subject: `🔐 Code Repository Access Request - ${name}`,
      text: emailContent,
      html: `
        <div style="font-family: 'Segoe UI', Tahoma, Geneva, Verdana, sans-serif; line-height: 1.6; color: #333; max-width: 600px; margin: 0 auto;">
          <div style="background: linear-gradient(135deg, #059669 0%, #047857 100%); color: white; padding: 20px; border-radius: 10px 10px 0 0;">
            <h1 style="margin: 0; font-size: 24px;">🔐 Code Repository Access Request</h1>
            <p style="margin: 10px 0 0 0; opacity: 0.9;">EcoLafaek Project</p>
          </div>
          
          <div style="background: #f9fafb; padding: 30px; border-radius: 0 0 10px 10px;">
            <div style="background: white; padding: 25px; border-radius: 8px; margin-bottom: 20px; border-left: 4px solid #059669;">
              <h2 style="color: #059669; margin: 0 0 20px 0; font-size: 18px;">Requester Details</h2>
              <table style="width: 100%; border-collapse: collapse;">
                <tr><td style="padding: 8px 0; font-weight: bold; color: #374151;">Name:</td><td style="padding: 8px 0;">${name}</td></tr>
                <tr><td style="padding: 8px 0; font-weight: bold; color: #374151;">Email:</td><td style="padding: 8px 0;"><a href="mailto:${email}" style="color: #059669; text-decoration: none;">${email}</a></td></tr>
                <tr><td style="padding: 8px 0; font-weight: bold; color: #374151;">GitHub:</td><td style="padding: 8px 0;"><a href="https://github.com/${githubUsername}" style="color: #059669; text-decoration: none;" target="_blank">@${githubUsername}</a></td></tr>
                <tr><td style="padding: 8px 0; font-weight: bold; color: #374151;">Role:</td><td style="padding: 8px 0;"><span style="background: #dcfce7; color: #166534; padding: 2px 8px; border-radius: 4px; font-size: 12px; font-weight: bold;">${formatRole(
                  role
                )}</span></td></tr>
                <tr><td style="padding: 8px 0; font-weight: bold; color: #374151;">Purpose:</td><td style="padding: 8px 0;"><span style="background: #e0f2fe; color: #0c4a6e; padding: 2px 8px; border-radius: 4px; font-size: 12px; font-weight: bold;">${formatPurpose(
                  purpose
                )}</span></td></tr>
              </table>
            </div>
            
            ${
              message
                ? `
            <div style="background: white; padding: 25px; border-radius: 8px; margin-bottom: 20px; border-left: 4px solid #3b82f6;">
              <h3 style="color: #3b82f6; margin: 0 0 15px 0; font-size: 16px;">Additional Message</h3>
              <p style="margin: 0; color: #6b7280; font-style: italic; background: #f8fafc; padding: 15px; border-radius: 6px;">"${message}"</p>
            </div>
            `
                : ""
            }
            
            <div style="background: white; padding: 25px; border-radius: 8px; border-left: 4px solid #f59e0b;">
              <h3 style="color: #f59e0b; margin: 0 0 15px 0; font-size: 16px;">Next Steps</h3>
              <ol style="margin: 0; padding-left: 20px; color: #6b7280;">
                <li style="margin-bottom: 8px;">Review the <a href="https://github.com/${githubUsername}" style="color: #059669;" target="_blank">requester's GitHub profile</a></li>
                <li style="margin-bottom: 8px;">Verify their role and stated purpose</li>
                <li style="margin-bottom: 8px;">Add them as a collaborator if approved</li>
                <li style="margin-bottom: 8px;">Send confirmation email to <a href="mailto:${email}" style="color: #059669;">${email}</a></li>
              </ol>
            </div>
            
            <div style="text-align: center; margin-top: 30px; padding: 20px; background: white; border-radius: 8px;">
              <p style="margin: 0 0 15px 0; color: #6b7280; font-size: 14px;">Request submitted on ${new Date().toLocaleString()}</p>
              <a href="https://github.com/ajitonelsonn/EcoLafaek" style="display: inline-block; background: #059669; color: white; padding: 12px 24px; text-decoration: none; border-radius: 6px; font-weight: bold;" target="_blank">🔗 Go to Repository</a>
            </div>
          </div>
        </div>
      `,
    });

    // Send confirmation email to requester
    await transporter.sendMail({
      from: process.env.EMAIL_USER,
      to: email,
      subject: "✅ Code Repository Access Request Received - EcoLafaek",
      html: `
        <div style="font-family: 'Segoe UI', Tahoma, Geneva, Verdana, sans-serif; line-height: 1.6; color: #333; max-width: 600px; margin: 0 auto;">
          <div style="background: linear-gradient(135deg, #059669 0%, #047857 100%); color: white; padding: 30px; text-align: center; border-radius: 10px 10px 0 0;">
            <h1 style="margin: 0; font-size: 28px;">✅ Request Received</h1>
            <p style="margin: 15px 0 0 0; opacity: 0.9; font-size: 16px;">Thank you for your interest in EcoLafaek</p>
          </div>
          
          <div style="background: #f9fafb; padding: 40px; border-radius: 0 0 10px 10px;">
            <div style="background: white; padding: 30px; border-radius: 12px; text-align: center; margin-bottom: 25px;">
              <div style="width: 60px; height: 60px; background: #dcfce7; border-radius: 50%; margin: 0 auto 20px auto; display: flex; align-items: center; justify-content: center;">
                <span style="font-size: 24px;">🔐</span>
              </div>
              <h2 style="color: #059669; margin: 0 0 15px 0; font-size: 22px;">Hi ${name}!</h2>
              <p style="color: #6b7280; margin: 0; font-size: 16px;">We've received your request for code repository access and are reviewing it now.</p>
            </div>
            
            <div style="background: white; padding: 25px; border-radius: 8px; margin-bottom: 25px; border-left: 4px solid #059669;">
              <h3 style="color: #059669; margin: 0 0 15px 0;">What Happens Next?</h3>
              <ul style="margin: 0; padding-left: 20px; color: #6b7280;">
                <li style="margin-bottom: 10px;"><strong>Review Process:</strong> We'll verify your GitHub profile and stated purpose</li>
                <li style="margin-bottom: 10px;"><strong>Timeline:</strong> You'll hear back from us within 30 minutes to 1 hour</li>
                <li style="margin-bottom: 10px;"><strong>Approval:</strong> If approved, you'll receive repository access via GitHub</li>
              </ul>
            </div>
            
            <div style="background: white; padding: 25px; border-radius: 8px; margin-bottom: 25px;">
              <h3 style="color: #374151; margin: 0 0 15px 0;">Your Request Summary</h3>
              <table style="width: 100%; border-collapse: collapse;">
                <tr><td style="padding: 8px 0; font-weight: bold; color: #6b7280;">GitHub Username:</td><td style="padding: 8px 0;">@${githubUsername}</td></tr>
                <tr><td style="padding: 8px 0; font-weight: bold; color: #6b7280;">Role:</td><td style="padding: 8px 0;">${formatRole(
                  role
                )}</td></tr>
                <tr><td style="padding: 8px 0; font-weight: bold; color: #6b7280;">Purpose:</td><td style="padding: 8px 0;">${formatPurpose(
                  purpose
                )}</td></tr>
                <tr><td style="padding: 8px 0; font-weight: bold; color: #6b7280;">Submitted:</td><td style="padding: 8px 0;">${new Date().toLocaleString()}</td></tr>
              </table>
            </div>
            
            <div style="text-align: center; color: #6b7280; font-size: 14px;">
              <p>Questions? Reply to this email or visit our <a href="#" style="color: #059669;">support page</a></p>
              <p style="margin-top: 20px; padding-top: 20px; border-top: 1px solid #e5e7eb;">
                <strong>EcoLafaek Team</strong><br>
                Making Timor-Leste cleaner and healthier together 🇹🇱
              </p>
            </div>
          </div>
        </div>
      `,
    });

    res.status(200).json({ message: "Request submitted successfully" });
  } catch (error) {
    console.error("Error sending email:", error);
    res.status(500).json({ message: "Error submitting request" });
  }
}

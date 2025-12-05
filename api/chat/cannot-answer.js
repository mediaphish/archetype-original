import { Resend } from "resend";

const resend = new Resend(process.env.RESEND_API_KEY);

export default async function handler(req, res) {
  if (req.method !== "POST") {
    return res.status(405).json({ error: "Method not allowed" });
  }

  try {
    const { question, name, phone, email } = req.body;

    if (!question) {
      return res.status(400).json({ error: "Question is required" });
    }

    // Always send email notification to Bart, even if no contact info provided
    const hasContactInfo = name && email;
    
    let emailSubject;
    let emailBody;

    // Generate unique ID for this question notification
    const questionId = `q_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`;
    const siteUrl = process.env.PUBLIC_SITE_URL || process.env.VERCEL_URL || 'https://www.archetypeoriginal.com';
    const feedbackUrl = `${siteUrl}/api/chat/question-feedback`;
    
    // Store the question in Supabase for tracking
    try {
      await supabase
        .from('unanswered_questions')
        .insert([
          {
            question_id: questionId,
            question: question,
            name: name || null,
            email: email || null,
            phone: phone || null,
            created_at: new Date().toISOString(),
            feedback: null,
            is_valuable: null
          }
        ]);
    } catch (dbError) {
      console.error('Error storing question:', dbError);
      // Continue even if DB insert fails
    }
    
    if (hasContactInfo) {
      emailSubject = `Archy Can't Answer: Question from ${name}`;
      emailBody = `
        <p>Archy encountered a question he couldn't answer and the user provided their contact information.</p>
        
        <h3>Question:</h3>
        <p>${question.replace(/\n/g, '<br>')}</p>
        
        <h3>Contact Information:</h3>
        <ul>
          <li><strong>Name:</strong> ${name}</li>
          <li><strong>Email:</strong> ${email}</li>
          ${phone ? `<li><strong>Phone:</strong> ${phone}</li>` : ''}
        </ul>
        
        <p>You can reply directly to this email to respond to ${name}.</p>
        
        <hr style="margin: 20px 0; border: none; border-top: 1px solid #ddd;">
        
        <p style="font-size: 12px; color: #666;">
          <strong>Help improve Archy:</strong> Was this question actually valuable?
          <br>
          <a href="${feedbackUrl}?id=${questionId}&feedback=valuable" style="color: #C85A3C; margin-right: 10px;">✓ Yes, valuable</a>
          <a href="${feedbackUrl}?id=${questionId}&feedback=not_valuable" style="color: #C85A3C;">✗ No, not valuable</a>
        </p>
      `;
    } else {
      emailSubject = `Archy Can't Answer: Question (No Contact Info)`;
      emailBody = `
        <p>Archy encountered a question he couldn't answer, but the user chose not to provide contact information.</p>
        
        <h3>Question:</h3>
        <p>${question.replace(/\n/g, '<br>')}</p>
        
        <p><em>Consider adding this to the knowledge corpus if it's relevant.</em></p>
        
        <hr style="margin: 20px 0; border: none; border-top: 1px solid #ddd;">
        
        <p style="font-size: 12px; color: #666;">
          <strong>Help improve Archy:</strong> Was this question actually valuable?
          <br>
          <a href="${feedbackUrl}?id=${questionId}&feedback=valuable" style="color: #C85A3C; margin-right: 10px;">✓ Yes, valuable</a>
          <a href="${feedbackUrl}?id=${questionId}&feedback=not_valuable" style="color: #C85A3C;">✗ No, not valuable</a>
        </p>
      `;
    }

    // Send email to Bart
    const bartEmail = process.env.BART_EMAIL || process.env.CONTACT_EMAIL || "bart@archetypeoriginal.com";
    
    try {
      await resend.emails.send({
        from: "Archy <noreply@archetypeoriginal.com>",
        to: bartEmail,
        replyTo: hasContactInfo ? email : undefined,
        subject: emailSubject,
        html: emailBody,
      });

      return res.status(200).json({ 
        success: true,
        message: hasContactInfo 
          ? "Your question has been sent to Bart. He'll get back to you soon!" 
          : "Your question has been noted. Thanks for chatting with Archy!"
      });
    } catch (emailError) {
      console.error("Error sending email:", emailError);
      return res.status(500).json({ error: "Failed to send notification email" });
    }
  } catch (error) {
    console.error("Error in cannot-answer handler:", error);
    return res.status(500).json({ error: "Internal server error" });
  }
}


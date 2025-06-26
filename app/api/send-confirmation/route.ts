import { NextRequest, NextResponse } from "next/server";

interface EmailRequest {
  bookingId: string;
  userEmail: string;
  eventName: string;
  eventDate: string;
  totalAmount: number;
  tickets?: Array<{
    type: string;
    quantity: number;
    price: number;
  }>;
  attendees?: Array<{
    name: string;
    email: string;
  }>;
}

// Helper function to generate email template
function generateEmailTemplate(data: EmailRequest): string {
  const { bookingId, eventName, eventDate, totalAmount, tickets, attendees } =
    data;

  let ticketsSection = "";
  if (tickets && tickets.length > 0) {
    ticketsSection = `
Tickets:
${tickets
  .map(
    (ticket) =>
      `- ${ticket.type}: ${ticket.quantity}x $${ticket.price} = $${
        ticket.quantity * ticket.price
      }`
  )
  .join("\n")}
`;
  }

  let attendeesSection = "";
  if (attendees && attendees.length > 0) {
    attendeesSection = `
Attendees:
${attendees
  .map((attendee) => `- ${attendee.name} (${attendee.email})`)
  .join("\n")}
`;
  }

  return `
Dear Customer,

Your booking has been confirmed! 🎉

━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━

BOOKING CONFIRMATION

Booking ID: ${bookingId}
Event: ${eventName}
Date: ${eventDate}
Total Amount: $${totalAmount.toFixed(2)}
${ticketsSection}${attendeesSection}
━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━

IMPORTANT INFORMATION:
• Please save this confirmation email for your records
• Bring a valid ID that matches the name on your booking
• Arrive at least 15 minutes before the event start time
• For any changes or cancellations, contact us with your booking ID

We look forward to seeing you at the event!

Best regards,
Local Events Hub Team

Need help? Contact us at support@localeventshub.com
  `.trim();
}

// Helper function to generate HTML email template
function generateHTMLEmailTemplate(data: EmailRequest): string {
  const { bookingId, eventName, eventDate, totalAmount, tickets, attendees } =
    data;

  let ticketsHTML = "";
  if (tickets && tickets.length > 0) {
    ticketsHTML = `
      <div style="margin: 20px 0;">
        <h3 style="color: #333; margin-bottom: 10px;">Tickets:</h3>
        <ul style="list-style: none; padding: 0;">
          ${tickets
            .map(
              (ticket) => `
            <li style="padding: 5px 0; border-bottom: 1px solid #eee;">
              <span style="font-weight: bold;">${ticket.type}:</span> 
              ${ticket.quantity}x $${ticket.price} = $${(
                ticket.quantity * ticket.price
              ).toFixed(2)}
            </li>
          `
            )
            .join("")}
        </ul>
      </div>
    `;
  }

  let attendeesHTML = "";
  if (attendees && attendees.length > 0) {
    attendeesHTML = `
      <div style="margin: 20px 0;">
        <h3 style="color: #333; margin-bottom: 10px;">Attendees:</h3>
        <ul style="list-style: none; padding: 0;">
          ${attendees
            .map(
              (attendee) => `
            <li style="padding: 5px 0; border-bottom: 1px solid #eee;">
              <span style="font-weight: bold;">${attendee.name}</span> (${attendee.email})
            </li>
          `
            )
            .join("")}
        </ul>
      </div>
    `;
  }

  return `
    <!DOCTYPE html>
    <html>
    <head>
      <meta charset="utf-8">
      <title>Booking Confirmation</title>
    </head>
    <body style="font-family: Arial, sans-serif; line-height: 1.6; color: #333; max-width: 600px; margin: 0 auto; padding: 20px;">
      <div style="background: linear-gradient(135deg, #667eea 0%, #764ba2 100%); color: white; padding: 30px; text-align: center; border-radius: 10px 10px 0 0;">
        <h1 style="margin: 0; font-size: 28px;">🎉 Booking Confirmed!</h1>
        <p style="margin: 10px 0 0 0; font-size: 16px; opacity: 0.9;">Thank you for your booking</p>
      </div>
      
      <div style="background: #f8f9fa; padding: 30px; border-radius: 0 0 10px 10px;">
        <div style="background: white; padding: 25px; border-radius: 8px; box-shadow: 0 2px 4px rgba(0,0,0,0.1);">
          <h2 style="color: #333; margin-top: 0; border-bottom: 2px solid #667eea; padding-bottom: 10px;">Booking Details</h2>
          
          <div style="margin: 20px 0;">
            <p style="margin: 5px 0;"><strong>Booking ID:</strong> <span style="color: #667eea; font-family: monospace;">${bookingId}</span></p>
            <p style="margin: 5px 0;"><strong>Event:</strong> ${eventName}</p>
            <p style="margin: 5px 0;"><strong>Date:</strong> ${eventDate}</p>
            <p style="margin: 5px 0;"><strong>Total Amount:</strong> <span style="color: #28a745; font-weight: bold; font-size: 18px;">$${totalAmount.toFixed(
              2
            )}</span></p>
          </div>
          
          ${ticketsHTML}
          ${attendeesHTML}
          
          <div style="background: #e3f2fd; border-left: 4px solid #2196f3; padding: 15px; margin: 20px 0;">
            <h3 style="color: #1976d2; margin-top: 0;">Important Information:</h3>
            <ul style="margin: 10px 0; padding-left: 20px;">
              <li>Please save this confirmation email for your records</li>
              <li>Bring a valid ID that matches the name on your booking</li>
              <li>Arrive at least 15 minutes before the event start time</li>
              <li>For any changes or cancellations, contact us with your booking ID</li>
            </ul>
          </div>
          
          <div style="text-align: center; margin: 30px 0;">
            <p style="font-size: 16px; color: #666;">We look forward to seeing you at the event!</p>
            <div style="border-top: 1px solid #eee; padding-top: 20px; margin-top: 20px;">
              <p style="margin: 5px 0; color: #888; font-size: 14px;">Best regards,<br><strong>Local Events Hub Team</strong></p>
              <p style="margin: 5px 0; color: #888; font-size: 12px;">Need help? Contact us at <a href="mailto:support@localeventshub.com" style="color: #667eea;">support@localeventshub.com</a></p>
            </div>
          </div>
        </div>
      </div>
    </body>
    </html>
  `;
}

// POST /api/send-confirmation - Send booking confirmation email
export async function POST(request: NextRequest) {
  try {
    const emailData: EmailRequest = await request.json();

    // Validate required fields
    if (
      !emailData.bookingId ||
      !emailData.userEmail ||
      !emailData.eventName ||
      !emailData.totalAmount
    ) {
      return NextResponse.json(
        {
          error:
            "Missing required fields: bookingId, userEmail, eventName, totalAmount",
        },
        { status: 400 }
      );
    }

    // Validate email format
    const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
    if (!emailRegex.test(emailData.userEmail)) {
      return NextResponse.json(
        { error: "Invalid email format" },
        { status: 400 }
      );
    }

    // Generate email templates
    const textTemplate = generateEmailTemplate(emailData);
    const htmlTemplate = generateHTMLEmailTemplate(emailData);

    // Log the email sending attempt
    console.log("Sending booking confirmation email:", {
      to: emailData.userEmail,
      bookingId: emailData.bookingId,
      eventName: emailData.eventName,
      eventDate: emailData.eventDate,
      totalAmount: emailData.totalAmount,
      hasTickets: !!(emailData.tickets && emailData.tickets.length > 0),
      hasAttendees: !!(emailData.attendees && emailData.attendees.length > 0),
    });

    // TODO: Integrate with actual email service (e.g., SendGrid, Resend, Postmark, etc.)
    // For now, we'll simulate email sending

    /*
    Example integration with Resend:
    
    import { Resend } from 'resend';
    const resend = new Resend(process.env.RESEND_API_KEY);
    
    const { data, error } = await resend.emails.send({
      from: 'Local Events Hub <noreply@localeventshub.com>',
      to: emailData.userEmail,
      subject: `Booking Confirmation - ${emailData.eventName}`,
      html: htmlTemplate,
      text: textTemplate,
    });
    
    if (error) {
      console.error('Email sending error:', error);
      return NextResponse.json({ error: 'Failed to send email' }, { status: 500 });
    }
    */

    // Simulate successful email sending
    await new Promise((resolve) => setTimeout(resolve, 100)); // Simulate network delay

    // Return success response
    return NextResponse.json({
      success: true,
      message: "Confirmation email sent successfully",
      booking_id: emailData.bookingId,
      recipient: emailData.userEmail,
      templates: {
        text: textTemplate,
        html: htmlTemplate,
      },
    });
  } catch (error) {
    console.error("Error sending confirmation email:", error);
    return NextResponse.json(
      { error: "Failed to send confirmation email" },
      { status: 500 }
    );
  }
}

// GET /api/send-confirmation - Health check and template preview
export async function GET(request: NextRequest) {
  const { searchParams } = new URL(request.url);
  const preview = searchParams.get("preview");

  if (preview === "true") {
    // Return a sample email template for preview
    const sampleData: EmailRequest = {
      bookingId: "BKG-12345-SAMPLE",
      userEmail: "customer@example.com",
      eventName: "Sample Music Festival 2024",
      eventDate: "Saturday, March 15, 2024 at 7:00 PM",
      totalAmount: 150.0,
      tickets: [
        { type: "General Admission", quantity: 2, price: 50.0 },
        { type: "VIP Package", quantity: 1, price: 50.0 },
      ],
      attendees: [
        { name: "John Doe", email: "john@example.com" },
        { name: "Jane Smith", email: "jane@example.com" },
      ],
    };

    const htmlTemplate = generateHTMLEmailTemplate(sampleData);

    return new Response(htmlTemplate, {
      headers: {
        "Content-Type": "text/html",
      },
    });
  }

  return NextResponse.json({
    status: "ok",
    timestamp: new Date().toISOString(),
    service: "send-confirmation",
    features: [
      "Plain text and HTML email templates",
      "Email validation",
      "Template preview (add ?preview=true)",
      "Ready for email service integration",
    ],
  });
}

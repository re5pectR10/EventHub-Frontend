import "jsr:@supabase/functions-js/edge-runtime.d.ts";
import { createClient } from "jsr:@supabase/supabase-js@2";

interface EmailRequest {
  bookingId: string;
  userEmail: string;
  eventName: string;
  eventDate: string;
  totalAmount: number;
}

Deno.serve(async (req: Request): Promise<Response> => {
  if (req.method !== "POST") {
    return new Response("Method not allowed", { status: 405 });
  }

  try {
    const emailData: EmailRequest = await req.json();

    // Here you would integrate with your email service (e.g., SendGrid, Resend, etc.)
    // For now, we'll just log the email data and return success

    console.log("Sending booking confirmation email:", {
      to: emailData.userEmail,
      bookingId: emailData.bookingId,
      eventName: emailData.eventName,
      eventDate: emailData.eventDate,
      totalAmount: emailData.totalAmount,
    });

    // Example email template
    const emailTemplate = `
      Dear Customer,
      
      Your booking has been confirmed!
      
      Booking ID: ${emailData.bookingId}
      Event: ${emailData.eventName}
      Date: ${emailData.eventDate}
      Total Amount: $${emailData.totalAmount}
      
      We look forward to seeing you at the event!
      
      Best regards,
      Local Events Hub Team
    `;

    // Return success response
    return new Response(
      JSON.stringify({
        success: true,
        message: "Confirmation email sent successfully",
        emailTemplate, // For demonstration purposes
      }),
      {
        headers: {
          "Content-Type": "application/json",
          "Access-Control-Allow-Origin": "*",
          "Access-Control-Allow-Headers":
            "authorization, x-client-info, apikey, content-type",
        },
      }
    );
  } catch (error) {
    console.error("Error sending confirmation email:", error);
    return new Response(
      JSON.stringify({ error: "Failed to send confirmation email" }),
      {
        status: 500,
        headers: { "Content-Type": "application/json" },
      }
    );
  }
});

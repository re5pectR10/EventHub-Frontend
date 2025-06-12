import { createClient } from "@/utils/supabase/client";

const SUPABASE_URL = process.env.NEXT_PUBLIC_SUPABASE_URL!;

interface BookingData {
  eventId: string;
  tickets: Array<{
    type: string;
    quantity: number;
    price: number;
  }>;
  attendees: Array<{
    name: string;
    email: string;
    phone?: string;
  }>;
  specialRequests?: string;
}

interface EmailData {
  bookingId: string;
  userEmail: string;
  eventName: string;
  eventDate: string;
  totalAmount: number;
}

export class EdgeFunctionsService {
  private supabase = createClient();

  /**
   * Process a booking using the Edge Function
   */
  async processBooking(bookingData: BookingData) {
    try {
      // Get the current session for authentication
      const {
        data: { session },
      } = await this.supabase.auth.getSession();

      if (!session) {
        throw new Error("User not authenticated");
      }

      const response = await fetch(
        `${SUPABASE_URL}/functions/v1/process-booking`,
        {
          method: "POST",
          headers: {
            Authorization: `Bearer ${session.access_token}`,
            "Content-Type": "application/json",
          },
          body: JSON.stringify(bookingData),
        }
      );

      if (!response.ok) {
        const error = await response.text();
        throw new Error(`Booking failed: ${error}`);
      }

      return await response.json();
    } catch (error) {
      console.error("Error processing booking:", error);
      throw error;
    }
  }

  /**
   * Send booking confirmation email using the Edge Function
   */
  async sendBookingConfirmation(emailData: EmailData) {
    try {
      const response = await fetch(
        `${SUPABASE_URL}/functions/v1/send-booking-confirmation`,
        {
          method: "POST",
          headers: {
            "Content-Type": "application/json",
          },
          body: JSON.stringify(emailData),
        }
      );

      if (!response.ok) {
        const error = await response.text();
        throw new Error(`Email sending failed: ${error}`);
      }

      return await response.json();
    } catch (error) {
      console.error("Error sending confirmation email:", error);
      throw error;
    }
  }

  /**
   * Complete booking process (process booking + send confirmation)
   */
  async completeBooking(
    bookingData: BookingData,
    eventName: string,
    eventDate: string
  ) {
    try {
      // Step 1: Process the booking
      const bookingResult = await this.processBooking(bookingData);

      if (!bookingResult.success) {
        throw new Error("Booking processing failed");
      }

      // Step 2: Get user email for confirmation
      const {
        data: { user },
      } = await this.supabase.auth.getUser();
      if (!user?.email) {
        throw new Error("User email not found");
      }

      // Step 3: Send confirmation email
      const emailResult = await this.sendBookingConfirmation({
        bookingId: bookingResult.bookingId,
        userEmail: user.email,
        eventName,
        eventDate,
        totalAmount: bookingResult.totalAmount,
      });

      return {
        booking: bookingResult,
        email: emailResult,
        success: true,
      };
    } catch (error) {
      console.error("Error completing booking:", error);
      throw error;
    }
  }
}

// Export a singleton instance
export const edgeFunctionsService = new EdgeFunctionsService();

// Validation utilities for the application

export const validateEmail = (email: string): boolean => {
  // Email validation that allows + but rejects consecutive dots
  const emailRegex = /^[a-zA-Z0-9._+-]+@[a-zA-Z0-9.-]+\.[a-zA-Z]{2,}$/;
  return emailRegex.test(email) && !email.includes("..");
};

export const validatePhone = (phone: string): boolean => {
  const phoneRegex = /^\+?[\d\s\-\(\)]{10,}$/;
  return phoneRegex.test(phone);
};

export const validateEventDate = (date: string): boolean => {
  const eventDate = new Date(date);
  const now = new Date();
  return eventDate > now;
};

export const sanitizeInput = (input: string): string => {
  // Properly remove HTML tags and trim whitespace
  return input.trim().replace(/<[^>]*>/g, "");
};

// Business logic utilities
export const calculateTotalPrice = (
  tickets: Array<{ quantity: number; price: number }>
): number => {
  return tickets.reduce(
    (sum, ticket) => sum + ticket.quantity * ticket.price,
    0
  );
};

export const generateBookingReference = (): string => {
  const timestamp = Date.now().toString(36);
  const random = Math.random().toString(36).substr(2, 5);
  return `BKG-${timestamp}-${random}`.toUpperCase();
};

export const validateTicketQuantity = (
  quantity: number,
  maxPerOrder: number = 10
): boolean => {
  return quantity > 0 && quantity <= maxPerOrder;
};

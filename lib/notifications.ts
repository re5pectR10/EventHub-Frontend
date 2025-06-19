// Simple notification utility to replace react-hot-toast
export interface NotificationOptions {
  duration?: number;
  position?: "top-right" | "top-left" | "bottom-right" | "bottom-left";
}

export interface Notification {
  id: string;
  type: "success" | "error" | "info" | "warning";
  message: string;
  duration: number;
}

class NotificationManager {
  private notifications: Notification[] = [];
  private listeners: ((notifications: Notification[]) => void)[] = [];

  subscribe(listener: (notifications: Notification[]) => void) {
    this.listeners.push(listener);
    return () => {
      this.listeners = this.listeners.filter((l) => l !== listener);
    };
  }

  private notify() {
    this.listeners.forEach((listener) => listener([...this.notifications]));
  }

  private add(
    type: Notification["type"],
    message: string,
    options: NotificationOptions = {}
  ) {
    const id = Math.random().toString(36).substr(2, 9);
    const duration = options.duration || 5000;

    const notification: Notification = {
      id,
      type,
      message,
      duration,
    };

    this.notifications.push(notification);
    this.notify();

    // Auto remove after duration
    setTimeout(() => {
      this.remove(id);
    }, duration);

    return id;
  }

  remove(id: string) {
    this.notifications = this.notifications.filter((n) => n.id !== id);
    this.notify();
  }

  success(message: string, options?: NotificationOptions) {
    return this.add("success", message, options);
  }

  error(message: string, options?: NotificationOptions) {
    return this.add("error", message, options);
  }

  info(message: string, options?: NotificationOptions) {
    return this.add("info", message, options);
  }

  warning(message: string, options?: NotificationOptions) {
    return this.add("warning", message, options);
  }

  clear() {
    this.notifications = [];
    this.notify();
  }
}

export const notifications = new NotificationManager();

// Convenience functions
export const toast = {
  success: (message: string, options?: NotificationOptions) =>
    notifications.success(message, options),
  error: (message: string, options?: NotificationOptions) =>
    notifications.error(message, options),
  info: (message: string, options?: NotificationOptions) =>
    notifications.info(message, options),
  warning: (message: string, options?: NotificationOptions) =>
    notifications.warning(message, options),
};

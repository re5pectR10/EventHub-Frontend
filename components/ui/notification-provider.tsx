"use client";

import { useEffect, useState } from "react";
import { notifications, type Notification } from "@/lib/notifications";
import { X, CheckCircle, XCircle, Info, AlertTriangle } from "lucide-react";

export function NotificationProvider() {
  const [notificationList, setNotificationList] = useState<Notification[]>([]);

  useEffect(() => {
    const unsubscribe = notifications.subscribe(setNotificationList);
    return unsubscribe;
  }, []);

  const getIcon = (type: Notification["type"]) => {
    switch (type) {
      case "success":
        return <CheckCircle className="h-5 w-5 text-green-500" />;
      case "error":
        return <XCircle className="h-5 w-5 text-red-500" />;
      case "warning":
        return <AlertTriangle className="h-5 w-5 text-yellow-500" />;
      case "info":
        return <Info className="h-5 w-5 text-blue-500" />;
      default:
        return <Info className="h-5 w-5 text-gray-500" />;
    }
  };

  const getBackgroundColor = (type: Notification["type"]) => {
    switch (type) {
      case "success":
        return "bg-green-50 border-green-200";
      case "error":
        return "bg-red-50 border-red-200";
      case "warning":
        return "bg-yellow-50 border-yellow-200";
      case "info":
        return "bg-blue-50 border-blue-200";
      default:
        return "bg-gray-50 border-gray-200";
    }
  };

  const getTextColor = (type: Notification["type"]) => {
    switch (type) {
      case "success":
        return "text-green-800";
      case "error":
        return "text-red-800";
      case "warning":
        return "text-yellow-800";
      case "info":
        return "text-blue-800";
      default:
        return "text-gray-800";
    }
  };

  if (notificationList.length === 0) {
    return null;
  }

  return (
    <div className="fixed top-4 right-4 z-50 space-y-2">
      {notificationList.map((notification) => (
        <div
          key={notification.id}
          className={`
            flex items-center gap-3 p-4 rounded-lg border shadow-lg max-w-md
            ${getBackgroundColor(notification.type)}
            animate-in slide-in-from-right duration-300
          `}
        >
          {getIcon(notification.type)}
          <p
            className={`flex-1 text-sm font-medium ${getTextColor(
              notification.type
            )}`}
          >
            {notification.message}
          </p>
          <button
            onClick={() => notifications.remove(notification.id)}
            className={`
              p-1 rounded-full hover:bg-black/10 transition-colors
              ${getTextColor(notification.type)}
            `}
          >
            <X className="h-4 w-4" />
          </button>
        </div>
      ))}
    </div>
  );
}

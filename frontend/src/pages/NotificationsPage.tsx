import { useEffect, useState } from "react";
import { useNavigate } from "react-router-dom";
import { api } from "@/lib/api";
import { formatDisplayDate } from "@/lib/date";
import { Notification, NotificationList } from "@/types";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { BellDot, Eye, Check, ExternalLink, AlertCircle } from "lucide-react";

export function NotificationsPage() {
  const navigate = useNavigate();
  const [notifications, setNotifications] = useState<Notification[]>([]);
  const [unreadCount, setUnreadCount] = useState(0);
  const [loading, setLoading] = useState(true);

  const fetchNotifications = async () => {
    try {
      const data = await api.get<NotificationList>("/notifications/");
      setNotifications(data.notifications);
      setUnreadCount(data.unread_count);
    } catch {
      /* ignore */
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchNotifications();
  }, []);

  useEffect(() => {
    const markAllVisibleRead = async () => {
      try {
        const unread = notifications.filter((n) => !n.is_read);
        if (unread.length === 0) return;
        await Promise.all(unread.map((n) => api.patch(`/notifications/${n.id}/read`).catch(() => null)));
        setNotifications((prev) => prev.map((n) => ({ ...n, is_read: true })));
        setUnreadCount(0);
      } catch {
        /* ignore */
      }
    };
    markAllVisibleRead();
  }, [notifications.length]);

  const handleMarkRead = async (id: number) => {
    try {
      await api.patch(`/notifications/${id}/read`);
      setNotifications((prev) =>
        prev.map((n) => (n.id === id ? { ...n, is_read: true } : n))
      );
      setUnreadCount((prev) => Math.max(0, prev - 1));
    } catch {
      /* ignore */
    }
  };

  const handleViewProfile = async (notification: Notification) => {
    if (!notification.is_read) {
      await handleMarkRead(notification.id);
    }
    if (notification.resource_type === "patient" && notification.resource_id) {
      navigate(`/patients/${notification.resource_id}`);
    }
  };

  const getTypeIcon = (type: string) => {
    switch (type) {
      case "patient_shared":
        return <AlertCircle className="h-4 w-4 text-blue-500" />;
      default:
        return <BellDot className="h-4 w-4 text-gray-500" />;
    }
  };

  const formatDate = (dateStr: string) => {
    const d = new Date(dateStr);
    const now = new Date();
    const diffMs = now.getTime() - d.getTime();
    const diffMins = Math.floor(diffMs / 60000);
    if (diffMins < 1) return "Just now";
    if (diffMins < 60) return `${diffMins}m ago`;
    const diffHours = Math.floor(diffMins / 60);
    if (diffHours < 24) return `${diffHours}h ago`;
    const diffDays = Math.floor(diffHours / 24);
    if (diffDays < 7) return `${diffDays}d ago`;
    return formatDisplayDate(dateStr);
  };

  return (
    <div className="space-y-5 lg:space-y-4">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-lg lg:text-xl font-bold text-foreground">Notifications</h1>
          <p className="text-xs sm:text-sm text-muted-foreground mt-1">
            {unreadCount > 0
              ? `${unreadCount} unread notification${unreadCount > 1 ? "s" : ""}`
              : "No unread notifications"}
          </p>
        </div>
      </div>

      <Card className="border-border/70 shadow-sm rounded-xl">
        <CardHeader className="p-4 lg:p-3 pb-2 lg:pb-2">
          <CardTitle className="flex items-center gap-2 text-sm font-semibold">
            <BellDot className="h-4 w-4" />
            All Notifications
          </CardTitle>
        </CardHeader>
        <CardContent className="p-0">
          {loading ? (
            <div className="py-8 text-center text-sm text-muted-foreground">Loading...</div>
          ) : notifications.length === 0 ? (
            <div className="py-8 text-center text-sm text-muted-foreground">No notifications yet</div>
          ) : (
            <div className="divide-y divide-border/50">
              {notifications.map((n) => (
                <div
                  key={n.id}
                  className={`flex items-center gap-3 px-5 lg:px-4 py-3 lg:py-2.5 transition-colors ${
                    !n.is_read ? "bg-primary-container/20" : "hover:bg-accent/50"
                  }`}
                >
                  <div className="shrink-0">
                    {!n.is_read ? (
                      <div className="w-2 h-2 rounded-full bg-primary" />
                    ) : (
                      <div className="w-2 h-2 rounded-full bg-transparent" />
                    )}
                  </div>
                  <div className="shrink-0">{getTypeIcon(n.notification_type)}</div>
                  <div className="flex-1 min-w-0">
                    <p
                      className={`text-sm truncate ${
                        !n.is_read ? "font-semibold text-foreground" : "text-muted-foreground"
                      }`}
                    >
                      {n.title}
                    </p>
                    {n.message && (
                      <p className="text-xs text-muted-foreground truncate mt-0.5">
                        {n.message}
                      </p>
                    )}
                    <p className="text-[10px] text-muted-foreground/60 mt-0.5">
                      {n.sender_name ? `from ${n.sender_name} · ` : ""}
                      {formatDate(n.created_at)}
                    </p>
                  </div>
                  <div className="flex items-center gap-1 shrink-0">
                    {n.resource_type === "patient" && n.resource_id && (
                      <Button
                        variant="ghost"
                        size="sm"
                        onClick={() => handleViewProfile(n)}
                        className="h-7 text-xs gap-1 px-2"
                      >
                        <ExternalLink className="h-3 w-3" />
                        View
                      </Button>
                    )}
                    {!n.is_read && (
                      <Button
                        variant="ghost"
                        size="sm"
                        onClick={() => handleMarkRead(n.id)}
                        className="h-7 text-xs gap-1 px-2"
                      >
                        <Check className="h-3 w-3" />
                        Read
                      </Button>
                    )}
                  </div>
                </div>
              ))}
            </div>
          )}
        </CardContent>
      </Card>
    </div>
  );
}

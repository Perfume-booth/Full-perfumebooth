import { notificationProxy } from "@/lib/notification-proxy";
export async function POST(request: Request) {
  return notificationProxy(request, "notifications/manage");
}

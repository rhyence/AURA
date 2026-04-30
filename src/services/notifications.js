export const requestPermission = async () => {
  if (!("Notification" in window)) return "denied"
  return await Notification.requestPermission()
}

export const fireNotification = (title, body) => {
  if (Notification.permission === "granted") {
    new Notification(title, { body, icon: "/favicon.svg" })
  }
}

export interface User {
  _id: string;
  name: string;
  email: string;
}

export interface PrivateMessage {
  _id: string;
  sender: User;
  receiver: string;
  content: string;
  deliveryStatus: "sent" | "delivered";
  createdAt: string;
}

export interface RoomMessage {
  _id: string;
  sender: User;
  room: string;
  content: string;
  createdAt: string;
}

export interface Room {
  _id: string;
  name: string;
  members: User[];
  createdBy: User;
}

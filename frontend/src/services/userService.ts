import api from "./api";
import { User } from "@/types";

export const getUsers = async (): Promise<User[]> => {
  const { data } = await api.get<User[]>("/users");
  return data;
};

export const searchUsers = async (query: string): Promise<User[]> => {
  const { data } = await api.get<User[]>("/users/search", {
    params: { q: query },
  });
  return data;
};

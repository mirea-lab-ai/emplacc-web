export type Member = {
  id: string;
  name: string;
  role: string;
  email?: string;
  avatarSrc?: string;
};

export type Team = {
  id: string;
  name: string;
  description?: string;
  members: Member[];
};

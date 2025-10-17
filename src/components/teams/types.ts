export type Member = {
  id: string;
  name: string;
  role: string;
  avatarSrc?: string;
};

export type Lead = {
  id: string;
  name: string;
  role?: string;
  avatarSrc?: string;
};

export type Team = {
  id: string;
  name: string;
  lead: Lead;
  members: Member[];          // ← только список сотрудников
};

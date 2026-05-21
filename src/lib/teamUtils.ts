import type { Team } from '@/components/teams/types';
import { UITeamFull } from '@/features/teams/api';

// Функция для преобразования UITeamFull в Team
export function convertUITeamToTeam(uiTeam: UITeamFull): Team {
  return {
    id: uiTeam.id,
    name: uiTeam.name,
    description: uiTeam.description,
    members: uiTeam.members.map(member => ({
      id: member.id,
      name: member.name,
      role: member.specialization ?? member.profession ?? member.role ?? 'Роль не указана',
      email: member.email,
      avatarSrc: member.avatarUrl,
    })),
  };
}

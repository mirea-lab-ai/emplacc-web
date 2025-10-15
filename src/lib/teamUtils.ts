import type { Team } from '@/components/teams/types';
import { UITeamFull } from '@/features/teams/api';

// Функция для преобразования UITeamFull в Team
export function convertUITeamToTeam(uiTeam: UITeamFull): Team {
  return {
    id: uiTeam.id,
    name: uiTeam.name,
    lead: uiTeam.lead ? {
      id: uiTeam.lead.id,
      name: uiTeam.lead.name,
    } : { id: 'no-lead', name: 'Нет лида' },
    members: uiTeam.members.map(member => ({
      id: member.id,
      name: member.name,
      role: member.role,
    })),
  };
}

'use client';

import { Box, Text } from '@chakra-ui/react';
import { useTaskById } from '@/features/tasks/hooks';
import { useIsClient } from '@/hooks/useIsClient';
import { isAuthed } from '@/lib/auth';

type Props = {
  taskId: string;
  description: string;
  onClick: (taskName: string, description: string) => void;
};

export default function PlanItem({ taskId, description, onClick }: Props) {
  const isClient = useIsClient();
  const hasCreds = isClient && isAuthed();
  
  const { data: taskData, isLoading } = useTaskById(taskId, hasCreds);

  const taskName = taskData?.name || (isLoading ? 'Загрузка...' : 'Задача не найдена');

  return (
    <Box
      as="li"
      onClick={() => onClick(taskName, description)}
      borderRadius="xl"
      px={4}
      py={2}
      borderWidth="1px"
      borderColor="whiteAlpha.200"
      bg="whiteAlpha.100"
      color="white"
      backdropFilter="blur(10px)"
      cursor="pointer"
      transition="background 0.2s ease"
      _hover={{ bg: 'whiteAlpha.200' }}
      listStyleType="none"
    >
      <Text fontWeight="medium" mb={1}>
        {taskName}
      </Text>
      {description && (
        <Text color="gray.300" fontSize="sm" truncate>
          {description}
        </Text>
      )}
    </Box>
  );
}

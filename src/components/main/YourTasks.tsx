'use client';

import Panel from '@/components/ui/Panel';
import { Badge, Box, Flex, Heading, Stack, Text } from '@chakra-ui/react';
import { useMemo } from 'react';
import { useIsClient } from '@/hooks/useIsClient';
import { useMyTasks } from '@/features/tasks/hooks';
import type { UITask } from '@/features/tasks/types';
import { getTaskPriorityMeta } from '@/features/tasks/types';
import { getUserId, isAuthed } from '@/lib/auth';

const formatDueDate = (value: string) => {
  const date = new Date(value);
  if (Number.isNaN(date.getTime())) {
    return value;
  }

  const pad = (n: number) => String(n).padStart(2, '0');
  const day = pad(date.getDate());
  const month = pad(date.getMonth() + 1);
  const year = date.getFullYear();
  const hours = pad(date.getHours());
  const minutes = pad(date.getMinutes());

  return `${day}.${month}.${year} ${hours}:${minutes}`;
};

export default function YourTasks() {
    const isClient = useIsClient();

    const hasCreds = isClient && isAuthed() && !!getUserId();
    const { data, isLoading, error } = useMyTasks(1, 20, hasCreds);
    const tasks = (data ?? []) as UITask[];

    const sorted = useMemo(() => {
    const arr = [...tasks];
    arr.sort((a, b) => {
      return getTaskPriorityMeta(a.priority).order - getTaskPriorityMeta(b.priority).order;
    });
    return arr;
  }, [tasks]);
    if (!isClient) {
        return (
            <Panel p={6} h="680px" overflow="hidden">
                <Flex mb={4} align="center" justify="space-between">
                    <Heading size="md">Ваши задачи</Heading>
                </Flex>
                <Stack gap={3} h="calc(100% - 2.5rem)" overflowY="auto" pr={2}>
                    {/* пустой контейнер для SSR */}
                </Stack>
            </Panel>
        );
    }
    return (
        <Panel p={6} h="680px" overflow="hidden">
            <Flex mb={4} align="center" justify="space-between">
                <Heading size="md">Ваши задачи</Heading>
            </Flex>

            <Stack gap={3} h="calc(100% - 2.5rem)" overflowY="auto" pr={2}>
                {isLoading ? (
                    <Text textAlign="center" color="gray.300" py={8}>
                        Загрузка задач...
                    </Text>
                ) : error ? (
                    <Text textAlign="center" color="red.300" py={8}>
                        Ошибка загрузки задач
                    </Text>
                ) : sorted.length === 0 ? (
                    <Text textAlign="center" color="gray.300" py={8}>
                        У вас пока нет задач
                    </Text>
                ) : (
                    sorted.map((t) => <TaskRow key={t.id} t={t} />)
                )}
            </Stack>
        </Panel>
    );
}

function TaskRow({t}: { t: UITask }) {
  const priorityMeta = getTaskPriorityMeta(t.priority);
    const { badgeStyles } = priorityMeta;

  return (
    <Box
        borderRadius="2xl"
        px={4}
        py={3}
        borderWidth="1px"
        borderColor="whiteAlpha.200"
        bg="whiteAlpha.100"
        backdropFilter="blur(10px)"
        color="white"
        transition="background 0.2s ease"
        _hover={{ bg: 'whiteAlpha.200' }}
    >
        <Flex align="flex-start" justify="space-between" gap={3}>
            <Box>
                <Text fontWeight="semibold">{t.title}</Text>
                {t.due && (
                    <Text color="gray.300" fontSize="sm" mt={1}>
                        Срок: {formatDueDate(t.due)}
                    </Text>
                )}
            </Box>
            <Badge
                borderRadius="lg"
                px={2}
                py={1}
                fontSize="xs"
                borderWidth="1px"
                bg={badgeStyles.bg}
                color={badgeStyles.color}
                borderColor={badgeStyles.borderColor}
                boxShadow={badgeStyles.boxShadow}
            >
                {priorityMeta.label}
            </Badge>
        </Flex>
    </Box>
  );
}
